import { expect, type Page } from '@playwright/test';
import { semesterName } from '../src/lib/semester';
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
		`DELETE FROM wish WHERE course_instance_id IN
		   ('${WISHES.instance}', '${WISHES.laterInstance}');
		 UPDATE semester SET wishes_published_at = NULL, phase = 'WISHES'
		  WHERE code IN ('${WISHES.semester}', '${WISHES.laterSemester}');`,
		'clearing the test wishes'
	);
}

/**
 * The caller's own entries, as the summary above the table shows them.
 *
 * One `<article>` per semester, and the wish table is not one — so this finds the summary and
 * never the form. By content rather than by a count of tables: "Meine Eintragungen" now sits
 * *above* the table, so `getByRole('table').last()` means the opposite of what it used to.
 */
function summaryFor(page: Page, semester: string) {
	// semesterName from the application rather than a second spelling of it here: "Wintersemester
	// 2032/33" has a two-digit tail, and a locator that guessed "2032/2033" would find nothing and
	// read as a broken page.
	return page.locator('article').filter({ hasText: semesterName(semester) });
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

/**
 * The button that saves the whole table.
 *
 * Almost never needed: a change saves itself. It stays because without JavaScript there is no way
 * to submit a `<select>`, and it is what these tests use to assert that the closed phase closes
 * both paths rather than only the convenient one.
 */
const save = (page: Page) => page.getByRole('button', { name: 'Alles speichern' });

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

		const mine = () => summaryFor(page, WISHES.semester);

		// **Nothing is clicked to save.** Choosing is the save, which is the whole point of the
		// screen: a table somebody goes down and fills in should not also need a button at the
		// bottom that they have to remember.
		await cell(page).selectOption('FIRST_CHOICE');

		// Wait for the summary card, which exists only once the round trip has come back and the
		// page has reloaded its data. Asserting on the wish table instead would pass against the
		// form, whose cells carry the same words, and the rest of the test would race the reload.
		await expect(mine().getByRole('cell', { name: 'unbedingt' })).toBeVisible();

		// The note appears once something is chosen: it is where the part-level detail lives now,
		// and an empty box in every cell would be the same table twice as tall. It saves when the
		// field is left rather than on every keystroke.
		await note(page).fill('nur die Vorlesung');
		// Explicitly out of the field. `fill()` dispatches `input` and stops there — it does not
		// blur, so the browser never fires the `change` a person typing would produce. The page
		// saves on `focusout` as well for the same reason: a value that arrives without the
		// browser calling it input is still a value somebody meant.
		await note(page).blur();
		await expect(mine().getByRole('cell', { name: 'nur die Vorlesung' })).toBeVisible();

		// Correcting is the same cell, and it is a correction rather than a second entry.
		await expect(cell(page)).toHaveValue('FIRST_CHOICE');
		await cell(page).selectOption('IF_NEEDED');

		await expect(mine().getByRole('cell', { name: 'notfalls' })).toBeVisible();
		await expect(mine().getByRole('row')).toHaveCount(2); // the heading row and the one entry

		// And back to nothing: the empty option is how a wish is withdrawn.
		await cell(page).selectOption('');
		await expect(mine()).toHaveCount(0);
	});

	test('my own entries span every semester, grouped by it', async ({ asPersona }) => {
		// Somebody who enters something for one semester and then moves the picker has not
		// withdrawn it. A summary that showed only the semester on screen would say they had.
		const page = await asPersona(PERSONAS.eins);

		await gotoRendered(page, URL);
		await cell(page).selectOption('HAPPY_TO');
		await expect(summaryFor(page, WISHES.semester)).toBeVisible();

		await gotoRendered(page, `/wuensche?semester=${WISHES.laterSemester}`);
		await cell(page).selectOption('FIRST_CHOICE');
		await expect(summaryFor(page, WISHES.laterSemester)).toBeVisible();

		// Both, while the picker is on one of them — and the one on screen says so, while the
		// other offers the way to it.
		await expect(summaryFor(page, WISHES.laterSemester).getByText('angezeigt')).toBeVisible();
		await expect(
			summaryFor(page, WISHES.semester).getByRole('link', { name: 'anzeigen' })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: /Meine Eintragungen \(2\)/ })).toBeVisible();

		// Away again, so the tests after this one start where they expect to.
		await cell(page).selectOption('');
		await expect(summaryFor(page, WISHES.laterSemester)).toHaveCount(0);
		await gotoRendered(page, URL);
		await cell(page).selectOption('');
		await expect(page.getByRole('heading', { name: /Meine Eintragungen/ })).toHaveCount(0);
	});

	test('a chosen cell is marked, and unchosen ones are not', async ({ asPersona }) => {
		// Reported as a wish after the first version: „wo habe ich etwas stehen" is what somebody
		// scans this table for, and the answer should be readable off the surface rather than by
		// reading every picker. The colour is redundant with the word in the picker, so it carries
		// nothing on its own — and it follows the caller's *stored* entry and never anybody
		// else's, which is the line this screen must not cross.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		const chosenCell = page.locator('td').filter({ has: cell(page) });
		// The band runs across the whole row, so the module's own cell carries it too — that is
		// what makes a filled-in row findable at a glance rather than by reading every picker.
		// Scoped by the row that *has the picker in it*, not by its text: the summary above the
		// table carries the same module name, and matching on that resolved to a cell of the
		// summary — which is never tinted, so the test failed for the wrong reason.
		const moduleCell = page
			.locator('tbody tr')
			.filter({ has: cell(page) })
			.locator('td')
			.nth(1);

		await expect(chosenCell).not.toHaveClass(/bg-primary/);
		await expect(moduleCell).not.toHaveClass(/bg-primary/);

		await cell(page).selectOption('FIRST_CHOICE');
		await expect(summaryFor(page, WISHES.semester)).toBeVisible();
		await expect(chosenCell).toHaveClass(/bg-primary/);
		await expect(moduleCell).toHaveClass(/bg-primary/);

		await cell(page).selectOption('');
		await expect(summaryFor(page, WISHES.semester)).toHaveCount(0);
		await expect(chosenCell).not.toHaveClass(/bg-primary/);
		await expect(moduleCell).not.toHaveClass(/bg-primary/);
	});

	test('a colleague sees nothing of it — no name, no number, no mark', async ({ asPersona }) => {
		// Eins registers.
		const eins = await asPersona(PERSONAS.eins);
		await gotoRendered(eins, URL);
		await cell(eins).selectOption('HAPPY_TO');
		await expect(summaryFor(eins, WISHES.semester)).toBeVisible();

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
