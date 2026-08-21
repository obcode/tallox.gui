import { describe, expect, it } from 'vitest';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
import {
	borrowedFromLabel,
	byYear,
	cohortLabel,
	compareWithPrevious,
	demandRows,
	groupsOf,
	hoursLabel,
	partLabel,
	plannedHours,
	previousComparableSemester,
	splitSummary,
	sharingState,
	trackLetters,
	type InstanceLike,
	type ModuleLike
} from './demand';

describe('cohortLabel', () => {
	it('assembles the label the faculty reads', () => {
		expect(cohortLabel('IF', 3, 'A')).toBe('IF3A');
		expect(cohortLabel('IF', 1, '')).toBe('IF1');
	});

	// IF3A and IFA differ by one character and mean different things. A label that quietly left
	// the year out would be read as a name rather than as a gap.
	it('spells out a missing cohort year instead of leaving it out', () => {
		expect(cohortLabel('IF', null, 'A')).toBe('IF?A');
		expect(cohortLabel('IF', undefined, '')).toBe('IF?');
	});
});

describe('partLabel', () => {
	it('names the kind and the hours', () => {
		expect(partLabel({ kind: 'LECTURE', teachingHours: 2 })).toBe('Vorlesung 2 SWS');
		expect(partLabel({ kind: 'LAB', teachingHours: 2.5 })).toBe('Praktikum 2,5 SWS');
	});

	// Zero is a statement — this part credits nobody with anything — and it is not the same
	// statement as "nobody has said yet", which is the ordinary state of a fresh declaration.
	it('says when nobody has stated the hours rather than showing a zero', () => {
		expect(partLabel({ kind: 'LAB', teachingHours: null })).toBe('Praktikum (SWS offen)');
	});
});

describe('hoursLabel', () => {
	it('renders whole numbers without decimals', () => {
		expect(hoursLabel(8)).toBe('8 SWS');
		expect(hoursLabel(2.5)).toBe('2,5 SWS');
	});
});

describe('borrowedFromLabel', () => {
	it('names the cohort that holds the part', () => {
		expect(borrowedFromLabel('IF', 'A')).toBe('IF…A');
	});

	// Halfway through splitting one cohort into two the sibling has no letter yet. Inventing one
	// would be worse than saying less.
	it('says less when the sibling has no letter yet', () => {
		expect(borrowedFromLabel('IF', '')).toBe('einem anderen Zug');
	});
});

// A module of the catalogue, with only what the table reads.
function module(id: string, overrides: Partial<ModuleLike> = {}): ModuleLike {
	return {
		id,
		name: `Modul ${id}`,
		practicalKind: 'LAB',
		splitIsEstimated: true,
		plannable: true,
		components: [],
		proposedComponents: [
			{ kind: 'LECTURE', teachingHours: 2 },
			{ kind: 'LAB', teachingHours: 2 }
		],
		programmeSemester: 1,
		...overrides
	};
}

function instance(
	moduleId: string,
	track: string,
	groups: number,
	overrides: Partial<InstanceLike> = {}
): InstanceLike {
	const parts: { kind: InstancePartKind; teachingHours: number; sharedAcrossTracks: boolean }[] = [
		{ kind: 'LECTURE', teachingHours: 2, sharedAcrossTracks: false }
	];
	for (let i = 0; i < groups; i++) {
		parts.push({ kind: 'LAB', teachingHours: 2, sharedAcrossTracks: false });
	}
	return {
		id: `${moduleId}-${track}`,
		track,
		programmeSemester: 1,
		teachingHours: 2 + groups * 2,
		module: { id: moduleId },
		parts,
		borrowedParts: [],
		...overrides
	};
}

describe('groupsOf', () => {
	it('counts the parts of the practical kind', () => {
		expect(groupsOf(instance('m', '', 3).parts, 'LAB')).toBe(3);
	});

	// A lecture held for both cohorts is neither a group nor this cohort's, and counting it would
	// put a number in the stepper that nobody set.
	it('does not count a part held for the sibling cohorts', () => {
		const parts = [
			{ kind: 'LAB' as const, teachingHours: 2, sharedAcrossTracks: false },
			{ kind: 'LAB' as const, teachingHours: 2, sharedAcrossTracks: true }
		];
		expect(groupsOf(parts, 'LAB')).toBe(1);
	});

	// A module that is nothing but a lecture has no practical unit, and the stepper is not shown.
	it('counts nothing where there is no practical kind', () => {
		expect(groupsOf(instance('m', '', 2).parts, null)).toBe(0);
	});
});

