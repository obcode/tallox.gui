import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Where the SWS controlling lived for its first day, before it became the statistics area.
 *
 * Kept as a permanent redirect, query and all: the address was linked from the demand page and
 * may have been sent to somebody, and a link that once worked should go on working.
 */
export const load: PageServerLoad = ({ url }) => {
	redirect(301, `/statistik${url.search}`);
};
