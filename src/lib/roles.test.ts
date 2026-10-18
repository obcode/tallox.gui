import { describe, expect, it } from 'vitest';
import {
	ALL_ROLES,
	ROLE_HINTS,
	ROLE_LABELS,
	displayName,
	isPartnerOnly,
	mayPreviewRoles,
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
	it('offers the preview to administrators only', () => {
		// Not for security reasons — narrowing cannot add anything by construction. A study
		// programme lead holds two roles and still has no reason to see a button that makes her
		// demand area disappear.
		expect(mayPreviewRoles(['LECTURER'])).toBe(false);
		expect(mayPreviewRoles(['LECTURER', 'PROGRAMME_LEAD'])).toBe(false);
		expect(mayPreviewRoles(['DEANS_OFFICE', 'LECTURER'])).toBe(false);
		expect(mayPreviewRoles(['ADMIN'])).toBe(true);
		expect(mayPreviewRoles(['LECTURER', 'ADMIN'])).toBe(true);
	});

	it('asks the held roles, not the effective ones', () => {
		// The point of the signature: an administrator currently narrowed to LECTURER no longer
		// acts as ADMIN — going by the effective roles, the menu would be gone exactly when it is
		// needed to get back.
		const granted = ['LECTURER', 'ADMIN'];
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
