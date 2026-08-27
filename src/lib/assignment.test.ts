import { describe, expect, it } from 'vitest';
import {
	assignmentChanges,
	candidatesFor,
	cohortGroups,
	currentValue,
	partHours,
	savedHint,
	type AssignmentLike,
	type InstanceLike,
	type WishLike
} from './assignment';

const instance = (over: Partial<InstanceLike> = {}): InstanceLike => ({
	id: 'i1',
	track: 'A',
	programmeSemester: 1,
	teachingHours: 8,
	programme: { code: 'IF' },
	module: { id: 'm1', name: 'Analysis', subjectGroup: { id: 'g1', code: 'MATHE' } },
	parts: [
		{ id: 'p1', kind: 'LECTURE', teachingHours: 2 },
		{ id: 'p2', kind: 'LAB', teachingHours: 2 },
		{ id: 'p3', kind: 'LAB', teachingHours: 2 }
	],
	...over
});

const held = (over: Partial<AssignmentLike> = {}): AssignmentLike => ({
	id: 'a1',
	note: '',
	assignee: { personId: 'per1', name: 'Prof. Eins' },
	part: { id: 'p1' },
	...over
});

describe('cohortGroups', () => {
	it('numbers a part only where the number distinguishes something', () => {
		const [group] = cohortGroups([instance()], []);
		expect(group.rows.map((r) => r.heading)).toEqual(['Vorlesung', 'Praktikum 1', 'Praktikum 2']);
	});

	it('puts each assignment on its own part and leaves the rest empty', () => {
		const [group] = cohortGroups([instance()], [held({ part: { id: 'p2' } })]);
		expect(group.rows.map((r) => r.assignment?.id ?? null)).toEqual([null, 'a1', null]);
	});

	it('drops a cohort with no parts, because there is nothing to fill', () => {
		expect(cohortGroups([instance({ parts: [] })], [])).toEqual([]);
	});

	it('assembles the cohort label rather than reading a stored one', () => {
		const [group] = cohortGroups([instance()], []);
		expect(group.label).toBe('IF1A');
	});
});

describe('partHours', () => {
	it('says the hours are open rather than showing a zero', () => {
		// Zero is a statement — this credits nobody with anything — and "not settled yet" is an
		// ordinary state of an instance declared before its detail was.
		expect(partHours({ id: 'p', kind: 'LECTURE', teachingHours: null })).toBe('SWS offen');
	});
});

describe('candidatesFor', () => {
	const wishes: WishLike[] = [
		{
			priority: 'FIRST_CHOICE',
			note: '',
			person: { id: 'per1', name: 'Prof. Eins' },
			instance: { id: 'i1' }
		},
		{
			priority: 'IF_NEEDED',
			note: 'nur die Vorlesung',
			person: { id: 'per2', name: 'Prof. Zwei' },
			instance: { id: 'i1' }
		},
		{
			priority: 'HAPPY_TO',
			note: '',
			person: { id: 'per9', name: 'Prof. Neun' },
			instance: { id: 'other' }
		}
	];

	it('offers whoever registered interest in this cohort, first, with how much', () => {
		const out = candidatesFor('i1', wishes, [], [], null);
		expect(out.map((c) => c.name)).toEqual(['Prof. Eins', 'Prof. Zwei']);
		expect(out[0].hint).toBe('unbedingt');
		expect(out[1].hint).toContain('nur die Vorlesung');
	});

	it('does not offer somebody who wished for a different cohort', () => {
		const out = candidatesFor('i1', wishes, [], [], null);
		expect(out.map((c) => c.personId)).not.toContain('per9');
	});

	it('lists somebody once, with the reason that says more', () => {
		const out = candidatesFor('i1', wishes, [{ id: 'per1', name: 'Prof. Eins' }], [], null);
		expect(out.filter((c) => c.personId === 'per1')).toHaveLength(1);
		expect(out[0].hint).toBe('unbedingt');
	});

	it('offers a search result by its teacher id and lets the backend canonicalise', () => {
		const out = candidatesFor('i1', [], [], [{ id: 't7', name: 'Lehrbeauftragte' }], null);
		expect(out).toEqual([{ teacherId: 't7', name: 'Lehrbeauftragte', hint: 'Suche' }]);
	});

	it('always offers whoever currently holds the part, even if nothing else names them', () => {
		const current = held({ assignee: { personId: 'per5', name: 'Prof. Fünf' } });
		const out = candidatesFor('i1', [], [], [], current);
		expect(out.at(-1)).toMatchObject({ personId: 'per5', hint: 'zugeteilt' });
	});
});

