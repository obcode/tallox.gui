import { expect } from '@playwright/test';
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
 * Serial, because they register and withdraw interest in the same part.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/wuensche?semester=${WISHES.semester}`;

/** Everything these tests registered, and the publication they may have caused. */
function reset(): void {
	runSql(
		`DELETE FROM wish WHERE instance_part_id IN ('${WISHES.lecture}', '${WISHES.lab}');
		 UPDATE semester SET wishes_published_at = NULL, phase = 'WISHES'
		  WHERE code = '${WISHES.semester}';`,
		'clearing the test wishes'
	);
}

test.beforeAll(reset);
test.afterAll(reset);

test.describe('the wish phase', () => {
	test('a lecturer registers interest, corrects it and withdraws it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, URL);

		await expect(page.getByRole('heading', { name: 'Wünsche' })).toBeVisible();

		// The module is in Eins's subject group, so it is under "my subjects" — a preselection,
		// which the page says in so many words.
		await expect(page.getByRole('heading', { name: 'Meine Fachgruppen' })).toBeVisible();

		// Re-read on every use. The form re-mounts when what is stored changes, so a locator kept
		// across a save points at an element that is no longer on the page.
		const lecture = () => page.getByRole('row', { name: /Vorlesung/ }).first();
		const summary = () => page.getByRole('heading', { name: /Meine Eintragungen/ });

		await lecture().getByRole('combobox').selectOption('FIRST_CHOICE');
		await lecture().getByRole('textbox').fill('am liebsten dienstags');
		await lecture().getByRole('button', { name: 'Eintragen' }).click();

		// Wait for the heading, which exists only once the round trip has come back and the page
		// has reloaded its data. Asserting on the table instead would pass against the *upper*
		// table — the one with the form in it, whose cells contain the same words — and the rest
		// of the test would then race the reload.
		await expect(summary()).toHaveText(/\(1\)/);

		const mine = page.getByRole('table').last();
		await expect(mine.getByRole('cell', { name: 'unbedingt' })).toBeVisible();
		await expect(mine.getByRole('cell', { name: 'am liebsten dienstags' })).toBeVisible();

		// Correcting is the same form, and it is a correction rather than a second entry.
		const picker = lecture().getByRole('combobox');
		await expect(picker).toHaveValue('FIRST_CHOICE');
		await picker.selectOption('IF_NEEDED');
		await lecture().getByRole('button', { name: 'Ändern' }).click();

		await expect(mine.getByRole('cell', { name: 'notfalls' })).toBeVisible();
		await expect(summary()).toHaveText(/\(1\)/);

		await page.getByRole('button', { name: 'Zurückziehen' }).first().click();
		await expect(summary()).toHaveCount(0);
	});

	test('a colleague sees nothing of it — no name, no number, no mark', async ({ asPersona }) => {
		// Eins registers.
		const eins = await asPersona(PERSONAS.eins);
		await gotoRendered(eins, URL);
		const row = eins.getByRole('row', { name: /Vorlesung/ }).first();
		await row.getByRole('button', { name: 'Eintragen' }).click();
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
		expect(body).not.toMatch(/Außerdem eingetragen/);
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

			await expect(page.getByText(`Außerdem eingetragen: ${PERSONAS.eins.name}`)).toBeVisible();
		}
	});

	test('publication opens it to everybody', async ({ asPersona }) => {
		runSql(
			`UPDATE semester SET wishes_published_at = now() WHERE code = '${WISHES.semester}';`,
			'publishing the test semester'
		);

		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, URL);

		await expect(page.getByText(`Außerdem eingetragen: ${PERSONAS.eins.name}`)).toBeVisible();
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
		await expect(page.getByRole('button', { name: 'Ändern' }).first()).toBeEnabled();
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
		await expect(page.getByRole('button', { name: 'Ändern' }).first()).toBeDisabled();
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
