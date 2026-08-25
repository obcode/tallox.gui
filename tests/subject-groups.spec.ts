import { expect, type Locator, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, openDropdown, test } from './fixtures';
import { runSql } from './psql';

/**
 * Fachgruppen — the faculty's own grouping of modules and people.
 *
 * What these tests are for, and what the backend's own tests are not: the screen has to keep
 * membership and leadership apart, because they look identical (two lists of colleagues) and mean
 * completely different things. Membership grants nothing; leadership decides who fills a group's
 * instances and, once wishes exist, who reads the unpublished ones. A screen that blurred them
 * would be the fastest way to hand somebody a permission nobody meant to grant.
 *
 * Serial, because they create and rename the same groups.
 */
test.describe.configure({ mode: 'serial' });

const CODE = 'E2EMATHE';
// Deliberately not a prefix of CODE: a card is found by the text it contains, and
// `E2EMATHE-ML` would match every locator looking for `E2EMATHE`.
const SPLIT = 'E2EML';

test.afterAll(() => {
	// Whatever a failed run left behind. Modules first: the assignment holds the group.
	runSql(
		`DELETE FROM module_subject_group WHERE subject_group_id IN
		   (SELECT id FROM subject_group WHERE code IN ('${CODE}', '${SPLIT}'));
		 DELETE FROM subject_group WHERE code IN ('${CODE}', '${SPLIT}');`,
		'removing the test subject groups'
	);
});

