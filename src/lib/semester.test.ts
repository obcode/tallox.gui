import { describe, expect, it } from 'vitest';
import type { Phase } from '$lib/gql/__generated__/graphql';
import {
	PHASE_HINTS,
	PHASE_LABELS,
	PHASE_ORDER,
	mayStillPublish,
	phaseButtonLabel,
	phaseDirection,
	semesterName,
	semesterShortName,
	wishesAreVisible,
	semesterTerm
} from './semester';

describe('PHASE_LABELS', () => {
	it('translates every phase there is', () => {
		// The mapping from English to the faculty's vocabulary lives in exactly two places: the
		// doc comment on policy.Phase and here. A missing translation would surface as
		// DEMAND_PLANNING on the page, which is not a word to anybody.
		for (const phase of PHASE_ORDER) {
			expect(PHASE_LABELS[phase], phase).toBeTruthy();
			expect(PHASE_HINTS[phase], phase).toBeTruthy();
		}
	});

	it('lists the phases in the order of the process', () => {
		// The same order as policy.AllPhases(). It is what phaseDirection reads, so a list sorted
		// alphabetically here would label a step forwards as a step back.
		expect([...PHASE_ORDER]).toEqual(['DEMAND_PLANNING', 'WISHES', 'ASSIGNMENT', 'FINAL']);
	});
});

describe('semesterName', () => {
	it('spells out a summer semester', () => {
		expect(semesterName('2027-SS')).toBe('Sommersemester 2027');
	});

	it('spells out a winter semester across both years', () => {
		// The interesting case, and the one a naive formatter gets wrong: the year in the code is
		// the one the semester *starts* in, so 2026-WS runs into 2027.
		expect(semesterName('2026-WS')).toBe('Wintersemester 2026/27');
	});

	it('pads the second year of a winter semester across a century', () => {
		expect(semesterName('2099-WS')).toBe('Wintersemester 2099/00');
		expect(semesterName('2009-WS')).toBe('Wintersemester 2009/10');
	});

	it('passes an unrecognised code through rather than guessing', () => {
		// The backend enforces the format with a CHECK constraint, so anything else here means
		// the assumption no longer holds — and then the raw code is the honest thing to show.
		// '2026W' is in the list because it is what this format used to be: the backend rewrote
		// its rows in migration 7, and a code in that shape reaching the page again means
		// something is serving stale data — showing it raw says so.
		for (const code of ['2026W', 'WS 2026', 'SS2027', '2027', '27S', '2027X', '']) {
			expect(semesterName(code), code).toBe(code);
		}
	});
});

describe('semesterShortName', () => {
	it('abbreviates both terms', () => {
		expect(semesterShortName('2027-SS')).toBe('SS 2027');
		expect(semesterShortName('2026-WS')).toBe('WS 2026/27');
	});

	it('leaves an unrecognised code alone', () => {
		expect(semesterShortName('SS2027')).toBe('SS2027');
	});
});

describe('phaseDirection', () => {
	it('reads a step forwards and a step back', () => {
		expect(phaseDirection('DEMAND_PLANNING', 'WISHES')).toBe('forward');
		expect(phaseDirection('ASSIGNMENT', 'WISHES')).toBe('backward');
	});

	it('has no direction for a phase to itself', () => {
		expect(phaseDirection('WISHES', 'WISHES')).toBeNull();
	});

	it('has no direction for a phase it does not know', () => {
		// The server decides which phases exist. A value this build cannot place gets no label
		// rather than a wrong one.
		expect(phaseDirection('WISHES', 'PLANNING_RETREAT' as Phase)).toBeNull();
	});

	it('reads a jump as a direction, because labelling is not permission', () => {
		// Deliberately not null. Whether the step is allowed is the backend's answer, delivered
		// as reachablePhases; this function only decides whether the button says "Weiter" or
		// "Zurück". Refusing to label a non-adjacent step would be a second adjacency rule.
		expect(phaseDirection('DEMAND_PLANNING', 'FINAL')).toBe('forward');
	});
});

describe('phaseButtonLabel', () => {
	it('says forward and back in the faculty vocabulary', () => {
		expect(phaseButtonLabel('DEMAND_PLANNING', 'WISHES')).toBe('Weiter zu Wunschphase');
		expect(phaseButtonLabel('ASSIGNMENT', 'WISHES')).toBe('Zurück zu Wunschphase');
	});

	it('falls back to the raw value for a phase it does not know', () => {
		expect(phaseButtonLabel('WISHES', 'PLANNING_RETREAT' as Phase)).toBe(
			'Weiter zu PLANNING_RETREAT'
		);
	});
});

describe('wishesAreVisible', () => {
	const semester = { code: '2027-SS', phase: 'WISHES' as Phase };

	it('is false while the timestamp is missing', () => {
		expect(wishesAreVisible(semester)).toBe(false);
		expect(wishesAreVisible({ ...semester, wishesPublishedAt: null })).toBe(false);
	});

	it('is true once there is a timestamp', () => {
		expect(wishesAreVisible({ ...semester, wishesPublishedAt: '2026-10-27T09:00:00Z' })).toBe(true);
	});

	it('does not depend on the phase', () => {
		// The two are independent in the backend, with no constraint tying them: the wish phase
		// can close without publishing, and publication can happen while the assignment runs. A
		// display that inferred one from the other would be wrong in whichever order the faculty
		// needs first.
		for (const phase of PHASE_ORDER) {
			expect(wishesAreVisible({ code: '2027-SS', phase }), phase).toBe(false);
			expect(
				wishesAreVisible({ code: '2027-SS', phase, wishesPublishedAt: '2026-10-27T09:00:00Z' }),
				phase
			).toBe(true);
		}
	});
});

describe('mayStillPublish', () => {
	it('is the opposite of wishesAreVisible', () => {
		// Cosmetic only — the backend is idempotent, so a second click is not an error. The
		// button disappears anyway, because a button that no longer does anything looks broken.
		for (const phase of PHASE_ORDER) {
			expect(mayStillPublish({ code: '2027-SS', phase })).toBe(true);
			expect(
				mayStillPublish({ code: '2027-SS', phase, wishesPublishedAt: '2026-10-27T09:00:00Z' })
			).toBe(false);
		}
	});
});

describe('semesterTerm', () => {
	it('reads the term off the code', () => {
		expect(semesterTerm('2026-WS')).toBe('WS');
		expect(semesterTerm('2027-SS')).toBe('SS');
	});

	it('answers nothing for a code that is not one', () => {
		expect(semesterTerm('WS 2026')).toBe('');
		expect(semesterTerm('')).toBe('');
	});
});
