import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { WISHES } from './seed';

/**
 * The wish phase, end to end — the rule the whole project is judged on.
 *
 * What this suite is for, and what the backend's own tests are not: the leak this rule dies of is
 * a *rendering*. A badge, a count, a greyed-out row, the sentence "noch niemand hat sich
 * eingetragen" — each of them gives the answer away without naming anybody, and none of them is
 * visible in a Go test. So the assertions below are mostly about what is **not** on the page.
 *
 * Serial, because they register and withdraw interest in the same instance.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/wuensche?semester=${WISHES.semester}`;

/** Everything these tests registered, and the publication they may have caused. */
function reset(): void {
	runSql(
		`DELETE FROM wish WHERE course_instance_id = '${WISHES.instance}';
		 UPDATE semester SET wishes_published_at = NULL, phase = 'WISHES'
		  WHERE code = '${WISHES.semester}';`,
		'clearing the test wishes'
	);
}

/**
 * The cell for the seeded module's cohort.
 *
 * By its accessible name rather than by position: the table has one column per cohort, and a
 * locator that counted columns would break the day the fixture gains a second one — while still
 * pointing at *a* select, so it would fail somewhere else entirely.
 */
function cell(page: Page) {
	return page.getByRole('combobox', { name: /Wunsch für .*E2E Fachmodul/ });
}

function note(page: Page) {
	return page.getByRole('textbox', { name: /Notiz zu .*E2E Fachmodul/ });
}

const save = (page: Page) => page.getByRole('button', { name: 'Eintragungen speichern' });

test.beforeAll(reset);
test.afterAll(reset);

