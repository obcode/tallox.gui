import { expect, gotoRendered, PERSONAS, test, type Persona } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * The help panel: "Jetzt dran" and short answers, from a button next to the identity.
 *
 * What is due depends on the planning semester's phase, and other specs move that semester
 * around while these run — so the phase-by-phase mapping is pinned in vitest (`guide.test.ts`),
 * and here only what holds in every phase: the panel opens on every page, carries the card,
 * and shows each person the questions that concern them.
 */

/** Opens the panel and waits until it has faded in — axe would otherwise measure through it. */
async function openHelp(page: Page) {
	await page.getByRole('banner').getByRole('button', { name: 'Hilfe' }).click();
	const dialog = page.getByRole('dialog', { name: 'Hilfe' });
	await expect(dialog).toBeVisible();
	await expect.poll(() => dialog.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
	return dialog;
}

async function openHelpAs(asPersona: (p: Persona) => Promise<Page>, persona: Persona, path = '/') {
	const page = await asPersona(persona);
	await gotoRendered(page, path);
	return { page, dialog: await openHelp(page) };
}

test.describe('the help panel', () => {
	test('opens with what is due now and closes again', async ({ asPersona, checkA11y }) => {
		const { page, dialog } = await openHelpAs(asPersona, PERSONAS.eins, '/wuensche');

		await expect(dialog.getByRole('heading', { name: /Jetzt dran für Dich/ })).toBeVisible();
		await expect(dialog.getByRole('link', { name: /Gesamten Ablauf ansehen/ })).toBeVisible();
		await checkA11y(page);

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
	});

	test('shows a lecturer the questions for everybody, not those for leads', async ({
		asPersona
	}) => {
		const { dialog } = await openHelpAs(asPersona, PERSONAS.zwei);

		await expect(dialog.getByText('Wer sieht meine Wünsche?')).toBeVisible();
		await expect(dialog.getByText(/Wunschrunde meiner Fachgruppe/)).toHaveCount(0);
		await expect(dialog.getByText(/Bedarf meines Studiengangs/)).toHaveCount(0);
	});

	test('shows a subject group lead how to close the wish round', async ({ asPersona }) => {
		const { dialog } = await openHelpAs(asPersona, PERSONAS.drei);

		const question = dialog.getByText(/Wie schließe ich die Wunschrunde meiner Fachgruppe/);
		await question.click();
		await expect(dialog.getByText(/Offen ist sie von Anfang an/)).toBeVisible();
		await expect(dialog.getByRole('link', { name: 'Zuteilung', exact: true })).toBeVisible();
	});

	test('puts the questions about the current page first', async ({ asPersona }) => {
		const { dialog } = await openHelpAs(asPersona, PERSONAS.vier, '/bedarf');

		const here = dialog.getByRole('region', { name: 'Zu dieser Seite' });
		await expect(
			here.getByText(/Wie melde ich, dass der Bedarf meines Studiengangs steht/)
		).toBeVisible();
		await expect(dialog.getByRole('region', { name: 'Weitere Fragen' })).toBeVisible();
	});

	// Closed, the panel adds nothing to the page. Its sentences sitting hidden in every page's
	// markup made `getByText(/geändert/)` on the demand page match a question in here.
	test('adds no text to the page while it is closed', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, '/bedarf');
		await expect(page.getByText('Wer sieht meine Wünsche?')).toHaveCount(0);

		await openHelp(page);
		await page.keyboard.press('Escape');
		await expect(page.getByText('Wer sieht meine Wünsche?')).toHaveCount(0);
	});

	// The panel survives a client-side navigation with the layout. A link inside it must not
	// leave it lying over the page it opened.
	test('closes when a link in it is followed', async ({ asPersona }) => {
		const { page, dialog } = await openHelpAs(asPersona, PERSONAS.eins);

		await dialog.getByRole('link', { name: /Gesamten Ablauf ansehen/ }).click();
		await expect(page).toHaveURL(/\/ablauf$/);
		await expect(dialog).toBeHidden();
	});
});
