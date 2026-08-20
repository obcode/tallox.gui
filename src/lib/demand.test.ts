import { describe, expect, it } from 'vitest';
import {
	borrowedFromLabel,
	byCohortYear,
	cohortLabel,
	hasSibling,
	hoursLabel,
	nextTrack,
	partLabel
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

describe('hasSibling', () => {
	const a = { id: '1', track: 'A', module: { id: 'm' } };
	const b = { id: '2', track: 'B', module: { id: 'm' } };
	const other = { id: '3', track: '', module: { id: 'n' } };

	it('finds another cohort of the same module', () => {
		expect(hasSibling(a, [a, b, other])).toBe(true);
	});

	it('does not count a different module or the instance itself', () => {
		expect(hasSibling(other, [a, b, other])).toBe(false);
		expect(hasSibling(a, [a])).toBe(false);
	});
});

describe('nextTrack', () => {
	// The first duplication of a single cohort proposes B, which is what turns IF1 into IF1A and
	// IF1B in one act.
	it('proposes B for a module that runs once', () => {
		const only = { id: '1', track: '', module: { id: 'm' } };
		expect(nextTrack(only, [only])).toBe('B');
	});

	it('skips the letters already taken', () => {
		const a = { id: '1', track: 'A', module: { id: 'm' } };
		const b = { id: '2', track: 'B', module: { id: 'm' } };
		expect(nextTrack(a, [a, b])).toBe('C');
	});

	it('ignores the cohorts of other modules', () => {
		const a = { id: '1', track: 'A', module: { id: 'm' } };
		const foreign = { id: '2', track: 'B', module: { id: 'n' } };
		expect(nextTrack(a, [a, foreign])).toBe('B');
	});
});

describe('byCohortYear', () => {
	const first = { id: '1', track: 'A', programmeSemester: 1, module: { id: 'm' } };
	const third = { id: '2', track: '', programmeSemester: 3, module: { id: 'n' } };
	const unfiled = { id: '3', track: '', programmeSemester: null, module: { id: 'o' } };

	it('groups by year, lowest first', () => {
		const groups = byCohortYear([third, first]);
		expect(groups.map((g) => g.programmeSemester)).toEqual([1, 3]);
		expect(groups[0].instances).toEqual([first]);
	});

	// The ones nobody has filed yet are the work still to do. A list that opened with them would
	// read as a list of problems.
	it('puts the instances without a year last', () => {
		const groups = byCohortYear([unfiled, first]);
		expect(groups.map((g) => g.programmeSemester)).toEqual([1, null]);
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
