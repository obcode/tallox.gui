import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';

/**
 * Teachers entered by hand: the dean's office enters one the ZPA does not list yet, corrects it
 * and takes it out of the lists; a taken address and a lecturer get the backend's refusal.
 *
 * Serial, because the tests share the one row.
 */
test.describe.configure({ mode: 'serial' });

const MAIL = 'lb.e2e@example.org';
const reset = () =>
	runSql(`DELETE FROM teacher WHERE source = 'LOCAL' AND mail = '${MAIL}';`, 'removing the row');

test.beforeAll(reset);
test.afterAll(reset);

test.describe('teachers entered by hand', () => {
	test('the dean’s office enters, corrects and retires one', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/zuteilung/lehrpersonen');
		await expect(
			page.getByRole('heading', { name: 'Lehrpersonen, die noch nicht im ZPA stehen' })
		).toBeVisible();

		const create = page.getByRole('region', { name: 'Lehrperson anlegen' });
		await create.getByRole('textbox', { name: 'Nachname' }).fill('Neu');
		await create.getByRole('textbox', { name: 'Vorname' }).fill('Lehrauftrag');
		await create.getByRole('textbox', { name: 'Mailadresse' }).fill(MAIL);
		await expect(create.getByRole('checkbox', { name: 'Lehrbeauftragte' })).toBeChecked();
		await create.getByRole('button', { name: 'Anlegen' }).click();
		await expect(page.getByText('Lehrauftrag Neu steht jetzt in der Auswahl.')).toBeVisible();

		const row = page.getByRole('row').filter({ hasText: MAIL });
		await expect(row).toContainText('nicht im ZPA');
		await expect(row).toContainText('LB');

		// The same address twice is the same human twice.
		await create.getByRole('textbox', { name: 'Nachname' }).fill('Doppelt');
		await create.getByRole('textbox', { name: 'Mailadresse' }).fill(MAIL);
		await create.getByRole('button', { name: 'Anlegen' }).click();
		await expect(page.getByRole('alert')).toContainText('Nicht angelegt');

		// Corrected in place, then out of the lists and back.
		await row.getByText('Bearbeiten').click();
		await row.getByRole('textbox', { name: 'Vorname' }).fill('Lehrauftrag Zwei');
		await row.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('row').filter({ hasText: MAIL })).toContainText(
			'Lehrauftrag Zwei Neu'
		);

		const again = page.getByRole('row').filter({ hasText: MAIL });
		await again.getByText('Bearbeiten').click();
		await again.getByRole('button', { name: 'Aus den Listen nehmen' }).click();
		await expect(page.getByRole('row').filter({ hasText: MAIL })).toContainText(
			'aus den Listen genommen'
		);

		await checkA11y(page);
	});

	test('a lecturer gets the refusal, not a row', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/zuteilung/lehrpersonen');
		const create = page.getByRole('region', { name: 'Lehrperson anlegen' });
		await create.getByRole('textbox', { name: 'Nachname' }).fill('Neu');
		await create.getByRole('textbox', { name: 'Mailadresse' }).fill('lb.e2e.zwei@example.org');
		await create.getByRole('button', { name: 'Anlegen' }).click();
		await expect(page.getByRole('alert')).toContainText('Fachgruppenleitungen');
	});
});
