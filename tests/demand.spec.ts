import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { CATALOGUE, DEMAND, SEMESTERS, demandResetSql } from './seed';
import { semesterShortName } from '../src/lib/semester';

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

// The planning table, not the overview. `/bedarf` opens read-only for everybody now, and the
// table is what these tests are about — so they ask for it the same way the toggle does.
const DEMAND_URL = `/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.programme}&bearbeiten=1`;

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
			`/bedarf?semester=${SEMESTERS.untouched}&studiengang=${CATALOGUE.programme}&bearbeiten=1`
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

		// Relative to the document, not to the viewport. boundingBox() reports viewport
		// coordinates, so a click that scrolls the button into view moves every number on the
		// page — which says nothing about whether the table moved, and made this test depend on
		// how tall the filter card happens to be.
		const box = async () => {
			const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
			const table = await page.locator('table').first().boundingBox();
			const sws = await page.getByRole('columnheader', { name: 'SWS' }).first().boundingBox();
			return {
				y: Math.round((table?.y ?? 0) + scroll.y),
				x: Math.round((sws?.x ?? 0) + scroll.x)
			};
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
	// what a lecturer gets is the overview rather than the planning table with its controls
	// switched off. The address here asks for the table; the permission decides.
	test('a lecturer reads the overview, even when the address asks to edit', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, DEMAND_URL);

		// The overview, told apart from the planning table by the column only it has. Both show
		// one row per module and both have a "Züge" column, so the cohorts are not the tell —
		// what the overview lists and the planning table does not is the parts.
		await expect(page.getByRole('columnheader', { name: 'Teile' }).first()).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'E2E Modul mit Aufteilung' }).first()
		).toBeVisible();

		await expect(page.getByRole('button', { name: 'Bedarf speichern' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(0);
		await expect(page.getByRole('columnheader', { name: 'Gruppen' })).toHaveCount(0);

		await checkA11y(page);
	});

	// The toggle, from the side that has the permission: the overview first, the table on the
	// button — and the address carries which one, so the link a colleague gets shows the same.
	test('a planner arrives at the overview and switches into the table', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(
			page,
			`/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.programme}`
		);

		await expect(page.getByRole('columnheader', { name: 'Teile' }).first()).toBeVisible();

		await page.getByRole('button', { name: 'Bearbeiten' }).click();

		await expect(page.getByRole('columnheader', { name: 'Gruppen' }).first()).toBeVisible();
		await expect(page).toHaveURL(/bearbeiten=1/);
		await expect(page.getByRole('button', { name: 'Bedarf speichern' })).toBeVisible();

		// And back, without losing the semester and the programme on the way.
		await page.getByRole('button', { name: 'Ansicht' }).click();
		await expect(page.getByRole('columnheader', { name: 'Teile' }).first()).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`studiengang=${CATALOGUE.programme}`));
	});

	// The escape hatch: a module that is in no catalogue of this programme and has to be offered
	// anyway. Allowed in the backend all along — the permission hangs off the programme of the
	// instance, never off the home of the module — and until now there was no way to say so from
	// the screen.
	test('fetches in a module from another programme, and can take it back', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		// It is not in the table: the catalogue query is filtered to this programme.
		await expect(page.getByRole('row', { name: /E2E Fremdmodul/ })).toHaveCount(0);

		// Behind a disclosure: it is the exception, and an open search box beside the filters
		// would read as a second way to filter the table.
		await page.getByText('Fach aus einem anderen Studiengang hereinholen').click();
		await page.getByRole('searchbox', { name: 'Modul suchen' }).fill('Fremdmodul');
		await page.getByRole('button', { name: 'Suchen' }).click();

		const hit = page.getByRole('listitem').filter({ hasText: 'E2E Fremdmodul' });
		await expect(hit.getByText(CATALOGUE.otherProgramme)).toBeVisible();
		await hit.getByRole('button', { name: 'in den Bedarf übernehmen' }).click();

		// Now it is a row of the table like any other, marked as one the filter did not produce
		// — which is what makes it possible to untick it again.
		const row = page.getByRole('row', { name: /E2E Fremdmodul/ });
		await expect(row).toBeVisible();
		await expect(row.getByText('außerhalb des Filters')).toBeVisible();
		await expect(row.getByRole('checkbox')).toBeChecked();

		// And back out. planDemand only touches the modules on the screen, so a row that is
		// visible is a row that can be withdrawn.
		await row.getByRole('checkbox').uncheck();
		await page.getByRole('button', { name: 'Zurückziehen und speichern' }).click();
		await expect(page.getByText('1 zurückgezogen')).toBeVisible({ timeout: 15_000 });
	});

	// The FWP placeholder, and the sentence the whole design rests on: three of them are three
	// cohorts of one. Not a workaround — three offerings of one module in one programme and
	// semester have to differ in their cohort, so the identity says it already, and the table
	// expresses it with the stepper it has.
	test('an FWP placeholder is planned like any other module, and three are three cohorts', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		await page.getByText('Eigene Lehrveranstaltung oder FWP-Platzhalter anlegen').click();
		await page.getByRole('textbox', { name: 'Name' }).fill('FWP-Platzhalter (technisch)');
		await page.getByLabel('Art der Lehrveranstaltung').selectOption('FWP_PLACEHOLDER');
		await page.getByRole('button', { name: 'Anlegen und anmelden' }).click();

		const row = page.getByRole('row', { name: /FWP-Platzhalter \(technisch\)/ });
		await expect(row).toBeVisible();
		// The badge, not the name — exact, because the name begins with the same word.
		await expect(row.getByText('FWP-Platzhalter', { exact: true })).toBeVisible();
		await expect(row.getByRole('checkbox')).toBeChecked();

		// A placeholder holds no lecture two cohorts could share: three FWPs are three different
		// subjects, not three cohorts of one.
		await expect(row.getByRole('button', { name: 'Vorlesung zusammenlegen' })).toHaveCount(0);

		// Three of them.
		const tracks = row.getByRole('spinbutton', { name: /^Züge von/ });
		await tracks.fill('3');
		await expect(page.getByText(/angelegt/)).toBeVisible({ timeout: 15_000 });

		await expect(page.getByRole('row', { name: /FWP-Platzhalter/ })).toHaveCount(1);
		// `?` rather than a number: a local course counts in no set of regulations, so there is
		// nothing to seed the cohort year from. The gap is spelled out instead of left off —
		// E2E1A and E2EA differ by one character and mean quite different things.
		await expect(row.getByText('E2E?A')).toBeVisible();
		await expect(row.getByText('E2E?C')).toBeVisible();
	});

	// The cohort year, said where the course is entered rather than looked for afterwards.
	//
	// The test above is the other half of this one: a local course counts in no set of
	// regulations, so nothing seeds the year and the row lands under "Ohne Fachsemester" — at the
	// bottom of the table, below every block somebody was working in. The field costs one number
	// at the moment somebody already knows it.
	test('files an own course under the cohort year it was entered with', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		await page.getByText('Eigene Lehrveranstaltung oder FWP-Platzhalter anlegen').click();
		await page.getByRole('textbox', { name: 'Name' }).fill('E2E Eigenes Fach');
		// Exact: every row of the table has one of these too, named after its module.
		await page.getByRole('spinbutton', { name: 'Fachsemester', exact: true }).fill('5');
		await page.getByRole('button', { name: 'Anlegen und anmelden' }).click();

		const row = page.getByRole('row', { name: /E2E Eigenes Fach/ });
		await expect(row).toBeVisible();
		await expect(row.getByRole('spinbutton', { name: /^Fachsemester von/ })).toHaveValue('5');
		// And that is the axis the table is grouped by, so the row is in the block a person was
		// working in rather than below every one of them.
		await expect(page.getByRole('heading', { name: /5\. Fachsemester/ })).toBeVisible();
	});

	// Empty stays empty. The field is optional in the sense that matters: "nobody has said" is a
	// state the rest of the page already renders, and it is the honest one while nobody has.
	test('leaves the cohort year open when the field is left empty', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, DEMAND_URL);

		await page.getByText('Eigene Lehrveranstaltung oder FWP-Platzhalter anlegen').click();
		await page.getByRole('textbox', { name: 'Name' }).fill('E2E Eigenes Fach ohne Jahr');
		await page.getByRole('button', { name: 'Anlegen und anmelden' }).click();

		const row = page.getByRole('row', { name: /E2E Eigenes Fach ohne Jahr/ });
		await expect(row).toBeVisible();
		await expect(row.getByRole('spinbutton', { name: /^Fachsemester von/ })).toHaveValue('');
		await expect(page.getByRole('heading', { name: /Ohne Fachsemester/ })).toBeVisible();
	});

	// The filters that switch on the click rather than on a second button. They are submit
	// buttons of a GET form, so the address carries the choice and the back button works — the
	// two properties a client-side filter would have cost.
	test('switches semester and programme without a second click', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/bedarf?semester=${DEMAND.semester}`);

		// Every programme the faculty plans is a tab. The list is short enough for that since it
		// stopped holding the ones nobody here runs.
		await page.getByRole('tab', { name: CATALOGUE.programme, exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`studiengang=${CATALOGUE.programme}`));
		await expect(page.getByRole('tab', { name: CATALOGUE.programme, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		// And a semester. That it keeps the programme is the next test's subject; here it is that
		// the click alone is the navigation and the tab it landed on carries the mark.
		// By its label rather than by a fragment of its code: every winter tab contains "WS", and
		// `.first()` then picks whichever one happens to sort earliest.
		const previous = page.getByRole('tab', { name: semesterShortName(DEMAND.previous) });
		await previous.click();
		await expect(page).toHaveURL(new RegExp(`semester=${DEMAND.previous}`));
		await expect(
			page.getByRole('tab', { name: semesterShortName(DEMAND.previous) })
		).toHaveAttribute('aria-selected', 'true');
	});

	// The toggle is about the person, not about this programme: somebody who plans finds it in
	// the same place every time, disabled and saying why where it cannot be used. A control that
	// comes and goes while one clicks through the programmes reads as a bug, and its absence
	// answers nothing.
	test('offers the edit toggle to a planner even where it cannot be used', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);

		// Across all programmes: she plans, but "all of them" is not one — planDemand writes
		// exactly one.
		await gotoRendered(page, `/bedarf?semester=${DEMAND.semester}`);
		const toggle = page.getByRole('button', { name: 'Bearbeiten' });
		await expect(toggle).toBeVisible();
		await expect(toggle).toBeDisabled();
		await expect(toggle).toHaveAttribute('title', /Studiengang wählen/);

		// A programme somebody else leads: still there, still disabled, different sentence.
		await gotoRendered(
			page,
			`/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.otherProgramme}`
		);
		await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Bearbeiten' })).toHaveAttribute(
			'title',
			/leiten Sie nicht/
		);

		// And her own, where it works.
		await gotoRendered(
			page,
			`/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.programme}`
		);
		await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeEnabled();
	});

	// Every form on this page owns some of the filter and has to carry the rest across. It did
	// not: a GET form submits only the clicked one of its submit buttons, so a click on a
	// programme sent `studiengang` alone — no semester, and the page landed back in the planning
	// semester. The mirror image lost the programme, and the third form had hidden copies of the
	// very fields it also shows, which made its selects inert.
	test('every filter keeps the others', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/bedarf?semester=${DEMAND.semester}`);

		// A programme keeps the semester.
		await page.getByRole('tab', { name: CATALOGUE.programme, exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`semester=${DEMAND.semester}`));
		await expect(page).toHaveURL(new RegExp(`studiengang=${CATALOGUE.programme}`));

		// A semester keeps the programme.
		await page.getByRole('tab', { name: 'SS 2028' }).click();
		await expect(page).toHaveURL(new RegExp(`studiengang=${CATALOGUE.programme}`));
		await expect(page).toHaveURL(/semester=2028-SS/);

		// And back, so the rest of this serial group finds the semester it expects.
		await page.getByRole('tab', { name: semesterShortName(DEMAND.semester) }).click();
		await expect(page).toHaveURL(new RegExp(`semester=${DEMAND.semester}`));

		// The controls of the third row are not shadowed by a hidden copy of themselves — and
		// that row belongs to the planning view, because it filters the catalogue list the
		// planning table is made of and nothing the overview shows.
		await expect(page.getByRole('button', { name: 'Anzeigen' })).toHaveCount(0);
		await page.getByRole('button', { name: 'Bearbeiten' }).click();

		const widen = page.getByRole('checkbox', { name: /^auch Module/ });
		await expect(widen).not.toBeChecked();
		await widen.check();
		await page.getByRole('button', { name: 'Anzeigen' }).click();

		await expect(page).toHaveURL(/turnus=alle/);
		await expect(page).toHaveURL(new RegExp(`studiengang=${CATALOGUE.programme}`));
		await expect(page).toHaveURL(new RegExp(`semester=${DEMAND.semester}`));
		await expect(page.getByRole('checkbox', { name: /^auch Module/ })).toBeChecked();

		// The switch is named after the term it would add, which is the other one.
		await expect(page.getByText('auch Module, die nur im Sommersemester laufen')).toBeVisible();
	});

	// The programmes this faculty does not plan are not offered anywhere on this page — neither
	// as a tab nor, since the select is gone, in a list behind one.
	test('offers no programme the faculty does not plan', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, `/bedarf?semester=${DEMAND.semester}`);

		await expect(
			page.getByRole('tab', { name: CATALOGUE.otherProgramme, exact: true })
		).toBeVisible();

		await runSql(
			`UPDATE programme SET planning_status = 'DISCONTINUED' WHERE code = ` +
				`'${CATALOGUE.otherProgramme}';`,
			'retiring the second test programme'
		);
		await gotoRendered(page, `/bedarf?semester=${DEMAND.semester}`);
		await expect(
			page.getByRole('tab', { name: CATALOGUE.otherProgramme, exact: true })
		).toHaveCount(0);

		// Put back, because the next test in this serial group fetches a module out of it.
		await runSql(
			`UPDATE programme SET planning_status = 'PLANNED' WHERE code = ` +
				`'${CATALOGUE.otherProgramme}';`,
			'restoring the second test programme'
		);
	});

	// A module in two cohorts is one subject offered twice, not two subjects — and the overview
	// has to say that the same way the planning table does, or the two screens disagree about
	// what is being offered.
	test('shows a module in two cohorts once, with both cohorts in the row', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(
			page,
			`/bedarf?semester=${DEMAND.semester}&studiengang=${CATALOGUE.programme}`
		);

		// The earlier tests in this serial group left this module planned in two cohorts.
		const row = page.getByRole('row', { name: /E2E Modul mit Aufteilung/ });
		await expect(row).toHaveCount(1);
		await expect(row.getByText('E2E1A')).toBeVisible();
		await expect(row.getByText('E2E1B')).toBeVisible();
	});

	// Arriving without a semester lands on the one the faculty is planning, and the choice ends
	// up in the address rather than only in the load — so the link somebody sends a colleague
	// still means what it meant when they sent it.
	test('opens on the planning semester when the address names none', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/bedarf');

		await expect(page).toHaveURL(new RegExp(`semester=${SEMESTERS.planning}`));
	});
});
