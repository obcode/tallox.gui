import { describe, expect, it } from 'vitest';
import type { Role } from '$lib/gql/__generated__/graphql';
import {
	needsAttention,
	programmeReach,
	reachHint,
	subjectGroupReach,
	type ScopeReach
} from './myRoles';

const one = [{}];
const none: unknown[] = [];

describe('reading an empty scope list', () => {
	// The whole reason this module exists. The same empty list means three different things,
	// and two of them are opposites — a page that rendered "keine" for all three would tell the
	// dean's office the reverse of the truth.
	it('is "all of them" for the dean\'s office', () => {
		const roles: Role[] = ['LECTURER', 'DEANS_OFFICE'];
		expect(programmeReach(roles, none).kind).toBe('all');
		expect(subjectGroupReach(roles, none).kind).toBe('all');
	});

	it('is "may do nothing" for a lead nobody has assigned anything', () => {
		expect(programmeReach(['PROGRAMME_LEAD'], none).kind).toBe('none');
		expect(subjectGroupReach(['SUBJECT_GROUP_LEAD'], none).kind).toBe('none');
	});

	it('is "the question does not apply" for somebody without the role', () => {
		expect(programmeReach(['LECTURER'], none).kind).toBe('not-held');
		expect(subjectGroupReach(['LECTURER'], none).kind).toBe('not-held');
	});
});

describe('the axes are separate', () => {
	// Neither implies the other: somebody can be correctly set up on one and waiting on the
	// other, which is exactly the state that looks like a broken tool from every other screen.
	it('reports a correctly scoped programme lead who leads no subject group', () => {
		const roles: Role[] = ['LECTURER', 'PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD'];
		expect(programmeReach(roles, one).kind).toBe('some');
		expect(subjectGroupReach(roles, none).kind).toBe('none');
	});
});

describe("the dean's office wins over a scoped role held beside it", () => {
	// Holding both is ordinary, and the wider grant is the truth: a scoped list rendered for
	// somebody who reaches everything would understate what they may do.
	it('answers "all" even when a scoped list came back', () => {
		const roles: Role[] = ['DEANS_OFFICE', 'PROGRAMME_LEAD'];
		expect(programmeReach(roles, one).kind).toBe('all');
	});
});

describe('the sentence beside the answer', () => {
	it('explains both of the empty cases and neither of the others', () => {
		expect(reachHint({ kind: 'all' }, 'programme')).toContain('Alle Studiengänge');
		expect(reachHint({ kind: 'none' }, 'subjectGroup')).toContain('erlaubt nichts');
		expect(reachHint({ kind: 'some' }, 'programme')).toBeNull();
		expect(reachHint({ kind: 'not-held' }, 'programme')).toBeNull();
	});

	it('names what is missing rather than saying it is not allowed', () => {
		// The distinction the backend draws too: somebody who reads "you may not" goes and asks
		// for a role they already hold.
		const hint = reachHint({ kind: 'none' }, 'subjectGroup') ?? '';
		expect(hint).toContain('zugeordnet');
		expect(hint).toContain('Administration');
	});
});

describe('which state is worth a warning', () => {
	// Only the one that looks like a working setup from everywhere else: the role is there, the
	// menu shows the area, and every list inside it is empty.
	it('is the assigned-nothing state and no other', () => {
		const reaches: ScopeReach[] = [
			{ kind: 'all' },
			{ kind: 'some' },
			{ kind: 'none' },
			{ kind: 'not-held' }
		];
		expect(reaches.filter(needsAttention)).toEqual([{ kind: 'none' }]);
	});
});
