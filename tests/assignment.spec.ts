import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { ASSIGNMENTS, assignmentStatements } from './seed';

/**
 * The assignment screen, end to end.
 *
 * Two kinds of assertion, and the second is the one this project is judged on: that the screen
 * does what it says, and that it says nothing about who holds what to somebody who may not know.
 * The second kind is written as "this text is not on the page", because a leak here is a sentence
 * somebody added for convenience and no Go test can see it.
 *
 * Serial, because they fill and empty the same parts.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/zuteilung?semester=${ASSIGNMENTS.semester}&fachgruppe=${ASSIGNMENTS.subjectGroup}`;

/** Back to the fixture's own state, so the order of the tests below does not matter. */
async function reset() {
	await runSql(assignmentStatements().join('\n'), 'resetting the assignment fixture');
}

/**
 * The dropdown of one part, by its accessible name.
 *
 * Never by a column number: a table that grows a column would break every locator, and the
 * accessible name is what somebody using the page hears anyway.
 */
function chooser(page: Page, part: string) {
	return page.getByRole('combobox', {
		name: new RegExp(`^Wer hält ${part} in .*${ASSIGNMENTS.moduleName}`)
	});
}

test.describe('the assignment screen', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('the lead of the subject group fills a part, and it stays filled', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		await expect(page.getByRole('heading', { name: ASSIGNMENTS.moduleName })).toBeVisible();

		// The wish is next to the row it is about, which is the whole reason for this layout.
		await expect(page.getByText(`Eingetragen: ${PERSONAS.fuenf.name}`)).toBeVisible();
		await expect(chooser(page, 'Vorlesung')).toContainText(PERSONAS.fuenf.name);

		await chooser(page, 'Vorlesung').selectOption({ index: 1 });

		// Wait for something that was not there before, rather than for a timeout.
		await expect(page.getByText(/1 Änderung gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await expect(chooser(page, 'Vorlesung')).toHaveValue(/^p:/);
	});

	test('a part is given back by choosing nobody', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		await chooser(page, 'Vorlesung').selectOption('');
		await expect(page.getByText(/1 Änderung gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await expect(chooser(page, 'Vorlesung')).toHaveValue('');
	});

	test('the two laboratories are numbered and the lecture is not', async ({ asPersona }) => {
		// A lone "Praktikum 1" invites the question which other one there is; two of them make the
		// number mean something.
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		await expect(chooser(page, 'Vorlesung')).toBeVisible();
		await expect(chooser(page, 'Praktikum 1')).toBeVisible();
		await expect(chooser(page, 'Praktikum 2')).toBeVisible();
	});

	test('an uninvolved colleague is told nothing about who holds what', async ({ asPersona }) => {
		const lead = await asPersona(PERSONAS.drei);
		await gotoRendered(lead, URL);
		await chooser(lead, 'Praktikum 1').selectOption({ index: 1 });
		await expect(lead.getByText(/gespeichert/)).toBeVisible();

		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, URL);
		const body = (await page.textContent('body')) ?? '';

		// Not the name — and not a number about it either. The second half is the one that gets
		// added as a convenience: "2 von 3 besetzt" is the confidential fact with the names taken
		// out, and it is exactly what a planning screen invites.
		expect(body).not.toContain(PERSONAS.fuenf.name);
		expect(body).not.toMatch(/\d+\s*(von|\/)\s*\d+\s*besetzt/i);
		expect(body).not.toMatch(/noch (nicht|niemand)/i);
		expect(body).not.toMatch(/\d+ (Zuteilungen?|besetzte)/i);
	});

	test('the page says what to do before a subject group is chosen', async ({ asPersona }) => {
		// Filtered by subject group on purpose — a page with every instance of the faculty and
		// every person who teaches here is not a screen. So the empty state has to say so rather
		// than look broken.
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/zuteilung?semester=${ASSIGNMENTS.semester}`);

		await expect(page.getByRole('heading', { name: 'Fachgruppe wählen' })).toBeVisible();
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);
		await checkA11y(page);
	});
});
