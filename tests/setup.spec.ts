import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { SETUP } from './seed';

/**
 * "Dein Stand" on the start page: a newcomer goes from nothing stated to set up, and the card
 * follows what she enters on the pages that already exist.
 *
 * Only the one-time group is asserted. Whether the desired hours are asked for depends on the
 * planning semester's phase, which other specs move in parallel — that mapping is pinned in
 * `setup.test.ts`.
 *
 * Serial, because the tests build on one another's statements.
 */
test.describe.configure({ mode: 'serial' });

function reset(): void {
	runSql(
		`DELETE FROM competence
		  WHERE person_id IN (SELECT id FROM person WHERE mail = '${PERSONAS.newcomer.mail}');
		 DELETE FROM person_subject_group
		  WHERE person_id IN (SELECT id FROM person WHERE mail = '${PERSONAS.newcomer.mail}');`,
		'clearing the newcomer'
	);
}

test.beforeAll(reset);
test.afterAll(reset);

test.describe('dein Stand', () => {
	test('a newcomer sees both one-time items open', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.newcomer);
		await gotoRendered(page, '/');

		const card = page.getByRole('region', { name: /Dein Stand/ });
		await expect(card.getByRole('heading', { name: 'Einmal einrichten' })).toBeVisible();
		await expect(
			card.getByRole('listitem').filter({ hasText: 'Fachgruppen angeben' })
		).toContainText('offen');
		await expect(card.getByText('Geht, sobald Du Deine Fachgruppen angegeben hast.')).toBeVisible();
		await expect(card.getByRole('link', { name: 'Einführung in Tallox' })).toBeVisible();
		await checkA11y(page);
	});

	test('it follows the subject groups and the competences', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.newcomer);
		await gotoRendered(page, '/');
		const card = page.getByRole('region', { name: /Dein Stand/ });

		// From the card to the page, as somebody new would go.
		await card.getByRole('link', { name: 'Meine Fachgruppen' }).click();
		await page.getByRole('checkbox', { name: new RegExp(`^${SETUP.subjectGroupName}`) }).check();

		await page
			.getByRole('navigation', { name: 'Meine Lehre' })
			.getByRole('link', { name: 'Kompetenzen', exact: true })
			.click();
		await expect(page.getByRole('heading', { name: 'Meine Kompetenzen', level: 1 })).toBeVisible();
		await gotoRendered(page, '/');
		await expect(
			card.getByRole('listitem').filter({ hasText: 'Fachgruppen angeben' })
		).toContainText('erledigt');
		// One compulsory module in the group, so one is all it can ask for.
		await expect(card.getByText(`${SETUP.subjectGroupName}: 0 von 1`)).toBeVisible();

		await gotoRendered(page, '/konto/kompetenzen');
		await page
			.getByRole('combobox', { name: `Stufe für ${SETUP.compulsoryName}` })
			.selectOption('CAN_TEACH');
		await expect(page.getByText('Eine Änderung gespeichert.')).toBeVisible();

		// Set up: the one-time group is gone. The card may stay for the desired hours.
		await gotoRendered(page, '/');
		await expect(page.getByRole('heading', { name: 'Einmal einrichten' })).toHaveCount(0);
	});

	test('is not shown to a partner faculty', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.partner);
		await gotoRendered(page, '/');
		await expect(page.getByRole('region', { name: /Dein Stand/ })).toHaveCount(0);
	});
});
