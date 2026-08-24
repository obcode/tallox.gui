import { test, expect, PERSONAS, gotoRendered, openDropdown } from './fixtures';

/**
 * Where the app frame puts its two settings menus — role preview and design.
 *
 * They sit in the footer, not in the nav bar. That is a decision the existing tests cannot
 * see: they look up the buttons by name across the whole page and stay green wherever the
 * buttons happen to be. Without this file the placement would drift back the first time
 * somebody adds a control "next to the theme menu" and finds it in the header.
 *
 * The bar above carries what one navigates by, the row below what one adjusts once and then
 * leaves alone — and the seven areas get the width back that the two menus were taking.
 */
test.describe('the settings menus', () => {
	test('sit in the footer and not in the nav bar', async ({ asPersona }) => {
		// The administrator is the one identity that has both on the page at once: the role
		// preview is offered to ADMIN only, see administration.spec.ts.
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/');

		const footer = page.getByRole('contentinfo');
		const header = page.getByRole('banner');

		await expect(footer.getByRole('button', { name: 'Rolle', exact: true })).toBeVisible();
		await expect(header.getByRole('button', { name: 'Rolle', exact: true })).toHaveCount(0);

		await expect(footer.getByRole('button', { name: /Design/ })).toBeVisible();
		await expect(header.getByRole('button', { name: /Design/ })).toHaveCount(0);
	});

	for (const name of [/Design/, /^Rolle$/] as const) {
		test(`${name.source} opens upwards`, async ({ asPersona }) => {
			// `dropdown-top` is what makes the footer a possible home for them at all. Opening
			// downwards, a menu unfolds past the end of the page: it drags a scrollbar along, and
			// at the bottom of a long page the entries below the fold are the ones one came for.
			const page = await asPersona(PERSONAS.sechs);
			await gotoRendered(page, '/');

			await openDropdown(page, name);

			const trigger = page.getByRole('button', { name });
			const menu = trigger.locator('..').locator('.dropdown-content');

			const triggerBox = (await trigger.boundingBox())!;
			const menuBox = (await menu.boundingBox())!;

			expect(
				menuBox.y + menuBox.height,
				`The menu ends at ${menuBox.y + menuBox.height}px, the button starts at ` +
					`${triggerBox.y}px — it is unfolding downwards out of the footer.`
			).toBeLessThanOrEqual(triggerBox.y + 1);
		});
	}
});
