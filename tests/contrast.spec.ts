import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { PERSONAS, test, expect, gotoRendered, openDropdown } from './fixtures';
import { THEME_COOKIE, THEMES } from '../src/lib/themes';
import { CATALOGUE } from './seed';

async function expectNoContrastViolations(page: Page, theme: string): Promise<void> {
	const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

	expect(
		results.violations,
		results.violations
			.flatMap((v) => v.nodes.map((n) => `${theme}: ${n.target.join(' ')}\n  ${n.failureSummary}`))
			.join('\n')
	).toEqual([]);
}

/**
 * Measures an element's contrast against its own background directly, to WCAG 2.1.
 *
 * Why by hand and not with axe: on the marked menu entry daisyUI puts a `background-image`
 * (`--fx-noise`, a data-URI SVG) on top of the background colour. For axe an element with a
 * background image is undecidable — the rule reports it as `incomplete`, not as `violation`. A
 * check on `results.violations` is therefore blind at this spot, and silently so: it stays green
 * even when what is there is dark on dark. That was exactly the case, and exactly why the axe
 * check above is not enough here.
 *
 * The colours are resolved to sRGB through a 1×1 canvas rather than parsed out of the text of
 * `getComputedStyle`: the themes are written in `oklch`, and the serialised computed form is
 * `rgb()`, `oklch()` or `color(...)` depending on the colour space. The browser converts that
 * better than a regular expression can anyway.
 */
async function contrastRatio(page: Page, selector: string): Promise<number> {
	return page.locator(selector).evaluate((node) => {
		const toSrgb = (color: string): [number, number, number] => {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const ctx = canvas.getContext('2d')!;
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
			return [r, g, b];
		};

		const luminance = (rgb: [number, number, number]): number => {
			const [r, g, b] = rgb.map((channel) => {
				const s = channel / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};

		const style = getComputedStyle(node);
		const a = luminance(toSrgb(style.color));
		const b = luminance(toSrgb(style.backgroundColor));
		return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
	});
}

/**
 * Contrast across **all** the themes on offer.
 *
 * The check in a11y.spec.ts only sees the default theme. That is not enough here: in this app
 * contrast is not a property of a component but of the pair (component, theme). Twelve themes
 * are on offer, each brings its own colour values, and a value that fits comfortably on `nord`
 * can fail on `winter` — measured: `base-content` at 70 % opacity gives 4.59:1 on `nord` and
 * 3.87:1 on `winter`.
 *
 * That is exactly what the first version of this interface violated, twice over:
 *
 *  1. The muted tones sat between 35 % and 70 % opacity. Only from 80 % does *every* theme hold
 *     the 4.5:1 of WCAG 1.4.3, which is why the scale is now 100/90/80 and nothing else.
 *  2. `text-error` and `text-warning` were used as text colours on `base-100`. But daisyUI's
 *     semantic colours are background colours — as text they reach 1.35:1 to 3.5:1 on the light
 *     themes. As a badge background they are paired with their `*-content` colour, and that pair
 *     is built for contrast.
 *
 * The university is a public body; BayEGovG and BITV 2.0 apply. A theme that makes the
 * application unreadable is therefore not a blemish — and since the theme list is curated,
 * "then pick another one" is not an answer but an invitation.
 */
test.describe('contrast across all themes', () => {
	for (const theme of THEMES) {
		test(`${theme.label} (${theme.value})`, async ({ page, context }) => {
			await context.addCookies([
				{ name: THEME_COOKIE, value: theme.value, url: 'http://localhost:4173' }
			]);

			await gotoRendered(page, '/');

			// The theme has to be genuinely applied, or twelve tests check the same thing twelve times.
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme.value);

			await expectNoContrastViolations(page, theme.value);
		});
	}
});

/**
 * The same check with the menus **open** — and that is not busywork.
 *
 * a11y.spec.ts opens both menus, but only in the default theme; contrast.spec.ts walks all
 * twelve themes but only ever saw them closed. In the gap between the two lay a real finding:
 * the marked entry (the current page in the area navigation, the chosen theme in the design
 * picker) gets `neutral` as a background from daisyUI. The menu contrast block in app.css turned
 * the foreground colour flatly back to `base-content` — unremarkable on `nord`, because both are
 * light on dark there, and dark on dark on **every light theme**, so unreadable.
 *
 * The marked entry is precisely where one locates oneself. Below 1024px the entire navigation
 * additionally runs through this menu.
 *
 * The axe check alone would **not** have found it, not even with the menu open: daisyUI puts a
 * `background-image` on the marked entry, and axe therefore reports it as `incomplete` rather
 * than as `violation`. Which is why `contrastRatio()` additionally measures for itself here —
 * see the reasoning there. Reproduced: with the old app.css all twelve axe runs stayed green
 * while the entry was unreadable on the light themes.
 */
test.describe('contrast with menus open, across all themes', () => {
	for (const theme of THEMES) {
		test(`${theme.label} (${theme.value})`, async ({ page, context }) => {
			await context.addCookies([
				{ name: THEME_COOKIE, value: theme.value, url: 'http://localhost:4173' }
			]);

			// Below lg the hamburger carries the navigation, and on `/` the entry "Start" is marked
			// there — the case in question. The design picker brings its marked entry along at
			// every width.
			await page.setViewportSize({ width: 375, height: 812 });
			await gotoRendered(page, '/');
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme.value);

			await openDropdown(page, 'Bereiche');
			await expect(page.getByRole('link', { name: /Start/ })).toHaveClass(/menu-active/);
			await expectNoContrastViolations(page, `${theme.value}, area menu`);
			expect(
				await contrastRatio(page, '.dropdown-content a.menu-active'),
				`${theme.value}: the current page in the area menu`
			).toBeGreaterThanOrEqual(4.5);

			// Close it first, or two open menus overlap and axe measures through the covered one.
			// daisyUI keeps a dropdown open via focus — so `blur()` is what closes it, not a click
			// beside it (which would land in the open menu).
			await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

			// Not `/Design/` as in a11y.spec.ts: that checks at desktop width, this one at 375px.
			// The label "Design" is hidden below `sm`, so the trigger's accessible name is no
			// longer its content but its `title`.
			await openDropdown(page, /Design|Darstellung wählen/);
			await expectNoContrastViolations(page, `${theme.value}, design picker`);
			expect(
				await contrastRatio(page, '.dropdown-content button.menu-active'),
				`${theme.value}: the chosen theme in the design picker`
			).toBeGreaterThanOrEqual(4.5);
		});
	}
});

