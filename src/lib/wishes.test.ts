import { describe, expect, it } from 'vitest';
import type { ReadInstanceLike } from './demand';
import {
	WISH_PRIORITIES,
	WISH_PRIORITY_LABELS,
	WISH_PRIORITY_TINTS,
	closedPhaseHint,
	closedSubjectGroups,
	cohortIn,
	demandStateHint,
	isWishChoice,
	isWishPriority,
	myWishByInstance,
	openPhaseHint,
	othersByInstance,
	othersHint,
	ownWishesBySemester,
	rowClosedReason,
	savedHint,
	splitByMySubjects,
	strongestPriority,
	heldForOthers,
	studyGroupLabel,
	trackColumns,
	trackHeading,
	type StoredWish,
	type WishEntry,
	type WishLike,
	type WishModule,
	wishChanges,
	wishRowLabel,
	wishRows,
	wishTint,
	wishesAreOpen
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

function wish(
	id: string,
	instanceId: string,
	mail: string,
	name: string,
	semester?: string,
	teachingHours = 4
): WishLike {
	return {
		id,
		priority: 'HAPPY_TO',
		note: '',
		person: { mail, name },
		instance: {
			id: instanceId,
			semester,
			track: 'A',
			programmeSemester: 3,
			teachingHours,
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

describe('the tint on a chosen cell', () => {
	it('is one hue in three strengths, strongest first', () => {
		// A priority is an amount, not a judgement: success/warning/error would read as good,
		// careful, bad, and „notfalls" is a colleague offering to fill a gap.
		const tints = WISH_PRIORITIES.map((p) => WISH_PRIORITY_TINTS[p]);
		expect(tints.every((t) => t.startsWith('bg-primary/'))).toBe(true);

		const strengths = tints.map((t) => Number(t.split('/')[1]));
		expect(strengths).toEqual([...strengths].sort((a, b) => b - a));
	});

	it('is a background and never a text colour', () => {
		// text-success and friends measure between 1.35:1 and 3.5:1 on the light themes. The rule
		// is old enough in this repository to be worth a test rather than a comment.
		for (const tint of Object.values(WISH_PRIORITY_TINTS)) {
			expect(tint).not.toMatch(/^text-/);
		}
	});

	it('takes the strongest of a row for the band across it', () => {
		// A row can hold two cohorts wanted differently. The band has to be one colour, and the
		// question it answers is "is there something of mine here, and how much" — so the
		// strongest wins, while the weaker cell still says its own thing in its own tint.
		expect(strongestPriority(['IF_NEEDED', 'FIRST_CHOICE'])).toBe('FIRST_CHOICE');
		expect(strongestPriority([undefined, 'HAPPY_TO', 'IF_NEEDED'])).toBe('HAPPY_TO');
		expect(strongestPriority(['IF_NEEDED'])).toBe('IF_NEEDED');
	});

	it('leaves a row with no entry at all untinted', () => {
		expect(strongestPriority([])).toBe('');
		expect(strongestPriority([undefined, undefined])).toBe('');
		expect(wishTint(strongestPriority([undefined]))).toBe('');
	});

	it('gives an empty cell no class at all', () => {
		// Nearly every cell of the table is empty; none of them should carry a class saying so.
		expect(wishTint('')).toBe('');
		expect(wishTint('HAPPY_TO')).toBe(WISH_PRIORITY_TINTS.HAPPY_TO);
	});
});

describe('wishRowLabel', () => {
	it('leads with the cohort, which is what somebody recognises', () => {
		expect(wishRowLabel(wish('w', 'i', 'eins@example.org', 'Eins').instance)).toBe(
			'IF3A · Analysis'
		);
	});
});

describe('a cohort another programme holds', () => {
	const held = (id: string, programme: string): ReadInstanceLike<WishModule> => ({
		...instance(id, 'm1', 'IT-Sicherheit', ''),
		programme: { code: programme },
		teachingHours: 0,
		parts: [],
		coveredBy: {
			acceptedAt: '2026-08-28T10:00:00Z',
			instance: { id: 'holder', track: '', programmeSemester: 2, programme: { code: 'DC' } }
		}
	});
	const holder = (id: string): ReadInstanceLike<WishModule> => ({
		...instance(id, 'm1', 'IT-Sicherheit', ''),
		programme: { code: 'DC' },
		covers: [
			{
				acceptedAt: '2026-08-28T10:00:00Z',
				instance: { id: 'guest', track: '', programmeSemester: 5, programme: { code: 'GS' } }
			}
		]
	});

	// One joint event is one thing to want. The covered cohort used to arrive as a second line for
	// the same teaching — once at its real hours, once at zero.
	it('does not get a line of its own', () => {
		const rows = wishRows([holder('holder'), held('guest', 'GS')]);
		expect(rows).toHaveLength(1);
		expect(rows[0].programme.code).toBe('DC');
	});

	it('is named on the line of the cohort that holds it', () => {
		const rows = wishRows([holder('holder'), held('guest', 'GS')]);
		expect(heldForOthers(rows[0]).map((o) => o.programme.code)).toEqual(['GS']);
	});

	// Coupling leaves wishes alone — they point at the instance, and the instance survives. An
	// entry made before it would otherwise have nowhere left to be withdrawn: "Meine Eintragungen"
	// lists entries, and the only control for one is the cell in this table.
	it('keeps its line where the reader has an entry on it', () => {
		const rows = wishRows([holder('holder'), held('guest', 'GS')], new Set(['guest']));
		expect(rows.map((r) => r.programme.code).sort()).toEqual(['DC', 'GS']);
	});

	// A programme that planned the module for itself is a second event, and stays a second row.
	it('leaves a separately planned cohort alone', () => {
		const separate: ReadInstanceLike<WishModule> = {
			...instance('own', 'm1', 'IT-Sicherheit', ''),
			programme: { code: 'DE' }
		};
		const rows = wishRows([holder('holder'), held('guest', 'GS'), separate]);
		expect(rows.map((r) => r.programme.code).sort()).toEqual(['DC', 'DE']);
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

	it('puts a module that runs once in the first column, not in one of its own', () => {
		// A "Zug" column beside "Zug A" and "Zug B" asks the reader to work out that the first two
		// are the same thing. The single cohort is Zug A.
		const rows = wishRows([
			instance('1', 'm1', 'Analysis', 'B'),
			instance('2', 'm1', 'Analysis', 'A'),
			instance('3', 'm2', 'Projektstudium', '')
		]);

		expect(trackColumns(rows)).toEqual(['A', 'B']);
		expect(trackHeading('A')).toBe('Zug A');
		expect(trackHeading('')).toBe('Zug A');
	});

	it('renames the column and never the cohort', () => {
		// The instance keeps its empty track, and so does its label: the day it becomes two
		// cohorts the first is named A for real, and a label that had said A all along would make
		// that a change nobody can see.
		const [row] = wishRows([instance('3', 'm2', 'Projektstudium', '')]);

		expect(row.cohorts[0].track).toBe('');
		expect(row.cohorts[0].label).toBe('IF3');
		expect(studyGroupLabel(row)).toBe('IF3');
	});

	it('finds the cohort in a column, and nothing where the module does not run', () => {
		const [row] = wishRows([instance('1', 'm1', 'Analysis', 'A')]);

		expect(cohortIn(row, 'A')?.instanceId).toBe('1');
		expect(cohortIn(row, 'B')).toBeUndefined();

		const [single] = wishRows([instance('2', 'm2', 'Projektstudium', '')]);
		expect(cohortIn(single, 'A')?.instanceId).toBe('2');
	});

	it('prefers a real cohort A over the unnamed one', () => {
		// The two cannot both occur in one row — the demand screen names the cohorts the moment
		// there are two — but a lookup that preferred the unnamed one would hide a real A rather
		// than fail, and a cell nobody can enter a wish into is worse than an error.
		const [row] = wishRows([
			instance('unnamed', 'm1', 'Analysis', ''),
			instance('real-a', 'm1', 'Analysis', 'A')
		]);

		expect(cohortIn(row, 'A')?.instanceId).toBe('real-a');
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

describe('ownWishesBySemester', () => {
	const own = (id: string, semester?: string, hours = 4) =>
		wish(id, `i-${id}`, 'eins@example.org', 'Eins', semester, hours);

	it('groups by semester, chronologically', () => {
		// The code sorts as text in date order, which is what that format is for — so the list
		// needs no date parsing to be in the order somebody expects.
		const groups = ownWishesBySemester([
			own('c', '2028-SS'),
			own('a', '2027-WS'),
			own('b', '2028-SS'),
			own('d', '2027-SS')
		]);

		expect(groups.map((g) => g.code)).toEqual(['2027-SS', '2027-WS', '2028-SS']);
		expect(groups[2].wishes.map((w) => w.id)).toEqual(['c', 'b']);
	});

	it('adds up what the entries of one semester cost', () => {
		// An upper bound rather than a promise — a wish is for the cohort, and which part somebody
		// holds is settled in the assignment. Worth showing anyway: the alternative is that
		// somebody adds four numbers up on paper.
		const groups = ownWishesBySemester([
			own('a', '2027-SS', 6),
			own('b', '2027-SS', 2.5),
			own('c', '2027-WS', 4)
		]);

		expect(groups.map((g) => g.teachingHours)).toEqual([8.5, 4]);
	});

	it('counts an instance whose hours nobody has stated as nothing, not as a gap', () => {
		// The figure is a sum of one's own entries; a missing number must not make the whole sum
		// disappear, because a semester with four entries and one unstated is still four entries.
		const groups = ownWishesBySemester([
			{
				...own('a', '2027-SS', 6),
				instance: { ...own('a', '2027-SS').instance, teachingHours: null }
			},
			own('b', '2027-SS', 2)
		]);

		expect(groups[0].teachingHours).toBe(2);
		expect(groups[0].wishes).toHaveLength(2);
	});

	it('keeps an entry whose instance did not carry its semester', () => {
		// Under an odd heading rather than dropped. Losing somebody's own entry to a missing field
		// would be the worse of the two, and it would look like the entry was never made.
		const groups = ownWishesBySemester([own('a'), own('b', '2027-SS')]);

		expect(groups.map((g) => g.code)).toEqual(['', '2027-SS']);
		expect(groups[0].wishes.map((w) => w.id)).toEqual(['a']);
	});

	it('is empty for somebody who has entered nothing', () => {
		expect(ownWishesBySemester([])).toEqual([]);
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

describe('closedSubjectGroups', () => {
	it('reads the list as the exceptions and not as the open ones', () => {
		// The mistake this shape invites, and it would shut the whole faculty: a group that is not
		// in the list is open.
		const closed = closedSubjectGroups([
			{ open: false, subjectGroup: { id: 'g1' } },
			{ open: true, subjectGroup: { id: 'g2' } }
		]);
		expect(closed.has('g1')).toBe(true);
		expect(closed.has('g2')).toBe(false);
		expect(closed.has('never-switched')).toBe(false);
	});
});

describe('rowClosedReason', () => {
	const row = (group: { id: string; code: string } | null) => ({ module: { subjectGroup: group } });

	it('says nothing when the round is open', () => {
		expect(rowClosedReason(row({ id: 'g1', code: 'MATHE' }), new Set())).toBeNull();
	});

	it('names the subject group lead as the repair for a shut round', () => {
		// The point of separating this from the phase: a shut window is one switch held by that
		// group's lead, and a sentence about the process would send somebody to the wrong person.
		const reason = rowClosedReason(row({ id: 'g1', code: 'MATHE' }), new Set(['g1']));
		expect(reason).toContain('MATHE');
		expect(reason).toContain('Fachgruppenleitung');
	});

	it('leaves the finished semester to the page head, which says it once', () => {
		// It said it per row as well, and an end-to-end test found the sentence as two elements.
		// What holds for the whole screen belongs at its head.
		expect(rowClosedReason(row({ id: 'g1', code: 'MATHE' }), new Set())).toBeNull();
	});

	it('leaves a module in no subject group open', () => {
		// It cannot be reached by any window, which is the fail-open default the backend takes too.
		expect(rowClosedReason(row(null), new Set(['g1']))).toBeNull();
	});
});

describe('demandStateHint', () => {
	it('marks a programme that has not announced its demand', () => {
		expect(demandStateHint({ programme: { code: 'IF' } }, new Set())).toBe('Bedarf noch in Arbeit');
	});

	it('says nothing once it has, because the ordinary state needs no label', () => {
		expect(demandStateHint({ programme: { code: 'IF' } }, new Set(['IF']))).toBeNull();
	});

	it('is an orientation and not a warning', () => {
		// Registering interest in a programme still working on its demand is allowed and often
		// sensible. A sentence that told somebody to wait would be wrong about the process.
		const hint = demandStateHint({ programme: { code: 'IF' } }, new Set()) ?? '';
		expect(hint).not.toMatch(/warte|noch nicht möglich|gesperrt/i);
	});
});
