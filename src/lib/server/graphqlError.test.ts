import { describe, expect, it } from 'vitest';
import { GENERIC_MESSAGE, httpStatusOf, toRefusal } from './graphqlError';

/** This is how graphql-request throws: an Error carrying a `response.errors` list. */
function clientError(errors: unknown[]): unknown {
	return Object.assign(new Error('GraphQL Error'), { response: { errors } });
}

describe('toRefusal', () => {
	it('passes known refusals through verbatim', () => {
		const refusal = toRefusal(
			clientError([
				{
					message: 'Dieses Token existiert nicht.',
					extensions: { code: 'TOKEN_NOT_FOUND' }
				}
			])
		);

		expect(refusal).toEqual({
			code: 'TOKEN_NOT_FOUND',
			message: 'Dieses Token existiert nicht.',
			// Not generic: the sentence is the backend's own, so a page showing it needs no code
			// beside it.
			generic: false
		});
	});

	it('replaces unknown errors with a generic sentence', () => {
		// The rule from CLAUDE.md: no raw backend error strings on write paths. A uniqueness
		// violation passed through would later reveal that somebody has already registered —
		// hence an allowlist and not a denylist.
		const refusal = toRefusal(
			clientError([
				{
					message:
						'ERROR: duplicate key value violates unique constraint "wish_owner_key" (SQLSTATE 23505)'
				}
			])
		);

		expect(refusal.message).toBe(GENERIC_MESSAGE);
		expect(refusal.message).not.toContain('SQLSTATE');
		expect(refusal.message).not.toContain('unique');
	});

	it('keeps the code but discards the text of an unknown code', () => {
		// The code helps when searching the log; the text has not been reviewed by anybody for
		// display.
		const refusal = toRefusal(
			clientError([{ message: 'table "person" does not exist', extensions: { code: 'INTERNAL' } }])
		);

		expect(refusal.code).toBe('INTERNAL');
		expect(refusal.message).toBe(GENERIC_MESSAGE);
	});

	it('copes with anything that is not a GraphQL error', () => {
		// A network failure throws something else entirely, and even then a displayable sentence
		// has to come out rather than "undefined" on the page.
		for (const thrown of [
			new Error('fetch failed'),
			undefined,
			null,
			'broken',
			{ response: {} },
			{ response: { errors: 'nope' } },
			clientError([]),
			clientError([null])
		]) {
			const refusal = toRefusal(thrown);
			expect(refusal.message).toBe(GENERIC_MESSAGE);
			expect(refusal.code).toBe('UNKNOWN');
		}
	});

	it('takes the first usable refusal', () => {
		const refusal = toRefusal(
			clientError([
				{ message: 'Nicht angemeldet.', extensions: { code: 'UNAUTHENTICATED' } },
				{ message: 'never mind', extensions: { code: 'TOKEN_NOT_FOUND' } }
			])
		);

		expect(refusal.code).toBe('UNAUTHENTICATED');
	});

	it('does not trust a known code with no text', () => {
		const refusal = toRefusal(clientError([{ extensions: { code: 'TOKEN_NOT_FOUND' } }]));
		expect(refusal.message).toBe(GENERIC_MESSAGE);
	});
});

describe('httpStatusOf', () => {
	it('reads the status out of a ClientError', () => {
		expect(httpStatusOf({ response: { status: 401, errors: [] } })).toBe(401);
		expect(httpStatusOf({ response: { status: 503, errors: [] } })).toBe(503);
	});

	it('returns undefined when no answer arrived at all', () => {
		// A network failure has no status, and that is exactly the difference from a refusal: "the
		// backend said no" against "the backend said nothing".
		expect(httpStatusOf(new Error('fetch failed'))).toBeUndefined();
		expect(httpStatusOf(undefined)).toBeUndefined();
		expect(httpStatusOf({ response: {} })).toBeUndefined();
	});

	it('separates "no account" from "cannot check anybody right now"', () => {
		// Both refusals from internal/auth carry the same code UNAUTHENTICATED — the difference
		// sits in the status alone. Without that distinction a deploy turns into a wave of people
		// who believe their access is gone.
		const noAccount = {
			response: { status: 401, errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] }
		};
		const dbRestarting = {
			response: { status: 503, errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] }
		};

		expect(toRefusal(noAccount).code).toBe(toRefusal(dbRestarting).code);
		expect(httpStatusOf(noAccount)).not.toBe(httpStatusOf(dbRestarting));
	});
});

describe('toRefusal, the generic flag', () => {
	// The flag exists so a page can show the code where the sentence says nothing. "Das hat nicht
	// geklappt" on its own is unanswerable — for the person reading it and for whoever they ask
	// about it afterwards.
	it('marks a refusal nobody has worded yet', () => {
		const refusal = toRefusal(clientError([{ message: 'boom', extensions: { code: 'WAT' } }]));
		expect(refusal).toEqual({ code: 'WAT', message: GENERIC_MESSAGE, generic: true });
	});

	it('marks an error with no code at all', () => {
		expect(toRefusal(new Error('network')).generic).toBe(true);
	});
});
