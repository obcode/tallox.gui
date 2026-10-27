import { expect, type Page } from '@playwright/test';
import { semesterName, semesterShortName } from '../src/lib/semester';
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

/**
 * A second cohort of the seeded module in the later semester, made by the one test that needs it
 * and taken away by `reset`. Not in the seed: the table test asserts the first semester has exactly
 * one cohort column, and the later semester is this file's own.
 */
const SECOND_COHORT = {
	instance: '0e2e0000-0000-4000-8000-000000000048',
	lecture: '0e2e0000-0000-4000-8000-000000000049'
} as const;

/** Everything these tests registered, and the publication they may have caused. */
function reset(): void {
	runSql(
		`DELETE FROM wish WHERE course_instance_id IN
		   ('${WISHES.instance}', '${WISHES.laterInstance}', '${SECOND_COHORT.instance}');
		 DELETE FROM wish_track_limit WHERE module_id = '${WISHES.module}';
		 DELETE FROM course_instance WHERE id = '${SECOND_COHORT.instance}';
		 UPDATE course_instance SET track = '' WHERE id = '${WISHES.laterInstance}';
		 DELETE FROM desired_teaching_hours WHERE semester_id IN
		   (SELECT id FROM semester WHERE code IN ('${WISHES.semester}', '${WISHES.laterSemester}'));
		 UPDATE semester SET wishes_published_at = NULL, phase = 'WISHES',
		        desired_hours_published_at = NULL, desired_hours_published_by = NULL,
		        desired_hours_frozen_at = NULL, desired_hours_frozen_by = NULL
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
		// The picker stays reachable: one tab per semester, each of them a submit button.
		await expect(page.getByRole('tablist')).toBeVisible();
		await expect(page.getByRole('tab').first()).toBeVisible();
	});

	test('the semester strip switches with one click', async ({ asPersona }) => {
		// One click and not two: the picker used to be a select with an "Anzeigen" button beside
		// it. Every tab is a submit button, the same control the demand page uses — so switching
		// needs no JavaScript either, which a select that submits itself would.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		const current = page.getByRole('tab', { name: semesterShortName(WISHES.semester) });
		await expect(current).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('button', { name: 'Anzeigen' })).toHaveCount(0);

		await page.getByRole('tab', { name: semesterShortName(WISHES.laterSemester) }).click();
		await expect(page).toHaveURL(new RegExp(`semester=${WISHES.laterSemester}`));
		await expect(
			page.getByRole('tab', { name: semesterShortName(WISHES.laterSemester) })
		).toHaveAttribute('aria-selected', 'true');
	});

	test('the table is one row per module with a column per cohort', async ({ asPersona }) => {
		// The shape the faculty planned in for years, in Confluence, as the view everybody had.
		// At part granularity the same module is eight rows and eight forms — the version of this
		// screen that somebody abandons halfway through.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		const table = page.getByRole('table').first();
		const headers = await table.locator('thead th').allTextContents();
		// The seeded module runs once, and its column is "Zug A" rather than a "Zug" column of its
		// own: a table with both would ask the reader to work out that they are the same thing.
		expect(headers.map((h) => h.trim())).toEqual(['Studiengruppe', 'Modul', 'SWS', 'Zug A']);

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

	test('one of two cohorts, either one: two wishes and „nur einen“', async ({ asPersona }) => {
		// Collab: a module in cohorts A and B, and somebody who takes one of them and does not mind
		// which. Until now that was a sentence in a note.
		runSql(
			`UPDATE course_instance SET track = 'A' WHERE id = '${WISHES.laterInstance}';
			 INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
			                              programme_semester)
			 SELECT '${SECOND_COHORT.instance}', semester_id, module_id, programme_id, 'B', 3
			   FROM course_instance WHERE id = '${WISHES.laterInstance}';
			 INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
			 VALUES ('${SECOND_COHORT.lecture}', '${SECOND_COHORT.instance}', 'LECTURE', 0, 2);`,
			'adding a second cohort'
		);
		try {
			const page = await asPersona(PERSONAS.eins);
			await gotoRendered(page, `/wuensche?semester=${WISHES.laterSemester}`);
			const mine = () => summaryFor(page, WISHES.laterSemester);
			const cohort = (track: string) =>
				page.getByRole('combobox', { name: new RegExp(`Wunsch für \\S*${track} · E2E Fachmodul`) });
			const bound = page.getByRole('combobox', { name: /Wie viele Züge von E2E Fachmodul/ });

			// One wish is not yet a choice between cohorts, so there is nothing to bound.
			await cohort('A').selectOption('HAPPY_TO');
			await expect(mine().getByRole('cell', { name: 'gerne' })).toBeVisible();
			await expect(bound).toHaveCount(0);

			await cohort('B').selectOption('IF_NEEDED');
			await expect(mine().getByRole('cell', { name: 'notfalls' })).toBeVisible();
			await expect(mine().getByText('4 SWS')).toBeVisible();

			await bound.selectOption('1');
			await expect(mine().getByText('nur einen der Züge').first()).toBeVisible();
			// Two cohorts offered as one are one cohort's hours.
			await expect(mine().getByText('2 SWS')).toBeVisible();
			await expect(bound).toHaveValue('1');

			// And lifted again.
			await bound.selectOption('');
			await expect(mine().getByText('nur einen der Züge')).toHaveCount(0);
			await expect(mine().getByText('4 SWS')).toBeVisible();
		} finally {
			reset();
		}
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

		// And the summary carries the same tint, so the three levels are not only a word there
		// either — that list is read to see what one has promised where.
		await expect(summaryFor(page, WISHES.semester).locator('tbody tr').first()).toHaveClass(
			/bg-primary/
		);

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

	test('the leads do not see it here either — they register on this page themselves', async ({
		asPersona
	}) => {
		// Vier leads the study programme this instance belongs to; Drei leads the subject group
		// its module is in. Both may read the entry, and do so on the assignment screen. On the
		// wish screen they are lecturers like everybody else, and a name under the cohort they are
		// about to choose is the head start the confidentiality exists to prevent.
		for (const persona of [PERSONAS.vier, PERSONAS.drei]) {
			const page = await asPersona(persona);
			await gotoRendered(page, URL);

			const body = await page.locator('main').innerText();
			expect(body).not.toContain(PERSONAS.eins.name);
			expect(body).not.toMatch(/Außerdem:/);
		}
	});

	// How much somebody would like to teach: stated on the wish page as a range, read by the lead of
	// their subject group beside their name when filling an instance.
	test('a lecturer states a range, and the lead of their group reads it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		const card = page.getByRole('region', { name: 'Wie viel möchtest Du halten?' });
		const low = card.getByRole('textbox', { name: 'SWS von' });
		const high = card.getByRole('textbox', { name: 'bis' });

		// Saved on leaving the field — there is no button.
		await expect(card.getByRole('button', { name: 'Speichern' })).toHaveCount(0);
		await low.fill('7,3');
		await low.press('Tab');
		await expect(card.getByRole('alert')).toContainText('zwischen 0 und 40');

		// "von" alone is a single figure, saved on leaving it; then "bis" below it is refused.
		await low.fill('12');
		await low.press('Tab');
		await expect(card.getByRole('status')).toContainText('Gespeichert');
		// Tab moved into "bis", and a field somebody is in is not rewritten by the reload.
		await expect(high).toHaveValue('');
		await high.fill('10');
		await high.press('Tab');
		await expect(card.getByRole('alert')).toContainText('Minimum');
		// The refused figure stays in the field, so it can be corrected rather than retyped.
		await expect(high).toHaveValue('10');

		await low.fill('6');
		await high.fill('12,5');
		await card.getByRole('textbox', { name: /Notiz/ }).fill('E2E-Notiz, nur für Zuständige');
		await card.getByRole('textbox', { name: /Notiz/ }).press('Tab');
		// Three fields left in a row are three saves, one after the other; a full reload before the
		// last has landed would read the one before it.
		await page.waitForLoadState('networkidle');
		await expect(card.getByRole('status')).toContainText('Gespeichert');
		await gotoRendered(page, URL);
		await expect(low).toHaveValue('6');
		await expect(high).toHaveValue('12,5');
		await expect(card).toContainText('offen');

		const lead = await asPersona(PERSONAS.drei);
		await gotoRendered(
			lead,
			`/zuteilung?semester=${WISHES.semester}&fachgruppe=${WISHES.subjectGroup}`
		);
		await expect(
			lead.locator('option', { hasText: `${PERSONAS.eins.name} (` }).filter({
				hasText: 'möchte 6–12,5 SWS'
			})
		).not.toHaveCount(0);
	});

	// The overview of the faculty before publication: a sentence for a colleague, not a table of
	// empty cells — and nothing of Eins's figure anywhere on the page.
	test('before publication a colleague sees no figure in the overview', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, `/wuensche/kollegium?semester=${WISHES.semester}`);

		await expect(page.getByText(/noch nicht veröffentlicht/).first()).toBeVisible();
		const body = await page.locator('main').innerText();
		expect(body).not.toContain('6–12,5');
		expect(body).not.toContain(PERSONAS.eins.name);
	});

	// The dean's office freezes at the deadline; from then on the lecturer reads and the dean's
	// office corrects, and the correction keeps the person's note and says who made it.
	test('the dean’s office freezes the figures and corrects one', async ({ asPersona }) => {
		const deans = await asPersona(PERSONAS.fuenf);
		await gotoRendered(deans, '/semester');
		const semesterCard = deans
			.locator('div.rounded-lg')
			.filter({ has: deans.getByRole('heading', { name: semesterName(WISHES.semester) }) });
		await semesterCard.getByText('Wunsch-SWS einfrieren …').click();
		await semesterCard
			.getByRole('button', {
				name: `Ja, Wunsch-SWS für ${semesterName(WISHES.semester)} einfrieren`
			})
			.click();
		await expect(semesterCard).toContainText('Wunsch-SWS eingefroren');

		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);
		const card = page.getByRole('region', { name: 'Wie viel möchtest Du halten?' });
		await expect(card.getByRole('textbox', { name: 'bis' })).toBeDisabled();
		await expect(card).toContainText('eingefroren');

		await gotoRendered(deans, `/wuensche/kollegium?semester=${WISHES.semester}`);
		const upper = deans.getByRole('textbox', { name: `SWS bis, ${PERSONAS.eins.name}` });
		await expect(upper).toHaveValue('12,5');
		await upper.fill('14');
		await upper.press('Tab');
		await gotoRendered(deans, `/wuensche/kollegium?semester=${WISHES.semester}`);
		await expect(upper).toHaveValue('14');

		await gotoRendered(page, URL);
		await expect(card).toContainText(`Nach Absprache geändert durch`);
		await expect(card.getByRole('textbox', { name: /Notiz/ })).toHaveValue(
			'E2E-Notiz, nur für Zuständige'
		);
	});

	test('publishing the figures shows everybody the range, never the note', async ({
		asPersona
	}) => {
		const deans = await asPersona(PERSONAS.fuenf);
		await gotoRendered(deans, '/semester');
		const semesterCard = deans
			.locator('div.rounded-lg')
			.filter({ has: deans.getByRole('heading', { name: semesterName(WISHES.semester) }) });
		await semesterCard.getByText('Wunsch-SWS veröffentlichen …').click();
		await semesterCard
			.getByRole('button', {
				name: `Ja, Wunsch-SWS für ${semesterName(WISHES.semester)} veröffentlichen`
			})
			.click();
		await expect(semesterCard).toContainText('Wunsch-SWS veröffentlicht');

		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, `/wuensche/kollegium?semester=${WISHES.semester}`);
		const row = page.getByRole('row').filter({ hasText: PERSONAS.eins.name });
		await expect(row).toContainText('6–14');
		// The bar beside it says the same in its label: planned against the range asked for.
		await expect(row.getByRole('img', { name: /gewünscht 6–14 SWS/ })).toBeVisible();
		await expect(page.locator('main')).not.toContainText('E2E-Notiz');
		// No correction controls for a colleague.
		await expect(page.getByRole('textbox', { name: /SWS bis,/ })).toHaveCount(0);
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
		await expect(page.getByText(/Dieses Semester ist vorbei/)).toBeVisible();
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

	test('the overview of the faculty is accessible, with and without the table', async ({
		asPersona,
		checkA11y
	}) => {
		for (const persona of [PERSONAS.zwei, PERSONAS.fuenf]) {
			const page = await asPersona(persona);
			await gotoRendered(page, `/wuensche/kollegium?semester=${WISHES.semester}`);
			await expect(page.getByRole('heading', { name: 'SWS im Kollegium', level: 1 })).toBeVisible();
			await checkA11y(page);
		}
	});
});
