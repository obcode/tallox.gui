import { describe, expect, it } from 'vitest';
import type { ReadInstanceLike } from './demand';
import {
	closedPhaseHint,
	cohortIn,
	isWishChoice,
	isWishPriority,
	myWishByInstance,
	openPhaseHint,
	othersByInstance,
	othersHint,
	savedHint,
	splitByMySubjects,
	studyGroupLabel,
	trackColumns,
	trackHeading,
	wishChanges,
	wishRowLabel,
	wishRows,
	wishesAreOpen,
	WISH_PRIORITIES,
	WISH_PRIORITY_LABELS,
	type StoredWish,
	type WishEntry,
	type WishLike,
	type WishModule
} from './wishes';

function instance(
	id: string,
	moduleId: string,
	moduleName: string,
	track: string,
	subjectGroup?: string
): ReadInstanceLike<WishModule> {
	return {
		id,
		track,
		programmeSemester: 3,
		teachingHours: 4,
		programme: { code: 'IF' },
		module: {
			id: moduleId,
			name: moduleName,
			subjectGroup: subjectGroup ? { id: subjectGroup, code: subjectGroup } : null
		},
		parts: [{ id: `${id}-v`, kind: 'LECTURE', teachingHours: 2 }]
	};
}

function wish(id: string, instanceId: string, mail: string, name: string): WishLike {
	return {
		id,
		priority: 'HAPPY_TO',
		note: '',
		person: { mail, name },
		instance: {
			id: instanceId,
			track: 'A',
			programmeSemester: 3,
			programme: { code: 'IF' },
			module: { id: 'm', name: 'Analysis' }
		}
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

	it('accepts the empty choice as a cell value but not as a priority', () => {
		// The fourth option of every cell. It is how a wish is withdrawn, so it has to pass the
		// form guard — and it is not a level, so it must not pass the one the mutation uses.
		expect(isWishChoice('')).toBe(true);
		expect(isWishPriority('')).toBe(false);
		expect(isWishChoice('MAYBE')).toBe(false);
	});
});

describe('wishRowLabel', () => {
	it('leads with the cohort, which is what somebody recognises', () => {
		expect(wishRowLabel(wish('w', 'i', 'eins@example.org', 'Eins').instance)).toBe(
			'IF3A · Analysis'
		);
	});
});

describe('the table', () => {
	it('is one row per module with its cohorts inside, in reading order', () => {
		const rows = wishRows([
			instance('2', 'm2', 'Softwaretechnik', 'A'),
			instance('1b', 'm1', 'Analysis', 'B'),
			instance('1a', 'm1', 'Analysis', 'A')
		]);

		expect(rows.map((r) => r.module.name)).toEqual(['Analysis', 'Softwaretechnik']);
		expect(rows[0].cohorts.map((c) => c.track)).toEqual(['A', 'B']);
	});

	it('has a column for every track that occurs, and a heading for the single-cohort one', () => {
		const rows = wishRows([
			instance('1', 'm1', 'Analysis', 'B'),
			instance('2', 'm1', 'Analysis', 'A'),
			instance('3', 'm2', 'Projektstudium', '')
		]);

		expect(trackColumns(rows)).toEqual(['', 'A', 'B']);
		expect(trackHeading('A')).toBe('Zug A');
		// Not "Zug " with nothing after it — that reads as a missing value, and it is not missing.
		expect(trackHeading('')).toBe('Zug');
	});

	it('finds the cohort in a column, and nothing where the module does not run', () => {
		const [row] = wishRows([instance('1', 'm1', 'Analysis', 'A')]);

		expect(cohortIn(row, 'A')?.instanceId).toBe('1');
		expect(cohortIn(row, 'B')).toBeUndefined();
	});

	it('names the cohorts of a row the way the old table did', () => {
		const [row] = wishRows([
			instance('1a', 'm1', 'Analysis', 'A'),
			instance('1b', 'm1', 'Analysis', 'B')
		]);

		expect(studyGroupLabel(row)).toBe('IF3A / IF3B');
	});
});

describe('splitByMySubjects', () => {
	it('puts my subjects first and keeps everything else reachable', () => {
		const rows = wishRows([
			instance('1', 'm1', 'Analysis', '', 'MATHE'),
			instance('2', 'm2', 'Softwaretechnik', '', 'SWE'),
			instance('3', 'm3', 'Noch unsortiert', '')
		]);

		const { mine, others } = splitByMySubjects(rows, ['MATHE']);

		expect(mine.map((r) => r.module.name)).toEqual(['Analysis']);
		// The rest is not hidden — it is a preselection, not a rule.
		expect(others.map((r) => r.module.name)).toEqual(['Noch unsortiert', 'Softwaretechnik']);
	});

	it('treats a module in no subject group as nobody’s subject yet', () => {
		const rows = wishRows([instance('3', 'm3', 'Noch unsortiert', '')]);
		const { mine, others } = splitByMySubjects(rows, ['MATHE']);

		expect(mine).toHaveLength(0);
		expect(others).toHaveLength(1);
	});
});

describe('myWishByInstance', () => {
	it('indexes only what was handed in — never a count over anybody', () => {
		const byInstance = myWishByInstance([wish('w1', 'i1', 'eins@example.org', 'Eins')]);

		expect(byInstance.get('i1')?.id).toBe('w1');
		expect(byInstance.get('i2')).toBeUndefined();
	});
});

