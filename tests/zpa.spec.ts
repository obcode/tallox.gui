import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';

/**
 * The ZPA import page, against the real stack.
 *
 * Two things here that no Go test sees. The four backend fields are `@interactiveOnly`, so the
 * API console under /api-doku — which goes through the token door — answers `null` for all of
 * them; without this page they are unreachable in production, which is exactly what happened to
 * `diagnoseAccess` on its first attempt. And the page has to be honest about an installation
 * that has never imported, which is the state every fresh database is in and the one a
 * developer sees first.
 */
test.describe('the ZPA import page', () => {
	test('the dean’s office sees it and can ask for a run', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/verwaltung/zpa');

		await expect(page.getByRole('heading', { name: 'ZPA-Import' })).toBeVisible();

		// The one thing on this page that must always be readable. On a database with no runs
		// it says so in a sentence rather than showing a dash — an installation that has never
		// imported is one whose module catalogue is empty, and that is not a detail.
		await expect(page.getByText(/erfolgreichen? Abgleich/i).first()).toBeVisible();

		await expect(page.getByRole('button', { name: 'Jetzt abgleichen' })).toBeVisible();

		await checkA11y(page);
	});

	test('an administrator sees it too', async ({ asPersona }) => {
		// The union of ADMIN and DEANS_OFFICE is the first rule in the backend that joins those
		// two roles, so both halves are worth an assertion here: the act is operational, the
		// need for it arises in planning.
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/zpa');

		await expect(page.getByRole('heading', { name: 'ZPA-Import' })).toBeVisible();
	});

	test('a lecturer is refused', async ({ asPersona }) => {
		// Cosmetic hiding is not the point — the lock is policy.MayReadZPAImport and it is
		// checked through both doors in Go. What this proves is that the refusal arrives as a
		// page and not as a broken screen.
		const page = await asPersona(PERSONAS.eins);
		const response = await page.goto('/verwaltung/zpa');

		expect(response?.status()).toBe(403);
	});

	test('the entry is not in a lecturer’s menu', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await expect(page.getByRole('link', { name: /ZPA-Import/ })).toHaveCount(0);
	});
});
