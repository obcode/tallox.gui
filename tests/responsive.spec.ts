import { PERSONAS, test, expect, gotoRendered, openDropdown, type Persona } from './fixtures';
import { ASSIGNMENTS, CATALOGUE, COMPETENCES, DEMAND, WISHES } from './seed';

/**
 * Tablet-first, as laid down in CLAUDE.md: fully usable from 768px, clean at 375px.
 *
 * The defect this catches is always the same and always invisible on the machine it arises on:
 * a wide table or a long line pushes the body past the viewport. Nobody notices on a desktop
 * monitor; on the tablet in the meeting where the assignment is discussed, the whole page wobbles
 * horizontally.
 */
/**
 * The widths that are measured, and the one that matters most is the breakpoint itself.
 *
 * The area bar has now been moved twice for the same reason. First away from `md` (768px),
 * where its seven entries needed 883px — at exactly the width CLAUDE.md promises full
 * usability from. Then away from `lg` (1024px), where the row measured 1061px: 84px of brand,
 * 667px of areas, and 247px of identity, role switcher and theme menu on the right. A
 * breakpoint means *from*, so the bar appears at exactly that width and has to fit there.
 *
 * It sits at `xl` (1280px) now, with the brand subtitle at `2xl`. The role switcher and the
 * theme menu have since moved into the footer, which frees up around 160px on the right on top
 * of that — the breakpoint stays where it is until somebody measures again. `laptop` below is
 * that first width and is in this list on purpose: an eighth area or a wider identity shows up
 * here rather than on somebody's tablet.
 */
const VIEWPORTS = [
	{ name: 'phone', width: 375, height: 812 },
	{ name: 'tablet portrait', width: 768, height: 1024 },
	{ name: 'tablet landscape', width: 1024, height: 768 },
	{ name: 'laptop', width: 1280, height: 800 },
	{ name: 'desktop', width: 1440, height: 900 }
] as const;

test.describe('rendering across widths', () => {
	for (const viewport of VIEWPORTS) {
		test(`${viewport.name} (${viewport.width}px) does not scroll horizontally`, async ({
			page
		}) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			await gotoRendered(page, '/');

			const overflow = await page.evaluate(() => {
				const el = document.documentElement;
				return { scroll: el.scrollWidth, client: el.clientWidth };
			});

			// One pixel of tolerance for subpixel rounding at fractional layout widths.
			expect(
				overflow.scroll,
				`The page is ${overflow.scroll}px wide at a ${overflow.client}px viewport — ` +
					`something in it has no width limit. Wide content belongs in an ` +
					`overflow-x-auto container of its own, not in the body.`
			).toBeLessThanOrEqual(overflow.client + 1);
		});
	}

	test('below 1280px the hamburger carries the navigation', async ({ page }) => {
		// At 1024 as well as at 768: tablet-first means fully operable, not everything visible at
		// once, and the menu holds the same entries in the same order as the bar.
		await page.setViewportSize({ width: 1024, height: 768 });
		await gotoRendered(page, '/');

		await expect(page.getByRole('button', { name: 'Bereiche' })).toBeVisible();

		await openDropdown(page, 'Bereiche');
		await expect(page.getByRole('banner').getByRole('list').last()).toBeVisible();
	});

	test('from 1280px the area bar stands side by side', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await gotoRendered(page, '/');

		// The other direction: the hamburger disappears. Without this half, a layout showing both
		// variants at once would be fine as far as the test is concerned.
		await expect(page.getByRole('button', { name: 'Bereiche' })).toBeHidden();
	});
});

/**
 * The tabs of an area, and the narrow menu that lists them — signed in, because the start page
 * above is measured anonymously and sees neither.
 *
 * Both checks found something the first time they ran: at 375px the administration's tabs
 * scrolled "Diagnose" out of sight, and the menu ran past the bottom of a 667px phone, where its
 * last entries could not be reached under the sticky header.
 */
test.describe('areas across widths', () => {
	// The longest tab rows: ADMIN's administration, and the assignment's long second tab.
	const AREA_PAGES = [
		{ who: PERSONAS.sechs, path: '/verwaltung/personen', area: 'Verwaltung' },
		{ who: PERSONAS.fuenf, path: '/zuteilung/kompetenzen', area: 'Zuteilung' },
		{ who: PERSONAS.eins, path: '/wuensche', area: 'Meine Lehre' }
	] as const;

	for (const viewport of VIEWPORTS) {
		test(`${viewport.name} (${viewport.width}px) shows every tab without scrolling`, async ({
			asPersona
		}) => {
			for (const { who, path, area } of AREA_PAGES) {
				const page = await asPersona(who);
				await page.setViewportSize({ width: viewport.width, height: viewport.height });
				await gotoRendered(page, path);

				const tabs = page.getByRole('navigation', { name: area }).getByRole('link');
				expect(await tabs.count(), `${path}: no tabs`).toBeGreaterThan(1);
				for (const box of await Promise.all((await tabs.all()).map((t) => t.boundingBox()))) {
					expect(box, `${path}: a tab is not rendered`).not.toBeNull();
					expect(box!.x + box!.width, `${path}: a tab ends outside the screen`).toBeLessThanOrEqual(
						viewport.width + 1
					);
				}
				const strip = await page
					.getByRole('navigation', { name: area })
					.locator('.tabs')
					.evaluate((el) => el.scrollWidth - el.clientWidth);
				expect(strip, `${path}: tabs hidden behind a horizontal scroll`).toBeLessThanOrEqual(1);
				const body = await page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth
				);
				expect(body, `${path}: the page scrolls horizontally`).toBeLessThanOrEqual(1);
				await page.close();
			}
		});
	}

	test('the narrow menu fits a small phone, and every entry is reachable', async ({
		asPersona
	}) => {
		// The dean's office has the longest menu: seven areas, three of them with pages.
		const page = await asPersona(PERSONAS.fuenf);
		await page.setViewportSize({ width: 375, height: 667 });
		await gotoRendered(page, '/');
		await openDropdown(page, 'Bereiche');

		const menu = page.getByRole('banner').locator('.dropdown-content').last();
		const box = (await menu.boundingBox())!;
		expect(box.y + box.height, 'the menu runs past the bottom of the screen').toBeLessThanOrEqual(
			667
		);

		for (const link of await menu.getByRole('link').all()) {
			await link.scrollIntoViewIfNeeded();
			await expect(link).toBeInViewport();
			const l = (await link.boundingBox())!;
			expect(
				l.x + l.width,
				`${await link.textContent()} sticks out of the menu`
			).toBeLessThanOrEqual(box.x + box.width + 1);
		}
		await expect(menu.getByRole('link', { name: /Tokens/ })).toBeVisible();
	});
});