describe('demandRows', () => {
	it('shows the cohorts a module is planned in', () => {
		const rows = demandRows(
			[module('m')],
			[instance('m', 'A', 3), instance('m', 'B', 2)],
			[],
			'2026-WS'
		);
		expect(rows[0].planned).toBe(true);
		expect(rows[0].tracks).toEqual([
			{
				track: 'A',
				groups: 3,
				instanceId: 'm-A',
				borrowedKinds: [],
				lecturePartId: undefined,
				sharedPartId: undefined
			},
			{
				track: 'B',
				groups: 2,
				instanceId: 'm-B',
				borrowedKinds: [],
				lecturePartId: undefined,
				sharedPartId: undefined
			}
		]);
		expect(rows[0].teachingHours).toBe(14);
	});

	// The takeover, as a prefilled row rather than a button: what the module had a year ago,
	// marked as a proposal, and worth nothing until somebody saves it.
	it('proposes what the previous comparable semester had', () => {
		const rows = demandRows([module('m')], [], [instance('m', '', 2)], '2026-WS');
		expect(rows[0].planned).toBe(false);
		expect(rows[0].proposedFrom).toBe('2026-WS');
		expect(rows[0].tracks).toEqual([{ track: '', groups: 2, borrowedKinds: [] }]);
		// A proposal costs the faculty nothing, because it is not planned.
		expect(rows[0].teachingHours).toBe(0);
	});

	it('leaves a module nobody has planned or had before empty', () => {
		const rows = demandRows([module('m')], [], [], '2026-WS');
		expect(rows[0].tracks).toEqual([]);
		expect(rows[0].proposedFrom).toBeUndefined();
	});

	// What is planned wins over what was: somebody who has already changed this semester must not
	// see last year's numbers back.
	it('prefers this semester over the previous one', () => {
		const rows = demandRows(
			[module('m')],
			[instance('m', '', 1)],
			[instance('m', '', 3)],
			'2026-WS'
		);
		expect(rows[0].tracks[0].groups).toBe(1);
	});
});

describe('trackLetters', () => {
	// One cohort has no letter: IF1 rather than IF1A, which is what the faculty says.
	it('gives a single cohort no letter', () => {
		expect(trackLetters(1)).toEqual(['']);
	});

	it('letters two or more', () => {
		expect(trackLetters(2)).toEqual(['A', 'B']);
		expect(trackLetters(3)).toEqual(['A', 'B', 'C']);
	});

	// Raising the number must not rename what is there — the letters people already say out loud.
	it('keeps the letters that exist', () => {
		expect(trackLetters(3, ['A', 'B'])).toEqual(['A', 'B', 'C']);
		expect(trackLetters(2, ['A', 'B', 'C'])).toEqual(['A', 'B']);
	});

	// The one rename that has to happen: a cohort with no letter beside a second one.
	it('letters an unlettered cohort when a second appears', () => {
		expect(trackLetters(2, [''])).toEqual(['A', 'B']);
	});

	// Two cohorts of one module are two instances of one identity, and the backend refuses the
	// whole save for it. Filling the free slots by position produced exactly that as soon as the
	// letters in use were not A, B, C from the start.
	it('never proposes a letter that is already in use', () => {
		expect(trackLetters(3, ['B', 'C'])).toEqual(['B', 'C', 'A']);
		expect(trackLetters(2, ['B'])).toEqual(['B', 'A']);
		expect(new Set(trackLetters(4, ['C'])).size).toBe(4);
	});

	it('keeps a single cohort as it is', () => {
		expect(trackLetters(1, ['A'])).toEqual(['A']);
		expect(trackLetters(0)).toEqual([]);
	});
});

describe('byYear', () => {
	it('groups by cohort year and sums the hours', () => {
		const rows = demandRows(
			[module('m'), module('n', { programmeSemester: 3 })],
			[instance('m', '', 2), instance('n', '', 1, { programmeSemester: 3 })],
			[],
			'2026-WS'
		);
		const groups = byYear(rows);
		expect(groups.map((g) => g.programmeSemester)).toEqual([1, 3]);
		expect(groups[0].teachingHours).toBe(6);
		expect(groups[1].teachingHours).toBe(4);
	});

	it('puts the rows without a year last', () => {
		const rows = demandRows(
			[module('m', { programmeSemester: null }), module('n')],
			[],
			[],
			'2026-WS'
		);
		expect(byYear(rows).map((g) => g.programmeSemester)).toEqual([1, null]);
	});
});

describe('compareWithPrevious', () => {
	it('counts the modules that came and went, and the hours', () => {
		const now = [instance('a', '', 2), instance('b', '', 1)];
		const before = [instance('a', '', 1), instance('c', '', 1)];
		expect(compareWithPrevious(now, before)).toEqual({
			added: 1,
			removed: 1,
			hoursBefore: 8,
			hoursAfter: 10
		});
	});
});

