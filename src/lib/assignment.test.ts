import { describe, expect, it } from 'vitest';
import {
	assignmentChanges,
	candidatesFor,
	commonNote,
	commonValue,
	mergeCombined,
	pooledInstances,
	cohortGroups,
	currentValue,
	partHours,
	partsSummary,
	savedHint,
	MIXED_CHOICE,
	type AssignmentEntry,
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
		const out = candidatesFor(['i1'], wishes, [], [], []);
		expect(out.map((c) => c.name)).toEqual(['Prof. Eins', 'Prof. Zwei']);
		expect(out[0].hint).toBe('unbedingt');
		expect(out[1].hint).toContain('nur die Vorlesung');
	});

	it('does not offer somebody who wished for a different cohort', () => {
		const out = candidatesFor(['i1'], wishes, [], [], []);
		expect(out.map((c) => c.personId)).not.toContain('per9');
	});

	it('lists somebody once, with the reason that says more', () => {
		const out = candidatesFor(['i1'], wishes, [{ id: 'per1', name: 'Prof. Eins' }], [], []);
		expect(out.filter((c) => c.personId === 'per1')).toHaveLength(1);
		expect(out[0].hint).toBe('unbedingt');
	});

	it('offers a search result by its teacher id and lets the backend canonicalise', () => {
		const out = candidatesFor(['i1'], [], [], [{ id: 't7', name: 'Lehrbeauftragte' }], []);
		expect(out).toEqual([{ teacherId: 't7', name: 'Lehrbeauftragte', hint: 'Suche' }]);
	});

	it('always offers whoever currently holds the part, even if nothing else names them', () => {
		const current = held({ assignee: { personId: 'per5', name: 'Prof. Fünf' } });
		const out = candidatesFor(['i1'], [], [], [], [current]);
		expect(out.at(-1)).toMatchObject({ personId: 'per5', hint: 'zugeteilt' });
	});

	// The event is held once for two study programmes, so the interest registered for the covered
	// cohort is interest in this teaching. Leaving it out would hide a willing colleague from the
	// only screen that decides who holds it.
	it('offers the interest registered for a covered cohort, and says where it came from', () => {
		const out = candidatesFor(['i1', 'other'], wishes, [], [], [], new Map([['other', 'GS']]));
		const pooled = out.find((c) => c.personId === 'per9');
		expect(pooled).toBeDefined();
		// The prefix is the whole reason to pool rather than merge silently: the person deciding
		// is choosing between two programmes' colleagues for one event.
		expect(pooled!.hint).toContain('Wunsch aus GS');
	});

	// The holding cohort's own interest is not labelled: it is the cohort being filled, and a
	// prefix on every line would be noise on the majority of them.
	it('does not label the interest registered for the cohort being filled', () => {
		const out = candidatesFor(['i1', 'other'], wishes, [], [], [], new Map([['other', 'GS']]));
		const own = out.find((c) => c.personId === 'per1');
		expect(own!.hint).not.toContain('Wunsch aus');
	});
});

