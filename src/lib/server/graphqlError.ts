/**
 * What may reach the user from a failed backend call.
 *
 * The backend delivers refusals as GraphQL errors with an `extensions.code` and a German
 * sentence. The **code** is the contract between the two repositories; the sentence is the
 * half somebody rewords after a support question. This file therefore reads the code and only
 * passes the sentence through — it makes no decision based on the text.
 *
 * And it is where the rule from CLAUDE.md hangs: **no raw backend error strings on write
 * paths**. Anything not recognisable as a deliberately worded refusal becomes a generic
 * sentence — a uniqueness violation passed through verbatim would otherwise reveal that
 * somebody has already registered.
 */

/** A refusal, in the shape the page displays it. */
export type BackendRefusal = {
	/** The machine-readable code from `extensions.code`, or `UNKNOWN`. */
	code: string;
	/** The sentence to display. German, from the backend or from here. */
	message: string;
};

/**
 * The codes whose text we take from the backend.
 *
 * An allowlist and not a denylist: an error with no known code is by definition one nobody has
 * thought about, and its text is exactly the one that must not reach the page. New codes are
 * added here deliberately — that is the moment somebody reads what the text gives away.
 */
const PASS_THROUGH = new Set([
	'INTERACTIVE_ONLY',
	'TOKEN_DESCRIPTION_REQUIRED',
	'TOKEN_DESCRIPTION_TOO_LONG',
	'TOKEN_LIFETIME_OUT_OF_RANGE',
	'TOKEN_NOT_FOUND',
	'UNAUTHENTICATED',
	// Administration. Unlike the wish write path nothing here gives anything away: whoever
	// gets to see these sentences is looking at a list that shows every person anyway.
	// "This person already exists" is simply the more useful answer there.
	'FORBIDDEN',
	'LAST_ADMIN',
	'INVALID_MAIL',
	'INVALID_ID',
	'PERSON_EXISTS',
	'PERSON_NOT_FOUND',
	'NAME_TOO_LONG',
	'UNKNOWN_ROLE',
	'GRANT_EXPIRY_OUT_OF_RANGE',
	// The semester workflow. Nothing here is confidential either — which semesters exist and
	// where each one stands is visible to everybody signed in — and the sentences are the useful
	// answer: PHASE_MOVED_ON in particular asks for a reload, which is exactly what the reader
	// has to do.
	'SEMESTER_CODE_INVALID',
	'SEMESTER_EXISTS',
	'SEMESTER_NOT_FOUND',
	'PHASE_NOT_ADJACENT',
	'PHASE_MOVED_ON',
	'PHASE_UNKNOWN',
	// The module catalogue. Published by the examination office and not confidential, so the
	// sentences give nothing away — and two of them are the whole point of having distinct
	// codes at all.
	//
	// PROGRAMME_SCOPE_MISSING says "nobody has assigned you a study programme", where the
	// generic refusal would send a study programme lead to ask for a role they already hold.
	// NOT_A_PROGRAMME_LEAD says "grant the role first", which is the administrator's next step.
	'MODULE_NOT_FOUND',
	'NOT_YOUR_PROGRAMME',
	'PROGRAMME_SCOPE_MISSING',
	'COMPONENTS_INVALID',
	'UNKNOWN_PROGRAMME',
	'NOT_A_PROGRAMME_LEAD',
	'SPO_ID_INVALID',
	// The demand. Not confidential either — it is what the wish phase is about — and every
	// sentence here is the useful answer rather than a fact about the database.
	//
	// Two of them are the reason the codes are separate at all. MODULE_NOT_DECOMPOSED names its
	// own repair, which is entering the module's split. INSTANCE_IN_USE deliberately names
	// nothing: "this instance has three wishes" would be the confidential fact with the names
	// taken out, so the backend's sentence says only that something hangs off it — and passing
	// that sentence through is safe precisely because it says no more.
	'DEMAND_PHASE_CLOSED',
	'MODULE_NOT_DECOMPOSED',
	'TRACK_TAKEN',
	'TRACK_INVALID',
	'PROGRAMME_SEMESTER_INVALID',
	'INSTANCE_IN_USE',
	'INSTANCE_NOT_FOUND',
	'PART_NOT_FOUND',
	'PART_INVALID',
	'TOO_MANY_PARTS',
	'NO_SIBLING_TRACKS',
	'NOT_SHARED_ACROSS_TRACKS',
	'PROGRAMME_NOT_FOUND',
	'SAME_SEMESTER',
	'SEMESTER_OUT_OF_RANGE'
]);

/** What is shown when the error is none of the known ones. */
export const GENERIC_MESSAGE = 'Das hat nicht geklappt. Bitte später erneut versuchen.';

type GraphQLErrorish = {
	message?: unknown;
	extensions?: { code?: unknown } | null;
};

/**
 * Translates an error thrown by `backendRequest` into something displayable.
 *
 * graphql-request throws a `ClientError` carrying `response.errors`; a network failure throws
 * something else entirely. Both end up here, and both have to become a sentence you can show
 * to a colleague.
 */
export function toRefusal(error: unknown): BackendRefusal {
	for (const entry of graphqlErrors(error)) {
		const code = typeof entry.extensions?.code === 'string' ? entry.extensions.code : '';
		const message = typeof entry.message === 'string' ? entry.message.trim() : '';

		if (PASS_THROUGH.has(code) && message) {
			return { code, message };
		}
		if (code) {
			// Known code, unknown text (or the other way round): the code helps when searching
			// the log, the text stays generic.
			return { code, message: GENERIC_MESSAGE };
		}
	}
	return { code: 'UNKNOWN', message: GENERIC_MESSAGE };
}

/**
 * The HTTP status the backend refused under — or `undefined` when it did not answer at all.
 *
 * Needed because the refusals from `internal/auth` all carry the same code `UNAUTHENTICATED`,
 * and the difference between "there is no account for this login" (401) and "I cannot check
 * anybody right now, the database is restarting" (503) sits exactly in the status. Without
 * that distinction a deploy turns into a wave of people who believe their access is gone.
 */
export function httpStatusOf(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') return undefined;
	const status = (error as { response?: { status?: unknown } }).response?.status;
	return typeof status === 'number' ? status : undefined;
}

/** Digs the GraphQL error list out of whatever graphql-request threw. */
function graphqlErrors(error: unknown): GraphQLErrorish[] {
	if (!error || typeof error !== 'object') return [];

	const response = (error as { response?: { errors?: unknown } }).response;
	if (!response || !Array.isArray(response.errors)) return [];

	return response.errors.filter(
		(entry): entry is GraphQLErrorish => !!entry && typeof entry === 'object'
	);
}
