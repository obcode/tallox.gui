import { graphql } from '#lib/gql/__generated__/index.ts';
import type { SessionQuery } from '#lib/gql/__generated__/graphql.ts';
import { backendRequest } from './backend';
import { httpStatusOf } from './graphqlError';

const SessionDocument = graphql(`
	query Session {
		session {
			narrowed
			interactive
			effectiveRoles
			grantedRoles
			person {
				id
				mail
				name
			}
		}
	}
`);

export type SessionInfo = SessionQuery['session'];

/**
 * What loading the session can come out as.
 *
 * Three outcomes rather than two, because "the backend is not answering" and "this account is
 * not allowed" are completely different messages for the user — and because the second used to
 * be displayed as the first. Somebody with an HM login but no row in `person` came through the
 * auth proxy and got a 401 from the backend; the GUI swallowed it and wrote "Backend nicht
 * erreichbar" into the footer. The useful answer would have been: you have no access, please
 * contact the administrators.
 */
export type SessionResult =
	| { kind: 'ok'; session: SessionInfo }
	/** Signed in at the IdP, but this installation does not know the login (or no longer does). */
	| { kind: 'no-access'; message: string }
	/** Backend gone, database gone, deploy running. Temporary, and not the person's fault. */
	| { kind: 'unreachable' };

/** What is shown when the backend did not supply a sentence of its own. */
export const NO_ACCESS_MESSAGE =
	'Für diese Kennung gibt es in Tallox kein Konto. Bitte bei der Administration melden.';

/**
 * Loads the session and classifies the failure case.
 *
 * The distinction hangs on the HTTP status, not on the error code: the refusals from
 * `internal/auth` all carry `UNAUTHENTICATED`, and the difference between "no account" (401)
 * and "I cannot check anybody right now" (503) sits exactly in the status. That is a deliberate
 * decision in the backend — telling a colleague her access is invalid while the database is
 * restarting is the way to a ticket about a problem that does not exist.
 */
export async function loadSession(): Promise<SessionResult> {
	try {
		const data = await backendRequest(SessionDocument);
		return { kind: 'ok', session: data.session };
	} catch (error) {
		if (httpStatusOf(error) === 401) {
			return { kind: 'no-access', message: refusalMessage(error) };
		}
		return { kind: 'unreachable' };
	}
}

/**
 * The backend's sentence, when it sent one.
 *
 * Passed through here as an exception rather than via the allowlist in graphqlError.ts: the
 * refusals from `internal/auth` are German sentences written for exactly this situation
 * ("Dieses Konto ist deaktiviert"), and they distinguish cases the person needs to know about.
 * They arise before any data access and therefore cannot give anything away about data.
 */
function refusalMessage(error: unknown): string {
	const errors = (error as { response?: { errors?: { message?: unknown }[] } })?.response?.errors;
	const first = errors?.[0]?.message;
	return typeof first === 'string' && first.trim() !== '' ? first.trim() : NO_ACCESS_MESSAGE;
}
