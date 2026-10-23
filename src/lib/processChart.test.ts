import { describe, expect, it } from 'vitest';
import { GUIDE } from './guide';
import {
	CHART_COLUMNS,
	CHART_LANES,
	columnOf,
	isCurrentColumn,
	laneOf,
	processChart
} from './processChart';
import { PHASE_ORDER } from './semester';

const UNSET = { kind: 'unset' } as const;

function place(title: string) {
	for (const phase of processChart(UNSET)) {
		for (const cell of phase.cells) {
			const step = cell.steps.find((s) => s.title === title);
			if (step) return { column: phase.column, lane: cell.lane, step };
		}
	}
	return null;
}

describe('the process chart', () => {
	// The picture is a second view of the per-semester steps, not a selection of them: a step that
	// falls out of it, or shows up twice, makes the two answers to "what happens when" disagree.
	it('shows every per-semester step exactly once, and no setup step', () => {
		const shown = processChart(UNSET).flatMap((p) => p.cells.flatMap((c) => c.steps));
		expect(shown.map((s) => s.title).sort()).toEqual(GUIDE[1].steps.map((s) => s.title).sort());
	});

	it('runs from naming the semester through the five phases, in order', () => {
		expect(CHART_COLUMNS).toEqual(['KICKOFF', ...PHASE_ORDER]);
		expect(processChart(UNSET).map((p) => p.column)).toEqual([...CHART_COLUMNS]);
	});

	// Every column has something in it — an empty phase in the picture would claim that nothing
	// happens there.
	it('has something to do in every phase', () => {
		for (const phase of processChart(UNSET)) {
			expect(
				phase.cells.some((c) => c.steps.length > 0),
				phase.column
			).toBe(true);
		}
	});

	// The numbers are the walk-through's, which runs on across both sections, so a click on a box
	// lands on the step it names.
	it('numbers the steps as the walk-through does', () => {
		const offset = GUIDE[0].steps.length;
		GUIDE[1].steps.forEach((step, i) => {
			expect(place(step.title)?.step.number, step.title).toBe(offset + i + 1);
		});
	});

	// The places a reader checks first: who does the demand, the wishes, the assignment, the close.
	it('puts the steps where the process has them', () => {
		expect(place('Das Planungssemester setzen')).toMatchObject({
			column: 'KICKOFF',
			lane: 'DEANS_OFFICE'
		});
		expect(place('Den Bedarf festlegen')).toMatchObject({
			column: 'DEMAND_PLANNING',
			lane: 'PROGRAMME_LEAD'
		});
		expect(place('Interesse bekunden')).toMatchObject({ column: 'WISHES', lane: 'EVERYBODY' });
		expect(place('Die Instanzen besetzen')).toMatchObject({
			column: 'ASSIGNMENT',
			lane: 'SUBJECT_GROUP_LEAD'
		});
		expect(place('Studiengangs-Review')).toMatchObject({
			column: 'REVIEW',
			lane: 'PROGRAMME_LEAD'
		});
		expect(place('Abschließen')).toMatchObject({ column: 'FINAL', lane: 'DEANS_OFFICE' });
	});

	// Only the publications cannot be taken back; marking anything else would tell somebody to be
	// careful where there is nothing to be careful about.
	it('marks exactly the steps that cannot be undone', () => {
		const oneWay = processChart(UNSET)
			.flatMap((p) => p.cells.flatMap((c) => c.steps))
			.filter((s) => s.oneWay)
			.map((s) => s.title);
		expect(oneWay.sort()).toEqual([
			'Die Wunsch-SWS einfrieren, prüfen und veröffentlichen',
			'Die Wünsche veröffentlichen',
			'Die Zuteilung veröffentlichen'
		]);
		for (const title of oneWay) {
			const step = GUIDE[1].steps.find((s) => s.title === title);
			expect(step?.text, title).toMatch(/nicht zurücknehmen/);
		}
	});

	it('gives every cell a lane, in lane order', () => {
		for (const phase of processChart(UNSET)) {
			expect(phase.cells.map((c) => c.lane)).toEqual([...CHART_LANES]);
		}
	});

	it('marks where the planning semester stands, and nothing when that is unknown', () => {
		const current = (planning: Parameters<typeof processChart>[0]) =>
			processChart(planning)
				.filter((p) => p.current)
				.map((p) => p.column);

		expect(current({ kind: 'set', code: '2027-SS', phase: 'WISHES' })).toEqual(['WISHES']);
		expect(current(UNSET)).toEqual(['KICKOFF']);
		expect(current({ kind: 'unknown' })).toEqual([]);
		expect(isCurrentColumn('FINAL', { kind: 'set', code: '2027-SS', phase: 'FINAL' })).toBe(true);
	});

	it('derives column and lane from due and who', () => {
		const base = { title: 'x', where: [], text: '' };
		expect(columnOf({ ...base, who: [], due: ['UNSET', 'FINAL'] })).toBe('KICKOFF');
		expect(columnOf({ ...base, who: [], due: ['WISHES'] })).toBe('WISHES');
		expect(columnOf({ ...base, who: [] })).toBe('FINAL');
		expect(laneOf({ ...base, who: [] })).toBe('EVERYBODY');
		expect(laneOf({ ...base, who: ['LECTURER'] })).toBe('EVERYBODY');
		expect(laneOf({ ...base, who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'] })).toBe('PROGRAMME_LEAD');
		expect(() => laneOf({ ...base, who: ['ADMIN'] })).toThrow();
	});
});
