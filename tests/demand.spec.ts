import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { CATALOGUE, DEMAND, demandResetSql } from './seed';

/**
 * Declaring demand, end to end.
 *
 * Serial, and the reason is the domain rather than the framework: the three tests plan the same
 * study programme in the same semester, and an instance is unique in (semester, module,
 * programme, cohort). Two of them running at once would meet on that constraint and one would
 * fail with TRACK_TAKEN — a real refusal, in a test that is not about it.
 */
test.describe.configure({ mode: 'serial' });

// Not only in the global setup: a retry re-runs this whole group, and without this the second
// attempt would start against the instances the first one declared.
test.beforeAll(() => {
	runSql(demandResetSql(), 'clearing the demand of the test programme');
});

const DEMAND_URL = `/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.programme}`;

test.describe('the demand', () => {
	test('starts empty, and says which modules cannot be declared yet', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		await expect(page.getByRole('heading', { name: 'Bedarf' })).toBeVisible();
		await expect(page.getByText('noch nichts angemeldet')).toBeVisible();

		// The work list, on the screen where the gap gets in the way: a module with no split
		// cannot be declared, so the picker does not offer it and the banner says why.
		await expect(page.getByText('noch keine SWS-Aufteilung')).toBeVisible();
		const modules = page.locator('select[name="moduleId"]');
		await expect(modules).toContainText('E2E Modul mit Aufteilung');
		await expect(modules).not.toContainText('E2E Modul ohne Aufteilung');

		await checkA11y(page);
	});

	test('is declared, split into two cohorts, and the lecture is held once for both', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		// Declare. The parts come from the module's split — a lecture and a laboratory — and
		// nobody typed them.
		// By id rather than by label: the option carries "— Pflicht" behind the name, and a test
		// that keys on that would break the day somebody improves the wording.
		await page.locator('select[name="moduleId"]').selectOption(CATALOGUE.split);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const card = page.locator('article', { hasText: 'E2E Modul mit Aufteilung' }).first();
		await expect(card).toBeVisible();
		await expect(card.getByText('Vorlesung 2 SWS')).toBeVisible();
		await expect(card.getByText('Praktikum 2 SWS')).toBeVisible();
		// Four hours of teaching for one cohort, from a four-hour module. The number the faculty
		// pays is the sum over the parts, not the module's own figure.
		await expect(card.getByText('4 SWS').first()).toBeVisible();

		// Split it into two cohorts. One act: the original becomes A and the copy is B.
		await card.getByRole('button', { name: 'Zug B anlegen' }).click();

		const cohortA = page.locator('article', { hasText: 'E2E Modul mit Aufteilung' }).first();
		const cohortB = page.locator('article', { hasText: 'E2E Modul mit Aufteilung' }).last();
		await expect(cohortA.getByText('E2E?A')).toBeVisible();
		await expect(cohortB.getByText('E2E?B')).toBeVisible();
		// Both hold their own teaching, which is the ordinary case and therefore the default.
		await expect(cohortB.getByText('Vorlesung 2 SWS')).toBeVisible();

		// Hold the lecture once for both, which is the case the flag on the part exists for.
		await cohortA.getByRole('button', { name: 'Bearbeiten' }).click();
		await cohortA.getByRole('button', { name: 'Für alle Züge zusammenlegen' }).first().click();

		const afterMerge = page.locator('article', { hasText: 'E2E Modul mit Aufteilung' });
		const sibling = afterMerge.last();
		// The sibling has no lecture of its own any more and borrows the one that is held for it
		// — a cohort rendered with a laboratory and no lecture would look like a mistake.
		await expect(sibling.getByText('gehalten mit E2E…A')).toBeVisible();
		// And its hours are two, not four: a lecture held once is counted once, at the cohort
		// that holds it.
		await expect(sibling.getByText('2 SWS').first()).toBeVisible();

		await checkA11y(page);
	});

	// Reading the demand needs an account and no role. It is what the wish phase is about, and a
	// lecturer who cannot see the instances has nothing to register interest in.
	test('a lecturer reads it and is not offered the controls', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, DEMAND_URL);

		// By its link in the card, not by its text: the same words are in the module picker's
		// options, which a lecturer does not get and which are hidden anyway.
		await expect(
			page.getByRole('link', { name: 'E2E Modul mit Aufteilung' }).first()
		).toBeVisible();
		await expect(page.getByText('Vorlesung 2 SWS').first()).toBeVisible();

		// Cosmetic, and worth doing anyway: a screen full of buttons that all answer "nicht Ihr
		// Studiengang" teaches people to ignore refusals. The lock is in the backend, and this
		// page asks it again on every one of these forms.
		await expect(page.getByRole('button', { name: 'Anlegen' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Zug . anlegen/ })).toHaveCount(0);
	});
});
