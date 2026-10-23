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

/**
 * What I have stated about myself, for "Dein Stand" (`$lib/setup.ts`).
 *
 * Only own rows: membership, the competence minimum per own group, and whether I have stated my
 * hours. The hours of every semester rather than the planning semester's, so one round trip
 * answers both — there are a handful per person.
 */
const OwnSetupDocument = graphql(`
	query OwnSetup {
		planningSemester {
			code
			phase
			desiredHoursFrozenAt
		}
		mySubjectGroups {
			id
			name
			modules {
				compulsory
			}
		}
		myCompetenceStatus {
			subjectGroup {
				id
			}
			canTeachCompulsory
			minimum
		}
		myDesiredTeachingHours {
			semester
		}
	}
`);

async function loadOverview() {
	try {
		const data = await backendRequest(StartOverviewDocument);
		return { programmes: data.programmes, subjectGroups: data.subjectGroups };
	} catch {
		// The start page is where somebody lands when something is wrong, so it must not fail on
		// an overview. "No account" never gets here — the root layout has already answered that —
		// and an unreachable backend is said once, in the backend card further down.
		return null;
	}
}

/** Separate from the overview, so that either can fail and only its own card goes. */
async function loadSetup() {
	try {
		const data = await backendRequest(OwnSetupDocument);
		const planning = data.planningSemester;
		return {
			subjectGroups: data.mySubjectGroups,
			competenceStatus: data.myCompetenceStatus,
			semester: planning
				? {
						code: planning.code,
						phase: planning.phase,
						frozen: !!planning.desiredHoursFrozenAt,
						stated: data.myDesiredTeachingHours.some((h) => h.semester === planning.code)
					}
				: null
		};
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async () => {
	const [overview, setup] = await Promise.all([loadOverview(), loadSetup()]);
	return { overview, setup };
};
