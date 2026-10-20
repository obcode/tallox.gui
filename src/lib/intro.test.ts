import { describe, expect, it } from 'vitest';
import { isNavigationRoute } from './guide';
import { HELP } from './help';
import { GLOSSARY, howtos, introRoutes, isCurrentPhase, PHASES, PROMISES } from './intro';
import { PHASE_ORDER } from './semester';

describe('the introduction', () => {
	it('tells every phase, in the order the semester runs through them', () => {
		expect(PHASES.map((p) => p.phase)).toEqual([...PHASE_ORDER]);
	});

	it('says for every phase what happens and what it means for somebody who teaches', () => {
		for (const p of PHASES) {
			expect(p.happens.length, p.phase).toBeGreaterThan(40);
			expect(p.forYou.length, p.phase).toBeGreaterThan(20);
		}
	});

	// Same rule as the walk-through and the help: a place the navigation does not know is a link
	// into nothing.
	it('links only to routes the navigation knows', () => {
		for (const href of introRoutes()) {
			expect(isNavigationRoute(href), `${href} is not in the navigation`).toBe(true);
		}
	});

	// The sentence the whole project hangs on, and the one most easily softened in a rewrite.
	it('promises that wishes stay confidential, including as a number', () => {
		const wishes = PROMISES.find((p) => p.title.startsWith('Wünsche sind vertraulich'));
		expect(wishes?.text).toMatch(/auch keine Anzahl/);
		expect(wishes?.text).toMatch(/Windhundverfahren/);
	});

	it('explains each term once', () => {
		const terms = GLOSSARY.map((t) => t.term);
		expect(new Set(terms).size).toBe(terms.length);
		expect(terms).toEqual(expect.arrayContaining(['Instanz', 'Zug', 'Teil', 'SWS']));
	});
});

describe('the how-tos on the introduction', () => {
	it('borrows them from the help, in three stages, none of them empty', () => {
		const stages = howtos();
		expect(stages.map((s) => s.stage)).toEqual(['ONCE', 'EACH_SEMESTER', 'AFTERWARDS']);
		for (const stage of stages) expect(stage.entries.length, stage.stage).toBeGreaterThan(0);
		for (const entry of stages.flatMap((s) => s.entries)) expect(HELP).toContain(entry);
	});

	it('covers what a lecturer does: subject groups, competences, wishes, own assignments', () => {
		const places = howtos()
			.flatMap((s) => s.entries)
			.map((e) => e.where[0].href);
		expect(places).toEqual(
			expect.arrayContaining([
				'/konto/fachgruppen',
				'/konto/kompetenzen',
				'/wuensche',
				'/konto/zuteilungen',
				'/zuteilung/uebersicht'
			])
		);
	});

	// A stage on an entry only for leads would never be rendered, and silently so.
	it('puts a stage only on entries that concern lecturers', () => {
		for (const entry of HELP.filter((e) => e.stage)) {
			expect(entry.who.length === 0 || entry.who.includes('LECTURER'), entry.question).toBe(true);
		}
	});
});

describe('the mark on the current phase', () => {
	it('marks exactly the phase the planning semester is in', () => {
		const planning = { kind: 'set', code: '2027-SS', phase: 'WISHES' } as const;
		expect(PHASES.filter((p) => isCurrentPhase(p.phase, planning)).map((p) => p.phase)).toEqual([
			'WISHES'
		]);
	});

	it('marks nothing while no semester is named or the backend did not answer', () => {
		for (const planning of [{ kind: 'unset' }, { kind: 'unknown' }] as const) {
			expect(PHASES.some((p) => isCurrentPhase(p.phase, planning))).toBe(false);
		}
	});
});