describe('othersByInstance', () => {
	it('drops the caller’s own rows and keeps the names of the rest', () => {
		const byInstance = othersByInstance(
			[
				wish('w1', 'i1', 'eins@example.org', 'Eins'),
				wish('w2', 'i1', 'zwei@example.org', 'Zwei'),
				wish('w3', 'i2', 'drei@example.org', 'Drei')
			],
			'eins@example.org'
		);

		expect(byInstance['i1']?.map((w) => w.person.name)).toEqual(['Zwei']);
		expect(byInstance['i2']?.map((w) => w.person.name)).toEqual(['Drei']);
	});

	it('is empty for an instance nobody else was returned for — which is not a statement', () => {
		// The whole point: before publication the backend returns nothing of anybody else's, so
		// this map is empty. That emptiness is the rule working, and the screen renders words for
		// it rather than a zero.
		const byInstance = othersByInstance(
			[wish('w1', 'i1', 'eins@example.org', 'Eins')],
			'eins@example.org'
		);

		expect(Object.keys(byInstance)).toHaveLength(0);
	});

	it('keeps everybody when the caller is not known', () => {
		// An anonymous render has nothing of its own to drop, and dropping nothing is right.
		const byInstance = othersByInstance([wish('w1', 'i1', 'eins@example.org', 'Eins')], null);
		expect(byInstance['i1']).toHaveLength(1);
	});
});

describe('wishChanges', () => {
	const stored = (instanceId: string, priority: StoredWish['priority'], note = ''): StoredWish => ({
		id: `w-${instanceId}`,
		instanceId,
		priority,
		note
	});
	const entry = (instanceId: string, priority: WishEntry['priority'], note = ''): WishEntry => ({
		instanceId,
		priority,
		note
	});

	it('produces nothing for the cells nobody touched', () => {
		// The ordinary case, and the one that keeps a save from being several hundred mutations:
		// nearly every cell of the table is empty and stays empty.
		const changes = wishChanges(
			[entry('i1', ''), entry('i2', 'HAPPY_TO'), entry('i3', '')],
			[stored('i2', 'HAPPY_TO')]
		);

		expect(changes).toEqual([]);
	});

	it('registers a new one and changes an existing one', () => {
		const changes = wishChanges(
			[entry('i1', 'FIRST_CHOICE'), entry('i2', 'IF_NEEDED')],
			[stored('i2', 'HAPPY_TO')]
		);

		expect(changes).toEqual([
			{ kind: 'set', instanceId: 'i1', priority: 'FIRST_CHOICE', note: '' },
			{ kind: 'set', instanceId: 'i2', priority: 'IF_NEEDED', note: '' }
		]);
	});

	it('notices a note that changed although the level did not', () => {
		const changes = wishChanges(
			[entry('i1', 'HAPPY_TO', 'nur die Vorlesung')],
			[stored('i1', 'HAPPY_TO')]
		);

		expect(changes).toEqual([
			{ kind: 'set', instanceId: 'i1', priority: 'HAPPY_TO', note: 'nur die Vorlesung' }
		]);
	});

	it('withdraws what was set back to nothing', () => {
		const changes = wishChanges([entry('i1', '')], [stored('i1', 'HAPPY_TO')]);

		expect(changes).toEqual([{ kind: 'withdraw', instanceId: 'i1', wishId: 'w-i1' }]);
	});

	it('does not withdraw a cell that was empty to begin with', () => {
		expect(wishChanges([entry('i1', '')], [])).toEqual([]);
	});
});

describe('savedHint', () => {
	it('counts the caller’s own changes and says so in German', () => {
		// The only number this screen may produce: it is about what this person just did, and
		// says nothing about anybody else.
		expect(savedHint(0)).toMatch(/nichts/);
		expect(savedHint(1)).toMatch(/^Eine/);
		expect(savedHint(3)).toMatch(/^3 Änderungen/);
	});
});

describe('wishesAreOpen', () => {
	it('is open until the semester is finished', () => {
		// Not only in the wish phase: a correction the tool refuses happens in a mail instead.
		for (const phase of ['DEMAND_PLANNING', 'WISHES', 'ASSIGNMENT']) {
			expect(wishesAreOpen(phase), phase).toBe(true);
		}
		expect(wishesAreOpen('FINAL')).toBe(false);
	});

	it('is closed for a semester whose phase is unknown', () => {
		// Fail closed, like the backend's own matrix: a phase this build cannot read is not one
		// to guess the most permissive value for.
		expect(wishesAreOpen(null)).toBe(false);
		expect(wishesAreOpen(undefined)).toBe(false);
	});

	it('says the semester is over rather than that a deadline was missed', () => {
		const hint = closedPhaseHint('FINAL');
		expect(hint).toMatch(/abgeschlossen/);
		// The sentence a reader could act on would be the wrong one — there is nothing to repair.
		expect(hint).not.toMatch(/Frist|verpasst|zu spät/i);
	});

	it('says which kind of open it is', () => {
		// "You may" is not obvious from a form that is merely not disabled, and the assignment
		// phase in particular reads like an oversight without a sentence.
		const hints = ['DEMAND_PLANNING', 'WISHES', 'ASSIGNMENT'].map(openPhaseHint);
		expect(new Set(hints).size).toBe(3);
		for (const hint of hints) {
			expect(hint.length).toBeGreaterThan(10);
		}
		expect(openPhaseHint('FINAL')).toBe('');
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
