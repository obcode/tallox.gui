import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { SPLIT, splitStatements } from './seed';

/**
 * Carrying a corrected split over to the instances that already exist, end to end.
 *
 * The case from the faculty: the split of a module was corrected and the cohort in the planning
 * semester kept the old parts, with nothing on the screen saying so. What has to hold is that
 * saving the split shows the gap at once, that the preview writes nothing, and that one more
 * click closes it.
 *
 * Serial, because the steps build on one another.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/module/${SPLIT.module}`;
const COHORT = `${SPLIT.semester} · ${SPLIT.programme}2`;

async function reset() {
	await runSql(splitStatements().join('\n'), 'resetting the split fixture');
}

test.describe('carrying a split over', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('saving a corrected split shows what it would change', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, URL);

		const hours = page.getByRole('textbox', { name: 'SWS' });
		await hours.nth(0).fill('3');
		await hours.nth(1).fill('1');
		await page.getByRole('button', { name: 'Aufteilung speichern' }).click();

		const section = page.getByRole('region', { name: 'Bestehende Instanzen' });
		await expect(section.getByText('1 Instanz würde angepasst.')).toBeVisible();
		await expect(section.getByText(`${COHORT}:`)).toBeVisible();
		await expect(section.getByText('6 → 5 SWS')).toBeVisible();
		await checkA11y(page);

		// A preview, not a save: asked again, it still has something to do.
		await section.getByRole('button', { name: 'Vorschau aktualisieren' }).click();
		await expect(section.getByText('1 Instanz würde angepasst.')).toBeVisible();
	});

	test('one click carries it over, and then there is nothing left to do', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, URL);

		const section = page.getByRole('region', { name: 'Bestehende Instanzen' });
		await section.getByRole('button', { name: 'Vorschau: auf Instanzen übertragen' }).click();
		await section.getByRole('button', { name: 'Jetzt übertragen' }).click();
		await expect(section.getByText('1 Instanz angepasst.')).toBeVisible();

		await section.getByRole('button', { name: 'Vorschau aktualisieren' }).click();
		await expect(section.getByText('Die Instanz folgt der Aufteilung schon.')).toBeVisible();
		await expect(section.getByRole('button', { name: 'Jetzt übertragen' })).toHaveCount(0);
	});

	test('a lecturer is not offered it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);
		await expect(page.getByRole('region', { name: 'Bestehende Instanzen' })).toHaveCount(0);
	});
});
