import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { ASSIGNMENTS, DEGREES } from './seed';

/**
 * The assignment screen cut by degree and grouped by study programme.
 *
 * Asked for by a subject group lead whose group holds bachelor's and master's modules and who
 * fills them as two separate jobs. The fixture is one module with a cohort in a bachelor's, a
 * master's and a programme nobody has recorded a degree for.
 *
 * Read-only: nothing here saves, so the tests may run in any order.
 */

const BASE = `/zuteilung?semester=${DEGREES.semester}&fachgruppe=${DEGREES.subjectGroup}`;

/** The cohort's own dropdown, by the cohort label the page assembles: code + year. */
function cohort(page: Page, code: string) {
	return page.getByRole('combobox', {
		name: `Wer hält alle Teile von ${DEGREES.moduleName} in ${code}1`
	});
}

test.describe('the degree filter on the assignment screen', () => {
	test('every cohort without a filter', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, BASE);

		for (const code of [DEGREES.bachelor, DEGREES.master, DEGREES.unrecorded]) {
			await expect(cohort(page, code)).toBeVisible();
		}
		await expect(page.getByText('Ohne eingetragenen Abschluss')).toHaveCount(0);
	});

	test('a master’s filter keeps the master’s cohort and names what it left out', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `${BASE}&abschluss=master`);

		await expect(cohort(page, DEGREES.master)).toBeVisible();
		await expect(cohort(page, DEGREES.bachelor)).toHaveCount(0);
		// Not dropped without a word: a cohort that vanished is a cohort nobody fills.
		await expect(cohort(page, DEGREES.unrecorded)).toHaveCount(0);
		await expect(page.getByText('Ohne eingetragenen Abschluss')).toContainText(DEGREES.unrecorded);
	});

	test('the filter switches on choosing, without a button', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, BASE);

		await page.getByRole('combobox', { name: 'Abschluss', exact: true }).selectOption('bachelor');
		await expect(page).toHaveURL(/abschluss=bachelor/);
		await expect(cohort(page, DEGREES.bachelor)).toBeVisible();
		await expect(cohort(page, DEGREES.master)).toHaveCount(0);
	});

	test('grouped by programme, the module stands under each of them', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `${BASE}&nach=studiengang`);

		const headings = page.getByRole('columnheader', { name: / · / });
		await expect(headings).toHaveText([
			`${DEGREES.bachelor} – Bachelor-Teststudiengang · Bachelor`,
			`${DEGREES.master} – Master-Teststudiengang · Master`,
			`${DEGREES.unrecorded} – Teststudiengang ohne Abschluss · Abschluss nicht eingetragen`
		]);
		await expect(page.getByRole('cell', { name: DEGREES.moduleName, exact: true })).toHaveCount(3);

		await checkA11y(page);
	});

	test('the view survives choosing another subject group', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(
			page,
			`/zuteilung?semester=${DEGREES.semester}&fachgruppe=${ASSIGNMENTS.subjectGroup}` +
				'&abschluss=master&nach=studiengang'
		);

		await page.getByRole('tab', { name: 'Abschluss-Testfachgruppe' }).click();
		await expect(page).toHaveURL(new RegExp(`fachgruppe=${DEGREES.subjectGroup}`));
		await expect(page).toHaveURL(/abschluss=master/);
		await expect(page).toHaveURL(/nach=studiengang/);
		await expect(cohort(page, DEGREES.master)).toBeVisible();
	});

	// Without JavaScript the browser navigates to the action, whose query string replaces the
	// page's. The view therefore travels in the action's address.
	test('saving comes back to the same view', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `${BASE}&abschluss=master&nach=studiengang`);

		const save = page.locator('form[action^="?/save"]');
		await expect(save).toHaveAttribute('action', /abschluss=master/);
		await expect(save).toHaveAttribute('action', /nach=studiengang/);
		await expect(save).toHaveAttribute('action', new RegExp(`fachgruppe=${DEGREES.subjectGroup}`));
	});
});
