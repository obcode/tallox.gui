import { error } from '@sveltejs/kit';
import { advanceSemesters } from '$lib/advanceWishes';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { PageServerLoad } from './$types';

/**
 * The advance wishes („Vormerkungen“) of a coming semester, for the people who plan it: who has
 * noted down which module, before the demand is settled.
 *
 * The rows arrive through the wish rule — the leads read the programmes and subject groups they
 * lead, the dean's office everything, and nobody anything through a plain token. Not on the
 * colleague's own page, because a lead noting something down there must not read the others'.
 * No count anywhere: a list of names is what the rule allows, a number is the leak.
 */
const AdvanceWishOverviewDocument = graphql(`
	query AdvanceWishOverview($semester: String!) {
		advanceWishes(semester: $semester) {
			id
			priority
			note
			maxTracks
			status
			person {
				name
				mail
			}
			programme {
				code
			}
			module {
				id
				name
			}
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	const semesters = advanceSemesters(new Date());
	const asked = url.searchParams.get('semester') ?? '';
	const semester = semesters.includes(asked) ? asked : semesters[0];
	try {
		const data = await backendRequest(AdvanceWishOverviewDocument, { semester });
		return { semester, semesters, rows: data.advanceWishes };
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};
