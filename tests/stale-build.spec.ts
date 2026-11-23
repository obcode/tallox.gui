import { expect, type Page } from '@playwright/test';
import { PERSONAS, test } from './fixtures';

/**
 * A tab that outlived a deploy.
 *
 * The page code lives in hashed chunks, and a deploy replaces them all. A tab opened before it
 * asks for a chunk that is gone the first time it goes to a page it has not loaded yet — in
 * Safari "Importing a module script failed". Reported on 2026-11-19 from a tab left open
 * overnight: the next click in the administration ended on the error page, and the collector
 * got an issue for it. See #lib/staleBuild.
 *
 * The deploy is played here with two routes: /_app/version.json announces a newer build, and
 * every page chunk the tab has not loaded yet answers 404.
 */

/** Waits until the page is interactive: the router attaches on hydration. */
async function openHydrated(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

/**
 * Marks the running document. A full load replaces it and the mark is gone; a navigation of
 * the tab's own router keeps it.
 */
async function markDocument(page: Page) {
	await page.evaluate(() => {
		(window as unknown as { staleTab?: boolean }).staleTab = true;
	});
}

async function documentIsMarked(page: Page): Promise<boolean> {
	return page.evaluate(() => (window as unknown as { staleTab?: boolean }).staleTab === true);
}

type Deploy = {
	/** From now on the tab is older than the server. */
	happen: () => void;
	/** Full loads of a document after the deploy. */
	documentLoads: string[];
};

/**
 * Must run before the first `goto`, so that it sees which chunks the tab loads.
 *
 * `announce`: whether /_app/version.json reports the new build. `healsOnLoad`: whether a full
 * load fetches the new build, as it does after a real deploy. Without it the chunk is missing
 * for good — a broken build rather than a stale tab.
 */
async function prepareDeploy(
	page: Page,
	{ announce, healsOnLoad }: { announce: boolean; healsOnLoad: boolean }
): Promise<Deploy> {
	let deployed = false;
	const known = new Set<string>();
	const documentLoads: string[] = [];

	await page.route('**/_app/immutable/nodes/**', (route) => {
		const url = route.request().url();
		if (!deployed) {
			known.add(url);
			return route.continue();
		}
		if (known.has(url)) return route.continue();
		return route.fulfill({ status: 404, body: 'Not Found' });
	});

	await page.route('**/_app/version.json', (route) =>
		deployed && announce ? route.fulfill({ json: { version: 'deployed-later' } }) : route.continue()
	);

	page.on('request', (request) => {
		if (!deployed || !request.isNavigationRequest() || request.frame() !== page.mainFrame()) {
			return;
		}
		documentLoads.push(new URL(request.url()).pathname);
		if (healsOnLoad) deployed = false;
	});

	return { happen: () => (deployed = true), documentLoads };
}

const myTeaching = (page: Page) =>
	page.getByRole('banner').getByRole('link', { name: 'Meine Lehre' });

test.describe('a tab older than the last deploy', () => {
	test('follows the next click with a full load once it knows of a newer build', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		const deploy = await prepareDeploy(page, { announce: true, healsOnLoad: true });
		await openHydrated(page, '/');
		await markDocument(page);
		deploy.happen();

		// Coming back to the tab asks for the version, as after a night with the laptop shut.
		const asked = page.waitForResponse('**/_app/version.json', { timeout: 5_000 });
		await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
		await asked;

		await myTeaching(page).click();
		await expect(page).toHaveURL(/\/wuensche/);
		await expect(page.getByRole('navigation', { name: 'Meine Lehre' })).toBeVisible();
		expect(await documentIsMarked(page)).toBe(false);
		expect(deploy.documentLoads).toEqual(['/wuensche']);
	});

	test('a page whose code is gone loads the new build instead of the error page', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		// The case from 2026-11-19: the tab asks /_app/version.json and learns of no newer build,
		// so SvelteKit's own reload does not happen — yet the chunk is gone, and a full load
		// fetches the new build.
		const deploy = await prepareDeploy(page, { announce: false, healsOnLoad: true });
		// handleError writes this line for whatever it reports to the collector.
		const reported: string[] = [];
		page.on('console', (message) => {
			if (message.text().startsWith('unexpected error')) reported.push(message.text());
		});
		await openHydrated(page, '/');
		await markDocument(page);
		deploy.happen();

		await myTeaching(page).click();

		await expect(page).toHaveURL(/\/wuensche/);
		await expect(page.getByRole('navigation', { name: 'Meine Lehre' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Das hat nicht geklappt' })).toHaveCount(0);
		expect(await documentIsMarked(page)).toBe(false);
		expect(deploy.documentLoads).toEqual(['/wuensche']);
		// A stale tab is not a failure of Tallox: no number, nothing in the collector.
		expect(reported).toEqual([]);
	});

	test('a chunk missing for good reloads once and then offers a button', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		// No newer version either: SvelteKit's own check finds nothing to reload for, and the
		// error page is all that is left.
		const deploy = await prepareDeploy(page, { announce: false, healsOnLoad: false });
		await openHydrated(page, '/');
		deploy.happen();

		await myTeaching(page).click();

		const reload = page.getByRole('button', { name: 'Seite neu laden' });
		await expect(reload).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Das hat nicht geklappt' })).toBeVisible();
		await expect(page.getByText('meist weil Tallox gerade aktualisiert wurde')).toBeVisible();
		// No number: nothing was reported, so there is nothing to look up.
		await expect(page.getByTestId('error-id')).toHaveCount(0);
		expect(deploy.documentLoads).toEqual(['/wuensche']);
		await checkA11y(page);
	});
});
