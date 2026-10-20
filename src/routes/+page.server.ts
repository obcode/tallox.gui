import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import type { PageServerLoad } from './$types';

/**
 * Who leads which programme and which subject group, for everybody.
 *
 * Both fields need an account and no role, through either door. The modules come along so the
 * page can unfold them without a second round trip.
 */
const StartOverviewDocument = graphql(`
	query StartOverview {
		programmes {
			code
			title
			leads {
				id
				name
				mail
			}
		}
		subjectGroups {
			id
			code
			name
			moduleCount
			leads {
				id
				name
				mail
			}
			modules {
				id
				name
				homeProgrammeCode
			}
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(StartOverviewDocument);
		return { overview: { programmes: data.programmes, subjectGroups: data.subjectGroups } };
	} catch {
		// The start page is where somebody lands when something is wrong, so it must not fail on
		// an overview. "No account" never gets here — the root layout has already answered that —
		// and an unreachable backend is said once, in the backend card further down.
		return { overview: null };
	}
};
