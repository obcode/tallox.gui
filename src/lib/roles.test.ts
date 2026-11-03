import { describe, expect, it } from 'vitest';
import {
	ALL_ROLES,
	ROLE_HINTS,
	ROLE_LABELS,
	displayName,
	isOnlooker,
	isPartnerOnly,
	mayPreviewRoles,
	mayPreviewWithoutRoles,
	mayRunImport,
	roleLabel,
	sortRoles
} from './roles';

describe('ROLE_LABELS', () => {
	it('translates every role there is', () => {
		// The mapping from English to the faculty's vocabulary lives in exactly two places: the
		// doc comment on policy.Role and here. A missing translation would surface in the
		// interface as LECTURER, which is not a word to anybody.
		for (const role of ALL_ROLES) {
			expect(ROLE_LABELS[role], role).toBeTruthy();
			expect(ROLE_HINTS[role], role).toBeTruthy();
		}
	});

	it('passes an unknown role through untranslated rather than swallowing it', () => {
		// When the backend has a role this version of the GUI does not know yet, showing it raw
		// beats leaving it out: an administration screen that does not display a granted role is
		// claiming somebody does not hold it.
		expect(roleLabel('FUTURE_ROLE')).toBe('FUTURE_ROLE');
	});
});

describe('sortRoles', () => {
	it('sorts into the order of ALL_ROLES', () => {
		expect(sortRoles(['ADMIN', 'LECTURER', 'DEANS_OFFICE'])).toEqual([
			'LECTURER',
			'DEANS_OFFICE',
			'ADMIN'
		]);
	});

	it('appends unknown values rather than losing them', () => {
		expect(sortRoles(['FUTURE_ROLE', 'LECTURER'])).toEqual(['LECTURER', 'FUTURE_ROLE']);
	});
});

describe('displayName', () => {
	it('shows the address as long as there is no name', () => {
		// The normal case and not an error: people are created with the address alone, because it
		// is the only thing that has to be right. Deriving a name from it would guess at how
		// people write themselves, and be wrong for every title and every umlaut.
		expect(displayName({ mail: 'prof.eins@example.org', name: '' })).toBe('prof.eins@example.org');
		expect(displayName({ mail: 'prof.eins@example.org', name: null })).toBe(
			'prof.eins@example.org'
		);
		expect(displayName({ mail: 'prof.eins@example.org', name: '   ' })).toBe(
			'prof.eins@example.org'
		);
	});

	it('shows the name as soon as there is one', () => {
		expect(displayName({ mail: 'prof.eins@example.org', name: 'Prof. Eins' })).toBe('Prof. Eins');
	});
});

describe('mayPreviewRoles', () => {
	it('offers the preview to everybody holding more than one role', () => {
		// Not for security reasons — narrowing cannot add anything by construction. A study
		// programme lead who also teaches wants to see what lecturers see; somebody with one role
		// has nothing to narrow it to.
		expect(mayPreviewRoles(['LECTURER'])).toBe(false);
		expect(mayPreviewRoles(['LECTURER', 'LECTURER'])).toBe(false);
		expect(mayPreviewRoles(['LECTURER', 'PROGRAMME_LEAD'])).toBe(true);
		expect(mayPreviewRoles(['DEANS_OFFICE', 'LECTURER'])).toBe(true);
		expect(mayPreviewRoles(['ADMIN'])).toBe(true);
		expect(mayPreviewRoles(['LECTURER', 'ADMIN'])).toBe(true);
	});

	it('offers "no role at all" to administrators only', () => {
		expect(mayPreviewWithoutRoles(['LECTURER', 'PROGRAMME_LEAD'])).toBe(false);
		expect(mayPreviewWithoutRoles(['ADMIN'])).toBe(true);
	});

	it('asks the held roles, not the effective ones', () => {
		// The point of the signature: a programme lead currently narrowed to LECTURER no longer
		// acts as one — going by the effective roles, the menu would be gone exactly when it is
		// needed to get back.
		const granted = ['LECTURER', 'PROGRAMME_LEAD'];
		const effectiveWhileNarrowed = ['LECTURER'];

		expect(mayPreviewRoles(granted)).toBe(true);
		expect(mayPreviewRoles(effectiveWhileNarrowed)).toBe(false);
	});
});

describe('a partner faculty', () => {
	// Held alone the role narrows; beside any other, whoever holds it is a colleague.
	it('is a partner only when the role is held alone', () => {
		expect(isPartnerOnly(['PARTNER_READER'])).toBe(true);
		expect(isPartnerOnly(['PARTNER_READER', 'LECTURER'])).toBe(false);
		expect(isPartnerOnly([])).toBe(false);
		expect(isPartnerOnly(['LECTURER'])).toBe(false);
	});
});

describe('an onlooker', () => {
	// A partner faculty or an observer, held alone: neither states anything about itself.
	it('is a partner or an observer holding nothing else', () => {
		expect(isOnlooker(['PARTNER_READER'])).toBe(true);
		expect(isOnlooker(['OBSERVER'])).toBe(true);
		expect(isOnlooker(['OBSERVER', 'LECTURER'])).toBe(false);
		expect(isOnlooker(['PARTNER_READER', 'OBSERVER'])).toBe(false);
		expect(isOnlooker(['LECTURER'])).toBe(false);
		expect(isOnlooker([])).toBe(false);
	});
});

describe('who runs the import', () => {
	// The administration and the dean's office; an observer reads the page and runs nothing.
	it('is the administration and the dean’s office', () => {
		expect(mayRunImport(['ADMIN'])).toBe(true);
		expect(mayRunImport(['DEANS_OFFICE', 'LECTURER'])).toBe(true);
		expect(mayRunImport(['OBSERVER'])).toBe(false);
		expect(mayRunImport(['LECTURER'])).toBe(false);
	});
});