describe('previousComparableSemester', () => {
	// The same term a year earlier, never the semester immediately before: 89 modules of the real
	// catalogue run only in the winter, and prefilling a summer from the winter before it would
	// propose a list of modules that cannot run.
	it('is the same term a year earlier', () => {
		expect(previousComparableSemester('2027-SS')).toBe('2026-SS');
		expect(previousComparableSemester('2026-WS')).toBe('2025-WS');
	});

	it('answers nothing for a code that is not one', () => {
		expect(previousComparableSemester('WS 2026')).toBe('');
	});
});

describe('sharingState', () => {
	const rowOf = (tracks: { track: string; groups: number; parts: InstanceLike['parts'] }[]) =>
		demandRows(
			[module('m')],
			tracks.map((t, i) => ({
				id: `m-${i}`,
				track: t.track,
				programmeSemester: 1,
				teachingHours: 4,
				module: { id: 'm' },
				parts: t.parts,
				borrowedParts: []
			})),
			[],
			'2026-WS'
		)[0];

	const lecture = (id: string, shared = false) => ({
		id,
		kind: 'LECTURE' as const,
		teachingHours: 2,
		sharedAcrossTracks: shared
	});
	const lab = { id: 'lab', kind: 'LAB' as const, teachingHours: 2, sharedAcrossTracks: false };

	// With one cohort there is nobody to share with, and the backend says so too.
	it('offers nothing for a module that runs once', () => {
		expect(sharingState(rowOf([{ track: '', groups: 1, parts: [lecture('a'), lab] }]))).toEqual({});
	});

	it('offers the first cohort’s lecture for merging', () => {
		const state = sharingState(
			rowOf([
				{ track: 'A', groups: 1, parts: [lecture('a'), lab] },
				{ track: 'B', groups: 1, parts: [lecture('b'), lab] }
			])
		);
		expect(state).toEqual({ mergeablePartId: 'a' });
	});

	// Once it is shared, what is offered is the way back — sharing is a judgement that gets
	// revised, and the undo has to be as easy as the merge.
	it('offers the shared lecture for splitting again', () => {
		const state = sharingState(
			rowOf([
				{ track: 'A', groups: 1, parts: [lecture('a', true), lab] },
				{ track: 'B', groups: 1, parts: [lab] }
			])
		);
		expect(state).toEqual({ sharedPartId: 'a' });
	});
});

describe('plannedHours', () => {
	const split = [
		{ kind: 'LECTURE' as const, teachingHours: 4 },
		{ kind: 'LAB' as const, teachingHours: 2 }
	];

	// The number the faculty pays: a six-hour module with two laboratory groups is eight hours of
	// teaching, not six. Summing the module's own figure is the plausible-looking wrong answer.
	it('multiplies the practical unit by the groups', () => {
		expect(plannedHours(split, 'LAB', [{ groups: 2 }])).toBe(8);
		expect(plannedHours(split, 'LAB', [{ groups: 1 }])).toBe(6);
	});

	it('adds up over the cohorts', () => {
		expect(plannedHours(split, 'LAB', [{ groups: 3 }, { groups: 2 }])).toBe(10 + 8);
	});

	// A lecture held once for both cohorts is counted at the cohort that holds it and nowhere
	// else. Counting it twice is exactly the mistake the shared part exists to prevent.
	it('does not count what a sibling cohort holds', () => {
		expect(
			plannedHours(split, 'LAB', [{ groups: 1 }, { groups: 1, borrowedKinds: ['LECTURE'] }])
		).toBe(6 + 2);
	});

	it('is nothing without a split', () => {
		expect(plannedHours([], 'LAB', [{ groups: 2 }])).toBe(0);
	});

	// A module that is nothing but a lecture has no practical unit, so the figure multiplies
	// nothing and the lecture is counted once.
	it('ignores the groups where there is no practical unit', () => {
		expect(plannedHours([{ kind: 'LECTURE', teachingHours: 4 }], null, [{ groups: 3 }])).toBe(4);
	});
});

describe('splitSummary', () => {
	it('writes the unit once, at the end', () => {
		expect(
			splitSummary([
				{ kind: 'LECTURE', teachingHours: 4 },
				{ kind: 'LAB', teachingHours: 2 }
			])
		).toBe('Vorlesung 4 + Praktikum 2 SWS');
	});

	it('marks a part with no hours as a gap rather than a zero', () => {
		expect(splitSummary([{ kind: 'LAB', teachingHours: null }])).toBe('Praktikum ? SWS');
	});

	it('is empty for a module with nothing to show', () => {
		expect(splitSummary([])).toBe('');
	});
});
