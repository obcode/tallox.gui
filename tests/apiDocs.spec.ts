import { test, expect, PERSONAS, gotoRendered } from './fixtures';

/**
 * The API documentation.
 *
 * It is the reason the documentation lives in the application and not on GitHub: it names the
 * endpoint, and the production hostname must not appear in any public repository. Instructions
 * that may not contain their most important detail are not instructions.
 */
test.describe('API documentation', () => {
	test('names the endpoint and the way to a token', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/api-doku');

		// The endpoint comes from the configuration, not from the markup — what is checked here
		// is that it arrives at all and points at the token door.
		await expect(page.getByText('/api/graphql').first()).toBeVisible();

		await page.getByRole('link', { name: /Konto → Tokens/ }).click();
		await expect(page).toHaveURL(/\/konto\/tokens$/);
	});

	test('explains that some fields do not answer through a token', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/api-doku');

		// The point every other support question would otherwise come from: the same query
		// returns something different depending on the door, and without this paragraph that
		// looks like a defect.
		await expect(page.getByText(/INTERACTIVE_ONLY/)).toBeVisible();
	});

	test('shows examples in several languages, with no token in the source', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/api-doku');

		for (const label of ['curl', 'Python', 'R']) {
			// exact: true — otherwise 'R' also matches 'curl'.
			await page.getByRole('tab', { name: label, exact: true }).click();
			const code = page.locator('pre code').first();
			await expect(code).toContainText('TALLOX_TOKEN');
			// The instructions demonstrate what they ask for.
			await expect(code).not.toContainText(/tallox_[0-9A-Z]{16}_/);
		}
	});

	test('the schema reference comes from the schema', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/api-doku/schema');

		// Query first — that is what somebody is looking for. And a field that really exists.
		await expect(page.getByRole('heading', { name: 'Query', exact: false })).toBeVisible();
		await expect(page.getByText('myTokens').first()).toBeVisible();

		// The nullability comes with it: `[PersonalAccessToken!]` without a trailing `!` is
		// exactly how @interactiveOnly answers without failing the query.
		await expect(page.getByText('[PersonalAccessToken!]').first()).toBeVisible();
	});

	test('the schema reference shows which door a field needs', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/api-doku/schema');

		// Only the release SDL carries the directive usages; introspection output has none, and
		// this row would show no badge at all.
		await expect(page.getByText(/Version v\d+\.\d+\.\d+/)).toBeVisible();
		const row = page.getByRole('row').filter({ hasText: 'myTokens' }).first();
		await expect(row.getByText('nur Browser')).toBeVisible();
		await expect(row.getByText(/TOKENS · lesen/)).toBeVisible();
	});

	test('both pages are accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);

		await gotoRendered(page, '/api-doku');
		await checkA11y(page);

		await gotoRendered(page, '/api-doku/schema');
		await checkA11y(page);
	});
});