/**
 * Every page, at every width, as the person who uses it.
 *
 * Two promises, and the second is the one an overflow check alone does not keep. The page must not
 * scroll sideways; and nothing on it may hide behind a sideways scroll of its own. The first held
 * everywhere when this was written, and still the person picker of the assignment screen, every
 * track column of the wish table and half the semester tabs sat off the right edge of a phone —
 * inside an `overflow-x-auto` that kept the page still and the content out of sight.
 *
 * Tables now turn into cards when their columns do not fit (`$lib/stackedTable`), and tab strips
 * wrap. Code samples in `<pre>` may scroll: a line of code broken in two is a different line.
 */
const EVERY_PAGE: readonly { who: Persona; path: string }[] = [
	{ who: PERSONAS.eins, path: '/' },
	{ who: PERSONAS.eins, path: '/ablauf' },
	{ who: PERSONAS.eins, path: '/einfuehrung' },
	{ who: PERSONAS.eins, path: '/konto/fachgruppen' },
	{ who: PERSONAS.eins, path: '/konto/kompetenzen' },
	{ who: PERSONAS.eins, path: '/konto/rollen' },
	{ who: PERSONAS.eins, path: '/konto/tokens' },
	{ who: PERSONAS.eins, path: '/konto/zuteilungen' },
	{ who: PERSONAS.eins, path: `/wuensche?semester=${WISHES.semester}` },
	{ who: PERSONAS.eins, path: '/module' },
	{ who: PERSONAS.eins, path: `/module/${CATALOGUE.split}` },
	{ who: PERSONAS.eins, path: '/api-doku' },
	{ who: PERSONAS.eins, path: '/api-doku/schema' },
	{ who: PERSONAS.vier, path: `/bedarf?semester=${DEMAND.semester}` },
	{ who: PERSONAS.fuenf, path: `/bedarf?semester=${DEMAND.semester}&bearbeiten=1` },
	{ who: PERSONAS.vier, path: '/statistik' },
	{
		who: PERSONAS.drei,
		path: `/zuteilung?semester=${ASSIGNMENTS.semester}&fachgruppe=${ASSIGNMENTS.subjectGroup}`
	},
	{ who: PERSONAS.drei, path: `/zuteilung/kompetenzen?fachgruppe=${COMPETENCES.subjectGroup}` },
	{ who: PERSONAS.fuenf, path: '/semester' },
	{ who: PERSONAS.fuenf, path: `/wuensche/kollegium?semester=${WISHES.semester}` },
	{ who: PERSONAS.fuenf, path: '/zuteilung/uebersicht' },
	{ who: PERSONAS.fuenf, path: '/verwaltung/studiengaenge' },
	{ who: PERSONAS.sechs, path: '/verwaltung/personen' },
	{ who: PERSONAS.sechs, path: '/verwaltung/fachgruppen' },
	{ who: PERSONAS.sechs, path: '/verwaltung/zpa' },
	{ who: PERSONAS.sechs, path: '/verwaltung/zugriffe' },
	{ who: PERSONAS.sechs, path: '/verwaltung/diagnose' }
];

test.describe('every page across widths', () => {
	// Plus the smallest phone still in use, where a card's label goes above its value.
	for (const viewport of [{ name: 'small phone', width: 320, height: 568 }, ...VIEWPORTS]) {
		test(`${viewport.name} (${viewport.width}px): nothing scrolls sideways, nothing hides`, async ({
			asPersona
		}) => {
			test.setTimeout(120_000);
			for (const { who, path } of EVERY_PAGE) {
				const page = await asPersona(who);
				await page.setViewportSize({ width: viewport.width, height: viewport.height });
				await gotoRendered(page, path);
				// The tables decide after hydration whether their columns fit.
				await page.waitForFunction(
					() => document.querySelectorAll('table.table-stack:not(.measured)').length === 0
				);

				const found = await page.evaluate(() => {
					const root = document.documentElement;
					const hidden = [...document.querySelectorAll('main *')]
						.filter((el) => {
							// A code sample, or the box around one.
							if (el.closest('pre') || el.querySelector(':scope > pre')) return false;
							const style = getComputedStyle(el);
							return (
								['auto', 'scroll'].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 1
							);
						})
						.map(
							(el) =>
								`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} ` +
								`(${el.scrollWidth} in ${el.clientWidth})`
						);
					return { page: root.scrollWidth - root.clientWidth, hidden };
				});

				expect(found.page, `${path}: the page scrolls sideways`).toBeLessThanOrEqual(1);
				expect(found.hidden, `${path}: content hidden behind a sideways scroll`).toEqual([]);
				await page.close();
			}
		});
	}
});
