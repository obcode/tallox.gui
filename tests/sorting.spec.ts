import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { SORTING, sortingStatements } from './seed';

/**
 * Sorting tables by their column heads.
 *
 * The order logic is unit-tested in src/lib/sorting.test.ts. What only a browser shows: that the
 * head is a button a person can press, that pressing it reorders the rendered rows and says so in
 * `aria-sort` — and, on the wish screen, that the order never gives away somebody else's entry
 * and that pressing a head inside the self-saving form saves nothing.
 *
 * Serial, because they share the fixture's one wish.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/wuensche?semester=${SORTING.semester}`;
const ACCOUNTS = '/verwaltung/personen?ansicht=konten';

function reset(): void {
	runSql(sortingStatements().join('\n'), 'resetting the sorting fixture');
}

test.beforeAll(() => {
	reset();
	// Neun wants Omega, the module that comes last in the page's own order. Straight into the
	// database: what is under test is the order other people see, not the writing of a wish.
	// Neun and not Eins, because "Meine Eintragungen" spans every semester and the wish spec,
	// running in parallel, asserts about what Eins's page holds.
	runSql(
		`INSERT INTO wish (course_instance_id, person_id, priority, note)
		 SELECT '${SORTING.omegaInstance}', id, 1, '' FROM person
		  WHERE mail = '${PERSONAS.unassigned.mail}';`,
		'registering the sorting wish'
	);
});
test.afterAll(reset);

/** The fixture's modules, in the order the wish table shows them. */
async function wishOrder(page: Page): Promise<string[]> {
	const names = await page.locator('tbody tr a.link').filter({ hasText: /^E2S / }).allInnerTexts();
	return names.map((n) => n.trim());
}

function head(page: Page, name: string) {
	return page.getByRole('columnheader', { name, exact: true });
}

async function sortBy(page: Page, name: string): Promise<void> {
	await head(page, name).getByRole('button').click();
}

const pageOrder = [SORTING.alphaName, SORTING.omegaName];
const reversed = [SORTING.omegaName, SORTING.alphaName];

test.describe('the wish table', () => {
	test('a click on a head cycles ascending, descending, and back', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, URL);

		expect(await wishOrder(page)).toEqual(pageOrder);
		await expect(head(page, 'Modul')).toHaveAttribute('aria-sort', 'none');

		await sortBy(page, 'Modul');
		await expect(head(page, 'Modul')).toHaveAttribute('aria-sort', 'ascending');
		expect(await wishOrder(page)).toEqual(pageOrder);

		await sortBy(page, 'Modul');
		await expect(head(page, 'Modul')).toHaveAttribute('aria-sort', 'descending');
		expect(await wishOrder(page)).toEqual(reversed);

		// The third click is the page's own order again, not a third direction.
		await sortBy(page, 'Modul');
		await expect(head(page, 'Modul')).toHaveAttribute('aria-sort', 'none');
		expect(await wishOrder(page)).toEqual(pageOrder);
	});

	test('the hours sort as numbers', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, URL);

		await sortBy(page, 'SWS');
		expect(await wishOrder(page)).toEqual(pageOrder);
		await sortBy(page, 'SWS');
		expect(await wishOrder(page)).toEqual(reversed);
		// One column at a time: the other heads say they are not sorting.
		await expect(head(page, 'Modul')).toHaveAttribute('aria-sort', 'none');
	});

	test('a track column sorts by the own entry, and only by it', async ({ asPersona }) => {
		// The rule this project is judged on. Neun has registered for Omega and nobody has
		// published anything. If Zwei's order moved Omega, the order alone would say that
		// somebody wants it — the heat map without the colour.
		const zwei = await asPersona(PERSONAS.zwei);
		await gotoRendered(zwei, URL);
		await sortBy(zwei, 'Zug A');
		expect(await wishOrder(zwei)).toEqual(pageOrder);
		await sortBy(zwei, 'Zug A');
		expect(await wishOrder(zwei)).toEqual(pageOrder);

		// For Neun it is their own entry, and it comes first.
		const neun = await asPersona(PERSONAS.unassigned);
		await gotoRendered(neun, URL);
		await sortBy(neun, 'Zug A');
		expect(await wishOrder(neun)).toEqual(reversed);
	});

	test('a click on a head saves nothing', async ({ asPersona }) => {
		// The table is one form that saves itself. A head that submitted it would write the
		// whole table on every sort.
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, URL);

		const posts: string[] = [];
		page.on('request', (r) => {
			if (r.method() === 'POST') posts.push(r.url());
		});
		await sortBy(page, 'Studiengruppe');
		await sortBy(page, 'Modul');
		await expect(head(page, 'Modul')).toHaveAttribute('aria-sort', 'ascending');
		expect(posts).toEqual([]);
	});
});

test.describe('the account list', () => {
	test('sorts by person in both directions', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, ACCOUNTS);

		const names = () => page.locator('tbody tr td:first-child .font-medium').allInnerTexts();
		const german = (a: string, b: string) => a.localeCompare(b, 'de', { numeric: true });

		await sortBy(page, 'Person');
		await expect(head(page, 'Person')).toHaveAttribute('aria-sort', 'ascending');
		const ascending = await names();
		expect(ascending.length).toBeGreaterThan(1);
		expect(ascending).toEqual([...ascending].sort(german));

		await sortBy(page, 'Person');
		await expect(head(page, 'Person')).toHaveAttribute('aria-sort', 'descending');
		const descending = await names();
		expect(descending).toEqual([...descending].sort((a, b) => german(b, a)));
	});
});
