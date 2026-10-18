import { describe, expect, it } from 'vitest';
import {
	ACCOUNT_ITEMS,
	areaFor,
	isActive,
	NAV_ITEMS,
	visibleNavItems,
	type NavItem
} from './navigation';

/** Every destination in the navigation, children included. */
function allHrefs(items: readonly NavItem[]): string[] {
	return items.flatMap((i) => [...(i.href ? [i.href] : []), ...allHrefs(i.children ?? [])]);
}

describe('isActive', () => {
	it('marks the start page only on exactly /', () => {
		const start = { emoji: '🏠', label: 'Start', href: '/' as const, hint: '' };
		expect(isActive(start, '/')).toBe(true);
		expect(isActive(start, '/module')).toBe(false);
	});

	it('never marks areas that have no route', () => {
		expect(isActive({ emoji: '📚', label: 'Module', hint: '' }, '/module')).toBe(false);
	});
});

describe('NAV_ITEMS', () => {
	it('has an emoji and a hint for every entry', () => {
		for (const item of NAV_ITEMS) {
			expect(item.emoji, item.label).not.toBe('');
			expect(item.hint, item.label).not.toBe('');
		}
	});

	it('uses every label only once', () => {
		const labels = NAV_ITEMS.map((i) => i.label);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('leads to every destination only once, tabs included', () => {
		// Two ways to the same place means one of them looks wrong as soon as the other is active.
		const hrefs = allHrefs([...NAV_ITEMS, ...ACCOUNT_ITEMS]);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it('puts what every lecturer does for themselves in one area', () => {
		const teaching = visibleNavItems(NAV_ITEMS, ['LECTURER']).find(
			(i) => i.label === 'Meine Lehre'
		)!;
		expect(teaching.children!.map((c) => c.href)).toEqual([
			'/wuensche',
			'/konto/zuteilungen',
			'/konto/kompetenzen',
			'/konto/fachgruppen'
		]);
		expect(teaching.href).toBe('/wuensche');
	});
});

describe('areas with tabs', () => {
	it('are active on any of their pages, and only there', () => {
		const teaching = NAV_ITEMS.find((i) => i.label === 'Meine Lehre')!;
		expect(isActive(teaching, '/konto/kompetenzen')).toBe(true);
		expect(isActive(teaching, '/konto/tokens')).toBe(false);
	});

	it('keep the assignment tab off the competence pool below it', () => {
		const area = areaFor('/zuteilung/kompetenzen', ['SUBJECT_GROUP_LEAD'])!;
		const active = area.children!.filter((c) => isActive(c, '/zuteilung/kompetenzen'));
		expect(active.map((c) => c.label)).toEqual(['Kompetenzen der Fachgruppe']);
		expect(areaFor('/zuteilung', ['SUBJECT_GROUP_LEAD'])!.label).toBe('Zuteilung');
	});

	it('show the administration by role, and land on the first tab one may see', () => {
		const admin = (roles: string[]) =>
			visibleNavItems(NAV_ITEMS, roles).find((i) => i.label === 'Verwaltung');
		expect(admin(['LECTURER'])).toBeUndefined();
		// The overview of the groups is readable by everybody, but it is no reason for a bar entry.
		expect(admin(['SUBJECT_GROUP_LEAD'])).toBeUndefined();

		const deans = admin(['DEANS_OFFICE'])!;
		expect(deans.href).toBe('/semester');
		expect(deans.children!.map((c) => c.label)).toEqual([
			'Semester',
			'Studiengänge',
			'Fachgruppen',
			'ZPA-Import'
		]);

		const full = admin(['ADMIN'])!;
		expect(full.href).toBe('/verwaltung/personen');
		expect(full.children!.map((c) => c.label)).toContain('Diagnose');
		expect(full.children!.map((c) => c.label)).not.toContain('Studiengänge');
		// ADMIN runs the installation, not the process: the phases are the dean's office's.
		expect(full.children!.map((c) => c.label)).not.toContain('Semester');
	});

	it('give a tab bar inside an area, and none outside', () => {
		expect(areaFor('/module', ['LECTURER'])).toBeNull();
		expect(areaFor('/konto/tokens', ['LECTURER'])).toBeNull();
		expect(areaFor('/wuensche', ['LECTURER'])!.children).toHaveLength(4);
	});
});

describe('ACCOUNT_ITEMS', () => {
	it('has a destination for every entry', () => {
		// Unlike NAV_ITEMS there are no "still to come" entries here: the account menu shows tools
		// that exist, and a dead entry in it would just be a click into nothing.
		for (const item of ACCOUNT_ITEMS) {
			expect(item.href).toBeTruthy();
			expect(item.hint).toBeTruthy();
		}
	});

	it('holds the account and nothing else', () => {
		// The help, the API documentation and the administration moved out; the menu is "me".
		expect(ACCOUNT_ITEMS.map((i) => i.href)).toEqual(['/konto/rollen', '/konto/tokens']);
	});
});

describe('visibleNavItems', () => {
	it('shows entries with no role requirement to everybody', () => {
		const items = [{ emoji: '🏠', label: 'Start', href: '/' as const, hint: 'x' }];
		expect(visibleNavItems(items, [])).toEqual(items);
	});

	it('hides what the role is missing for', () => {
		const items = [
			{ emoji: '📊', label: 'Statistik', hint: 'x', roles: ['DEANS_OFFICE'] as const },
			{ emoji: '✋', label: 'Wünsche', hint: 'x' }
		];
		expect(visibleNavItems(items, ['LECTURER']).map((i) => i.label)).toEqual(['Wünsche']);
		expect(visibleNavItems(items, ['DEANS_OFFICE']).map((i) => i.label)).toEqual([
			'Statistik',
			'Wünsche'
		]);
	});

	it('accepts any one of the named roles', () => {
		const items = [
			{
				emoji: '🧩',
				label: 'Zuteilung',
				hint: 'x',
				roles: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'] as const
			}
		];
		expect(visibleNavItems(items, ['PROGRAMME_LEAD'])).toHaveLength(1);
	});

	it('drops an area none of whose tabs is left', () => {
		const items: NavItem[] = [
			{
				emoji: '🛠️',
				label: 'Verwaltung',
				hint: 'x',
				children: [
					{
						emoji: '🔍',
						label: 'Diagnose',
						href: '/verwaltung/diagnose',
						hint: 'x',
						roles: ['ADMIN']
					}
				]
			}
		];
		expect(visibleNavItems(items, ['LECTURER'])).toEqual([]);
		expect(visibleNavItems(items, ['ADMIN'])[0].href).toBe('/verwaltung/diagnose');
	});
});

describe('the bar of a partner faculty', () => {
	const labels = (roles: string[]) => visibleNavItems(NAV_ITEMS, roles).map((i) => i.label);

	// A partner reads the planning of its programmes and states nothing about itself.
	it('offers the demand and the statistics, and none of the pages one fills in oneself', () => {
		const bar = labels(['PARTNER_READER']);
		expect(bar).toContain('Bedarf');
		expect(bar).toContain('Statistik');
		expect(bar).not.toContain('Meine Lehre');
		expect(bar).toContain('Zuteilung');
	});

	it('gives a partner who also teaches here everything a colleague has', () => {
		expect(labels(['PARTNER_READER', 'LECTURER'])).toContain('Meine Lehre');
	});
});

describe('the assignment area', () => {
	const area = (roles: string[]) =>
		visibleNavItems(NAV_ITEMS, roles).find((i) => i.label === 'Zuteilung');

	// Everybody reads the published assignment; the leads still land where they fill it.
	it('leads a lecturer to the overview and a lead to the filling', () => {
		expect(area(['LECTURER'])!.href).toBe('/zuteilung/uebersicht');
		expect(area(['LECTURER'])!.children!.map((c) => c.label)).toEqual(['Übersicht']);
		expect(area(['LECTURER', 'SUBJECT_GROUP_LEAD'])!.href).toBe('/zuteilung');
		expect(area(['PARTNER_READER'])!.href).toBe('/zuteilung/uebersicht');
	});
});
