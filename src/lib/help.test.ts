import { describe, expect, it } from 'vitest';
import { isNavigationRoute } from './guide';
import { HELP, helpFor, helpRoutes } from './help';

describe('the short answers in the help panel', () => {
	// Same rule as the walk-through: a place the navigation does not know is a link into nothing.
	it('links only to routes the navigation knows', () => {
		for (const href of helpRoutes()) {
			expect(isNavigationRoute(href), `${href} is not in the navigation`).toBe(true);
		}
	});

	it('names a place and gives an answer for every question', () => {
		for (const entry of HELP) {
			expect(entry.where.length, entry.question).toBeGreaterThan(0);
			expect(entry.answer.length, entry.question).toBeGreaterThan(40);
		}
	});

	it('asks every question only once', () => {
		const questions = HELP.map((e) => e.question);
		expect(new Set(questions).size).toBe(questions.length);
	});

	it('shows a lecturer the questions for everybody, and not the ones for leads', () => {
		const { here, more } = helpFor(['LECTURER'], '/');
		const all = [...here, ...more].map((e) => e.question);
		expect(all).toContain('Wer sieht meine Wünsche?');
		expect(all.some((q) => q.includes('Wunschrunde'))).toBe(false);
		expect(all.some((q) => q.includes('Bedarf'))).toBe(false);
	});

	it('shows a subject group lead how to close the wish round', () => {
		const { here, more } = helpFor(['LECTURER', 'SUBJECT_GROUP_LEAD'], '/');
		expect([...here, ...more].map((e) => e.question)).toContain(
			'Wie schließe ich die Wunschrunde meiner Fachgruppe, und wie öffne ich sie wieder?'
		);
	});

	it('puts the questions about the current page first, including its sub-pages', () => {
		const onDemand = helpFor(['PROGRAMME_LEAD'], '/bedarf');
		expect(onDemand.here.length).toBeGreaterThan(0);
		for (const entry of onDemand.here) {
			expect(entry.where.some((w) => w.href === '/bedarf')).toBe(true);
		}
		expect(onDemand.more.every((e) => !e.where.some((w) => w.href === '/bedarf'))).toBe(true);

		const onSub = helpFor(['PROGRAMME_LEAD'], '/bedarf/sws');
		expect(onSub.here).toEqual(onDemand.here);
	});

	// "On the start page" is not "every page": `/` must not count as the prefix of everything.
	it('treats nothing as being about the start page', () => {
		expect(helpFor(['DEANS_OFFICE'], '/').here).toEqual([]);
	});

	// The one sentence about wishes the help may never get wrong.
	it('says that wishes stay confidential, including as a number', () => {
		const entry = HELP.find((e) => e.question === 'Wer sieht meine Wünsche?');
		expect(entry?.answer).toMatch(/auch keine Anzahl/);
	});

	it('says that changes save themselves, and when it asks instead', () => {
		const entry = HELP.find((e) => e.question.includes('Speichern'));
		expect(entry?.who).toEqual([]);
		expect(entry?.answer).toMatch(/sobald Du sie setzt/);
		expect(entry?.answer).toMatch(/gespeichert oder verworfen/);
	});
});
