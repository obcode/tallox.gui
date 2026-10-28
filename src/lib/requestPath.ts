/**
 * Whether a request path is one this application refuses to look at.
 *
 * A path that begins with `//` is read by a browser as a protocol-relative URL — `//evil.example`
 * is "the host evil.example", not "the directory // on this host". SvelteKit's `use:enhance`
 * follows such a path after a form action (GHSA-pfhg-q3qv-9q6r, fixed in Kit 3). Nothing here
 * has a catch-all route for it to reach, so today it is not exploitable; it is refused all the
 * same, because "today" is the kind of word the next route does not read.
 */
export function isRefusedPath(pathname: string): boolean {
	return pathname.startsWith('//');
}