test.describe('the wish phase', () => {
	test('opens on the planning semester when the address names none', async ({ asPersona }) => {
		// Reported from the running installation: `/wuensche` without a query string answered 403.
		//
		// The semester argument is required, so the bare page had to invent a code — and any code
		// it invents is one the backend judges. The placeholder was outside the ten-year window, so
		// the whole document was refused before the redirect could put a real semester in the
		// address. The semester-scoped fields are asked for only when there is a semester now.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/wuensche');

		await expect(page.getByRole('heading', { name: 'Wünsche' })).toBeVisible();
		// And it landed on a semester rather than on nothing: the address says which.
		await expect(page).toHaveURL(/\?semester=\d{4}-(SS|WS)/);
	});

	test('a semester somebody typed into the address is not a broken page', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/wuensche?semester=1999-WS');

		// A 403 for a query parameter reads as "you may not be here" when it means "that is not a
		// semester". The picker stays, and the sentence says what is wrong.
		await expect(page.getByRole('heading', { name: 'Wünsche' })).toBeVisible();
		await expect(page.getByText(/zehn Jahre/)).toBeVisible();
		await expect(page.getByLabel('Semester')).toBeVisible();
	});

	test('the table is one row per module with a column per cohort', async ({ asPersona }) => {
		// The shape the faculty planned in for years, in Confluence, as the view everybody had.
		// At part granularity the same module is eight rows and eight forms — the version of this
		// screen that somebody abandons halfway through.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		const table = page.getByRole('table').first();
		const headers = await table.locator('thead th').allTextContents();
		expect(headers.map((h) => h.trim())).toEqual(['Studiengruppe', 'Modul', 'SWS', 'Zug']);

		// One row for the module, whatever its instance is made of. The seeded instance has a
		// lecture and a laboratory, and neither is a row of its own.
		const row = table.getByRole('row', { name: /E2E Fachmodul/ });
		await expect(row).toHaveCount(1);
		await expect(row.getByRole('combobox')).toHaveCount(1);
	});

	test('a lecturer registers interest, corrects it and withdraws it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		// The module is in Eins's subject group, so it is under "my subjects" — a preselection,
		// which the page says in so many words.
		await expect(page.getByRole('heading', { name: 'Meine Fachgruppen' })).toBeVisible();

		const summary = () => page.getByRole('heading', { name: /Meine Eintragungen/ });

		await cell(page).selectOption('FIRST_CHOICE');
		// The note appears once something is chosen: it is where the part-level detail lives now,
		// and an empty box in every cell would be the same table twice as tall.
		await note(page).fill('nur die Vorlesung');
		await save(page).click();

		// Wait for the heading, which exists only once the round trip has come back and the page
		// has reloaded its data. Asserting on the table instead would pass against the table with
		// the form in it, whose cells contain the same words, and the rest of the test would then
		// race the reload.
		await expect(summary()).toHaveText(/\(1\)/);

		const mine = page.getByRole('table').last();
		await expect(mine.getByRole('cell', { name: 'unbedingt' })).toBeVisible();
		await expect(mine.getByRole('cell', { name: 'nur die Vorlesung' })).toBeVisible();

		// Correcting is the same table and the same button, and it is a correction rather than a
		// second entry.
		await expect(cell(page)).toHaveValue('FIRST_CHOICE');
		await cell(page).selectOption('IF_NEEDED');
		await save(page).click();

		await expect(
			page.getByRole('table').last().getByRole('cell', { name: 'notfalls' })
		).toBeVisible();
		await expect(summary()).toHaveText(/\(1\)/);

		// And back to nothing: the empty option is how a wish is withdrawn.
		await cell(page).selectOption('');
		await save(page).click();
		await expect(summary()).toHaveCount(0);
	});

	test('a colleague sees nothing of it — no name, no number, no mark', async ({ asPersona }) => {
		// Eins registers.
		const eins = await asPersona(PERSONAS.eins);
		await gotoRendered(eins, URL);
		await cell(eins).selectOption('HAPPY_TO');
		await save(eins).click();
		await expect(eins.getByRole('heading', { name: /Meine Eintragungen \(1\)/ })).toBeVisible();

		// Zwei looks at the same screen.
		const zwei = await asPersona(PERSONAS.zwei);
		await gotoRendered(zwei, URL);

		const body = await zwei.locator('main').innerText();

		// The name, obviously.
		expect(body).not.toContain(PERSONAS.eins.name);
		expect(body).not.toContain(PERSONAS.eins.mail);
		// And the shapes a count takes. Any of these would give the whole answer away without
		// naming anybody, which is the failure this rule exists to prevent.
		expect(body).not.toMatch(/Außerdem:/);
		expect(body).not.toMatch(/\b1 Interessent/);
		expect(body).not.toMatch(/bereits Interesse/);
		// And the sentence that is a statement about other people's wishes even when it is empty.
		expect(body).not.toMatch(/noch niemand/i);

		// What Zwei does see: their own (none) and the explanation for the absence.
		await expect(zwei.getByText(/nicht sichtbar/)).toBeVisible();
		await expect(zwei.getByRole('heading', { name: /Meine Eintragungen/ })).toHaveCount(0);
	});

	test('the lead of the programme sees it, the lead of a subject group too', async ({
		asPersona
	}) => {
		// Vier leads the study programme this instance belongs to; Drei leads the subject group
		// its module is in. Two orthogonal ways to be responsible for the same row.
		for (const persona of [PERSONAS.vier, PERSONAS.drei]) {
			const page = await asPersona(persona);
			await gotoRendered(page, URL);

			await expect(page.getByText(`Außerdem: ${PERSONAS.eins.name}`)).toBeVisible();
		}
	});

	test('publication opens it to everybody', async ({ asPersona }) => {
		runSql(
			`UPDATE semester SET wishes_published_at = now() WHERE code = '${WISHES.semester}';`,
			'publishing the test semester'
		);

		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, URL);

		await expect(page.getByText(`Außerdem: ${PERSONAS.eins.name}`)).toBeVisible();
		await expect(page.getByText(/Die Wünsche sind veröffentlicht/)).toBeVisible();
	});

	test('the assignment phase still lets somebody change their mind', async ({ asPersona }) => {
		// The rule the faculty asked for: open for as long as the semester is not finished. A
		// correction the tool refuses happens in a mail instead, and then the list the tool holds
		// is the wrong one.
		runSql(
			`UPDATE semester SET phase = 'ASSIGNMENT' WHERE code = '${WISHES.semester}';`,
			'moving the test semester into the assignment'
		);

		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		await expect(page.getByText(/Die Zuteilung läuft bereits/)).toBeVisible();
		await expect(save(page)).toBeEnabled();
		await expect(cell(page)).toBeEnabled();
	});

	test('a finished semester is closed and says the semester is over', async ({ asPersona }) => {
		runSql(
			`UPDATE semester SET phase = 'FINAL' WHERE code = '${WISHES.semester}';`,
			'finishing the test semester'
		);

		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		// The sentence says the semester is over rather than that a deadline was missed — there is
		// nothing here the reader can repair.
		await expect(page.getByText(/Dieses Semester ist abgeschlossen/)).toBeVisible();
		await expect(save(page)).toBeDisabled();
		await expect(cell(page)).toBeDisabled();
	});

	test('the demand page shows nothing about wishes either', async ({ asPersona }) => {
		// The other screen somebody would put a badge on. It renders instances — the unit that is
		// wished for — so it is the second place this rule has to hold.
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, `/bedarf?semester=${WISHES.semester}&studiengang=${WISHES.programme}`);

		const body = await page.locator('main').innerText();
		expect(body).not.toContain(PERSONAS.eins.name);
		expect(body).not.toContain(PERSONAS.eins.mail);

		// The shapes a statement about somebody's interest takes. Not the word "Wunschphase" —
		// which phase a semester is in is public and the page says so legitimately, and an
		// assertion that forbade the word would be forbidding the wrong thing.
		expect(body).not.toMatch(/Interessent/i);
		expect(body).not.toMatch(/bereits Interesse|hat Interesse|Interesse bekundet/i);
		expect(body).not.toMatch(/\d+ Wünsche?\b/);
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);
		await checkA11y(page);
	});
});