/**
 * The module catalogue, across all the themes.
 *
 * A page of its own in this list because it is the first in the application that is a **wide
 * table with badges in it** — six columns, a badge per row for compulsory-or-elective, another
 * for a missing split. Every one of those is a pair (component, theme) that the start page does
 * not contain, and the first version of this table got exactly the documented thing wrong: the
 * link to a module with no split was `link-warning`, which is 1.35:1 on `base-100` and
 * unreadable on all seven light themes.
 *
 * It runs signed in, because the catalogue needs an identity, and filtered to a programme so
 * that the columns that only appear with one — the duty badge above all — are on the page.
 */
test.describe('the module catalogue across all themes', () => {
	for (const theme of THEMES) {
		test(`${theme.label} (${theme.value})`, async ({ browser, context }) => {
			await context.addCookies([
				{ name: THEME_COOKIE, value: theme.value, url: 'http://localhost:4173' }
			]);

			const signedIn = await browser.newContext({
				extraHTTPHeaders: { 'X-Remote-User': PERSONAS.vier.mail },
				storageState: { cookies: await context.cookies(), origins: [] }
			});
			const page = await signedIn.newPage();

			await gotoRendered(page, `/module?studiengang=${CATALOGUE.programme}`);
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme.value);

			await expectNoContrastViolations(page, theme.value);
			await signedIn.close();
		});
	}
});

/**
 * The API documentation across all themes.
 *
 * Here for its tabs, and it earns the place: on `retro` its inactive tab measured 4.3:1 for as
 * long as the page has existed, because no sweep had ever visited a page with tabs. The
 * component is shared, so the next value somebody lowers would take both screens with it.
 */
test.describe('the API documentation across all themes', () => {
	for (const theme of THEMES) {
		test(`${theme.label} (${theme.value})`, async ({ browser, context }) => {
			await context.addCookies([
				{ name: THEME_COOKIE, value: theme.value, url: 'http://localhost:4173' }
			]);

			const signedIn = await browser.newContext({
				extraHTTPHeaders: { 'X-Remote-User': PERSONAS.eins.mail },
				storageState: { cookies: await context.cookies(), origins: [] }
			});
			const page = await signedIn.newPage();

			await gotoRendered(page, '/api-doku');
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme.value);

			await expectNoContrastViolations(page, theme.value);
			await signedIn.close();
		});
	}
});

/**
 * The admission list across all themes.
 *
 * Its own sweep, because it is the first screen built out of switches: `btn-primary`,
 * `btn-secondary` and `btn-outline`, dozens per row, and each of them says what it says by being
 * filled or not. daisyUI pairs a filled button with its own `*-content` foreground; `btn-outline`
 * takes its colour from the surface it sits on, and that surface differs per theme. A ratio that
 * is comfortable on `nord` is the one that fails on `winter`, and here it would make the
 * difference between "has an account" and "has none" unreadable.
 */
test.describe('the admission list across all themes', () => {
	for (const theme of THEMES) {
		test(`${theme.label} (${theme.value})`, async ({ browser, context }) => {
			await context.addCookies([
				{ name: THEME_COOKIE, value: theme.value, url: 'http://localhost:4173' }
			]);

			const signedIn = await browser.newContext({
				extraHTTPHeaders: { 'X-Remote-User': PERSONAS.sechs.mail },
				storageState: { cookies: await context.cookies(), origins: [] }
			});
			const page = await signedIn.newPage();

			await gotoRendered(page, '/verwaltung/personen');
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme.value);

			await expectNoContrastViolations(page, theme.value);
			await signedIn.close();
		});
	}
});
