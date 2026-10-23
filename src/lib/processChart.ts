import type { Phase, Role } from '$lib/gql/__generated__/graphql';
import { GUIDE, type GuideStep } from '$lib/guide';
import type { PlanningState } from '$lib/planning';
import { ROLE_LABELS } from '$lib/roles';
import { PHASE_HINTS, PHASE_LABELS, PHASE_ORDER } from '$lib/semester';

/**
 * The semester as a picture on /ablauf: phases from left to right, roles as lanes, and in each
 * cell the steps that role takes in that phase.
 *
 * Built from `GUIDE` and nothing else, like the table "Wer macht was" — a third answer to "who
 * does what, and when" that is drawn by hand would be the first to go stale. Two things the
 * guide does not say directly are derived here, and the tests pin both:
 *
 * - **The column** is the first phase in `due` that is a phase of the semester being planned.
 *   Naming the planning semester is due while none is named and after the last one was closed;
 *   that is before the semester's own phases begin, and gets a column of its own. The close
 *   has no `due` on purpose (shown as due in the review it would read as "close now"), and is
 *   what the phase FINAL means.
 * - **The lane** is the first role in `who`: the one who does the step, where the others named
 *   may as well. The assignment names the subject group lead first, the demand the programme
 *   lead. A step nobody in particular does is everybody's.
 */

/** A column: the phases of the semester, preceded by naming which one is planned. */
export type ChartColumn = Phase | 'KICKOFF';

/** A lane: a role, or everybody with an account. */
export type ChartLane = Exclude<Role, 'LECTURER' | 'ADMIN' | 'PARTNER_READER'> | 'EVERYBODY';

export type ChartStep = {
	/** The number the step has in the walk-through below, which the chart links to. */
	number: number;
	title: string;
	/** The step cannot be undone. Said in its text, marked in the picture. */
	oneWay: boolean;
};

export type ChartPhase = {
	column: ChartColumn;
	label: string;
	hint: string;
	/** The planning semester stands here: the "hier stehen wir" mark. */
	current: boolean;
	/** One entry per lane, in the order of `CHART_LANES`, empty where the role has nothing to do. */
	cells: { lane: ChartLane; steps: ChartStep[] }[];
};

/**
 * Top to bottom: everybody, then the leads who work with what everybody entered, then the dean's
 * office that switches the phases. The order of `ALL_ROLES`, with the lecturer read as everybody.
 */
export const CHART_LANES: readonly ChartLane[] = [
	'EVERYBODY',
	'SUBJECT_GROUP_LEAD',
	'PROGRAMME_LEAD',
	'DEANS_OFFICE'
];

export const LANE_LABELS: Record<ChartLane, string> = {
	EVERYBODY: 'Alle',
	SUBJECT_GROUP_LEAD: ROLE_LABELS.SUBJECT_GROUP_LEAD,
	PROGRAMME_LEAD: ROLE_LABELS.PROGRAMME_LEAD,
	DEANS_OFFICE: ROLE_LABELS.DEANS_OFFICE
};

export const CHART_COLUMNS: readonly ChartColumn[] = ['KICKOFF', ...PHASE_ORDER];

const KICKOFF_LABEL = 'Auftakt';
const KICKOFF_HINT = 'Das Dekanat sagt, welches Semester als Nächstes geplant wird.';

/** The column a per-semester step sits in. See the module comment. */
export function columnOf(step: GuideStep): ChartColumn {
	if (!step.due) return 'FINAL';
	const phase = step.due.find((p): p is Phase => p !== 'UNSET' && p !== 'FINAL');
	return phase ?? 'KICKOFF';
}

/** The lane a step sits in. See the module comment. */
export function laneOf(step: GuideStep): ChartLane {
	const first = step.who[0];
	if (!first || first === 'LECTURER') return 'EVERYBODY';
	if (first === 'ADMIN' || first === 'PARTNER_READER') {
		// Neither takes part in the semester; a step that names one first belongs to the setup.
		throw new Error(`${step.title}: ${first} has no lane in the semester`);
	}
	return first;
}

/** Whether the planning semester stands in this column. Unknown means nowhere. */
export function isCurrentColumn(column: ChartColumn, planning: PlanningState): boolean {
	if (planning.kind === 'unknown') return false;
	if (planning.kind === 'unset') return column === 'KICKOFF';
	return column === planning.phase;
}

/** The per-semester steps, laid out as phases × lanes. */
export function processChart(planning: PlanningState): ChartPhase[] {
	const [setup, perSemester] = GUIDE;
	const offset = setup.steps.length;
	const steps = perSemester.steps.map((step, i) => ({ step, number: offset + i + 1 }));

	return CHART_COLUMNS.map((column) => ({
		column,
		label: column === 'KICKOFF' ? KICKOFF_LABEL : PHASE_LABELS[column],
		hint: column === 'KICKOFF' ? KICKOFF_HINT : PHASE_HINTS[column],
		current: isCurrentColumn(column, planning),
		cells: CHART_LANES.map((lane) => ({
			lane,
			steps: steps
				.filter(({ step }) => columnOf(step) === column && laneOf(step) === lane)
				.map(({ step, number }) => ({ number, title: step.title, oneWay: step.oneWay ?? false }))
		}))
	}));
}
