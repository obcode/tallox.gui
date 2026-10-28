import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '$env/dynamic/private';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { ClientError, GraphQLClient, type Variables } from 'graphql-request';
import { assumeHeaderValue } from '$lib/assumedRoles';

/**
 * The identity of the running request.
 *
 * Why AsyncLocalStorage rather than threading `event.locals` through: the SSR hop runs
 * container-internally against `http://tallox-api:8080/query` and therefore bypasses the auth
 * proxy. The backend sees no X-Remote-User unless we send it ourselves. Threading it through
 * the signature of every load() function and every /gui-api handler would be a change in
 * dozens of places — and one forgotten place would be a silent authorization failure.
 */
export type AuthContext = {
	remoteUser?: string;
	remoteDisplayname?: string;
	/**
	 * The role narrowing from the cookie, see $lib/assumedRoles.
	 *
	 * `undefined` means "not narrowed", an empty array means "narrowed to no role at all".
	 * These are different states and travel to the backend as "no header" and "header with an
	 * empty value" respectively.
	 */
	assumedRoles?: string[];
};

export const authContext = new AsyncLocalStorage<AuthContext>();

function serverUrl(): string {
	// NEVER let this point at the public URL: the SSR process has no OIDC cookie and would get
	// the IdP's login page back as HTML. The symptom is then a 500 on an arbitrary page, not a
	// 401.
	return env.TALLOX_SERVER || 'http://localhost:8080/query';
}

/**
 * The GraphQL client for the current request.
 *
 * Headers are always built FROM SCRATCH, never copied from the incoming request. An
 * Authorization or X-Remote header sent by the client must never be forwarded to the backend.
 */
export function backendClient(ctx?: AuthContext): GraphQLClient {
	const { remoteUser, remoteDisplayname, assumedRoles } = ctx ?? authContext.getStore() ?? {};

	const headers: Record<string, string> = {};
	if (remoteUser) headers['X-Remote-User'] = remoteUser;
	if (remoteDisplayname) headers['X-Remote-Displayname'] = remoteDisplayname;

	// The only header here that concerns permissions and still does not come from the proxy.
	// That is fine because it can only take away: the backend intersects the selection with the
	// roles actually held. The empty string is a valid value meaning "judge me as somebody with
	// no role at all" — hence the check against undefined rather than for truthiness.
	const assume = assumeHeaderValue(assumedRoles);
	if (assume !== undefined) headers['X-Tallox-Assume-Roles'] = assume;

	return new GraphQLClient(serverUrl(), { headers });
}

/**
 * Shorthand for the normal case: a request with the identity of the running request.
 *
 * Deliberately takes only a `TypedDocumentNode` from `$lib/gql/__generated__`, never a string.
 * The result type therefore comes from the document itself — a `<T>` written by hand next to it
 * is only an assertion, and goes quietly wrong at the next schema change.
 */
export function backendRequest<TResult, TVariables extends Variables>(
	document: TypedDocumentNode<TResult, TVariables>,
	variables?: TVariables
): Promise<TResult> {
	// The cast widens the variables type parameter and nothing else. graphql-request uses a
	// conditional type to decide whether `variables` is required, and that cannot be resolved
	// for a TVariables that is still generic. The outward signature stays narrow.
	//
	// Deliberately NO parameter for headers: backendClient() builds those from the identity of
	// the request, and a place where a caller can pass some in is the place where a forwarded
	// Authorization header eventually shows up.
	const widened = document as TypedDocumentNode<TResult, Variables>;
	return backendClient()
		.request<TResult>(widened, variables)
		.catch((err: unknown) => {
			throw withoutPayload(err);
		});
}

/** One GraphQL error as the backend sends it: the sentence, and the code the interface branches on. */
export type BackendGraphQLError = {
	message?: string;
	extensions?: { code?: string } | null;
};

/**
 * What a failed backend request throws out of `backendRequest`.
 *
 * graphql-request's own `ClientError` carries the whole exchange: the query, the variables,
 * the response data, and a message that is all of that as JSON. Every `load` that does not
 * catch it turns into a 500 whose message goes to the container log and to the error collector
 * — with the variables in it, and the variables are mail addresses, wish notes and desired
 * hours. This type keeps what the interface reads (`response.status`, `response.errors`) and
 * nothing of what the person typed.
 */
export class BackendError extends Error {
	readonly response: { status: number; errors: BackendGraphQLError[] };

	constructor(status: number, errors: BackendGraphQLError[]) {
		super(errors[0]?.message || `backend answered ${status}`);
		this.name = 'BackendError';
		this.response = { status, errors };
	}
}

/**
 * Turns graphql-request's `ClientError` into a `BackendError`, and leaves every other error
 * as it is: a network failure carries no payload of ours.
 */
export function withoutPayload(err: unknown): unknown {
	if (!(err instanceof ClientError)) return err;

	const errors = Array.isArray(err.response.errors) ? err.response.errors : [];
	return new BackendError(
		err.response.status,
		errors.map((e) => ({
			message: typeof e?.message === 'string' ? e.message : undefined,
			extensions:
				e?.extensions && typeof e.extensions.code === 'string' ? { code: e.extensions.code } : null
		}))
	);
}