test.describe('subject groups', () => {
	test('an administrator creates one, and it starts without a lead', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/fachgruppen');

		// Level 1: the section below carries the same word, and the wish fixture seeds a group —
		// so without the level this matches two headings and fails in strict mode.
		await expect(page.getByRole('heading', { name: 'Fachgruppen', level: 1 })).toBeVisible();

		await page.getByLabel('Kürzel').fill(CODE);
		await page.getByLabel('Name', { exact: true }).first().fill('E2E Mathematik');
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const card = page.locator('article', { hasText: CODE });
		await expect(card).toBeVisible();

		// "Keine Fachgruppe ohne Person, die sich ihrer annimmt" is a work list and not a
		// constraint: the group exists before its lead is decided, and the screen says so.
		await expect(card.getByText('Leitung: noch niemand')).toBeVisible();
		await expect(page.getByText(/Fachgruppe.? ohne Leitung/)).toBeVisible();
	});

	test('leadership needs the role and membership does not', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/fachgruppen');

		const card = page.locator('article', { hasText: CODE });
		const leads = card.locator('form[action="?/setLeads"]');
		const members = card.locator('form[action="?/setMembers"]');

		// Only somebody holding SUBJECT_GROUP_LEAD is offered as a lead. Cosmetic — the backend
		// refuses the rest, and the composite foreign key refuses it even if the backend forgot —
		// but a picker offering a choice that always fails is how people learn to ignore refusals.
		await expect(leads.getByRole('checkbox', { name: /Drei/ })).toBeVisible();
		await expect(leads.getByRole('checkbox', { name: /Zwei/ })).toHaveCount(0);

		// Membership is open to everybody, because it is not a grant.
		await expect(members.getByRole('checkbox', { name: /Zwei/ })).toBeVisible();

		await leads.getByRole('checkbox', { name: /Drei/ }).check();
		await leads.getByRole('button', { name: 'Leitung speichern' }).click();
		await expect(card.getByText(`Leitung: ${PERSONAS.drei.name}`)).toBeVisible();

		await members.getByRole('checkbox', { name: /Zwei/ }).check();
		await members.getByRole('button', { name: 'Mitglieder speichern' }).click();
		await expect(card.getByText('Mitglieder: 1')).toBeVisible();
	});

	test('a lecturer reads the groups and is offered no form', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/verwaltung/fachgruppen');

		// Readable by anybody with an account: who leads which subject is what the faculty's
		// organisation looks like, and somebody looking for the person to ask needs it.
		await expect(page.locator('article', { hasText: CODE })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Anlegen' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Leitung speichern' })).toHaveCount(0);
	});

	test('the entry is in everybody’s menu, unlike the other administration screens', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await openDropdown(page, /Prof/);
		await expect(page.getByRole('link', { name: /Fachgruppen/ })).toBeVisible();
		// The contrast: user administration is ADMIN-only and stays out of a lecturer's menu.
		await expect(page.getByRole('link', { name: /Verwaltung/ })).toHaveCount(0);
	});

	test('a module is assigned, moved and taken out again', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/fachgruppen');

		// The second group, so that "moved" is a real move rather than a first assignment.
		await page.getByLabel('Kürzel').fill(SPLIT);
		await page.getByLabel('Name', { exact: true }).first().fill('E2E Mathematik (ML)');
		await page.getByRole('button', { name: 'Anlegen' }).click();
		await expect(page.locator('article', { hasText: SPLIT })).toBeVisible();

		await gotoRendered(page, '/module?ohne-fachgruppe=1');

		const firstRow = page.locator('tbody tr').first();
		// Whichever module the work list happens to offer first — and it has to be named, because
		// the assertions below are about *that* row and the catalogue is not this test's to
		// predict.
		// .first(): a row without a stated split carries a second link, the one that offers to
		// enter it.
		const moduleName = (await firstRow.getByRole('link').first().innerText()).trim();

		await firstRow.getByRole('checkbox').check();
		await page
			.getByLabel('Ausgewählte Module zuordnen zu')
			.selectOption({ label: `${CODE} — E2E Mathematik` });
		await page.getByRole('button', { name: 'Zuordnen' }).click();

		// A string rather than a regular expression: the sentence spans several lines in the
		// markup, and only string matching normalizes whitespace.
		await expect(page.getByText(`1 Modul nach ${CODE} verschoben`)).toBeVisible();

		// It is out of the work list, and its group shows **under the Fachgruppe heading**.
		//
		// The assertion used to be "a cell somewhere in the table says E2EMATHE", which passed
		// happily while the subject group sat in the column headed "Heimat" and the home programme
		// in the one headed "Fachgruppe". A table is read by column, so a cell assertion that does
		// not name its column is not asserting what the reader sees.
		await gotoRendered(page, `/module?q=${encodeURIComponent(moduleName)}`);

		const group = await cellUnder(page, 'Fachgruppe');
		const home = await cellUnder(page, 'Heimat');
		await expect(group).toHaveText(CODE);
		// Whatever the home programme is, it is not the subject group's code — which is exactly
		// what a swap would make it.
		await expect(home).not.toHaveText(CODE);
		await expect(home).not.toHaveText('');
	});

	test('a group with modules is retired rather than deleted', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/fachgruppen');

		const card = page.locator('article', { hasText: CODE });
		await card.getByRole('button', { name: 'Stilllegen' }).click();

		// It moves into the second block, so it is the same card read under a different heading —
		// and its module count survives, which is the point of there being no delete.
		await expect(page.getByRole('heading', { name: /Stillgelegt/ })).toBeVisible();
		const retired = page.locator('article', { hasText: CODE });
		// Exact string rather than a regular expression, for the reason above — and exact so that
		// "1 Modul" does not also match "1 Module".
		await expect(retired.getByText('1 Modul', { exact: true })).toBeVisible();

		await retired.getByRole('button', { name: 'Wieder aufnehmen' }).click();
		await expect(
			page.locator('article', { hasText: CODE }).getByText('1 Modul', { exact: true })
		).toBeVisible();
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/fachgruppen');
		await checkA11y(page);
	});
});

/**
 * The first row's cell in the column with this heading.
 *
 * By index rather than by content, because that is what "under this heading" means: a table whose
 * cells hold the right values in the wrong columns is wrong, and every assertion that looks up a
 * cell by its text passes anyway.
 */
async function cellUnder(page: Page, heading: string): Promise<Locator> {
	const headings = (await page.locator('thead th').allTextContents()).map((h) => h.trim());
	const column = headings.indexOf(heading);
	expect(
		column,
		`no column headed "${heading}" — headings are ${headings.join(', ')}`
	).toBeGreaterThanOrEqual(0);

	return page.locator('tbody tr').first().locator('td').nth(column);
}
