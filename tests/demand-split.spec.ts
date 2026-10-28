import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { DEMAND_SPLIT, demandSplitStatements } from './seed';

/**
 * A split changed after its instances were declared, as the demand page shows it.
 *
 * The case from the faculty: the lab of a placeholder was corrected from 4 to 2 SWS, the instance
 * kept its two labs of 4, and the planning table said 6 SWS „(gespeichert 10 SWS)“ while the
 * overview said 10 — with nothing explaining either, and no way from here to fix it. What has to
 * hold: both views say the parts have not followed the split, the planning row offers the
 * module page's preview and carrying over, and changing the split from a row asks at once.
 *
 * Serial, because the steps build on one another.
 */
test.describe.configure({ mode: 'serial' });

const BASE = `/bedarf?semester=${DEMAND_SPLIT.semester}&studiengang=${DEMAND_SPLIT.programme}`;
const PLANNING = `${BASE}&bearbeiten=1`;

async function reset() {
	await runSql(demandSplitStatements().join('\n'), 'resetting the demand split fixture');
}

test.describe('a split the instances have not followed', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('the overview says the stored parts differ from the split', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, BASE);

		const row = page.getByRole('row', { name: new RegExp(DEMAND_SPLIT.moduleName) });
		await expect(row.getByText('nicht übertragen')).toBeVisible();
		await expect(row).toContainText(
			'Die gespeicherten Teile ergeben 10 SWS, die aktuelle Aufteilung (Vorlesung 2 + Praktikum 2 SWS) 6 SWS.'
		);
		await expect(row.getByRole('link', { name: 'Modulseite' })).toHaveAttribute(
			'href',
			new RegExp(`/module/${DEMAND_SPLIT.module}#split-instances$`)
		);
		await checkA11y(page);
	});

	test('the planning row explains the gap and carries the split over', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, PLANNING);

		const row = page.getByRole('row', { name: new RegExp(DEMAND_SPLIT.moduleName) }).first();
		await expect(row.getByText('(gespeichert 10 SWS)')).toBeVisible();
		await expect(row).toContainText(
			'Die gespeicherten Teile ergeben 10 SWS, die Aufteilung 6 SWS.'
		);

		await row.getByRole('button', { name: /^Vorschau: Aufteilung von .* übertragen$/ }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByText('1 Instanz würde angepasst.')).toBeVisible();
		await expect(dialog.getByText('10 → 6 SWS')).toBeVisible();
		await expect(dialog.getByText(/behalten ihre gespeicherten SWS/)).toBeVisible();
		await checkA11y(page);

		await dialog.getByRole('button', { name: 'Jetzt übertragen' }).click();
		await expect(dialog.getByText('1 Instanz angepasst.')).toBeVisible();
		await dialog.getByRole('button', { name: 'Fertig' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);

		const after = page.getByRole('row', { name: new RegExp(DEMAND_SPLIT.moduleName) }).first();
		await expect(after.getByText('nicht übertragen')).toHaveCount(0);
		await expect(after.getByText('(gespeichert', { exact: false })).toHaveCount(0);
	});

	test('changing the split from the row asks whether to carry it over', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, PLANNING);

		const row = page.getByRole('row', { name: new RegExp(DEMAND_SPLIT.moduleName) }).first();
		await row.getByRole('button', { name: /^Weitere Einstellungen für/ }).click();
		await page.getByRole('button', { name: 'Aufteilung ändern' }).click();
		// Said before saving, too, so nobody expects the instances to move with it.
		await expect(row.getByText(/behalten ihre gespeicherten SWS/)).toBeVisible();
		await page.getByRole('textbox', { name: /SWS des 2\. Teils/ }).fill('3');
		await page.getByRole('button', { name: 'speichern', exact: true }).click();

		const dialog = page.getByRole('dialog');
		await expect(
			dialog.getByText('Die neue Aufteilung ist gespeichert.', { exact: false })
		).toBeVisible();
		await expect(dialog.getByText('6 → 8 SWS')).toBeVisible();

		// Leaving it is a choice, and the row keeps saying so.
		await dialog.getByRole('button', { name: 'Nicht übertragen' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);
		const after = page.getByRole('row', { name: new RegExp(DEMAND_SPLIT.moduleName) }).first();
		await expect(after).toContainText(
			'Die gespeicherten Teile ergeben 6 SWS, die Aufteilung 8 SWS.'
		);
	});
});
