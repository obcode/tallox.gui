import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { PROGRAMME_VIEW, TEACHERS } from './seed';

/**
 * The assignment screen for one study programme, across every subject group.
 *
 * Asked for by a programme lead who had to click through every subject group to see the gaps of
 * their programme. The fixture is a programme with a cohort in each of two subject groups, and a
 * cohort of another programme in the first group; Vier leads the programme and neither group.
 */

const BASE = `/zuteilung?semester=${PROGRAMME_VIEW.semester}`;
const VIEW = `${BASE}&studiengang=${PROGRAMME_VIEW.programme}`;

/** The cohort's own dropdown, by the cohort label the page assembles: code + year. */
function cohort(page: Page, module: string, code: string) {
	return page.getByRole('combobox', { name: `Wer hält alle Teile von ${module} in ${code}3` });
}

const first = (page: Page) =>
	cohort(page, PROGRAMME_VIEW.moduleNames.first, PROGRAMME_VIEW.programme);
const second = (page: Page) =>
	cohort(page, PROGRAMME_VIEW.moduleNames.second, PROGRAMME_VIEW.programme);
const foreign = (page: Page) =>
	cohort(page, PROGRAMME_VIEW.moduleNames.first, PROGRAMME_VIEW.foreign);

const clear = () =>
	runSql(
		`DELETE FROM assignment WHERE instance_part_id IN
		   (SELECT id FROM instance_part WHERE course_instance_id IN
		      ('${PROGRAMME_VIEW.instances.first}', '${PROGRAMME_VIEW.instances.second}',
		       '${PROGRAMME_VIEW.instances.foreign}'));`,
		'clearing the programme view fixture'
	);

test.describe('the view of one study programme', () => {
	test.beforeAll(clear);
	test.afterAll(clear);

	test('a programme lead chooses the programme and sees its cohorts of every subject group', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, BASE);

		await page
			.getByRole('combobox', { name: 'Studiengang', exact: true })
			.selectOption(PROGRAMME_VIEW.programme);
		await expect(page).toHaveURL(new RegExp(`studiengang=${PROGRAMME_VIEW.programme}`));

		await expect(first(page)).toBeVisible();
		await expect(second(page)).toBeVisible();
		// Another programme's cohort of the same module is not part of this view.
		await expect(foreign(page)).toHaveCount(0);

		// The progress line for exactly this programme, and nothing said about a partial count.
		await expect(page.getByRole('progressbar', { name: 'Besetzte Teile' })).toBeVisible();
		await expect(page.getByRole('main')).toContainText(/0\s+von\s+2\s+Teilen\s+besetzt/);
		await expect(page.getByText('Gezählt sind nur die Züge')).toHaveCount(0);

		await checkA11y(page);
	});

	test('only the programmes somebody leads are offered', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, BASE);
		const choice = page.getByRole('combobox', { name: 'Studiengang', exact: true });
		await expect(choice.locator(`option[value="${PROGRAMME_VIEW.programme}"]`)).toHaveCount(1);
		await expect(choice.locator(`option[value="${PROGRAMME_VIEW.foreign}"]`)).toHaveCount(0);

		// And an address naming another programme shows nothing of it.
		await gotoRendered(page, `${BASE}&studiengang=${PROGRAMME_VIEW.foreign}`);
		await expect(page.getByRole('heading', { name: 'Studiengang nicht verfügbar' })).toBeVisible();
		await expect(foreign(page)).toHaveCount(0);
		await expect(page.getByRole('progressbar', { name: 'Besetzte Teile' })).toHaveCount(0);
	});

	test('the dean’s office may choose any programme', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `${BASE}&studiengang=${PROGRAMME_VIEW.foreign}`);
		await expect(foreign(page)).toBeVisible();
	});

	test('a lecturer is offered no programme view', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, VIEW);
		await expect(page.getByRole('combobox', { name: 'Studiengang', exact: true })).toHaveCount(0);
		await expect(first(page)).toHaveCount(0);
	});

	// The side finding: on another subject group's tab a programme lead reads the assignments of
	// her own programme only, so the other cohorts looked unfilled and were counted as such.
	test('on a subject group tab a programme lead’s progress counts her programme only', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `${BASE}&fachgruppe=${PROGRAMME_VIEW.groups.first}`);

		await expect(first(page)).toBeVisible();
		await expect(foreign(page)).toBeVisible();
		await expect(page.getByRole('main')).toContainText(/0\s+von\s+1\s+Teil\s+besetzt/);
		await expect(page.getByText('Gezählt sind nur die Züge')).toBeVisible();
	});

	test('saving from the programme view stays on it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, VIEW);

		const spare = `t:${TEACHERS.spare}`;
		await second(page).focus();
		await second(page).selectOption(spare);
		await expect(page.getByText(/1 Änderung gespeichert/)).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`studiengang=${PROGRAMME_VIEW.programme}`));

		await gotoRendered(page, VIEW);
		await expect(second(page)).toHaveValue(spare);
		await expect(page.getByRole('main')).toContainText(/1\s+von\s+2\s+Teilen\s+besetzt/);
	});
});
