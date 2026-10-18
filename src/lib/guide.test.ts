import { describe, expect, it } from 'vitest';
import {
	DUE_NOW_LIMIT,
	dueCard,
	dueNow,
	GUIDE,
	guideRoutes,
	isDue,
	isNavigationRoute,
	mayOpen
} from './guide';
import { PHASE_ORDER } from './semester';

describe('the walk-through', () => {
	// A step that points at a page the navigation does not know is a link into nothing — or,
	// worse, a link into a page that exists but that the menu hides from this person on purpose.
	it('links only to routes the navigation knows', () => {
		for (const href of guideRoutes()) {
			expect(isNavigationRoute(href), `${href} is not in the navigation`).toBe(true);
		}
	});

	// The lecturer is everybody's baseline, and the administration is hidden from them in the
	// menu — so the guide must not link them there either, while it still names the step.
	it('links where the menu links, and not where it hides', () => {
		expect(mayOpen('/verwaltung/personen', ['LECTURER'])).toBe(false);
		expect(mayOpen('/verwaltung/personen', ['ADMIN'])).toBe(true);
		expect(mayOpen('/verwaltung/studiengaenge', ['LECTURER'])).toBe(false);
		expect(mayOpen('/verwaltung/studiengaenge', ['DEANS_OFFICE'])).toBe(true);
		// Readable by everybody: the demand is what the wish phase is about, and who leads which
		// subject group is what the faculty looks like.
		expect(mayOpen('/bedarf', ['LECTURER'])).toBe(true);
		expect(mayOpen('/verwaltung/fachgruppen', ['LECTURER'])).toBe(true);
		expect(mayOpen('/zuteilung', ['LECTURER'])).toBe(false);
		expect(mayOpen('/zuteilung', ['SUBJECT_GROUP_LEAD'])).toBe(true);
	});

	// Every step says who does it and where, or it is a sentence and not a step.
	it('names a place for every step', () => {
		for (const section of GUIDE) {
			for (const step of section.steps) {
				expect(step.where.length, `${step.title} names no page`).toBeGreaterThan(0);
				expect(step.text.length, `${step.title} explains nothing`).toBeGreaterThan(40);
			}
		}
	});

	// The faculty's rhythm (step 8 in weeks 1–2 up to the assignment in weeks 8–9) is what a
	// subject group lead plans the term around. Every per-semester step says when; the one-time
	// setup does not, because it hangs on no semester.
	it('says when each per-semester step happens, and only those', () => {
		const [setup, perSemester] = GUIDE;
		for (const step of setup.steps) expect(step.when, step.title).toBeUndefined();
		for (const step of perSemester.steps) expect(step.when, step.title).toMatch(/Semesterwoche/);
	});

	// The demand stays writable through the wish and the assignment phase, and the guide says so,
	// because a forgotten module or a lecturer who drops out is the normal case, not an exception.
	it('says that the demand can still change after the demand step', () => {
		const steps = GUIDE.flatMap((s) => s.steps);
		expect(steps.find((s) => s.title === 'Interesse bekunden')?.text).toMatch(/Bedarf/);
		expect(steps.find((s) => s.title === 'Die Instanzen besetzen')?.text).toMatch(
			/lässt sich der Bedarf noch ändern/
		);
	});

	// The review is the step after the assignment, and the guide says that everything stays
	// changeable there until the semester is over — the faculty's own words were "bis zum Schluss".
	it('puts the programme review between the assignment and the close', () => {
		const titles = GUIDE[1].steps.map((s) => s.title);
		const assign = titles.indexOf('Die Instanzen besetzen');
		expect(titles[assign + 1]).toBe('Studiengangs-Review');
		expect(titles[assign + 2]).toBe('Abschließen');
		const review = GUIDE[1].steps[assign + 1];
		expect(review.text).toMatch(/änderbar, bis das Semester vorbei ist/);
		expect(review.where.map((w) => w.href)).toContain('/statistik');
	});

	// The confidentiality rule is the one sentence the start page may never get wrong.
	it('says that wishes stay confidential until they are published', () => {
		const wishes = GUIDE.flatMap((s) => s.steps).find((s) => s.title === 'Interesse bekunden');
		expect(wishes?.text).toMatch(
			/Bis zur Veröffentlichung sieht das niemand sonst, auch nicht als Anzahl/
		);
	});
});

const titles = (steps: { title: string }[]) => steps.map((s) => s.title);

/**
 * "Jetzt dran": what the start page and the help panel say is due.
 *
 * The phase is the faculty's beat, not a lock — but what the card says has to match what the
 * walk-through says, or the two answers to "what do I do now" drift apart. These tests pin the
 * mapping a person actually meets.
 */
