import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { CATALOGUE, FILING } from './seed';

test.describe('the module catalogue', () => {
	test('a lecturer sees it — the catalogue is not confidential', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/module');

		await expect(page.getByRole('heading', { name: 'Modulkatalog' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'E2E Modul mit Aufteilung' })).toBeVisible();
		// The responsible person is a column of the list, not only of the detail page: it is
		// what somebody scans for when they are looking for a module's owner.
		await expect(page.getByRole('cell', { name: 'Zwei, Prof.' })).toBeVisible();

		await checkA11y(page);
	});

	// The union that a programme's list is. Without the home-programme half, 26 active modules of
	// the real catalogue are invisible to the person responsible for them — and the first thing
	// a study programme lead does is look for one of their own.
	test('a programme’s list includes its own modules that are in no regulations', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module?studiengang=${CATALOGUE.programme}`);

		await expect(page.getByRole('link', { name: 'E2E Modul nur zu Hause' })).toBeVisible();
		// And it says why it is there, rather than looking like an ordinary catalogue entry.
		const row = page.getByRole('row', { name: /E2E Modul nur zu Hause/ });
		await expect(row.getByText('nur Heimat')).toBeVisible();
	});

	// Which basket an elective sits in, on its line; a compulsory module's basket says nothing the
	// badge does not.
	test('names the basket of an elective, and not of a compulsory module', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module?studiengang=${CATALOGUE.programme}`);

		await expect(page.getByRole('row', { name: /E2E Modul ohne Aufteilung/ })).toContainText(
			'E2E WPF-Korb'
		);
		await expect(page.getByText('E2E Pflichtkorb')).toHaveCount(0);
	});

	// The work list. A lead getting ready for a semester needs to know which of their modules
	// cannot be declared yet, and that is a bounded, finishable task.
	test('the work list finds the modules with no split', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module?studiengang=${CATALOGUE.programme}&ohne-aufteilung=1`);

		await expect(page.getByRole('link', { name: 'E2E Modul ohne Aufteilung' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'E2E Modul mit Aufteilung' })).toHaveCount(0);
	});

	// Eighty-nine modules of the real catalogue run only in the summer, and the demand being
	// planned is for one term.
	test('the term filter keeps out what cannot run in that term', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module?studiengang=${CATALOGUE.programme}&turnus=WS`);

		// Winter-only stays, summer-only goes.
		await expect(page.getByRole('link', { name: 'E2E Modul mit Aufteilung' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'E2E Modul ohne Aufteilung' })).toHaveCount(0);
		// And "nach Ankündigung" says nothing about the term, so it stays — hiding it would
		// remove more than half the real catalogue in the name of a filter meant to help.
		await expect(page.getByRole('link', { name: 'E2E Modul nur zu Hause' })).toBeVisible();
	});

	test('without an account the page is refused rather than empty', async ({ browser }) => {
		// Somebody with an HM login this installation does not know: through the auth proxy, and
		// with no row in `person`. Sending no header at all would not do — in auth.mode=dev the
		// browser door then hands out the development user, and the test would assert nothing.
		//
		// An empty table would be the more alarming of the two possible answers: it reads as "the
		// catalogue has not been imported" rather than "you have no account here".
		const context = await browser.newContext({
			extraHTTPHeaders: { 'X-Remote-User': 'niemand@example.org' }
		});
		const page = await context.newPage();

		const response = await page.goto('/module');
		expect(response?.status()).toBe(403);
		await context.close();
	});
});

