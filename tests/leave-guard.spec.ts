import { expect, type Page } from '@playwright/test';
import { PERSONAS, test } from './fixtures';

/**
 * Leaving a page with something typed into a form that is sent by a button.
 *
 * Most forms save themselves; these do not, because saving half of them would be wrong — a token
 * or an account needs all its fields at once. Leaving such a form with something in it asks:
 * save, discard, or stay. Asked for on 2026-10-20, after a tick on a page with a "Speichern"
 * button was lost on the way to the next page.
 *
 * The self-saving half — leaving waits for the save — is in `own-subject-groups.spec.ts`, on the
 * exact path it was reported on.
 */

/** Waits until the page is interactive: the guard and the actions attach on hydration. */
async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Noch nicht gespeichert' });

test.describe('leaving a form with unsaved input', () => {
	test('asks, and staying keeps what was typed', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await open(page, '/konto/tokens');

		await page.getByLabel('Wofür?').fill('Auswertung im Notebook');
		await page.getByRole('link', { name: 'Tallox', exact: true }).first().click();

		await expect(dialog(page)).toBeVisible();
		await expect(dialog(page)).toContainText('Neues Token');
		await checkA11y(page);

		// A token is not created from the dialog: its secret is shown once, on this page.
		await expect(dialog(page).getByRole('button', { name: 'Speichern' })).toHaveCount(0);

		await dialog(page).getByRole('button', { name: 'Hier bleiben' }).click();
		await expect(dialog(page)).toBeHidden();
		await expect(page).toHaveURL(/\/konto\/tokens$/);
		await expect(page.getByLabel('Wofür?')).toHaveValue('Auswertung im Notebook');
	});

	test('Escape means stay', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await open(page, '/konto/tokens');

		await page.getByLabel('Wofür?').fill('etwas');
		await page.getByRole('link', { name: 'Tallox', exact: true }).first().click();
		await expect(dialog(page)).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(dialog(page)).toBeHidden();
		await expect(page).toHaveURL(/\/konto\/tokens$/);
	});

	test('discarding goes where the click was meant to go', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await open(page, '/konto/tokens');

		await page.getByLabel('Wofür?').fill('wird verworfen');
		await page.getByRole('link', { name: 'Tallox', exact: true }).first().click();
		await dialog(page).getByRole('button', { name: 'Verwerfen' }).click();

		await expect(page).toHaveURL(/\/$/);
	});

	test('does not ask about a form nobody typed into', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await open(page, '/konto/tokens');

		// Typing and deleting again is no change either.
		await page.getByLabel('Wofür?').fill('x');
		await page.getByLabel('Wofür?').fill('');
		await page.getByRole('link', { name: 'Tallox', exact: true }).first().click();

		await expect(page).toHaveURL(/\/$/);
		await expect(dialog(page)).toHaveCount(0);
	});

	test('saving from the dialog creates the account and then leaves', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await open(page, '/verwaltung/personen?ansicht=konten');

		// One address per run: people are never deleted.
		const mail = `leave.${Date.now()}@example.org`;
		await page.getByLabel('Mailadresse').fill(mail);
		await page.getByRole('link', { name: 'Tallox', exact: true }).first().click();

		await expect(dialog(page)).toContainText('Neues Konto');
		await dialog(page).getByRole('button', { name: 'Speichern' }).click();
		await expect(page).toHaveURL(/\/$/);

		await open(page, `/verwaltung/personen?ansicht=konten&q=${encodeURIComponent(mail)}`);
		await expect(page.getByRole('row').filter({ hasText: mail })).toBeVisible();
	});

	test('an invalid form is pointed at, not sent', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await open(page, '/verwaltung/personen?ansicht=konten');

		// Only a name: the address is required, so there is nothing to save yet.
		await page.getByLabel('Name (optional)').fill('Ohne Adresse');
		await page.getByRole('link', { name: 'Tallox', exact: true }).first().click();
		await dialog(page).getByRole('button', { name: 'Speichern' }).click();

		await expect(dialog(page)).toBeHidden();
		await expect(page).toHaveURL(/\/verwaltung\/personen/);
		await expect(page.getByLabel('Name (optional)')).toHaveValue('Ohne Adresse');
	});
});
