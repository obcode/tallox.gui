import type { Phase } from '$lib/gql/__generated__/graphql';

/**
 * How far the demand releases of a semester have got: `released` of the `planned` study programmes.
 * Counts programmes, never anything about wishes — readable by everybody, like the releases.
 */
export type DemandRelease = { released: number; planned: number };

/**
 * Which semester is being planned and where it stands — what the layout loads for the
 * "Jetzt dran" card. Outside `$lib/server` because the card renders it; the loader is
 * `loadPlanningState` in `$lib/server/planning.ts`.
 */
export type PlanningState =
	/**
	 * The dean's office has named a planning semester.
	 *
	 * `release` says how many of the planned study programmes have released their demand for
	 * wishes. Absent where a page builds this state from a query of its own that does not ask.
	 */
	| { kind: 'set'; code: string; phase: Phase; release?: DemandRelease }
	/** Nobody has said yet. A real state with a step of its own, not a failure. */
	| { kind: 'unset' }
	/** The backend did not answer. The card says nothing rather than something wrong. */
	| { kind: 'unknown' };
