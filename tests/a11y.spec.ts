import AxeBuilder from '@axe-core/playwright';
import { test, expect, KNOWN_A11Y_DEBT, PERSONAS, gotoRendered, openDropdown } from './fixtures';

/**
 * Accessibility, checked automatically.
 *
 * The university is a public body — BayEGovG and BITV 2.0 apply, this is not optional. And the
 * check belongs at the start: axe finds contrast and role defects that cost two minutes each
 * individually and become a project of their own in a finished interface with seven areas.
 *
 * Automated checking catches roughly a third of the real problems. It does not replace a
 * keyboard pass — which is why one stands next to it here rather than instead of it.
 */
test.describe('accessibility', () => {
	test('start page, anonymous', async ({ page, checkA11y }) => {
		await gotoRendered(page, '/');
		await checkA11y(page);
	});

	test('start page, signed in', async ({ asPersona, checkA11y }) => {
		// Signed in is different markup: the identity in the bar, different card contents.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');
		await checkA11y(page);
	});

	test('with the theme menu open', async ({ page, checkA11y }) => {
		// Dropdowns are the classic place to find them: a `tabindex` on a non-interactive
		// element, a missing `aria-label`. Collapsed, axe does not check the menu at all.
		await gotoRendered(page, '/');
		await openDropdown(page, /Design/);
		await checkA11y(page);
	});

	test('mobile, with the area menu open', async ({ page, checkA11y }) => {
		// Below 768px the hamburger carries the navigation. That is different markup from the bar
		// above it and is never touched by the desktop check.
		await page.setViewportSize({ width: 375, height: 812 });
		await gotoRendered(page, '/');
		await openDropdown(page, 'Bereiche');
		await checkA11y(page);
	});

	// The process chart on /ablauf is a grid of its own: headings per phase, the lane names for
	// screen readers inside each cell, and a different layout below lg.
	for (const width of [1440, 375]) {
		test(`the walk-through with its chart (${width}px)`, async ({ asPersona, checkA11y }) => {
			const page = await asPersona(PERSONAS.eins);
			await page.setViewportSize({ width, height: 900 });
			await gotoRendered(page, '/ablauf');
			await checkA11y(page);
		});
	}

	// One test of its own for every rule in KNOWN_A11Y_DEBT, so that the open finding is named
	// in every report. `fixme` means: known, not fixed, does not block — unlike `skip`, which
	// also stands for "does not run here" and is therefore overlooked.
	//
	// Whoever fixes one removes the entry from KNOWN_A11Y_DEBT and this `fixme`; from then on the
	// regular check guards the rule.
	for (const rule of KNOWN_A11Y_DEBT) {
		test(`open: ${rule}`, async ({ page }) => {
			test.fixme(
				true,
				`${rule} is violated on the start page. For color-contrast that concerns the ` +
					`status tones text-base-content/60, /45 and /35 from CLAUDE.md — a decision ` +
					`about the design tokens, not a single broken spot.`
			);

			await gotoRendered(page, '/');
			const results = await new AxeBuilder({ page }).withRules([rule]).analyze();
			expect(results.violations).toEqual([]);
		});
	}

	test('the page is operable by keyboard', async ({ page }) => {
		await gotoRendered(page, '/');

		// Not an axe subject: axe checks markup, not focus order. All this is about is the basic
		// assurance that Tab lands somewhere at all and does not end in a trap.
		await page.keyboard.press('Tab');

		const focused = await page.evaluate(() => {
			const el = document.activeElement;
			return el ? `${el.tagName.toLowerCase()}` : null;
		});

		test.expect(focused, 'nothing is focused after the first Tab').not.toBe(null);
		test.expect(focused).not.toBe('body');
	});
});
