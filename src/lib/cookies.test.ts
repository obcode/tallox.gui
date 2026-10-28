import { describe, expect, it } from 'vitest';
import { secureCookieAttribute } from './cookies';

describe('secureCookieAttribute', () => {
	it('marks the cookie secure on https', () => {
		expect(secureCookieAttribute('https:')).toBe('; secure');
	});
	it('does not on http, where the local loop runs', () => {
		expect(secureCookieAttribute('http:')).toBe('');
	});
});
