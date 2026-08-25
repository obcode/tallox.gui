import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The people the end-to-end tests work with.
 *
 * The same names as `internal/testdata` in the backend, so that a scenario has the same cast in
 * both repositories: whoever owns the wish in the Go test owns it here too. Without that you
 * read a failed end-to-end test and first have to reconstruct which address was the interesting
 * one.
 *
 * All invented, all under `example.org` (RFC 2606). This repository is public — the name of a
 * real colleague never appears here.
 */
export const PERSONAS = {
	/** Owner of the record under test. */
	eins: { mail: 'prof.eins@example.org', name: 'Prof. Eins' },
	/** An uninvolved colleague — the person wish confidentiality protects against. */
	zwei: { mail: 'prof.zwei@example.org', name: 'Prof. Zwei' },
	/** Leads one subject group: permitted inside it, not outside. */
	drei: { mail: 'prof.drei@example.org', name: 'Prof. Drei' },
	/** A planner: sees wishes before publication, because the process requires it. */
	vier: { mail: 'prof.vier@example.org', name: 'Prof. Vier' },
	/** The dean's office: runs the process, so switches the phases and publishes the wishes. */
	fuenf: { mail: 'dekanat@example.org', name: 'Deans Office' },
	/** Administers people and roles — and deliberately reads no wishes. */
	sechs: { mail: 'admin@example.org', name: 'Admin' }
} as const;

export type Persona = (typeof PERSONAS)[keyof typeof PERSONAS];

type Fixtures = {
	/**
	 * Signs the browser context in as this person.
	 *
	 * Sets `X-Remote-User` the way **Caddy → oauth2-proxy** does in production. The test plays
	 * the proxy here, not the client: Caddy discards incoming `X-Remote-*`, so a browser cannot
	 * sign itself in with it. That is exactly why the header lives in a fixture and not
	 * scattered through the specs — otherwise somebody eventually concludes that the GUI accepts
	 * identity from the client.
	 */
	asPersona: (persona: Persona) => Promise<Page>;

	/** Accessibility check for the current page. */
	checkA11y: (page: Page) => Promise<void>;
};

/**
 * Rules that are currently violated and therefore do not block.
 *
 * This list is a debt, not a configuration. Every entry needs a reason and belongs removed as
 * soon as it is fixed; `tests/a11y.spec.ts` additionally carries a `fixme`-marked test for each
 * entry, so that the open finding is named in every report instead of vanishing silently.
 *
 * Currently empty — `color-contrast` used to be here and is fixed.
 */
export const KNOWN_A11Y_DEBT: readonly string[] = [];

export const test = base.extend<Fixtures>({
	asPersona: async ({ browser }, use) => {
		const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];

		await use(async (persona: Persona) => {
			const context = await browser.newContext({
				extraHTTPHeaders: {
					'X-Remote-User': persona.mail,
					'X-Remote-Displayname': persona.name
				}
			});
			contexts.push(context);
			return context.newPage();
		});

		for (const context of contexts) {
			await context.close();
		}
	},

	// Playwright reads the fixture dependencies from the destructuring pattern of the first
	// parameter and rejects anything else — a named parameter is a runtime error here, not a
	// question of style. This fixture needs no dependencies, so the pattern stays empty.
	// eslint-disable-next-line no-empty-pattern
	checkA11y: async ({}, use) => {
		await use(async (page: Page) => {
			const results = await new AxeBuilder({ page })
				// WCAG 2.1 AA. The university is a public body: accessibility is not optional here
				// but BayEGovG/BITV — and retrofitting it afterwards is considerably more
				// expensive than having it in the gate from the start.
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.disableRules([...KNOWN_A11Y_DEBT])
				.analyze();

			expect(
				results.violations,
				// The default message is an object dump. This summary says which rule is violated
				// where — the difference between "CI is red" and "I know what to fix".
				results.violations
					.map(
						(v) =>
							`${v.id} (${v.impact}): ${v.help}\n` +
							v.nodes
								.map(
									(n) =>
										`  ${n.target.join(' ')}\n    ${n.failureSummary?.replace(/\n/g, '\n    ')}`
								)
								.join('\n')
					)
					.join('\n')
			).toEqual([]);
		});
	}
});

export { expect };

/**
 * Waits until the page has been rendered server-side.
 *
 * `waitForLoadState('networkidle')` would be the obvious thing and is wrong here: the app has no
 * background requests, so `networkidle` merely waits out a fixed period and makes the suite slow
 * without guaranteeing anything.
 */
export async function gotoRendered(page: Page, path: string): Promise<void> {
	await page.goto(path, { waitUntil: 'domcontentloaded' });
	await page.locator('main').waitFor({ state: 'visible' });
}

/**
 * Opens a daisyUI dropdown and waits until it is actually visible.
 *
 * Not `.click()` alone. The dropdown fades in via `opacity` and is present in the markup the
 * whole time — Playwright's `toBeVisible()` does not look at opacity, so it reports "visible"
 * while the menu is still transparent.
 *
 * For axe that is fatal, and in a misleading way: it measures the colours through the
 * half-transparent element, finds washed-out values and reports contrast violations that do not
 * exist. The test goes red with a justification that looks like a real defect in the interface.
 */
export async function openDropdown(page: Page, name: string | RegExp): Promise<void> {
	const trigger = page.getByRole('button', { name });
	await trigger.click();

	// From the trigger to its own content, not `.dropdown-content` globally: the bar has two
	// dropdowns (areas and theme choice), and `.first()` reliably caught the wrong one — the
	// helper then waited for a menu nobody had opened and ran into the timeout.
	const content = trigger.locator('..').locator('.dropdown-content');
	await expect
		.poll(() => content.evaluate((el) => Number(getComputedStyle(el).opacity)), {
			message: `The dropdown "${name}" did not become visible.`,
			timeout: 5_000
		})
		.toBe(1);
}
