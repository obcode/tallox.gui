import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { CATALOGUE, DEMAND, demandResetSql } from './seed';

/**
 * Planning a semester's demand, end to end.
 *
 * Serial, and the reason is the domain rather than the framework: these tests plan the same study
 * programme in the same semester, and an instance is unique in (semester, module, programme,
 * cohort). Two of them at once would meet on that constraint.
 */
test.describe.configure({ mode: 'serial' });

// Not only in the global setup: a retry re-runs this whole group, and without this the second
// attempt would start against what the first one saved.
test.beforeAll(() => {
	runSql(demandResetSql(), 'clearing the demand of the test programme');
});

const DEMAND_URL = `/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.programme}`;

test.describe('the demand table', () => {
	test('arrives prefilled from the previous comparable semester', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		await expect(page.getByRole('heading', { name: 'Bedarf' })).toBeVisible();

		// The takeover, as a prefilled row rather than a button: what this module had a year ago,
		// marked as a proposal and worth nothing until somebody saves.
		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await expect(row.getByText('Vorschlag aus')).toBeVisible();
		await expect(row.getByRole('checkbox')).toBeChecked();
		await expect(row.getByRole('spinbutton', { name: /^Gruppen von/ })).toHaveValue('2');

		// The cohort year is the axis the table is grouped by.
		await expect(page.getByRole('heading', { name: /1\. Fachsemester/ })).toBeVisible();

		// And a module nobody has split yet is planned with a guess, which says so.
		const guess = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await expect(guess.getByText('geschätzt')).toBeVisible();
		// Six hours, and the rule this morning changed: four of lecture and two of laboratory.
		await expect(guess.getByText('Vorlesung 4 SWS + Praktikum 2 SWS')).toBeVisible();

		await checkA11y(page);
	});

	test('is saved in one click, with cohorts that need not be alike', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		// Tick a second module beside the prefilled one and save both at once.
		const guess = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await guess.getByRole('checkbox').check();
		await page.getByRole('button', { name: 'Bedarf speichern' }).click();

		await expect(page.getByText('2 angelegt')).toBeVisible();
		// A four-hour module with two laboratory groups is six hours of teaching, and a six-hour
		// one with one group is six more.
		await expect(page.getByText('Geplant sind jetzt 12 SWS')).toBeVisible();

		// A second cohort for one of them, with three groups where the first has two.
		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await row.getByRole('button', { name: /Ein Zug mehr/ }).click();
		await page.getByRole('spinbutton', { name: 'Gruppen von Zug B' }).fill('3');
		await page.getByRole('button', { name: 'Bedarf speichern' }).click();

		await expect(page.getByText('1 angelegt')).toBeVisible();
		// E2E1A and E2E1B, and the first one was renamed rather than replaced.
		await expect(page.getByText('E2E1A')).toBeVisible();
		await expect(page.getByText('E2E1B')).toBeVisible();
		await expect(page.getByRole('spinbutton', { name: 'Gruppen von Zug A' })).toHaveValue('2');
		await expect(page.getByRole('spinbutton', { name: 'Gruppen von Zug B' })).toHaveValue('3');
	});

	// One lecture for both cohorts: it happens once and its hours count once. Never the default —
	// every cohort holds its own until somebody says otherwise — so the saying-so has to be here,
	// and so does the way back.
	test('holds one lecture for both cohorts, and undoes it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await expect(row.getByText('14 SWS')).toBeVisible();

		await page.getByRole('button', { name: 'Vorlesung einmal für alle Züge' }).click();

		// Six hours instead of seven per cohort's worth: the lecture is held once now.
		await expect(page.getByText('Vorlesung wird geteilt')).toBeVisible();
		const merged = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await expect(merged.getByText('12 SWS')).toBeVisible();

		await page.getByRole('button', { name: 'Vorlesung wieder je Zug' }).click();
		await expect(page.getByText('Vorlesung wird geteilt')).toHaveCount(0);
	});

	test('confirms a guessed split from the row it is shown in', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		const row = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await expect(row.getByText('geschätzt')).toBeVisible();
		// Exact: the module is called "…zum Bestätigen", and every stepper in its row carries its
		// name — a substring match finds five buttons and none of them this one.
		await row.getByRole('button', { name: 'bestätigen', exact: true }).click();

		const confirmed = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await expect(confirmed.getByText('geschätzt')).toHaveCount(0);
		// The split it took over is the one that was shown.
		await expect(confirmed.getByText('Vorlesung 4 SWS + Praktikum 2 SWS')).toBeVisible();
	});

	// A tick taken away is a statement, and from the wish phase onwards somebody's entry may be
	// behind it — so it is shown before it is acted on.
	test('asks before it withdraws anything', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		const row = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await row.getByRole('checkbox').uncheck();
		await page.getByRole('button', { name: 'Bedarf speichern' }).click();

		await expect(page.getByRole('heading', { name: /Bitte bestätigen/ })).toBeVisible();
		await expect(page.getByText(/zieht 1 Instanz/)).toBeVisible();

		// Nothing has happened yet: the summary of a save is what says something did.
		await expect(page.getByText('zurückgezogen.')).toHaveCount(0);
		await expect(page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first()).toBeVisible();

		await page.getByRole('button', { name: 'Zurückziehen und speichern' }).click();
		await expect(page.getByText('1 zurückgezogen')).toBeVisible();
	});

	// Reading the demand needs an account and no role — it is what the wish phase is about — and
	// the controls that write are not offered to somebody who cannot.
	test('a lecturer reads it and is offered no controls', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, DEMAND_URL);

		await expect(
			page.getByRole('link', { name: 'E2E Modul mit Aufteilung' }).first()
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Bedarf speichern' })).toHaveCount(0);
		// The row's own tick, not the filter's: the filters are for everybody.
		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await expect(row.getByRole('checkbox')).toBeDisabled();
	});
});
