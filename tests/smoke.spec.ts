import { PERSONAS, test, expect, gotoRendered } from './fixtures';

/**
 * The smoke test. Runs against a real stack: SvelteKit SSR → GraphQL backend → PostgreSQL.
 *
 * What it secures is checked by no unit test: that the three parts answer together at all. The
 * commonest way that breaks is not a broken component but a wrong `TALLOX_SERVER` URL — and its
 * symptom is a page that renders but is empty everywhere.
 */
test.describe('start page', () => {
	test('renders and calls itself by name', async ({ page }) => {
		await gotoRendered(page, '/');

		await expect(page.getByRole('heading', { name: 'Einsatzplanung', level: 1 })).toBeVisible();
		await expect(page.getByRole('banner').getByText('Tallox', { exact: true })).toBeVisible();
	});

	test('reaches the backend and shows its version', async ({ page }) => {
		await gotoRendered(page, '/');

		// The card says "Nicht erreichbar" when the SSR hop fails. That is exactly the
		// interesting case: the page still renders, and without this assertion an end-to-end run
		// against a dead backend would be green.
		const backendCard = page
			.locator('div')
			.filter({ hasText: /^🔌 Backend/ })
			.last();
		await expect(backendCard).not.toContainText('Nicht erreichbar');

		// The footer gets its server version by the same route. Deliberately not checked against
		// a version number: a locally built backend reports "dev", because the version is only
		// set via ldflags at release time. The interesting thing is the "—", because that means
		// the answer was empty rather than faulty — a different failure from an unreachable
		// backend, and one the card above does not show.
		const footer = page.getByRole('contentinfo');
		await expect(footer).toContainText(/Server\s+\S+/);
		await expect(footer).not.toContainText('Server —');
	});

	test('serves a fully substituted app.html', async ({ page }) => {
		// Learned the hard way: a comment in app.html that mentioned a sveltekit placeholder in
		// its prose attracted the substitution. The stylesheet ended up inside the comment, the
		// real placeholder stayed as visible text in the <head> — and because text is invalid
		// there, the browser closed the head and showed "%sveltekit.head%" in the top left of
		// every page. The application was unstyled.
		//
		// Not one of the other tests noticed: they check content and behaviour, and both kept
		// working. Hence these two blunt but effective assertions.
		const response = await page.goto('/');
		const html = await response!.text();

		const leftover = html.match(/%sveltekit\.[a-z]+%|%tallox\.[a-z]+%/i);
		expect(
			leftover?.[0],
			`app.html contains an unsubstituted placeholder (${leftover?.[0]}). ` +
				`Commonest cause: the same placeholder is mentioned in a comment further up and ` +
				`intercepts the substitution.`
		).toBeUndefined();

		// Without a stylesheet the page still renders and reads as unremarkable in a test — it
		// just looks wrecked. That is exactly the damage the defect above caused.
		await expect(page.locator('head link[rel="stylesheet"]')).not.toHaveCount(0);
	});

	test('answers a health check with no identity at all', async ({ request }) => {
		// Straight at the backend, without a browser and without headers. /healthz has to answer
		// before the database, the auth proxy or a session exist — the container health check and
		// deploy/smoketest hang on it. Were it ever behind the auth middleware, every deployment
		// would roll itself back on a healthy server.
		const backend = process.env.TALLOX_SERVER ?? 'http://localhost:8080/query';
		const health = new URL('/healthz', backend).toString();

		const response = await request.get(health);
		expect(response.ok(), `GET ${health} answered with ${response.status()}`).toBe(true);
		expect(await response.json()).toMatchObject({ status: 'ok' });
	});
});

/**
 * The walk-through on the start page: the process as numbered steps, who does each and where.
 *
 * Two things are worth a test. The steps link only where the menu links — a lecturer reads
 * that the administration admits people, and gets no link into a refusal; an administrator
 * gets the link. And the one sentence the page may never get wrong is the confidentiality of
 * the wishes.
 */
test.describe('the walk-through on the start page', () => {
	test('tells the process in order, with the roles beside each step', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await expect(page.getByRole('heading', { name: 'Einmal einrichten' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Jedes Semester' })).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Den Bedarf festlegen/ })).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Interesse bekunden/ })).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Die Instanzen besetzen/ })).toBeVisible();
		await expect(page.getByText(/Bis zur Veröffentlichung sieht das niemand sonst/)).toBeVisible();
		await expect(
			page.getByText('Jedes Modul gehört genau einer Fachgruppe', { exact: false })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Wer macht was' })).toBeVisible();
	});

	test('links a step only where the menu would', async ({ asPersona }) => {
		const lecturer = await asPersona(PERSONAS.eins);
		await gotoRendered(lecturer, '/');
		await expect(lecturer.getByRole('link', { name: 'Personen und Rollen' })).toHaveCount(0);
		await expect(lecturer.getByText('Personen und Rollen')).toBeVisible();
		await expect(lecturer.getByRole('link', { name: 'Bedarf', exact: true }).first()).toBeVisible();

		const admin = await asPersona(PERSONAS.sechs);
		await gotoRendered(admin, '/');
		await expect(admin.getByRole('link', { name: 'Personen und Rollen' })).toBeVisible();
	});
});
