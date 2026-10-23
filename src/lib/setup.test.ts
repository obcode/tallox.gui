import { describe, expect, it } from 'vitest';
import { isNavigationRoute } from './guide';
import { reachableMinimum, setupCard, type SetupInput } from './setup';

const compulsory = { compulsory: true };
const elective = { compulsory: false };

const software = {
	id: 'g1',
	name: 'Softwarefächer',
	modules: [compulsory, compulsory, compulsory]
};

function input(overrides: Partial<SetupInput> = {}): SetupInput {
	return {
		roles: ['LECTURER'],
		subjectGroups: [],
		competenceStatus: [],
		semester: null,
		...overrides
	};
}

function status(id: string, canTeachCompulsory: number) {
	return { subjectGroup: { id }, canTeachCompulsory, minimum: 3 };
}

const wishes = { code: '2027-SS', phase: 'WISHES' as const, frozen: false, stated: false };

describe('the setup card', () => {
	it('starts with both one-time items open, competences waiting for the groups', () => {
		const card = setupCard(input());
		expect(card?.groups.map((g) => g.title)).toEqual(['Einmal angeben']);
		expect(card?.done).toBe(0);
		expect(card?.total).toBe(2);
		const competences = card?.groups[0].items.find((i) => i.key === 'COMPETENCES');
		expect(competences?.done).toBe(false);
		expect(competences?.text).toContain('sobald Du Deine Fachgruppen');
	});

	it('names the groups below the minimum', () => {
		const card = setupCard(
			input({ subjectGroups: [software], competenceStatus: [status('g1', 1)] })
		);
		expect(card?.done).toBe(1);
		const competences = card?.groups[0].items.find((i) => i.key === 'COMPETENCES');
		expect(competences?.text).toContain('Softwarefächer: 1 von 3');
	});

	// The backend's minimum is flat; a group with fewer compulsory modules must not stay open
	// for good.
	it('asks a group for no more compulsory modules than it has', () => {
		const small = { id: 'g2', name: 'Klein', modules: [compulsory, elective] };
		expect(reachableMinimum(small, 3)).toBe(1);
		expect(setupCard(input({ subjectGroups: [small], competenceStatus: [status('g2', 1)] }))).toBe(
			null
		);
		const none = { id: 'g3', name: 'Nur Wahlfächer', modules: [elective] };
		expect(setupCard(input({ subjectGroups: [none] }))).toBe(null);
	});

	it('is gone once everything is stated', () => {
		const card = setupCard(
			input({
				subjectGroups: [software],
				competenceStatus: [status('g1', 3)],
				semester: { ...wishes, stated: true }
			})
		);
		expect(card).toBe(null);
	});

	// Set up long ago, new planning semester: the one item that comes back every semester.
	it('shows only the semester when the one-time items are done', () => {
		const card = setupCard(
			input({ subjectGroups: [software], competenceStatus: [status('g1', 3)], semester: wishes })
		);
		expect(card?.groups.map((g) => g.title)).toEqual(['Für Sommersemester 2027']);
		expect(card?.groups[0].items.map((i) => i.key)).toEqual(['DESIRED_HOURS']);
		expect(card).toMatchObject({ done: 0, total: 1 });
	});

	it('keeps a stated semester beside open one-time items', () => {
		const card = setupCard(input({ semester: { ...wishes, stated: true } }));
		expect(card?.groups.map((g) => g.title)).toEqual(['Einmal angeben']);
	});

	it('asks for the hours only while they can still be entered and are of use', () => {
		const done = { subjectGroups: [software], competenceStatus: [status('g1', 3)] };
		expect(
			setupCard(input({ ...done, semester: { ...wishes, phase: 'DEMAND_PLANNING' } }))
		).not.toBe(null);
		expect(setupCard(input({ ...done, semester: { ...wishes, frozen: true } }))).toBe(null);
		expect(setupCard(input({ ...done, semester: { ...wishes, phase: 'ASSIGNMENT' } }))).toBe(null);
		expect(setupCard(input({ ...done, semester: { ...wishes, phase: 'REVIEW' } }))).toBe(null);
		expect(setupCard(input({ ...done, semester: null }))).toBe(null);
	});

	it('is a lecturer’s card', () => {
		expect(setupCard(input({ roles: ['PARTNER_READER'] }))).toBe(null);
		expect(setupCard(input({ roles: ['DEANS_OFFICE'] }))).toBe(null);
		expect(setupCard(input({ roles: [] }))).toBe(null);
		expect(setupCard(input({ roles: ['LECTURER', 'SUBJECT_GROUP_LEAD'] }))).not.toBe(null);
	});

	it('links only where the navigation goes', () => {
		const card = setupCard(input({ semester: wishes }));
		for (const item of card?.groups.flatMap((g) => g.items) ?? []) {
			for (const link of item.where) expect(isNavigationRoute(link.href!)).toBe(true);
		}
	});
});
