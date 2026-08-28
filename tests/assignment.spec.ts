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

/** The cohort's own dropdown — the one control that fills every part at once. */
function cohortChooser(page: Page) {
	return page.getByRole('combobox', {
		name: new RegExp(`^Wer hält alle Teile von ${ASSIGNMENTS.moduleName}`)
	});
}

/** The cohort's parts, folded away because splitting them is the exception. */
function parts(page: Page) {
	return page.locator('details').filter({ hasText: 'Teile einzeln besetzen' }).first();
}

/**
 * Unfold the per-part view.
 *
 * Every test below that names a single part has to do this first, and that is the screen saying
 * what it is for: a cohort is normally held by one person, so the parts are behind a disclosure
 * and the cohort is not.
 */
async function openParts(page: Page) {
	const details = parts(page);
	if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
		await details.getByText('Teile einzeln besetzen').click();
	}
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

		await openParts(page);
		await expect(chooser(page, 'Vorlesung')).toContainText(PERSONAS.fuenf.name);

		await chooser(page, 'Vorlesung').selectOption({ index: 1 });

		// Wait for something that was not there before, rather than for a timeout.
		await expect(page.getByText(/1 Änderung gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await openParts(page);
		await expect(chooser(page, 'Vorlesung')).toHaveValue(/^p:/);
	});

	test('a part is given back by choosing nobody', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);
		await openParts(page);

		await chooser(page, 'Vorlesung').selectOption('');
		await expect(page.getByText(/1 Änderung gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await openParts(page);
		await expect(chooser(page, 'Vorlesung')).toHaveValue('');
	});

	test('the two laboratories are numbered and the lecture is not', async ({ asPersona }) => {
		// A lone "Praktikum 1" invites the question which other one there is; two of them make the
		// number mean something.
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);
		await openParts(page);

		await expect(chooser(page, 'Vorlesung')).toBeVisible();
		await expect(chooser(page, 'Praktikum 1')).toBeVisible();
		await expect(chooser(page, 'Praktikum 2')).toBeVisible();
	});

	test('an uninvolved colleague is told nothing about who holds what', async ({ asPersona }) => {
		const lead = await asPersona(PERSONAS.drei);
		await gotoRendered(lead, URL);
		await openParts(lead);
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

test.describe('a cohort held by one person', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	// The case the screen is arranged around: the same colleague takes the lecture and both
	// laboratories. Asking for each of them separately made the ordinary arrangement the laborious
	// one and the exception the cheap one, which is the wrong way round.
	test('one choice fills every part of the cohort', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		// Which parts "alle Teile" means is on the page, next to the control — a single dropdown is
		// otherwise a promise whose extent nobody has been shown.
		await expect(page.getByText('Vorlesung · Praktikum 1 · Praktikum 2')).toBeVisible();

		// The first candidate: whoever registered interest, which is what the list leads with.
		await cohortChooser(page).selectOption({ index: 2 });
		await expect(page.getByText(/3 Änderungen gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await expect(cohortChooser(page)).toHaveValue(/^p:/);

		await openParts(page);
		for (const part of ['Vorlesung', 'Praktikum 1', 'Praktikum 2']) {
			await expect(chooser(page, part)).toHaveValue(/^p:/);
		}
	});

	// The exception, and the state the one dropdown above cannot describe. It has to say so rather
	// than name one of the two people, and the parts have to be open when it does — otherwise the
	// screen hides the very thing that makes it disagree with itself.
	test('a part given to somebody else makes the cohort read as split', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		await openParts(page);
		await chooser(page, 'Praktikum 2').selectOption('');
		await expect(page.getByText(/1 Änderung gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await expect(cohortChooser(page)).toHaveValue('*');
		await expect(parts(page)).toHaveJSProperty('open', true);

		// And the two controls do not fight: a save that touched nothing must not write the
		// cohort's "verschieden" back over the part that differs.
		await chooser(page, 'Vorlesung').selectOption(await chooser(page, 'Vorlesung').inputValue());
		await page.getByRole('button', { name: 'Alles speichern' }).click();
		await expect(page.getByText(/Nichts zu speichern/)).toBeVisible();
		await expect(chooser(page, 'Praktikum 2')).toHaveValue('');
	});
});

test.describe('the wish round switch', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('the lead shuts the round from the screen they fill it on', async ({ asPersona }) => {
		// Filling and shutting are the same person's two acts, in that order more often than not,
		// so the switch is where they already are.
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		// The button carries the state unambiguously, and by its accessible name — the sentence
		// beside it is split across elements by its <strong>, which makes it the wrong thing to
		// locate by.
		await page.getByRole('button', { name: 'Wunschphase schließen' }).click();
		await expect(page.getByRole('button', { name: 'Wunschphase öffnen' })).toBeVisible();

		// A door and not a phase: it opens again.
		await page.getByRole('button', { name: 'Wunschphase öffnen' }).click();
		await expect(page.getByRole('button', { name: 'Wunschphase schließen' })).toBeVisible();
	});

	test('a shut round stops the wish screen from taking entries, and says who opens it', async ({
		asPersona
	}) => {
		const lead = await asPersona(PERSONAS.drei);
		await gotoRendered(lead, URL);
		await lead.getByRole('button', { name: 'Wunschphase schließen' }).click();
		await expect(lead.getByRole('button', { name: 'Wunschphase öffnen' })).toBeVisible();

		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/wuensche?semester=${ASSIGNMENTS.semester}`);

		// The cell is there and refuses, and the sentence names the repair — which is this subject
		// group's lead and not the dean's office.
		const cell = page.getByRole('combobox', {
			name: new RegExp(`Wunsch für .*${ASSIGNMENTS.moduleName}`)
		});
		await expect(cell).toBeDisabled();
		await expect(
			page.getByText(/Wunschphase der Fachgruppe .* ist derzeit geschlossen/)
		).toBeVisible();
		await expect(page.getByText(/Fachgruppenleitung kann sie wieder öffnen/)).toBeVisible();

		// Reopened, and the cell takes entries again.
		await gotoRendered(lead, URL);
		await lead.getByRole('button', { name: 'Wunschphase öffnen' }).click();
		await expect(lead.getByRole('button', { name: 'Wunschphase schließen' })).toBeVisible();

		await gotoRendered(page, `/wuensche?semester=${ASSIGNMENTS.semester}`);
		await expect(cell).toBeEnabled();
	});

	test('a programme still working on its demand is marked on the wish screen', async ({
		asPersona
	}) => {
		// An orientation and not a warning: registering interest here stays possible, and the mark
		// disappears once the lead announces the demand as settled.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/wuensche?semester=${ASSIGNMENTS.semester}`);

		await expect(page.getByText('Bedarf noch in Arbeit').first()).toBeVisible();
	});
});
