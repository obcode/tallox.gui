import { PERSONAS, test, expect, gotoRendered } from './fixtures';
import { CATALOGUE, COMPETENCES } from './seed';

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

	// The tab shows a graduation cap, and the icon the page names is the one that is served.
	test('names its favicon and serves the graduation cap', async ({ page }) => {
		await page.goto('/');
		const href = await page.locator('link[rel="icon"]').getAttribute('href');
		expect(href).toMatch(/favicon\.svg$/);

		const icon = await page.request.get(new URL(href!, page.url()).toString());
		expect(icon.ok()).toBe(true);
		expect(icon.headers()['content-type']).toContain('image/svg+xml');
		expect(await icon.text()).toContain('🎓');
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
 * The walk-through, on its own page since the start page shows only what is due now.
 *
 * Two things are worth a test. The steps link only where the menu links — a lecturer reads
 * that the administration admits people, and gets no link into a refusal; an administrator
 * gets the link. And the one sentence the page may never get wrong is the confidentiality of
 * the wishes.
 */
test.describe('the walk-through', () => {
	test('tells the process in order, with the roles beside each step', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/ablauf');

		await expect(
			page.getByRole('heading', { name: 'Ablauf der Einsatzplanung', level: 1 })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Einmal einrichten' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Jedes Semester' })).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Den Bedarf festlegen/ })).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Interesse bekunden/ })).toBeVisible();
		await expect(
			page.getByRole('heading', { name: /^Die Wunschrunde der Fachgruppe schließen/ })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Die Instanzen besetzen/ })).toBeVisible();
		await expect(page.getByText(/Bis zur Veröffentlichung sieht das niemand sonst/)).toBeVisible();
		await expect(
			page.getByText('Jedes Modul gehört genau einer Fachgruppe', { exact: false })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Wer macht was' })).toBeVisible();
	});

	// The picture above the steps: the per-semester steps as phases × roles. Where each step sits
	// is pinned in processChart.test.ts; this checks that it renders and that a box leads to its
	// step. Which phase is marked depends on other specs and is not checked here.
	test('draws the semester as phases and roles', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/ablauf');

		const chart = page.getByRole('heading', { name: 'Das Semester im Überblick' }).locator('..');
		for (const phase of [
			'Auftakt',
			'Bedarfsplanung',
			'Wunschphase',
			'Zuteilung',
			'Studiengangs-Review',
			'Abgeschlossen'
		]) {
			await expect(chart.getByRole('heading', { name: phase, exact: true })).toBeVisible();
		}
		await expect(chart.getByText('nicht umkehrbar')).toHaveCount(3);

		await chart.getByRole('link', { name: /Die Instanzen besetzen/ }).click();
		await expect(page).toHaveURL(/#schritt-\d+$/);
		await expect(page.getByRole('heading', { name: /^Die Instanzen besetzen/ })).toBeInViewport();
	});

	test('links a step only where the menu would', async ({ asPersona }) => {
		const lecturer = await asPersona(PERSONAS.eins);
		await gotoRendered(lecturer, '/ablauf');
		const main = lecturer.getByRole('main');
		await expect(main.getByRole('link', { name: 'Personen und Rollen' })).toHaveCount(0);
		await expect(main.getByText('Personen und Rollen')).toBeVisible();
		await expect(main.getByRole('link', { name: 'Bedarf', exact: true }).first()).toBeVisible();

		const admin = await asPersona(PERSONAS.sechs);
		await gotoRendered(admin, '/ablauf');
		await expect(
			admin.getByRole('main').getByRole('link', { name: 'Personen und Rollen' })
		).toBeVisible();
	});

	test('is in the help panel for everybody', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');
		// It is reference, so it sits with the help — not behind the identity, which is the
		// account and nothing else.
		await page.getByRole('button', { name: 'Hilfe', exact: true }).click();
		await page
			.getByRole('dialog')
			.getByRole('link', { name: /Ablauf der Einsatzplanung/ })
			.click();
		await expect(
			page.getByRole('heading', { name: 'Ablauf der Einsatzplanung', level: 1 })
		).toBeVisible();
		await expect(page.getByRole('dialog')).toBeHidden();
	});
});

/**
 * The introduction, for somebody who teaches and plans nothing.
 *
 * The phase mark moves with the planning semester, which other specs change while these run —
 * so which phase is marked is pinned in vitest (`intro.test.ts`), and here only what holds in
 * every phase: the sections are there, the confidentiality promise is said, and the links follow
 * the menu.
 */
