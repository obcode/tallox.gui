import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';

/**
 * The observer, against the real stack: the bar it is offered and the import page it reads. The
 * rules themselves are asserted in Go (`bootstrap/observer_test.go`); what this proves is that a
 * screen shows an observer what it reads and no button that would only meet a refusal.
 */
test.describe('an observer', () => {
	test('is offered what it reads and none of the pages one fills in oneself', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.observer);
		await gotoRendered(page, '/');

		await expect(page.getByRole('link', { name: /Meine Lehre/ })).toHaveCount(0);
		await expect(page.getByRole('region', { name: /Dein Stand/ })).toHaveCount(0);
		await expect(page.getByRole('link', { name: /Statistik/ }).first()).toBeAttached();

		await checkA11y(page);
	});

	test('reads the import page and finds no button to run it', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.observer);
		await gotoRendered(page, '/verwaltung/zpa');

		await expect(page.getByRole('heading', { name: 'ZPA-Import' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Jetzt abgleichen' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Katalog neu aufbauen' })).toHaveCount(0);

		await checkA11y(page);
	});
});