test.describe('one module', () => {
	// The link the fifth ZPA endpoint exists for. A teacher is imported master data and not a
	// user of this installation, and the page says which of the two this person is — the only
	// place that distinction becomes visible.
	test('names the person responsible for it, and whether they can sign in', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module/${CATALOGUE.split}`);

		await expect(page.getByRole('heading', { name: 'Modulverantwortung' })).toBeVisible();
		// The plain spelling, not the written-out one the fixture's teacher row carries. Everybody
		// is shown in one register here — the examination office's titles are dropped rather than
		// invented for the colleagues who have an account and no title in this system.
		await expect(page.getByText(PERSONAS.zwei.name)).toBeVisible();
		await expect(page.getByText('Prof. Dr. Zwei')).toHaveCount(0);
		await expect(page.getByText('Professur')).toBeVisible();
		// Zwei is in the cast and therefore has a person row; a teacher who is not would read
		// the other way.
		await expect(page.getByText('hat einen Tallox-Zugang')).toBeVisible();
	});

	// About one real module in thirty names nobody Tallox can resolve. The page says why rather
	// than leaving a blank, which would read as a fault in the page.
	test('says so when the catalogue names nobody it can resolve', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module/${CATALOGUE.unsplit}`);

		await expect(page.getByRole('heading', { name: 'Modulverantwortung' })).toBeVisible();
		await expect(page.getByText(/nennt niemanden/)).toBeVisible();
	});

	test('shows where it counts and what it is split into', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module/${CATALOGUE.split}`);

		await expect(page.getByRole('heading', { name: 'E2E Modul mit Aufteilung' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'SWS-Aufteilung' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Wo dieses Modul zählt' })).toBeVisible();
		await expect(page.getByText('SPO 2025')).toBeVisible();

		await checkA11y(page);
	});

	// The examination office publishes one figure and a phrase, never the split. Starting from an
	// empty form is how a bounded task turns into a chore, so the page proposes one — and says
	// that it has, because an unconfirmed guess must not look like a stored fact.
	test('proposes a split for a module that has none, marked as a proposal', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module/${CATALOGUE.unsplit}`);

		// One word for one thing, on both pages that show it: the demand table marks such a row
		// "geschätzt" too.
		await expect(page.getByText('geschätzt')).toBeVisible();
		// SU mit Übung, 4 SWS — two of lecture and two of exercise.
		const hours = page.locator('input[name="teachingHours"]');
		await expect(hours).toHaveCount(2);
		await expect(hours.first()).toHaveValue('2');
	});

	// Its own module rather than the one the read tests use: a test that writes to a fixture
	// others read passes alone and fails in a full run, and the order that produced it is not in
	// the report.
	test('a lead of the programme can state the split', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/module/${CATALOGUE.writable}`);

		await page.getByRole('button', { name: 'Aufteilung speichern' }).click();
		// The estimate is now the faculty's own statement, so the page stops marking it as one.
		await expect(page.getByText('geschätzt')).toHaveCount(0);
		await expect(page.getByText('Summe: 4 SWS')).toBeVisible();

		// A 0 takes an entry away, the same as clearing it: the field says so.
		const hours = page.locator('input[name="teachingHours"]');
		await expect(hours).toHaveCount(2);
		await hours.first().fill('4');
		await hours.nth(1).fill('0');
		await page.getByRole('button', { name: 'Aufteilung speichern' }).click();
		await expect(page.getByText('Summe: 4 SWS')).toBeVisible();
		await expect(page.locator('input[name="teachingHours"]')).toHaveCount(1);
	});

	// The lead of the module's subject group, who is no programme lead: the case a colleague
	// reported, where the editor was offered and saving was refused.
	test('the lead of the module’s subject group can state the split', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module/${FILING.splittable}`);

		await page.getByRole('button', { name: 'Aufteilung speichern' }).click();
		await expect(page.getByText('geschätzt')).toHaveCount(0);
		await expect(page.getByText('Nicht gespeichert')).toHaveCount(0);
	});

	// The lock is policy.MayWriteModuleSplit, on both doors. What this asserts is the interface's
	// half: somebody who may not save is not handed a form that is refused on saving, and is told
	// who enters the split instead.
	test('a lecturer reads the split and is told who enters it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/module/${CATALOGUE.split}`);

		await expect(page.getByRole('button', { name: 'Aufteilung speichern' })).toHaveCount(0);
		await expect(page.getByText('Vorlesung 2 + Praktikum 2 = 4 SWS')).toBeVisible();
		await expect(page.getByText(/Eintragen können die Fachgruppenleitung/)).toBeVisible();
	});

	// The catalogue's "eintragen" is a link only where saving would succeed.
	test('the catalogue links “eintragen” only where the split may be entered', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module?q=${FILING.programme}`);

		const row = (name: string) => page.getByRole('row', { name: new RegExp(name) });
		await expect(row(FILING.linkableName).getByRole('link', { name: /eintragen/ })).toBeVisible();
		await expect(row(FILING.foreignName).getByRole('link', { name: /eintragen/ })).toHaveCount(0);
		await expect(row(FILING.foreignName).getByText('fehlt')).toBeVisible();
	});
});