test.describe('the introduction', () => {
	test('tells the ideas, the phases and what a lecturer does', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/einfuehrung');
		const main = page.getByRole('main');

		await expect(
			main.getByRole('heading', { name: 'Einführung in Tallox', level: 1 })
		).toBeVisible();
		await expect(
			main.getByRole('heading', { name: 'Drei Versprechen an das Kollegium' })
		).toBeVisible();
		await expect(
			main
				.getByRole('region', { name: 'Drei Versprechen an das Kollegium' })
				.getByText(/auch keine Anzahl/)
		).toBeVisible();
		await expect(main.getByRole('heading', { name: 'Ein Semester in fünf Phasen' })).toBeVisible();
		for (const phase of [
			'Bedarfsplanung',
			'Wunschphase',
			'Zuteilung',
			'Studiengangs-Review',
			'Abgeschlossen'
		]) {
			await expect(
				main.getByRole('heading', { name: new RegExp(`^${phase}`), level: 3 })
			).toBeVisible();
		}
		await expect(main.getByRole('heading', { name: 'Was Du tust' })).toBeVisible();
		await expect(
			main.getByText('Wie trage ich einen Wunsch ein, und wie ziehe ich ihn zurück?')
		).toBeVisible();
		// The how-tos are a lecturer's: nothing about closing a subject group's wish round.
		await expect(main.getByText(/Wunschrunde meiner Fachgruppe/)).toHaveCount(0);
		await expect(main.getByRole('link', { name: 'Wünsche', exact: true }).first()).toBeVisible();
		await checkA11y(page);
	});

	test('is in the help panel and on the start page', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');
		await page.getByRole('main').getByRole('link', { name: 'Einführung', exact: true }).click();
		await expect(page).toHaveURL(/\/einfuehrung$/);

		await page.getByRole('banner').getByRole('button', { name: 'Hilfe', exact: true }).click();
		await page
			.getByRole('dialog')
			.getByRole('link', { name: /Einführung in Tallox/ })
			.click();
		await expect(
			page.getByRole('heading', { name: 'Einführung in Tallox', level: 1 })
		).toBeVisible();
		await expect(page.getByRole('dialog')).toBeHidden();
	});
});

/**
 * The start page no longer tells the whole process: two sections of steps and a table met
 * somebody on their first visit. It says what is due now and points at the rest.
 */
test.describe('the start page as a starting point', () => {
	test('shows what is due now and links the whole walk-through', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');
		const main = page.getByRole('main');

		await expect(main.getByRole('heading', { name: /Jetzt dran für Dich/ })).toBeVisible();
		await expect(main.getByRole('link', { name: /Gesamten Ablauf ansehen/ })).toBeVisible();
		await expect(main.getByRole('heading', { name: 'Einmal einrichten' })).toHaveCount(0);
		await expect(main.getByRole('heading', { name: 'Wer macht was' })).toHaveCount(0);
		// Removed on request: a list of what does not exist yet is not what somebody arriving needs.
		await expect(main.getByRole('heading', { name: /Was noch entsteht/ })).toHaveCount(0);

		await main.getByRole('link', { name: /Gesamten Ablauf ansehen/ }).click();
		await expect(page).toHaveURL(/\/ablauf$/);
	});

	// Who leads what is for everybody — Eins holds no planning role and sees both lists, with the
	// leads the seed gave the programme and the group.
	test('shows who leads which programme and subject group', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');
		const main = page.getByRole('main');

		await expect(main.getByRole('heading', { name: 'Wer leitet was' })).toBeVisible();

		const programmes = main.getByRole('list', { name: 'Studiengänge und ihre Leitung' });
		const programme = programmes
			.getByRole('listitem')
			.filter({ has: page.getByText(CATALOGUE.programme, { exact: true }) });
		await expect(programme).toContainText(PERSONAS.vier.name);

		const groups = main.getByRole('list', { name: 'Fachgruppen und ihre Leitung' });
		const group = groups.locator(':scope > li').filter({ hasText: 'Kompetenz-Testfachgruppe' });
		await expect(group).toContainText(`Leitung: ${PERSONAS.drei.name}`);

		const module = group.getByRole('link', { name: COMPETENCES.compulsoryName });
		await expect(module).toBeHidden();
		await group.getByText('2 Module').click();
		await expect(module).toBeVisible();

		await checkA11y(page);
	});
});
