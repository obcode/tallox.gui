import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, openDropdown, test } from './fixtures';
import { runSql } from './psql';
import { WISHES } from './seed';

/**
 * The subject groups somebody joins themselves.
 *
 * Membership is not a permission — the backend's assignment scope deliberately does not read it —
 * so this page belongs to the person and not to the administration. What it decides is what the
 * wish screen offers first, which is the difference between a preselection and a barrier.
 *
 * Serial, because the tests change the same person's memberships.
 */
test.describe.configure({ mode: 'serial' });

/** Whatever a run left behind: Zwei is in no group to start with. */
function reset(): void {
	runSql(
		`DELETE FROM person_subject_group
		  WHERE person_id IN (SELECT id FROM person WHERE mail = '${PERSONAS.zwei.mail}');`,
		'clearing the test memberships'
	);
}

test.beforeAll(reset);
test.afterAll(reset);

test.describe('my subject groups', () => {
	test('the entry is in everybody’s own area', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/');

		await openDropdown(page, /Prof/);
		await expect(page.getByRole('link', { name: 'Meine Fachgruppen', exact: true })).toBeVisible();
	});

	test('a lecturer joins one and it sticks, also after saving twice', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/fachgruppen');

		await expect(page.getByRole('heading', { name: 'Meine Fachgruppen' })).toBeVisible();

		const box = page.getByRole('checkbox', { name: new RegExp(WISHES.subjectGroupCode) });
		await expect(box).not.toBeChecked();

		await box.check();
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByText('Gespeichert.')).toBeVisible();
		await expect(box).toBeChecked();

		// The second save is where a form reset would show the state from before the first one.
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(box).toBeChecked();

		await gotoRendered(page, '/konto/fachgruppen');
		await expect(
			page.getByRole('checkbox', { name: new RegExp(WISHES.subjectGroupCode) })
		).toBeChecked();
	});

	test('joining changes what the wish screen offers first', async ({ asPersona }) => {
		// The reason the page exists, asserted rather than described.
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, `/wuensche?semester=${WISHES.semester}`);

		await expect(page.getByRole('heading', { name: 'Meine Fachgruppen' })).toBeVisible();
	});

	test('it says what a group holds, so "is this my subject" is answerable', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/fachgruppen');

		// A group's code says nothing about whether it holds the module somebody teaches.
		const card = page.locator('article', { hasText: WISHES.subjectGroupCode });
		await card.getByRole('group').click();
		await expect(card.getByRole('link', { name: 'E2E Fachmodul' })).toBeVisible();
	});

	test('leaving is the same form', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/fachgruppen');

		const box = page.getByRole('checkbox', { name: new RegExp(WISHES.subjectGroupCode) });
		await box.uncheck();
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByText('Gespeichert.')).toBeVisible();
		await expect(box).not.toBeChecked();

		// And the wish screen stops offering it first — the preselection follows the membership.
		await gotoRendered(page, `/wuensche?semester=${WISHES.semester}`);
		await expect(page.getByText(/noch keiner Fachgruppe zugeordnet/)).toBeVisible();
	});

	test('nobody is offered a way to make themselves a lead here', async ({ asPersona }) => {
		// The one thing this page must not reach: leading a group is a grant, and it decides who
		// reads unpublished wishes before the stichtag.
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/fachgruppen');

		await expect(page.getByRole('button', { name: /Leitung/ })).toHaveCount(0);
		const body = await page.locator('main').innerText();
		expect(body).toMatch(/Leitung .* wird in der Verwaltung vergeben|nicht hier/);
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/fachgruppen');
		await checkA11y(page);
	});
});
