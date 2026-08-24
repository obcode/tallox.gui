import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, openDropdown, test } from './fixtures';
import { runSql } from './psql';
import { CATALOGUE } from './seed';

/**
 * Which study programmes the faculty plans.
 *
 * The examination office's catalogue holds every programme its regulations mention, and the
 * source cannot say which of them this faculty runs — the newest regulations of two planned
 * programmes are older than those of every programme that has run out. So it is a decision, and
 * this is the screen it is taken on.
 *
 * Serial, because these tests change the same programme.
 */
test.describe.configure({ mode: 'serial' });

test.afterAll(() => {
	// Whatever a failed run left behind: the demand tests need this programme planned.
	runSql(
		`UPDATE programme SET planning_status = 'PLANNED' WHERE code = '${CATALOGUE.otherProgramme}';`,
		'restoring the second test programme'
	);
});

test.describe('the study programmes', () => {
	test('a lecturer sees the list and is offered no decision', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/verwaltung/studiengaenge');

		await expect(page.getByRole('heading', { name: 'Studiengänge' })).toBeVisible();
		await expect(page.getByRole('row', { name: new RegExp(CATALOGUE.programme) })).toBeVisible();

		// Cosmetic, and asserted as such: the lock is policy.MayAdministerSemesters and applies
		// to the token door too.
		await expect(page.getByRole('button', { name: 'ausgelaufen' })).toHaveCount(0);
	});

	test('the entry is not in a lecturer’s menu', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await openDropdown(page, /Prof/);
		await expect(page.getByRole('link', { name: /Studiengänge/ })).toHaveCount(0);
	});

	test('the dean’s office retires a programme and brings it back', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/verwaltung/studiengaenge');

		const row = page.getByRole('row', { name: new RegExp(CATALOGUE.otherProgramme) });
		await expect(row.getByText('wird geplant')).toBeVisible();

		await row.getByRole('button', { name: 'ausgelaufen' }).click();

		// It moves into the second block, so it is the same row read under a different heading.
		const retired = page.getByRole('row', { name: new RegExp(CATALOGUE.otherProgramme) });
		await expect(retired.getByText('ausgelaufen')).toBeVisible();

		// And back, because that is the other direction the faculty needs.
		await retired.getByRole('button', { name: 'wird geplant' }).click();
		await expect(
			page
				.getByRole('row', { name: new RegExp(CATALOGUE.otherProgramme) })
				.getByText('wird geplant')
		).toBeVisible();
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/verwaltung/studiengaenge');
		await checkA11y(page);
	});
});
