import { graphql } from '$lib/gql/__generated__';
import type { PlanningState } from '$lib/planning';
import { backendRequest } from './backend';

const PlanningSemesterQuery = graphql(`
	query PlanningSemesterPhase {
		planningSemester {
			code
			phase
		}
	}
`);

/**
 * The planning semester's phase, for every page.
 *
 * A query of its own rather than a field on the session query: the session is what tells "no
 * account" from "backend down", and that classification must not start failing because a
 * second field did. Swallows every error for the same reason as `loadServerBuildInfo` — the
 * card hangs on every page, and a deploy in progress must not turn every page into a 500.
 */
export type { PlanningState };

export async function loadPlanningState(): Promise<PlanningState> {
	try {
		const data = await backendRequest(PlanningSemesterQuery);
		const semester = data.planningSemester;
		return semester
			? { kind: 'set', code: semester.code, phase: semester.phase }
			: { kind: 'unset' };
	} catch {
		return { kind: 'unknown' };
	}
}
