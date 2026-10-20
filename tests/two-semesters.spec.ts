import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { TWO_SEMESTERS, twoSemesterStatements } from './seed';

/**
 * A module over two semesters, end to end.
 *
 * The case from the faculty: "Wirtschaftsinformatik" stands in the catalogue with 8 SWS and is
 * taught 2 + 2 in the winter and again in the summer. Marked as such, the page proposes one
 * semester's split and does not call 2 + 2 a discrepancy.
 *
 * Serial, because the steps build on one another.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/module/${TWO_SEMESTERS.module}`;

async function reset() {
	await runSql(twoSemesterStatements().join('\n'), 'resetting the two-semester fixture');
}

test.describe('a module over two semesters', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('marked, it is proposed and compared per semester', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, URL);

		// Unmarked, the proposal takes the catalogue's 8 as one semester.
		await expect(page.getByText('Summe: 8 SWS')).toBeVisible();

		await page.getByRole('button', { name: 'Läuft über zwei Semester' }).click();
		await expect(page.getByText('Dieses Modul läuft über zwei Semester.')).toBeVisible();
		await expect(page.getByText(/8 SWS über 2 Semester laut Modulkatalog/)).toBeVisible();
		await expect(page.getByText('Summe: 4 SWS')).toBeVisible();
		await checkA11y(page);

		const hours = page.getByRole('textbox', { name: 'SWS' });
		await hours.nth(0).fill('2');
		await hours.nth(1).fill('2');
		await page.getByRole('button', { name: 'Aufteilung speichern' }).click();
		await expect(page.getByText('Summe: 4 SWS')).toBeVisible();
		await expect(page.getByText('Abweichung')).toHaveCount(0);
	});

	test('a lecturer reads the mark and is offered no control', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);
		await expect(page.getByText('Dieses Modul läuft über zwei Semester.')).toBeVisible();
		await expect(
			page.getByRole('button', { name: /Läuft (über zwei|nur über ein) Semester/ })
		).toHaveCount(0);
	});

	test('the catalogue says it, so nobody reads the 8 as one semester', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `/module?q=${encodeURIComponent(TWO_SEMESTERS.moduleName)}`);
		await expect(page.getByText(/8 SWS über 2 Semester/)).toBeVisible();
	});
});
