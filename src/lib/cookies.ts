/**
 * The attribute that keeps a cookie off plain HTTP, where the page is served over HTTPS.
 *
 * Neither cookie this application sets in the browser is a secret — the theme, the role
 * narrowing — and the local loop runs over http, where `secure` would make the cookie vanish.
 * So the flag follows the page: on https it is set, on http it is not. Takes the protocol
 * rather than reading `location` so that it can be tested without a window.
 */
export function secureCookieAttribute(protocol: string): string {
	return protocol === 'https:' ? '; secure' : '';
}