describe('currentValue', () => {
	it('is empty when nobody holds the part', () => {
		expect(currentValue(null)).toBe('');
	});

	it('distinguishes an account from a catalogue entry', () => {
		expect(currentValue(held())).toBe('p:per1');
		expect(currentValue(held({ assignee: { teacherId: 't7', name: 'X' } }))).toBe('t:t7');
	});
});

describe('assignmentChanges', () => {
	it('writes nothing for a screen nobody changed', () => {
		// Otherwise every visit would move updatedAt on every row, and the audit would stop
		// meaning anything.
		const entries = new Map([['p1', { choice: 'p:per1', note: '' }]]);
		expect(assignmentChanges(entries, new Map([['p1', held()]]))).toEqual([]);
	});

	it('carries the assignment being replaced, so a stale write is refused rather than silent', () => {
		const entries = new Map([['p1', { choice: 'p:per2', note: '' }]]);
		const [change] = assignmentChanges(entries, new Map([['p1', held()]]));
		expect(change).toEqual({
			kind: 'set',
			partId: 'p1',
			personId: 'per2',
			teacherId: undefined,
			note: '',
			replacing: 'a1'
		});
	});

	it('names no assignment when the part is believed to be free', () => {
		// The safe direction: a call that names nothing can only ever fill a part nobody holds.
		const entries = new Map([['p1', { choice: 'p:per2', note: '' }]]);
		const [change] = assignmentChanges(entries, new Map());
		expect(change).toMatchObject({ kind: 'set', replacing: undefined });
	});

	it('clears a part that was emptied', () => {
		const entries = new Map([['p1', { choice: '', note: '' }]]);
		expect(assignmentChanges(entries, new Map([['p1', held()]]))).toEqual([
			{ kind: 'clear', partId: 'p1', assignmentId: 'a1' }
		]);
	});

	it('does nothing for a part that was already empty', () => {
		const entries = new Map([['p1', { choice: '', note: '' }]]);
		expect(assignmentChanges(entries, new Map())).toEqual([]);
	});

	it('treats a changed note alone as a change', () => {
		const entries = new Map([['p1', { choice: 'p:per1', note: 'vertretungsweise' }]]);
		const [change] = assignmentChanges(entries, new Map([['p1', held()]]));
		expect(change).toMatchObject({ note: 'vertretungsweise', replacing: 'a1' });
	});

	it('sends a teacher as a teacher', () => {
		const entries = new Map([['p1', { choice: 't:t7', note: '' }]]);
		const [change] = assignmentChanges(entries, new Map());
		expect(change).toMatchObject({ personId: undefined, teacherId: 't7' });
	});
});

describe('savedHint', () => {
	it('counts what this caller just did and says nothing about the plan', () => {
		// The only kind of number this screen is allowed to show. Anything counting who holds what
		// would be the confidential fact with the names taken out.
		expect(savedHint(0)).toBe('Nichts zu speichern.');
		expect(savedHint(1)).toBe('1 Änderung gespeichert.');
		expect(savedHint(4)).toBe('4 Änderungen gespeichert.');
		for (const n of [0, 1, 4]) {
			expect(savedHint(n)).not.toMatch(/besetzt|vergeben|frei|offen/);
		}
	});
});
