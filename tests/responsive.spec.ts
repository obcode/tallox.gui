import { test, expect, gotoRendered, openDropdown } from './fixtures';

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
 * 667px of areas, and 247px of identity, role switcher and theme menu on the right, which have
 * grown since and are not going to shrink. A breakpoint means *from*, so the bar appears at
 * exactly that width and has to fit there.
 *
 * It sits at `xl` (1280px) now, with the brand subtitle at `2xl`, which leaves around 190px of
 * slack. `laptop` below is that first width and is in this list on purpose: an eighth area or a
 * wider identity shows up here rather than on somebody's tablet.
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
