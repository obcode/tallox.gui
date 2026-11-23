import * as env from '$app/env/public';
import { examples, tokenEndpoint } from '#lib/apiExamples.ts';
import type { PageServerLoad } from './$types';

/**
 * The route is called `/api-doku` and not `/api`.
 *
 * `/api/graphql` is the machine API, which Caddy does not forward to the GUI. A GUI path right
 * next to it works today — the matcher is exact — and would break precisely when somebody
 * generalises it to `/api/*`. The price is a hyphen in the path; what it buys is that the two
 * namespaces never touch.
 */
export const load: PageServerLoad = async () => {
	// Resolved on the server so the page carries the URL in the first HTML: anybody wanting to
	// copy it should not have to wait for JavaScript to load.
	const endpoint = tokenEndpoint(env.PUBLIC_TALLOX_SERVER ?? '');

	return {
		endpoint,
		examples: examples(endpoint)
	};
};