describe('pooledInstances', () => {
	const base = {
		id: 'host',
		track: '',
		teachingHours: 4,
		programme: { code: 'DE' },
		module: { id: 'm', name: 'Betriebssysteme I' },
		parts: []
	};

	it('is just the cohort itself where nothing is covered', () => {
		expect(pooledInstances(base).ids).toEqual(['host']);
	});

	// An unanswered request has changed nothing: the cohort that asked still holds its own parts
	// and fills them itself, so its interest belongs to its own screen and not to this one.
	it('leaves out a request nobody has agreed to', () => {
		const out = pooledInstances({
			...base,
			covers: [{ acceptedAt: null, instance: { id: 'guest', programme: { code: 'GS' } } }]
		});
		expect(out.ids).toEqual(['host']);
	});

	it('takes in an agreed one, with the programme it belongs to', () => {
		const out = pooledInstances({
			...base,
			covers: [
				{ acceptedAt: '2026-08-27T10:00:00Z', instance: { id: 'guest', programme: { code: 'GS' } } }
			]
		});
		expect(out.ids).toEqual(['host', 'guest']);
		expect(out.programmes.get('guest')).toBe('GS');
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

describe('the cohort as one unit', () => {
	// A cohort is normally held by one person: the same colleague takes the lecture and its
	// laboratories, and splitting them is an arrangement somebody makes on purpose. These four
	// describe the control that follows from that, and the rule that ranks it against the parts.

	const rows = (...held: (AssignmentLike | null)[]) =>
		cohortGroups(
			[instance()],
			held.filter((a) => a !== null)
		)[0].rows;

	const eins = (part: string, note = ''): AssignmentLike =>
		held({
			id: `a-${part}`,
			note,
			assignee: { personId: 'per1', name: 'Prof. Eins' },
			part: { id: part }
		});

	const zwei = (part: string, note = ''): AssignmentLike =>
		held({
			id: `a-${part}`,
			note,
			assignee: { personId: 'per2', name: 'Prof. Zwei' },
			part: { id: part }
		});

	describe('commonValue', () => {
		it('is the one name where every part holds it', () => {
			expect(commonValue(rows(eins('p1'), eins('p2'), eins('p3')))).toBe('p:per1');
		});

		it('is the empty choice where nobody holds anything', () => {
			expect(commonValue(rows())).toBe('');
		});

		// The value the cohort's dropdown cannot show, and the reason it needs a sentinel at all.
		it('is null where the parts disagree', () => {
			expect(commonValue(rows(eins('p1'), zwei('p2')))).toBeNull();
		});
	});

	describe('commonNote', () => {
		it('is null where the parts carry different notes, so no field claims to edit them', () => {
			expect(
				commonNote(rows(eins('p1', 'hier'), eins('p2', 'dort'), eins('p3', 'dort')))
			).toBeNull();
		});

		it('is the shared note where they agree', () => {
			const all = rows(eins('p1', 'gemeinsam'), eins('p2', 'gemeinsam'), eins('p3', 'gemeinsam'));
			expect(commonNote(all)).toBe('gemeinsam');
		});
	});

	describe('partsSummary', () => {
		it('names what "all of them" is, next to the one control that fills them', () => {
			expect(partsSummary(rows())).toBe('Vorlesung · Praktikum 1 · Praktikum 2');
		});
	});

	describe('mergeCombined', () => {
		const parts = ['p1', 'p2', 'p3'];
		const stored = (...held: AssignmentLike[]) =>
			new Map(held.map((a) => [a.part.id as string, a]));
		// What the rows underneath submit: their rendered defaults, which are what is stored.
		const perPart = (...cells: (string | [string, string])[]) =>
			new Map<string, AssignmentEntry>(
				cells.map((cell, i) => {
					const [choice, note] = typeof cell === 'string' ? [cell, ''] : cell;
					return [parts[i], { choice, note }];
				})
			);

		it('writes one name onto every part of the cohort', () => {
			const out = mergeCombined(
				[{ partIds: parts, choice: 'p:per1', note: '' }],
				perPart('', '', ''),
				stored()
			);
			expect([...out.values()].map((e) => e.choice)).toEqual(['p:per1', 'p:per1', 'p:per1']);
		});

		// The rule that makes both controls submittable at once: the cohort acts only when it says
		// something the parts do not already say in common. Somebody working in the open detail view
		// leaves it showing exactly that common value, so the parts decide.
		it('keeps quiet where it repeats what the parts already hold', () => {
			const out = mergeCombined(
				[{ partIds: parts, choice: 'p:per1', note: '' }],
				perPart('p:per1', 'p:per2', 'p:per1'),
				stored(eins('p1'), eins('p2'), eins('p3'))
			);
			expect([...out.values()].map((e) => e.choice)).toEqual(['p:per1', 'p:per2', 'p:per1']);
		});

		it('keeps quiet while it says "leave every part as it is"', () => {
			const out = mergeCombined(
				[{ partIds: parts, choice: MIXED_CHOICE, note: null }],
				perPart('p:per1', 'p:per2', ''),
				stored(eins('p1'), zwei('p2'))
			);
			expect([...out.values()].map((e) => e.choice)).toEqual(['p:per1', 'p:per2', '']);
		});

		it('empties the whole cohort where it names nobody and the parts were held', () => {
			const out = mergeCombined(
				[{ partIds: parts, choice: '', note: '' }],
				perPart('p:per1', 'p:per1', 'p:per1'),
				stored(eins('p1'), eins('p2'), eins('p3'))
			);
			expect([...out.values()].map((e) => e.choice)).toEqual(['', '', '']);
		});

		// Clearing a note is a change and '' is its value, so the note is ranked on its own — a
		// cohort whose person did not change can still have its note rewritten.
		it('writes a note onto every part without touching who holds them', () => {
			const out = mergeCombined(
				[{ partIds: parts, choice: 'p:per1', note: 'vertretungsweise' }],
				perPart('p:per1', 'p:per1', 'p:per1'),
				stored(eins('p1'), eins('p2'), eins('p3'))
			);
			expect([...out.values()]).toEqual([
				{ choice: 'p:per1', note: 'vertretungsweise' },
				{ choice: 'p:per1', note: 'vertretungsweise' },
				{ choice: 'p:per1', note: 'vertretungsweise' }
			]);
		});

		// Absent is not empty: the page leaves the field out where the parts carry different notes,
		// and that must not read as an instruction to clear them.
		it('leaves the notes alone where the page offered no field for them', () => {
			const out = mergeCombined(
				[{ partIds: parts, choice: 'p:per2', note: null }],
				perPart(['p:per1', 'hier'], ['p:per1', 'dort'], ['p:per1', 'dort']),
				stored(eins('p1', 'hier'), eins('p2', 'dort'), eins('p3', 'dort'))
			);
			expect([...out.values()].map((e) => e.note)).toEqual(['hier', 'dort', 'dort']);
			expect([...out.values()].map((e) => e.choice)).toEqual(['p:per2', 'p:per2', 'p:per2']);
		});

		// End to end through the difference: the cohort control has to produce the same three
		// writes somebody filling three rows by hand would.
		it('turns one choice into one write per part, with the id each replaces', () => {
			const stock = stored(eins('p1'), eins('p2'), eins('p3'));
			const changes = assignmentChanges(
				mergeCombined(
					[{ partIds: parts, choice: 'p:per2', note: '' }],
					perPart('p:per1', 'p:per1', 'p:per1'),
					stock
				),
				stock
			);
			expect(changes).toEqual([
				{
					kind: 'set',
					partId: 'p1',
					personId: 'per2',
					teacherId: undefined,
					note: '',
					replacing: 'a-p1'
				},
				{
					kind: 'set',
					partId: 'p2',
					personId: 'per2',
					teacherId: undefined,
					note: '',
					replacing: 'a-p2'
				},
				{
					kind: 'set',
					partId: 'p3',
					personId: 'per2',
					teacherId: undefined,
					note: '',
					replacing: 'a-p3'
				}
			]);
		});
	});
});
