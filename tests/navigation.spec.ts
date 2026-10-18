import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, openDropdown, test } from './fixtures';

/**
 * The bar holds areas, an area holds its pages as tabs. What every lecturer does for themselves —
 * wishes, competences, subject groups — is one area; the identity menu is the account and nothing
 * else; the administration is an area of its own for whoever runs it.
 */
test.describe('areas and their tabs', () => {
	test('a lecturer finds wishes, competences and subject groups in one place', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await page.getByRole('banner').getByRole('link', { name: 'Meine Lehre' }).click();
		await expect(page).toHaveURL(/\/wuensche/);

		const tabs = page.getByRole('navigation', { name: 'Meine Lehre' });
		await expect(tabs.getByRole('link')).toHaveText(['Wünsche', 'Kompetenzen', 'Fachgruppen']);
		await expect(tabs.getByRole('link', { name: 'Wünsche' })).toHaveAttribute(
			'aria-current',
			'page'
		);

		await tabs.getByRole('link', { name: 'Kompetenzen' }).click();
		await expect(page.getByRole('heading', { name: 'Meine Kompetenzen', level: 1 })).toBeVisible();
		await expect(tabs.getByRole('link', { name: 'Kompetenzen' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		// The area stays marked in the bar on every one of its pages.
		await expect(
			page.getByRole('banner').getByRole('link', { name: 'Meine Lehre' }).first()
		).toHaveAttribute('aria-current', 'page');

		await checkA11y(page);
	});

	test('the identity menu is the account and nothing else', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/');

		await openDropdown(page, /Admin/);
		const menu = page.getByRole('banner').locator('.dropdown-content').first();
		await expect(menu.getByRole('link')).toHaveText([/Meine Rollen$/, /Tokens$/]);
	});

	test('the administration shows each role its own tabs', async ({ asPersona }) => {
		const admin = await asPersona(PERSONAS.sechs);
		await gotoRendered(admin, '/');
		await admin.getByRole('banner').getByRole('link', { name: 'Verwaltung' }).click();
		await expect(admin).toHaveURL(/\/verwaltung\/personen$/);
		await expect(
			admin.getByRole('navigation', { name: 'Verwaltung' }).getByRole('link')
		).toHaveText(['Personen', 'Fachgruppen', 'ZPA-Import', 'Zugriffe', 'Diagnose']);

		// The dean's office lands on the programmes and is offered none of the installation's own
		// screens — the log of accesses and the diagnosis are ADMIN's.
		const deans = await asPersona(PERSONAS.fuenf);
		await gotoRendered(deans, '/');
		await deans.getByRole('banner').getByRole('link', { name: 'Verwaltung' }).click();
		await expect(deans).toHaveURL(/\/verwaltung\/studiengaenge$/);
		await expect(
			deans.getByRole('navigation', { name: 'Verwaltung' }).getByRole('link')
		).toHaveText(['Studiengänge', 'Fachgruppen', 'ZPA-Import']);
	});
});
