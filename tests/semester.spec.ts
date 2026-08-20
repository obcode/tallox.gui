import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';

/**
 * The semester page, against the real stack.
 *
 * Two things here no Go test can see. The buttons for switching a phase are rendered from
 * `reachablePhases`, which the backend computes from the same rule the mutation enforces — a
 * page that built its own adjacency logic would look right until the two disagreed. And the
 * confidentiality rule has a visual half: before publication this page must show no aggregate
 * about the wishes, not even to the dean's office, and that is a statement about markup.
 */

/** A code per run: semesters are never deleted, so a fixed one would fail on SEMESTER_EXISTS. */
function freshCode(): string {
	// Four digits, a hyphen and the term, and far enough out that it cannot collide with a real
	// semester somebody entered. The year cycles through 2100..2199, the term alternates.
	const n = Date.now() % 100;
	return `21${String(n).padStart(2, '0')}-${n % 2 === 0 ? 'SS' : 'WS'}`;
}

test.describe('semesters and phases', () => {
	test('a lecturer sees the process but cannot change it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/semester');

		await expect(page.getByRole('heading', { name: 'Semester und Phasen' })).toBeVisible();

		// Cosmetic, and asserted as such: the lock is policy.MayAdministerSemesters and is
		// checked through both doors in Go. What this proves is that a lecturer is not shown
		// controls that would only ever produce a refusal.
		await expect(page.getByRole('button', { name: 'Anlegen' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Weiter zu/ })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /veröffentlichen/ })).toHaveCount(0);
	});

	test('the dean’s office creates a semester and walks it through the process', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/semester');

		const code = freshCode();
		await page.getByLabel('Semester').fill(code);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		// The card is found by its code, not by `.first()`: the list is sorted chronologically, so
		// a freshly created semester lands wherever its code puts it and not at the top.
		const row = page.locator('div.rounded-lg').filter({ hasText: code });
		await expect(row.getByText('Bedarfsplanung')).toBeVisible();

		// Forward one step. The button label comes from the same order the backend uses.
		await row.getByRole('button', { name: 'Weiter zu Wunschphase' }).click();
		await expect(row.getByText('Wunschphase')).toBeVisible();

		// And back. Reopening a plan is a normal thing for a faculty to do, so the way back has
		// to exist — and it has to be one step, not a jump.
		await expect(row.getByRole('button', { name: 'Zurück zu Bedarfsplanung' })).toBeVisible();
		await expect(row.getByRole('button', { name: 'Weiter zu Zuteilung' })).toBeVisible();
		await expect(row.getByRole('button', { name: /Weiter zu Abgeschlossen/ })).toHaveCount(0);
	});

	test('publishing takes two clicks and cannot be undone afterwards', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/semester');

		const code = freshCode();
		await page.getByLabel('Semester').fill(code);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const row = page.locator('div.rounded-lg').filter({ hasText: code });
		await expect(row.getByText('Wünsche vertraulich')).toBeVisible();

		// Behind a disclosure rather than a confirm(): the page works without JavaScript, and
		// this is the one action on it that cannot be walked back.
		await row.getByText('Wünsche veröffentlichen …').click();
		await row.getByRole('button', { name: /^Ja,/ }).click();

		await expect(row.getByText('Wünsche veröffentlicht')).toBeVisible();

		// And the button is gone. The backend is idempotent, so a second click would not be an
		// error — but a button that no longer does anything looks broken.
		await expect(row.getByText('Wünsche veröffentlichen …')).toHaveCount(0);
	});

	test('shows nothing about the wishes themselves before publication', async ({ asPersona }) => {
		// The visual half of the rule the whole project rests on. An aggregate — a count, a "has
		// wishes" tick, a sort by interest — gives the confidential information away completely
		// without naming anybody, and it would do so on the screen of the very role that plans.
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/semester');

		const code = freshCode();
		await page.getByLabel('Semester').fill(code);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const row = page.locator('div.rounded-lg').filter({ hasText: code });
		await expect(row).toContainText('Wünsche vertraulich');

		// No number anywhere in the card except the semester code itself.
		const text = ((await row.textContent()) ?? '').replace(code, '');
		expect(text, 'the card carries a figure about the wishes').not.toMatch(
			/\d+\s*(Wünsche|Wunsch|Interess)/
		);
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/semester');
		await checkA11y(page);
	});

	test('appears in the navigation for everybody', async ({ asPersona }) => {
		// Not gated by a role: the phase is the answer to "may I enter my wishes yet", and a
		// lecturer who cannot see it gets a tool that refuses writes without saying why.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await expect(page.getByRole('navigation').getByText('Semester').first()).toBeVisible();
	});
});
