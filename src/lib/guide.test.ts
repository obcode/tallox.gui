import { describe, expect, it } from 'vitest';
import { GUIDE, guideRoutes, isNavigationRoute, mayOpen } from './guide';

describe('the guide on the start page', () => {
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

	// The confidentiality rule is the one sentence the start page may never get wrong.
	it('says that wishes stay confidential until they are published', () => {
		const wishes = GUIDE.flatMap((s) => s.steps).find((s) => s.title === 'Interesse bekunden');
		expect(wishes?.text).toMatch(
			/Bis zur Veröffentlichung sieht das niemand sonst, auch nicht als Anzahl/
		);
	});
});
