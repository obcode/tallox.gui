import { describe, expect, it } from 'vitest';
import {
	assignmentChanges,
	candidateSections,
	candidatesFor,
	commonNote,
	commonValue,
	moduleBlocks,
	mergeCombined,
	pooledInstances,
	cohortGroups,
	fillProgress,
	currentValue,
	partHours,
	partsSummary,
	savedHint,
	MIXED_CHOICE,
	type AssignmentEntry,
	type AssignmentLike,
	type InstanceLike,
	type WishLike,
	instancesOfTab,
	instancesListedAsCie,
	instancesOfDegree,
	programmesWithoutDegree,
	programmeSections,
	mayFillUnfiled,
	UNFILED,
	cohortsWithoutInterest,
	isWideOpen,
	mayShowGaps,
	ownRows,
	isArranged,
	divisionDefault,
	parseHours,
	candidateLabel
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

// The case from the request: 2 + 2 of the lecture and 2 + 2 of the laboratory, half of each given
// by another faculty.
describe('a cohort divided with another faculty', () => {
	const divided = instance({
		parts: [
			{ id: 'p1', kind: 'LECTURE', teachingHours: 2 },
			{ id: 'p1a', kind: 'LECTURE', teachingHours: 2, dividedFrom: 'p1', taughtBy: 'FK 04' },
			{ id: 'p2', kind: 'LAB', teachingHours: 2 },
			{ id: 'p2a', kind: 'LAB', teachingHours: 1, dividedFrom: 'p2' },
			{ id: 'p2b', kind: 'LAB', teachingHours: 1, dividedFrom: 'p2', taughtBy: 'FK 04' },
			{ id: 'p3', kind: 'LAB', teachingHours: 2 }
		]
	});

	// A lecture cut in two is still the one lecture: "Vorlesung 2" would claim a second one.
	it('names a piece after the part it was cut from', () => {
		const [group] = cohortGroups([divided], []);
		expect(group.rows.map((r) => r.heading)).toEqual([
			'Vorlesung',
			'Vorlesung – Anteil',
			'Praktikum 1',
			'Praktikum 1 – Anteil 1',
			'Praktikum 1 – Anteil 2',
			'Praktikum 2'
		]);
	});

	// "One person holds the cohort" is our share of it; another faculty's half is not staffed here.
	it('leaves the parts another faculty teaches out of the cohort’s own dropdown', () => {
		const [group] = cohortGroups([divided], [held({ part: { id: 'p1' } })]);
		expect(ownRows(group.rows).map((r) => r.part.id)).toEqual(['p1', 'p2', 'p2a', 'p3']);
		expect(commonValue(ownRows(group.rows))).toBeNull();
	});

	it('says in the summary who teaches what is not ours', () => {
		const [group] = cohortGroups([divided], []);
		expect(partsSummary(group.rows)).toContain('Vorlesung – Anteil (FK 04)');
	});

	it('shows its parts rather than folding them away', () => {
		const [group] = cohortGroups([divided], []);
		const [plain] = cohortGroups([instance()], []);
		expect(isArranged(group.rows)).toBe(true);
		expect(isArranged(plain.rows)).toBe(false);
	});
});

describe('dividing a part', () => {
	it('offers half of it, and nothing for a part without hours', () => {
		expect(divisionDefault({ id: 'x', kind: 'LECTURE', teachingHours: 4 })).toBe(2);
		expect(divisionDefault({ id: 'x', kind: 'LECTURE', teachingHours: 3 })).toBe(1.5);
		expect(divisionDefault({ id: 'x', kind: 'LECTURE', teachingHours: null })).toBeNull();
	});

	it('reads a comma as a decimal point and refuses what is not a number', () => {
		expect(parseHours('1,5')).toBe(1.5);
		expect(parseHours(' 2 ')).toBe(2);
		expect(parseHours('')).toBeNull();
		expect(parseHours('zwei')).toBeNull();
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

	it('says beside the level that somebody takes only one of the cohorts', () => {
		// Whoever fills IF4B should know that the same person may be offering themselves for IF4A.
		const bounded: WishLike[] = [
			{ ...wishes[1], trackLimit: 1 },
			{ ...wishes[0], trackLimit: null }
		];
		const out = candidatesFor(['i1'], bounded, [], [], []);
		expect(out.find((c) => c.personId === 'per2')!.hint).toBe(
			'notfalls · nur einen der Züge · nur die Vorlesung'
		);
		expect(out.find((c) => c.personId === 'per1')!.hint).toBe('unbedingt');
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
		expect(out).toEqual([
			{ teacherId: 't7', name: 'Lehrbeauftragte', hint: 'Suche', kind: 'other' }
		]);
	});

	// Collab: the dropdown offered only who had wished for the cohort, where the subject group had
	// no members entered. Whoever fills a cohort must be able to pick anybody who teaches here.
	it('offers everybody who teaches here after the reasons, under their own heading', () => {
		const everyone = [
			{ id: 't1', name: 'Prof. Eins', mail: 'prof.eins@example.org' },
			{ id: 't8', name: 'Prof. Acht', mail: 'prof.acht@example.org' }
		];
		const withMail = wishes.map((w) =>
			w.person.id === 'per1' ? { ...w, person: { ...w.person, mail: 'Prof.Eins@example.org' } } : w
		);
		const out = candidatesFor(['i1'], withMail, [], [], [], new Map(), [], everyone);
		expect(out.map((c) => c.name)).toEqual(['Prof. Eins', 'Prof. Zwei', 'Prof. Acht']);
		expect(out.at(-1)).toEqual({ teacherId: 't8', name: 'Prof. Acht', kind: 'other' });
	});

	it('groups the dropdown with the wishes first and leaves out empty groups', () => {
		const out = candidatesFor(
			['i1'],
			wishes,
			[{ id: 'per7', name: 'Prof. Sieben' }],
			[],
			[],
			new Map(),
			[],
			[{ id: 't8', name: 'Prof. Acht' }]
		);
		expect(candidateSections(out).map((s) => [s.label, s.candidates.map((c) => c.name)])).toEqual([
			['Gewünscht', ['Prof. Eins', 'Prof. Zwei']],
			['Fachgruppe', ['Prof. Sieben']],
			['Weitere Lehrende', ['Prof. Acht']]
		]);
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

	// The competence pool comes after the wishes and before the members: "kann halten" is what is
	// left to go on where nobody registered interest for this cohort.
	it('offers the competence pool after the wishes, the stronger statement first', () => {
		const out = candidatesFor(
			['i1'],
			wishes,
			[{ id: 'per3', name: 'Prof. Drei' }],
			[],
			[],
			new Map(),
			[
				{ level: 'WOULD_LIKE', note: '', holder: { personId: 'per4', name: 'Prof. Vier' } },
				{ level: 'CAN_TEACH', note: 'nur Übung', holder: { teacherId: 't8', name: 'LB Acht' } },
				// Already a wish: listed once, with the wish as the reason.
				{ level: 'CAN_TEACH', note: '', holder: { personId: 'per1', name: 'Prof. Eins' } }
			]
		);
		expect(out.map((c) => c.name)).toEqual([
			'Prof. Eins',
			'Prof. Zwei',
			'LB Acht',
			'Prof. Vier',
			'Prof. Drei'
		]);
		expect(out[2]).toEqual({
			teacherId: 't8',
			name: 'LB Acht',
			hint: 'kann halten · nur Übung',
			kind: 'pool'
		});
		expect(out[3].hint).toBe('Interesse, Einarbeitung nötig');
		expect(out[0].hint).toBe('unbedingt');
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

describe('moduleBlocks', () => {
	const cohort = (module: string, name: string, programme: string, track: string) =>
		cohortGroups(
			[
				instance({
					id: `${module}-${programme}-${track}`,
					track,
					programme: { code: programme },
					module: { id: module, name }
				})
			],
			[]
		)[0];

	it('gathers the cohorts of a module so the name can be written once', () => {
		const blocks = moduleBlocks([
			cohort('m2', 'Betriebssysteme', 'IF', 'A'),
			cohort('m1', 'Analysis', 'IF', 'B'),
			cohort('m2', 'Betriebssysteme', 'IF', 'B')
		]);
		expect(blocks.map((b) => b.name)).toEqual(['Analysis', 'Betriebssysteme']);
		expect(blocks[1].cohorts.map((c) => c.label)).toEqual(['IF1A', 'IF1B']);
	});

	// The process gives PBLVs out last, and the screen is read top to bottom.
	it('puts the PBLVs after everything else', () => {
		const pblv = cohortGroups(
			[instance({ id: 'p', module: { id: 'p', name: 'Agiles Projekt', projectBased: true } })],
			[]
		)[0];
		const blocks = moduleBlocks([pblv, cohort('m1', 'Übersetzerbau', 'IF', 'A')]);
		expect(blocks.map((b) => [b.name, b.projectBased])).toEqual([
			['Übersetzerbau', false],
			['Agiles Projekt', true]
		]);
	});

	// By name and not by id: the first column is read down, looking for a module.
	it('orders the modules the way somebody reads the first column', () => {
		const blocks = moduleBlocks([
			cohort('m1', 'Übersetzerbau', 'IF', 'A'),
			cohort('m2', 'Algorithmen', 'IF', 'A')
		]);
		expect(blocks.map((b) => b.name)).toEqual(['Algorithmen', 'Übersetzerbau']);
	});
});

describe('the degree filter', () => {
	const bachelor = { programme: { code: 'IF', degree: 'BACHELOR' as const } };
	const master = { programme: { code: 'IN', degree: 'MASTER' as const } };
	const unrecorded = { programme: { code: 'XY', title: 'Ohne Eintrag', degree: null } };
	const alsoUnrecorded = { programme: { code: 'XY', degree: null } };

	it('keeps everything where no degree is chosen', () => {
		expect(instancesOfDegree([bachelor, master, unrecorded], null)).toEqual([
			bachelor,
			master,
			unrecorded
		]);
	});

	// The backend's rule: a programme nobody recorded a degree for matches neither.
	it('keeps only the programmes of the chosen degree', () => {
		expect(instancesOfDegree([bachelor, master, unrecorded], 'MASTER')).toEqual([master]);
		expect(instancesOfDegree([bachelor, master, unrecorded], 'BACHELOR')).toEqual([bachelor]);
	});

	it('names each programme the filter leaves out once', () => {
		expect(programmesWithoutDegree([master, unrecorded, bachelor, alsoUnrecorded])).toEqual([
			{ code: 'XY', title: 'Ohne Eintrag' }
		]);
		expect(programmesWithoutDegree([bachelor, master])).toEqual([]);
	});
});

describe('programmeSections', () => {
	const cohort = (
		module: string,
		name: string,
		programme: { code: string; degree?: 'BACHELOR' | 'MASTER' | null },
		over: Partial<InstanceLike['module']> = {}
	) =>
		cohortGroups(
			[
				instance({
					id: `${module}-${programme.code}`,
					programme,
					module: { id: module, name, ...over }
				})
			],
			[]
		)[0];

	const IF = { code: 'IF', degree: 'BACHELOR' as const };
	const IB = { code: 'IB', degree: 'BACHELOR' as const };
	const IN = { code: 'IN', degree: 'MASTER' as const };
	const XY = { code: 'XY', degree: null };

	it('runs bachelor, master, then unrecorded, and by code within each', () => {
		const sections = programmeSections([
			cohort('m1', 'Analysis', XY),
			cohort('m1', 'Analysis', IN),
			cohort('m1', 'Analysis', IF),
			cohort('m1', 'Analysis', IB)
		]);
		expect(sections.map((s) => s.programme.code)).toEqual(['IB', 'IF', 'IN', 'XY']);
	});

	// The point of cutting by programme: a module serving two of them is in both sections, each
	// time with that programme's cohort only.
	it('puts a module that serves two programmes into both', () => {
		const sections = programmeSections([
			cohort('m1', 'Datenbanken', IF),
			cohort('m1', 'Datenbanken', IN)
		]);
		expect(
			sections.map((s) => [s.programme.code, s.blocks.map((b) => b.cohorts.map((c) => c.label))])
		).toEqual([
			['IF', [['IF1A']]],
			['IN', [['IN1A']]]
		]);
	});

	it('keeps the PBLVs last inside each section', () => {
		const sections = programmeSections([
			cohort('p', 'Agiles Projekt', IF, { projectBased: true }),
			cohort('m1', 'Übersetzerbau', IF)
		]);
		expect(sections[0].blocks.map((b) => b.name)).toEqual(['Übersetzerbau', 'Agiles Projekt']);
	});
});

describe('which instances a tab shows', () => {
	const filed = { module: { subjectGroup: { id: 'g1' } } };
	const other = { module: { subjectGroup: { id: 'g2' } } };
	const unfiled = { module: { subjectGroup: null } };

	it('gives a subject group its own instances', () => {
		expect(instancesOfTab([filed, other, unfiled], 'g1')).toEqual([filed]);
	});

	// The bug this function exists for. The subject group is derived through the module, so an
	// instance whose module nobody has filed matches no group at all — and comparing against the
	// chosen id dropped it silently. A locally created module, which is how a short-notice FWP is
	// declared, arrives in exactly that state: the instance somebody had just declared was the
	// one they could not fill.
	it('gives the unfiled tab the instances that are in no group', () => {
		expect(instancesOfTab([filed, other, unfiled], UNFILED)).toEqual([unfiled]);
	});

	it('shows nothing until a tab is chosen', () => {
		expect(instancesOfTab([filed, other, unfiled], null)).toEqual([]);
	});

	it('never lets an unfiled instance fall out of every tab', () => {
		const all = [filed, other, unfiled];
		const tabs = ['g1', 'g2', UNFILED];
		const covered = tabs.flatMap((tab) => instancesOfTab(all, tab));
		expect(covered).toHaveLength(all.length);
	});
});

describe('who is offered the unfiled tab', () => {
	// Only the two roles that may fill such an instance. Filling is a union of "leads the subject
	// group" and "leads the study programme", and a module in no group satisfies only the second
	// — so a subject group lead would meet a refusal on every row.
	it('is the study programme lead and the dean’s office', () => {
		expect(mayFillUnfiled(['PROGRAMME_LEAD'])).toBe(true);
		expect(mayFillUnfiled(['DEANS_OFFICE'])).toBe(true);
	});

	it('is not the subject group lead, whose reach is a group', () => {
		expect(mayFillUnfiled(['LECTURER', 'SUBJECT_GROUP_LEAD'])).toBe(false);
	});
});

describe('the cohorts nobody has registered interest in', () => {
	const a = { id: 'i1', module: { name: 'Analysis' }, parts: [{}] };
	const b = { id: 'i2', module: { name: 'Algebra' }, parts: [{}] };
	const partless = { id: 'i3', module: { name: 'Platzhalter' }, parts: [] };

	it('names the ones with no entry and leaves out the ones with', () => {
		expect(cohortsWithoutInterest([a, b], [{ instance: { id: 'i1' } }])).toEqual([b]);
	});

	it('leaves out cohorts with nothing to fill', () => {
		// The table leaves them out too: there is nothing to assign, so "nobody wants it" is not
		// a gap anybody can act on.
		expect(cohortsWithoutInterest([partless], [])).toEqual([]);
	});

	it('says nothing about how many registered', () => {
		// The rule the whole confidentiality design rests on. A gap is "this one has none",
		// never "that one has three" — the function returns rows, and there is no count to read
		// off it because the wished-for ones are not in the result at all.
		const gaps = cohortsWithoutInterest(
			[a, b],
			[{ instance: { id: 'i1' } }, { instance: { id: 'i1' } }]
		);
		expect(gaps).toEqual([b]);
	});
});

describe('a cohort that is entirely open', () => {
	const wish = { instance: { id: 'i1' } };
	const held = { id: 'a1' };

	it('is one with neither a wish nor anybody holding it', () => {
		expect(isWideOpen([], [], true)).toBe(true);
	});

	it('is not open once somebody wants it — there is a name to start from', () => {
		expect(isWideOpen([wish], [], true)).toBe(false);
	});

	it('is not open once the lead has filled it, wish or no wish', () => {
		expect(isWideOpen([], [held], true)).toBe(false);
	});

	it('is not open where nothing here is ours to fill', () => {
		// A cohort another faculty teaches is arranged, not staffed.
		expect(isWideOpen([], [], false)).toBe(false);
	});
});

describe('who may see the gap list', () => {
	const led = [{ id: 'g1' }];

	// Condition one of three, and not a nicety: the list is computed from the backend-filtered
	// wishes, which for anybody else are their own entries alone. "Nobody registered" would then
	// be false as well as leaky.
	it('is the lead of the chosen group', () => {
		expect(mayShowGaps('g1', ['SUBJECT_GROUP_LEAD'], led)).toBe(true);
	});

	it('is not the lead of a different group', () => {
		expect(mayShowGaps('g2', ['SUBJECT_GROUP_LEAD'], led)).toBe(false);
	});

	it('is not a mere member — membership grants nothing', () => {
		expect(mayShowGaps('g1', ['LECTURER'], [])).toBe(false);
		// A lead previewing the lecturer's view: the led groups still come from `me`, the role
		// does not — and without the role the wishes the gaps are computed from are withheld.
		expect(mayShowGaps('g1', ['LECTURER'], led)).toBe(false);
	});

	it('is not a study programme lead, whose reach is the other axis', () => {
		// She may fill these instances and read the wishes of her programme — but not the ones
		// this group's modules carry for other programmes, so a gap she saw would be wrong.
		expect(mayShowGaps('g1', ['PROGRAMME_LEAD'], [])).toBe(false);
	});

	it('is the dean’s office, which reads every entry before publication', () => {
		expect(mayShowGaps('g1', ['DEANS_OFFICE'], [])).toBe(true);
	});

	it('is never the unfiled tab, whose modules reach no lead at all', () => {
		expect(mayShowGaps(UNFILED, ['DEANS_OFFICE'], led)).toBe(false);
		expect(mayShowGaps(null, ['DEANS_OFFICE'], led)).toBe(false);
	});
});

describe('the candidate in the dropdown', () => {
	const desired = new Map([
		['p1', { min: 12.5, max: 12.5 }],
		['p3', { min: 6, max: 10 }]
	]);
	const load = new Map([['p3', 8]]);

	it('adds the hours somebody would like to teach, after why they are listed', () => {
		expect(
			candidateLabel({ personId: 'p1', name: 'Eins', hint: 'gerne', kind: 'wish' }, desired)
		).toBe('Eins (gerne, möchte 12,5 SWS)');
		expect(candidateLabel({ personId: 'p1', name: 'Eins', kind: 'other' }, desired)).toBe(
			'Eins (möchte 12,5 SWS)'
		);
	});

	it('shows a range, and what somebody already holds in every subject group', () => {
		expect(candidateLabel({ personId: 'p3', name: 'Drei', kind: 'other' }, desired, load)).toBe(
			'Drei (möchte 6–10 SWS, 8 eingeplant)'
		);
		expect(
			candidateLabel({ personId: 'p4', name: 'Vier', kind: 'other' }, desired, new Map([['p4', 2]]))
		).toBe('Vier (2 eingeplant)');
	});

	// Not stated and not visible are the same: nothing.
	it('says nothing for somebody without a visible figure, or a teacher without an account', () => {
		expect(
			candidateLabel({ personId: 'p2', name: 'Zwei', hint: 'Fachgruppe', kind: 'member' }, desired)
		).toBe('Zwei (Fachgruppe)');
		expect(candidateLabel({ teacherId: 't1', name: 'Extern', kind: 'other' }, desired, load)).toBe(
			'Extern'
		);
	});
});

describe('fillProgress', () => {
	it('counts filled parts and their hours', () => {
		const groups = cohortGroups(
			[
				instance(),
				instance({ id: 'i2', track: 'B', parts: [{ id: 'p4', kind: 'LECTURE', teachingHours: 4 }] })
			],
			[held({ part: { id: 'p2' } }), held({ id: 'a2', part: { id: 'p4' } })]
		);
		expect(fillProgress(groups)).toEqual({ parts: 4, filledParts: 2, hours: 10, filledHours: 6 });
	});

	// Taught by another faculty: nobody here fills it, so it is neither open nor done.
	it('leaves out what another faculty teaches, and counts a part without hours as zero', () => {
		const groups = cohortGroups(
			[
				instance({
					parts: [
						{ id: 'p1', kind: 'LECTURE', teachingHours: 2, taughtBy: 'FK 04' },
						{ id: 'p2', kind: 'LAB', teachingHours: null }
					]
				})
			],
			[]
		);
		expect(fillProgress(groups)).toEqual({ parts: 1, filledParts: 0, hours: 0, filledHours: 0 });
	});

	it('is empty for nothing shown', () => {
		expect(fillProgress([])).toEqual({ parts: 0, filledParts: 0, hours: 0, filledHours: 0 });
	});
});

describe('instancesListedAsCie', () => {
	const listed = { id: 'a', cie: true };
	const unlisted = { id: 'b', cie: false };
	const unknown: { id: string; cie?: boolean } = { id: 'c' };

	it('keeps everything without the filter', () => {
		expect(instancesListedAsCie([listed, unlisted, unknown], false)).toEqual([
			listed,
			unlisted,
			unknown
		]);
	});
	it('keeps only the listed cohorts with it', () => {
		expect(instancesListedAsCie([listed, unlisted, unknown], true)).toEqual([listed]);
	});
});
