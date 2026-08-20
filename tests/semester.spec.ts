import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';

/**
 * The semester page, against the real stack.
 *
 * Two things here no Go test can see. The buttons for switching a phase are rendered from
 * `reachablePhases`, which the backend computes from the same rule the mutation enforces — a
 * page that built its own adjacency logic would look right until the two disagreed. And the
 * confidentiality rule has a visual half: before publication this page must show no aggregate
 * about the wishes, not even to the dean's office, and that is a statement about markup.
 *
 * Nothing here creates a semester, because nothing can: the page lists the semesters around
 * now whether or not anybody has planned anything, and the tests pick their subject out of that
 * list. Which is also the assertion — a fresh database shows the process, not a form.
 *
 * **On a local database this leaves state behind.** Publishing cannot be undone, so each local
 * run consumes one of the listed semesters; the suite says so when they run out. Wipe with
 * `psql-tallox -c 'delete from semester'` — the rows hold nothing but the decisions these tests
 * made. In CI the database is new every time.
 */

/** The semester cards on the page, newest first — the order the backend lists them in. */
function cards(page: Page) {
	return page.locator('div.rounded-lg').filter({ has: page.locator('h2') });
}

/**
 * The code of the oldest semester nobody has published yet.
 *
 * From the far end so that it cannot be the one the phase test walks, and chosen at runtime
 * rather than written down: a fixed code would be usable exactly once, since publishing is
 * final.
 *
 * Returns the *code* rather than the card. A locator is a query and not a handle — filtering on
 * "Wünsche vertraulich" and then publishing would make the same locator point at a different
 * card on the next assertion, which is a test that quietly stops watching what it started on.
 */
async function oldestUnpublishedCode(page: Page): Promise<string> {
	const unpublished = cards(page).filter({ hasText: 'Wünsche vertraulich' });
	const count = await unpublished.count();
	if (count === 0) {
		throw new Error(
			'every listed semester has had its wishes published — this is a local database ' +
				"carrying earlier runs. Wipe it with: psql-tallox -c 'delete from semester'"
		);
	}
	return (
		(await unpublished
			.nth(count - 1)
			.locator('code')
			.first()
			.textContent()) ?? ''
	);
}

test.describe('semesters and phases', () => {
	test('a lecturer sees the process but cannot change it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/semester');

		await expect(page.getByRole('heading', { name: 'Semester und Phasen' })).toBeVisible();

		// The semesters are there without anybody having set them up, and a lecturer sees them:
		// "may I enter my wishes yet" is the phase, and a tool that hides it refuses writes
		// without saying why.
		expect(await cards(page).count()).toBeGreaterThan(3);

		// Cosmetic, and asserted as such: the lock is policy.MayAdministerSemesters and is
		// checked through both doors in Go. What this proves is that a lecturer is not shown
		// controls that would only ever produce a refusal.
		await expect(page.getByRole('button', { name: /Weiter zu/ })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /veröffentlichen/ })).toHaveCount(0);
	});

	test('the dean’s office walks a semester through the process', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/semester');

		// The furthest one on the list: nothing has been decided about it, so it is in
		// Bedarfsplanung without anybody having put it there — and the phase test ends where it
		// started, so a second run finds it the same way.
		const newest = (await cards(page).first().locator('code').first().textContent()) ?? '';
		const row = cards(page).filter({ hasText: newest });
		await expect(row.getByText('Bedarfsplanung')).toBeVisible();

		// Forward one step. The button label comes from the same order the backend uses.
		await row.getByRole('button', { name: 'Weiter zu Wunschphase' }).click();
		await expect(row.getByText('Wunschphase')).toBeVisible();

		// One step away in each direction, and nothing further: FINAL is two steps from here and
		// must not be offered, because a skip that cannot be expressed cannot happen by accident.
		await expect(row.getByRole('button', { name: 'Weiter zu Zuteilung' })).toBeVisible();
		await expect(row.getByRole('button', { name: /Weiter zu Abgeschlossen/ })).toHaveCount(0);

		// And back. Reopening a plan is a normal thing for a faculty to do, so the way back has
		// to exist — and clicking it here also leaves the semester where the test found it,
		// which is what lets this run twice against the same database.
		await row.getByRole('button', { name: 'Zurück zu Bedarfsplanung' }).click();
		await expect(row.getByText('Bedarfsplanung')).toBeVisible();
	});

	test('publishing takes two clicks and cannot be undone afterwards', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/semester');

		const row = cards(page).filter({ hasText: await oldestUnpublishedCode(page) });
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

		// The second card rather than the first, so that the phase test walking the newest one
		// cannot change this card's text underneath the assertion.
		const row = cards(page).nth(1);
		const code = (await row.locator('code').first().textContent()) ?? '';
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
