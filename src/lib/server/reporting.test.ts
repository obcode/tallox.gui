import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/sveltekit';
import { stripIdentityHeaders } from './reporting';

describe('stripIdentityHeaders', () => {
	it('removes the identity the proxy set, whatever its case', () => {
		const event = {
			request: {
				headers: {
					'X-Remote-User': 'prof.eins@example.org',
					'x-remote-displayname': 'Prof. Eins',
					'x-remote-department': 'FK07',
					cookie: '_oauth2_proxy=…',
					authorization: 'Bearer tallox_…',
					'user-agent': 'Mozilla/5.0',
					accept: 'text/html'
				}
			}
		} as unknown as ErrorEvent;

		const got = stripIdentityHeaders(event);

		expect(got.request?.headers).toEqual({ 'user-agent': 'Mozilla/5.0', accept: 'text/html' });
	});

	it('leaves an event without a request alone', () => {
		const event = { message: 'x' } as ErrorEvent;
		expect(stripIdentityHeaders(event)).toBe(event);
	});
});
