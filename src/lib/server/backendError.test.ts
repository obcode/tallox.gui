import { describe, expect, it } from 'vitest';
import { ClientError } from 'graphql-request';
import { BackendError, withoutPayload } from './backend';
import { httpStatusOf, toRefusal } from './graphqlError';

/**
 * The exchange stays in backend.ts.
 *
 * graphql-request's ClientError serialises the request and the response into its message. A
 * load that does not catch it becomes a 500 whose message reaches the container log and the
 * error collector — carrying the variables, which here are mail addresses, notes and hours.
 */
describe('withoutPayload', () => {
	const raw = new ClientError(
		{
			status: 422,
			data: { me: { mail: 'prof.eins@example.org' } },
			errors: [{ message: 'Diesen Wunsch gibt es nicht.', extensions: { code: 'WISH_NOT_FOUND' } }]
		} as never,
		{
			query: 'mutation SetWish($note: String) { setWish(note: $note) { id } }',
			variables: { note: 'nur die Vorlesung bitte', mail: 'prof.zwei@example.org' }
		} as never
	);

	it('keeps the status and the errors the interface branches on', () => {
		const got = withoutPayload(raw);

		expect(got).toBeInstanceOf(BackendError);
		expect(httpStatusOf(got)).toBe(422);
		expect(toRefusal(got)).toEqual({
			code: 'WISH_NOT_FOUND',
			message: 'Diesen Wunsch gibt es nicht.',
			generic: false
		});
	});

	it('carries neither the variables, nor the query, nor the response data', () => {
		const got = withoutPayload(raw) as Error;
		const everything = JSON.stringify(got) + got.message + String(got.stack);

		for (const leak of [
			'nur die Vorlesung',
			'prof.zwei',
			'prof.eins',
			'mutation SetWish',
			'variables'
		]) {
			expect(everything).not.toContain(leak);
		}
		expect(got.message).toBe('Diesen Wunsch gibt es nicht.');
	});

	it('leaves an error that is not a ClientError alone', () => {
		const network = new TypeError('fetch failed');
		expect(withoutPayload(network)).toBe(network);
	});
});
