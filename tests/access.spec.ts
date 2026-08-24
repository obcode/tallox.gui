import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';

/**
 * The access log page.
 *
 * The rules are in the backend and are checked there, through both doors. What is checked here
 * is what no Go test level can see: that the page exists at all — the field is
 * `@interactiveOnly`, so the API console cannot show it and this page is the only way to read
 * the log in production — and that visiting it produces an entry a moment later, which is the
 * end-to-end evidence that the middleware sits in the real chain and not only in a test one.
 */

test.describe('access log', () => {
	test('refuses a lecturer rather than showing her an empty log', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		const response = await page.goto('/verwaltung/zugriffe');

		// An empty table and "you may not do this" are different answers, and the first would
		// read as "nobody has been here", which is a claim about colleagues rather than about
		// permissions.
		expect(response?.status()).toBeGreaterThanOrEqual(400);
	});

	test('is not offered to a lecturer in the menu', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await page.goto('/');
		await expect(page.getByRole('link', { name: /Zugriffe/ })).toHaveCount(0);
	});

	test('shows an administrator what happened, and records the visit itself', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.sechs);

		// A page load of its own, so that there is something to find afterwards that this test
		// caused rather than something an earlier one left behind.
		await gotoRendered(page, '/');
		await gotoRendered(page, '/verwaltung/zugriffe');

		await expect(page.getByRole('heading', { name: 'Zugriffe' })).toBeVisible();

		// The visit to the front page is in the log — through SSR, the relayed identity, the
		// middleware and the table. Any one of those missing and this row does not exist.
		await expect(page.getByText(PERSONAS.sechs.mail).first()).toBeVisible();
	});

	test('names a refused sign-in by the address that was turned away', async ({
		asPersona,
		browser
	}) => {
		// Somebody with an HM login and no person row. The backend answers 401 and this is the
		// only place the event becomes visible to a person.
		const stranger = await browser.newContext({
			extraHTTPHeaders: { 'X-Remote-User': 'niemand.aus.dem.nichts@example.org' }
		});
		await stranger.newPage().then((p) => p.goto('/'));
		await stranger.close();

		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/zugriffe');

		await expect(page.getByText('niemand.aus.dem.nichts@example.org').first()).toBeVisible();
		await expect(page.getByText('UNKNOWN_USER').first()).toBeVisible();
	});

	test('filters without losing the other filters', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/zugriffe');

		await page.getByLabel('Person').fill(PERSONAS.sechs.mail);
		await page.getByLabel('Zeitraum').selectOption('7');
		await page.getByRole('button', { name: 'Anzeigen' }).click();

		await page.waitForURL(/person=/);
		expect(new URL(page.url()).searchParams.get('zeitraum')).toBe('7');
	});

	test('is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/zugriffe');
		await checkA11y(page);
	});
});
