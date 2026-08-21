import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { CATALOGUE, DEMAND, SEMESTERS, demandResetSql } from './seed';

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
		// And the page says what that means before it happens: the table saves itself, so the
		// first change anybody makes adopts the proposal with it.
		await expect(
			page.getByText(/vorbelegt — wird mit der nächsten Änderung übernommen/)
		).toBeVisible();
		await expect(row.getByRole('checkbox')).toBeChecked();
		await expect(row.getByRole('spinbutton', { name: /^Gruppen von/ })).toHaveValue('2');

		// The cohort year is the axis the table is grouped by.
		await expect(page.getByRole('heading', { name: /1\. Fachsemester/ })).toBeVisible();

		// And a module nobody has split yet is planned with a guess, which says so.
		const guess = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await expect(guess.getByText('geschätzt')).toBeVisible();
		// Six hours, and the rule this morning changed: four of lecture and two of laboratory.
		await expect(guess.getByText('Vorlesung 4 + Praktikum 2 SWS')).toBeVisible();

		await checkA11y(page);
	});

	test('saves itself, with cohorts that need not be alike', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		// Tick a second module beside the prefilled one. Nothing else: the tick is a decision, and
		// a decision that sits in a browser waiting for a second act is one a closed tab undoes.
		const guess = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await guess.getByRole('checkbox').check();

		// The SWS column answers before anything is saved: a six-hour module with one laboratory
		// group is six hours of teaching. It used to say "—" for every row of a semester nobody
		// had planned yet, which is every row on the day this page is most used.
		await expect(guess.getByText('6 SWS')).toBeVisible();

		await expect(page.getByText('2 angelegt')).toBeVisible({ timeout: 15_000 });
		// A four-hour module with two laboratory groups is six hours of teaching, and a six-hour
		// one with one group is six more.
		await expect(page.getByText('12 SWS geplant')).toBeVisible();

		// A second cohort for one of them, with three groups where the first has two.
		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await row.getByRole('button', { name: /Ein Zug mehr/ }).click();
		await page.getByRole('spinbutton', { name: 'Gruppen von Zug B' }).fill('3');

		await expect(page.getByText('1 angelegt')).toBeVisible({ timeout: 15_000 });
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

		await page.getByRole('button', { name: 'Vorlesung zusammenlegen' }).click();

		// Six hours instead of seven per cohort's worth: the lecture is held once now.
		await expect(page.getByText('Vorlesung geteilt').first()).toBeVisible();
		const merged = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		await expect(merged.getByText('12 SWS')).toBeVisible();

		await page.getByRole('button', { name: 'Vorlesung trennen' }).click();
		await expect(page.getByText('Vorlesung geteilt')).toHaveCount(0);
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
		await expect(confirmed.getByText('Vorlesung 4 + Praktikum 2 SWS')).toBeVisible();
	});

	// The other half of the estimate: it is a guess, so it has to be correctable where it is
	// shown. "Four and two instead of three and three" is two fields, not a trip to another page —
	// least of all from a screen where fifteen ticks are waiting to be saved.
	test('corrects a split from the row it is shown in', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		// Its own module, because this writes: the seed clears its split before every run, so a
		// failure halfway leaves nothing behind for the next one to trip over.
		const row = page.getByRole('row', { name: /E2E Modul zum Ändern/ }).first();
		await expect(row.getByText('Vorlesung 2 + Praktikum 2 SWS')).toBeVisible();
		await expect(row.getByText('geschätzt')).toBeVisible();

		// Exact again: the module is called "…zum Ändern", so every stepper in its row carries the
		// word in its label.
		await row.getByRole('button', { name: 'ändern', exact: true }).click();
		await page.getByRole('textbox', { name: /SWS des 1\. Teils/ }).fill('3');
		await page.getByRole('textbox', { name: /SWS des 2\. Teils/ }).fill('1');
		// Exact: "Bedarf speichern" stands at the foot of the same form.
		await page.getByRole('button', { name: 'speichern', exact: true }).click();

		const corrected = page.getByRole('row', { name: /E2E Modul zum Ändern/ }).first();
		await expect(corrected.getByText('Vorlesung 3 + Praktikum 1 SWS')).toBeVisible();
		// And it is the faculty's own statement now, not a guess.
		await expect(corrected.getByText('geschätzt')).toHaveCount(0);
	});

	// A tick taken away is a statement, and from the wish phase onwards somebody's entry may be
	// behind it — so it is shown before it is acted on.
	test('asks before it withdraws anything', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		const row = page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first();
		await row.getByRole('checkbox').uncheck();

		// The one change that does not happen by itself: it is shown before it is done.
		await expect(page.getByRole('heading', { name: /Bitte bestätigen/ })).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByText(/zieht 1 Instanz/)).toBeVisible();

		// Nothing has happened yet: the summary of a save is what says something did.
		await expect(page.getByText('zurückgezogen.')).toHaveCount(0);
		await expect(page.getByRole('row', { name: /E2E Modul zum Bestätigen/ }).first()).toBeVisible();

		await page.getByRole('button', { name: 'Zurückziehen und speichern' }).click();
		await expect(page.getByText('1 zurückgezogen')).toBeVisible();
	});

	// The first thing anybody plans in a semester nobody has touched — the ordinary way this
	// screen gets used, and the case that failed in production: the preview the save runs first
	// had no semester row to point at, and the person got "Das hat nicht geklappt".
	test('plans the first demand of a semester nobody has touched', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(
			page,
			`/bedarf?semester=${SEMESTERS.untouched}&studiengang=${CATALOGUE.programme}`
		);

		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ }).first();
		// Nothing is planned here yet, and nothing was a year ago either: no prefill, no ticks.
		await expect(row.getByRole('checkbox')).not.toBeChecked();
		await row.getByRole('checkbox').check();

		await expect(page.getByText('1 angelegt')).toBeVisible({ timeout: 15_000 });
	});

	// The page saves after every click, so what it says about saving must not move anything: it
	// used to appear between the heading and the table, and every click pushed the table down and
	// pulled it back. Measured rather than described, because "es verschiebt sich" is exactly the
	// kind of defect a screenshot in a report cannot show.
	test('says what it saved without moving the table', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		const box = async () => {
			const table = await page.locator('table').first().boundingBox();
			const sws = await page.getByRole('columnheader', { name: 'SWS' }).first().boundingBox();
			return { y: Math.round(table?.y ?? 0), x: Math.round(sws?.x ?? 0) };
		};

		const before = await box();
		await page
			.getByRole('button', { name: /^Eine Gruppe mehr/ })
			.first()
			.click();

		await expect(page.getByText(/geändert/)).toBeVisible({ timeout: 15_000 });
		expect(await box(), 'the table moved while the page reported a save').toEqual(before);

		// And the columns of every cohort year are the same columns, which they were not while
		// each block sized itself to its own contents.
		const heads = page.getByRole('columnheader', { name: 'Aufteilung' });
		const first = await heads.first().boundingBox();
		for (let i = 1; i < (await heads.count()); i++) {
			expect(Math.round((await heads.nth(i).boundingBox())?.x ?? 0)).toBe(
				Math.round(first?.x ?? 0)
			);
		}
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
