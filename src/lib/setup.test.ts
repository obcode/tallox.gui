import { describe, expect, it } from 'vitest';
import { isNavigationRoute } from './guide';
import { setupCard, type SetupCard, type SetupInput } from './setup';

const software = { id: 'g1', name: 'Softwarefächer' };
const maths = { id: 'g2', name: 'Mathematik' };

function input(overrides: Partial<SetupInput> = {}): SetupInput {
	return {
		roles: ['LECTURER'],
		subjectGroups: [],
		competenceTotal: { canTeachCompulsory: 0, minimum: 3 },
		semester: null,
		...overrides
	};
}

function total(canTeachCompulsory: number, minimum = 3) {
	return { canTeachCompulsory, minimum };
}

/** The card with something open, or a failed expectation. */
function open(card: SetupCard | null) {
	if (!card || card.complete) throw new Error(`expected open items, got ${JSON.stringify(card)}`);
	return card;
}

const wishes = { code: '2027-SS', phase: 'WISHES' as const, frozen: false, stated: false };
const setUp = { subjectGroups: [software], competenceTotal: total(3) };

describe('the setup card', () => {
	it('starts with both one-time items open, competences waiting for the groups', () => {
		const card = open(setupCard(input()));
		expect(card.groups.map((g) => g.title)).toEqual(['Einmal angeben']);
		expect(card.done).toBe(0);
		expect(card.total).toBe(2);
		const competences = card.groups[0].items.find((i) => i.key === 'COMPETENCES');
		expect(competences?.done).toBe(false);
		expect(competences?.text).toContain('sobald Du Deine Fachgruppen');
	});

	it('says how far the total is from the minimum', () => {
		const card = open(setupCard(input({ subjectGroups: [software], competenceTotal: total(1) })));
		expect(card.done).toBe(1);
		const competences = card.groups[0].items.find((i) => i.key === 'COMPETENCES');
		expect(competences?.text).toContain('über alle Deine Fachgruppen zusammen');
		expect(competences?.text).toContain('Bisher 1 von 3');
	});

	// Reported on 2026-10-30: per group, two in software and two in mathematics stayed open twice.
	it('is done with three over two groups', () => {
		const card = setupCard(
			input({
				subjectGroups: [software, maths],
				competenceTotal: total(4),
				semester: { ...wishes, stated: true }
			})
		);
		expect(card?.complete).toBe(true);
	});

	// The backend caps the minimum at the compulsory modules one's groups have; a group of
	// electives must not leave the item open for good.
	it('takes the capped minimum as it comes', () => {
		const card = setupCard(
			input({
				subjectGroups: [software],
				competenceTotal: total(0, 0),
				semester: { ...wishes, stated: true }
			})
		);
		expect(card?.complete).toBe(true);
	});

	// Done must look different from "did not load", which is no card at all.
	it('says so in one line once everything is stated', () => {
		const card = setupCard(input({ ...setUp, semester: { ...wishes, stated: true } }));
		expect(card).toMatchObject({
			complete: true,
			summary:
				'Fachgruppen, Kompetenzen und Deine Wunsch-SWS für das Sommersemester 2027 sind angegeben.'
		});
		expect(card?.complete && card.where.map((l) => l.href)).toEqual([
			'/konto/fachgruppen',
			'/konto/kompetenzen',
			'/wuensche'
		]);
	});

	it('leaves the hours out of the line while they are not asked for', () => {
		const card = setupCard(input({ ...setUp, semester: null }));
		expect(card).toMatchObject({
			complete: true,
			summary: 'Fachgruppen und Kompetenzen sind angegeben.'
		});
	});

	// Set up long ago, new planning semester: the one item that comes back every semester.
	it('shows only the semester when the one-time items are done', () => {
		const card = open(setupCard(input({ ...setUp, semester: wishes })));
		expect(card.groups.map((g) => g.title)).toEqual(['Für Sommersemester 2027']);
		expect(card.groups[0].items.map((i) => i.key)).toEqual(['DESIRED_HOURS']);
		expect(card).toMatchObject({ done: 0, total: 1 });
	});

	it('keeps a stated semester beside open one-time items', () => {
		const card = open(setupCard(input({ semester: { ...wishes, stated: true } })));
		expect(card.groups.map((g) => g.title)).toEqual(['Einmal angeben']);
	});

	it('asks for the hours only while they can still be entered and are of use', () => {
		const complete = (semester: SetupInput['semester']) =>
			setupCard(input({ ...setUp, semester }))?.complete;
		expect(complete({ ...wishes, phase: 'DEMAND_PLANNING' })).toBe(false);
		expect(complete({ ...wishes, frozen: true })).toBe(true);
		expect(complete({ ...wishes, phase: 'ASSIGNMENT' })).toBe(true);
		expect(complete({ ...wishes, phase: 'REVIEW' })).toBe(true);
		expect(complete(null)).toBe(true);
	});

	it('is a lecturer’s card', () => {
		expect(setupCard(input({ roles: ['PARTNER_READER'] }))).toBe(null);
		expect(setupCard(input({ roles: ['DEANS_OFFICE'] }))).toBe(null);
		expect(setupCard(input({ roles: [] }))).toBe(null);
		expect(setupCard(input({ roles: ['LECTURER', 'SUBJECT_GROUP_LEAD'] }))).not.toBe(null);
	});

	it('links only where the navigation goes', () => {
		const card = open(setupCard(input({ semester: wishes })));
		for (const item of card.groups.flatMap((g) => g.items)) {
			for (const link of item.where) expect(isNavigationRoute(link.href!)).toBe(true);
		}
	});
});