describe('what is due now', () => {
	it('tells a programme lead to plan the demand while the demand is being planned', () => {
		expect(titles(dueNow('DEMAND_PLANNING', ['LECTURER', 'PROGRAMME_LEAD']))).toEqual([
			'Den Bedarf festlegen'
		]);
	});

	it('tells everybody to enter wishes in the wish phase, and a lead to close the round', () => {
		expect(titles(dueNow('WISHES', ['LECTURER']))).toEqual(['Interesse bekunden']);
		expect(titles(dueNow('WISHES', ['LECTURER', 'SUBJECT_GROUP_LEAD']))).toEqual([
			'Interesse bekunden',
			'Die Wunschrunde der Fachgruppe schließen'
		]);
		expect(titles(dueNow('WISHES', ['LECTURER', 'DEANS_OFFICE']))).toContain(
			'Die Wünsche veröffentlichen'
		);
	});

	// The round is open from the start, and the step says so. The opposite sentence ("the lead
	// opens it") would send a lecturer to wait for something nobody has to do.
	it('says the wish round is open until somebody closes it', () => {
		const step = GUIDE[1].steps.find((s) => s.title === 'Die Wunschrunde der Fachgruppe schließen');
		expect(step?.text).toMatch(/offen, solange niemand sie schließt/);
		expect(step?.where.map((w) => w.href)).toEqual(['/zuteilung']);
	});

	it('shows a lecturer nothing in the assignment', () => {
		expect(dueNow('ASSIGNMENT', ['LECTURER'])).toEqual([]);
		expect(titles(dueNow('ASSIGNMENT', ['SUBJECT_GROUP_LEAD']))).toEqual([
			'Die Instanzen besetzen'
		]);
	});

	// The close happens at the end of the planned semester. Shown as due in the review, it would
	// read like a prompt to do it after week 9 — which the walk-through explicitly warns against.
	it('never shows the close as due', () => {
		for (const phase of PHASE_ORDER) {
			expect(titles(dueNow(phase, ['DEANS_OFFICE']))).not.toContain('Abschließen');
		}
	});

	it('asks the dean’s office for a planning semester when none is set, or the last one is over', () => {
		expect(titles(dueNow(null, ['DEANS_OFFICE']))).toEqual(['Das Planungssemester setzen']);
		expect(titles(dueNow('FINAL', ['DEANS_OFFICE']))).toEqual(['Das Planungssemester setzen']);
		expect(dueNow(null, ['LECTURER'])).toEqual([]);
	});

	it('shows nothing without roles, rather than everybody’s steps', () => {
		expect(dueNow('WISHES', [])).toEqual([]);
	});

	it('gives every phase at least one step for somebody', () => {
		for (const phase of PHASE_ORDER) {
			expect(
				dueNow(phase, ['DEANS_OFFICE', 'PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'LECTURER']).length,
				phase
			).toBeGreaterThan(0);
		}
	});

	it('never marks a one-time setup step as due', () => {
		for (const step of GUIDE[0].steps) expect(step.due, step.title).toBeUndefined();
	});
});

describe('the "Jetzt dran" card', () => {
	it('names the semester and the phase above the steps', () => {
		const card = dueCard({ kind: 'set', code: '2027-SS', phase: 'WISHES' }, ['LECTURER']);
		expect(card.heading).toBe('Sommersemester 2027 · Wunschphase');
		expect(titles(card.steps)).toEqual(['Interesse bekunden']);
		expect(card.note).toBeNull();
		expect(card.more).toBe(0);
	});

	it('says so in a sentence when nothing is due, instead of an empty list', () => {
		const card = dueCard({ kind: 'set', code: '2026-WS', phase: 'ASSIGNMENT' }, ['LECTURER']);
		expect(card.steps).toEqual([]);
		expect(card.note).toMatch(/„Zuteilung“ ist für Deine Rollen gerade nichts Bestimmtes dran/);
	});

	it('tells everybody but the dean’s office that no planning semester has been named', () => {
		const lecturer = dueCard({ kind: 'unset' }, ['LECTURER']);
		expect(lecturer.heading).toBe('Noch kein Planungssemester');
		expect(lecturer.note).toMatch(/Das Dekanat hat noch nicht gesagt/);

		const dean = dueCard({ kind: 'unset' }, ['DEANS_OFFICE']);
		expect(titles(dean.steps)).toEqual(['Das Planungssemester setzen']);
		expect(dean.note).toBeNull();
	});

	// Backend down: the card must not claim a phase it does not know.
	it('claims nothing when the state is unknown', () => {
		const card = dueCard({ kind: 'unknown' }, ['LECTURER']);
		expect(card.heading).toBeNull();
		expect(card.steps).toEqual([]);
		expect(card.note).toMatch(/nicht abrufen/);
	});

	it('lists at most the limit and counts the rest', () => {
		// Nobody holds enough roles today to exceed it; the cap is for the day a phase grows.
		const everybody = ['LECTURER', 'SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE', 'ADMIN'];
		const card = dueCard({ kind: 'set', code: '2027-SS', phase: 'WISHES' }, everybody);
		const all = dueNow('WISHES', everybody);
		expect(card.steps.length).toBe(Math.min(all.length, DUE_NOW_LIMIT));
		expect(card.more).toBe(Math.max(0, all.length - DUE_NOW_LIMIT));
	});
});

describe('the mark on the walk-through', () => {
	const steps = GUIDE.flatMap((s) => s.steps);
	const step = (title: string) => steps.find((s) => s.title === title)!;

	it('marks the steps of the current phase, whoever does them', () => {
		const wishes = { kind: 'set', code: '2027-SS', phase: 'WISHES' } as const;
		expect(isDue(step('Interesse bekunden'), wishes)).toBe(true);
		expect(isDue(step('Die Wünsche veröffentlichen'), wishes)).toBe(true);
		expect(isDue(step('Den Bedarf festlegen'), wishes)).toBe(false);
	});

	it('marks the planning semester step while none is set, and nothing when unknown', () => {
		expect(isDue(step('Das Planungssemester setzen'), { kind: 'unset' })).toBe(true);
		expect(isDue(step('Das Planungssemester setzen'), { kind: 'unknown' })).toBe(false);
	});
});

describe('what is due for a partner faculty', () => {
	// The steps for everybody are a colleague's — choosing groups, stating competences, wishes.
	it('names none of the steps one does for oneself', () => {
		for (const phase of PHASE_ORDER) {
			expect(dueNow(phase, ['PARTNER_READER']).filter((s) => s.who.length === 0)).toEqual([]);
		}
		expect(mayOpen('/wuensche', ['PARTNER_READER'])).toBe(false);
		expect(mayOpen('/statistik', ['PARTNER_READER'])).toBe(true);
	});
});
