import type { Phase } from '$lib/gql/__generated__/graphql';

/**
 * Which semester is being planned and where it stands — what the layout loads for the
 * "Jetzt dran" card. Outside `$lib/server` because the card renders it; the loader is
 * `loadPlanningState` in `$lib/server/planning.ts`.
 */
export type PlanningState =
	/** The dean's office has named a planning semester. */
	| { kind: 'set'; code: string; phase: Phase }
	/** Nobody has said yet. A real state with a step of its own, not a failure. */
	| { kind: 'unset' }
	/** The backend did not answer. The card says nothing rather than something wrong. */
	| { kind: 'unknown' };
