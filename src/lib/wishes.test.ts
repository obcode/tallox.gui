import { describe, expect, it } from 'vitest';
import {
	closedPhaseHint,
	groupByModule,
	isWishPriority,
	myWishByPart,
	othersHint,
	splitByMySubjects,
	wishRowLabel,
	wishesAreOpen,
	WISH_PRIORITIES,
	WISH_PRIORITY_LABELS,
	type OfferedInstance
} from './wishes';

function instance(
	id: string,
	moduleId: string,
	moduleName: string,
	track: string,
	subjectGroup?: string
): OfferedInstance {
	return {
		id,
		track,
		programmeSemester: 3,
		programme: { code: 'IF' },
		module: {
			id: moduleId,
			name: moduleName,
			subjectGroup: subjectGroup ? { id: subjectGroup, code: subjectGroup } : null
		},
		parts: [{ id: `${id}-v`, kind: 'LECTURE', teachingHours: 2 }]
	};
}

describe('the priorities', () => {
	it('has three, most wanted first, and each has a German word', () => {
		expect(WISH_PRIORITIES).toEqual(['FIRST_CHOICE', 'HAPPY_TO', 'IF_NEEDED']);
		for (const p of WISH_PRIORITIES) {
			expect(WISH_PRIORITY_LABELS[p]).toBeTruthy();
		}
	});

	it('guards a value coming back out of a form', () => {
		expect(isWishPriority('HAPPY_TO')).toBe(true);
		expect(isWishPriority('MAYBE')).toBe(false);
	});
});

describe('wishRowLabel', () => {
	it('leads with the cohort, which is what somebody recognises', () => {
		const i = instance('1', 'm', 'Analysis', 'B');
		expect(wishRowLabel(i, i.parts[0])).toBe('IF3B · Vorlesung 2 SWS');
	});
});

describe('groupByModule', () => {
	it('groups the cohorts under their module, in reading order', () => {
		const groups = groupByModule([
			instance('2', 'm2', 'Softwaretechnik', 'A'),
			instance('1b', 'm1', 'Analysis', 'B'),
			instance('1a', 'm1', 'Analysis', 'A')
		]);

		expect(groups.map((g) => g.moduleName)).toEqual(['Analysis', 'Softwaretechnik']);
		expect(groups[0].instances.map((i) => i.track)).toEqual(['A', 'B']);
	});
});

describe('splitByMySubjects', () => {
	it('puts my subjects first and keeps everything else reachable', () => {
		const groups = groupByModule([
			instance('1', 'm1', 'Analysis', '', 'MATHE'),
			instance('2', 'm2', 'Softwaretechnik', '', 'SWE'),
			instance('3', 'm3', 'Noch unsortiert', '')
		]);

		const { mine, others } = splitByMySubjects(groups, ['MATHE']);

		expect(mine.map((g) => g.moduleName)).toEqual(['Analysis']);
		// The rest is not hidden — it is a preselection, not a rule.
		expect(others.map((g) => g.moduleName)).toEqual(['Noch unsortiert', 'Softwaretechnik']);
	});

	it('treats a module in no subject group as nobody’s subject yet', () => {
		const groups = groupByModule([instance('3', 'm3', 'Noch unsortiert', '')]);
		const { mine, others } = splitByMySubjects(groups, ['MATHE']);

		expect(mine).toHaveLength(0);
		expect(others).toHaveLength(1);
	});
});

describe('myWishByPart', () => {
	it('indexes only what was handed in — never a count over anybody', () => {
		const wishes = [
			{
				id: 'w1',
				priority: 'HAPPY_TO' as const,
				note: '',
				person: { mail: 'eins@example.org', name: 'Eins' },
				part: { id: 'p1', kind: 'LECTURE' as const, teachingHours: 2 },
				instance: {
					track: 'A',
					programmeSemester: 3,
					programme: { code: 'IF' },
					module: { id: 'm', name: 'Analysis' }
				}
			}
		];

		const byPart = myWishByPart(wishes);
		expect(byPart.get('p1')?.id).toBe('w1');
		expect(byPart.get('p2')).toBeUndefined();
	});
});

describe('wishesAreOpen', () => {
	it('is open only in the wish phase', () => {
		expect(wishesAreOpen('WISHES')).toBe(true);
		for (const phase of ['DEMAND_PLANNING', 'ASSIGNMENT', 'FINAL', null, undefined]) {
			expect(wishesAreOpen(phase)).toBe(false);
		}
	});

	it('says why, differently for each phase', () => {
		const hints = ['DEMAND_PLANNING', 'ASSIGNMENT', 'FINAL'].map(closedPhaseHint);
		expect(new Set(hints).size).toBe(3);
		for (const hint of hints) {
			expect(hint.length).toBeGreaterThan(10);
		}
	});
});

describe('othersHint', () => {
	it('explains the empty list without saying anything about other people', () => {
		const before = othersHint(null);

		// The sentence that must never appear: an empty list is not "nobody is interested".
		expect(before).not.toMatch(/niemand hat|noch niemand|keine Interess/i);
		expect(before).toMatch(/nicht sichtbar/);
		// And it says the absence covers the number too, because that is the leak people expect
		// to be allowed.
		expect(before).toMatch(/Anzahl/);

		expect(othersHint('2026-10-27T12:00:00Z')).toMatch(/veröffentlicht/);
	});
});
