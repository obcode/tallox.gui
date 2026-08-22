import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { admissionResetSql } from './seed';
import { runSql } from './psql';

/** The accounts tab. The ZPA list is what /verwaltung/personen opens on. */
const ACCOUNTS = '/verwaltung/personen?ansicht=konten';

/**
 * Who sees the administration area, who can use it, and what the role preview does.
 *
 * The lock is in the backend and is checked there, through both doors. What is checked here no
 * Go test level can see: that the navigation is built from the *effective* roles and not from
 * the held ones, that the cookie really reaches the backend, and that the way back out of a
 * narrowing stays reachable from the state in which the administration area has just
 * disappeared.
 */

test.describe('administration', () => {
	test('appears in the menu for administrators only', async ({ asPersona }) => {
		const admin = await asPersona(PERSONAS.sechs);
		await admin.goto('/');
		await expect(admin.getByRole('button', { name: PERSONAS.sechs.name })).toBeVisible();

		const lecturer = await asPersona(PERSONAS.eins);
		await lecturer.goto('/');
		// Cosmetic, but the right kind: somebody who sees the entry and gets a refusal on every
		// click learns to ignore refusals.
		await expect(lecturer.getByRole('link', { name: /Verwaltung/ })).toHaveCount(0);
	});

	test('lists the people for administrators', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto(ACCOUNTS);

		await expect(page.getByRole('heading', { name: 'Personen und Rollen' })).toBeVisible();
		await expect(page.getByText(PERSONAS.eins.name)).toBeVisible();
	});

	test('shows the two lists as tabs that are told apart', async ({ asPersona }) => {
		// The daisyUI tab styles hang off `.tabs > .tab`, so a tab that is not a child of the bar
		// silently loses its padding and its marked state: the two labels then run together into
		// one word, and nothing about it fails. Both properties are asserted, because the second
		// is the one that says which list is on screen.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/personen');

		const zpa = page.getByRole('tab', { name: 'Aus dem ZPA' });
		const accounts = page.getByRole('tab', { name: 'Alle Konten' });
		await expect(zpa).toHaveAttribute('aria-selected', 'true');
		await expect(accounts).toHaveAttribute('aria-selected', 'false');

		// The padding, because that is what daisyUI separates tabs with — the boxes themselves sit
		// flush and the marked one carries a surface of its own. With zero padding the two labels
		// touch and read as one word, which is exactly the state this guards against.
		for (const tab of [zpa, accounts]) {
			const padding = await tab.evaluate((node) => {
				const style = getComputedStyle(node);
				return Math.min(parseFloat(style.paddingInlineStart), parseFloat(style.paddingInlineEnd));
			});
			expect(padding, await tab.innerText()).toBeGreaterThan(4);
		}

		await accounts.click();
		await page.waitForURL(/ansicht=konten/);
		await expect(page.getByRole('tab', { name: 'Alle Konten' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(page.getByLabel('Mailadresse')).toBeVisible();
	});

	test('refuses a lecturer rather than showing her an empty list', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		const response = await page.goto('/verwaltung/personen');

		// An empty table and "you may not do this" are different answers, and the first would look
		// as though there were nobody in the system.
		expect(response?.status()).toBeGreaterThanOrEqual(400);
		await expect(page.getByText(PERSONAS.zwei.mail)).toHaveCount(0);
	});
});

test.describe('creating people and setting roles', () => {
	test('creates with the mail address alone and grants roles afterwards', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto(ACCOUNTS);

		// One address per run: people are never deleted, so a fixed value would fail on
		// PERSON_EXISTS the second time round — and that would look like a defect in the
		// application rather than a database with a memory.
		const mail = `new.${Date.now()}@example.org`;

		await page.getByLabel('Mailadresse').fill(mail);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		// Created without a name: the address then stands where the name otherwise would. That is
		// the normal case and not a gap — the name comes later, from the person themselves or
		// from the ZPA.
		await page.getByRole('searchbox', { name: 'Suchen' }).fill(mail);
		await page.getByRole('button', { name: 'Anwenden' }).click();
		const row = page.getByRole('row').filter({ hasText: mail });
		await expect(row).toContainText('— noch keine —');

		// Roles are a step of their own, LECTURER included: who may do what should be a list
		// somebody wrote, not a default nobody chose.
		await row.getByRole('button', { name: 'Bearbeiten' }).click();
		await page.getByRole('checkbox', { name: /Dozent:in/ }).check();
		await page.getByRole('button', { name: 'Rollen speichern' }).click();

		await expect(page.getByRole('row').filter({ hasText: mail })).toContainText('Dozent:in');
	});

	test('does not let the last administrator be removed', async ({ asPersona }) => {
		// The safety net, seen from the interface. The rule itself is a transaction in
		// internal/store and is checked there against the database; all that counts here is that
		// it is reachable from the screen the damage would be done on, and that it arrives as a
		// readable sentence and not as a 500.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto(ACCOUNTS);

		// A precondition, and it is checked rather than assumed: the rule only applies when there
		// is exactly one administrator. Were there a second one locally, this test would actually
		// deactivate the persona — and every further run would start with a locked-out test
		// identity that cannot be reactivated through the interface. In CI the seed sets the
		// state, locally it can differ.
		const admins = await page.getByRole('row').filter({ hasText: 'Administration' }).count();
		test.skip(admins !== 1, `This database has ${admins} administrators, the test needs 1.`);

		await page.getByRole('searchbox', { name: 'Suchen' }).fill(PERSONAS.sechs.mail);
		await page.getByRole('button', { name: 'Anwenden' }).click();
		const row = page.getByRole('row').filter({ hasText: PERSONAS.sechs.mail });
		await row.getByRole('button', { name: 'Bearbeiten' }).click();
		await page.getByRole('button', { name: 'Konto deaktivieren' }).click();

		await expect(page.getByText('Nicht gespeichert')).toBeVisible();
		await expect(page.getByText(/ohne Administration/)).toBeVisible();
	});
});

/**
 * Admitting somebody from the ZPA list.
 *
 * Serial, and for the domain rather than the framework: these tests admit and withdraw the same
 * two people, and "nobody has admitted them yet" is a precondition one of them takes away from
 * the other.
 */
test.describe('admitting people from the ZPA list', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(() => {
		// Before, not after. A run that failed halfway leaves the accounts behind, and the next
		// one has to be able to start anyway.
		runSql(admissionResetSql(), 'removing the accounts the admission tests create');
	});

	test('opens on the professors of faculty 07 and says what it is keeping out', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/personen');

		await expect(page.getByRole('row').filter({ hasText: 'Sieben, Prof.' })).toBeVisible();
		// Another faculty, and a lecturer on a contract: both kept out by the pre-filter.
		await expect(page.getByRole('row').filter({ hasText: 'Neun, Prof.' })).toHaveCount(0);
		await expect(page.getByRole('row').filter({ hasText: 'Zehn, M.Sc.' })).toHaveCount(0);

		// And it says so. A pre-filtered list that does not is indistinguishable from a short one
		// — which matters here because more than half of the real entries state no faculty at all.
		await expect(page.getByText(/weitere mit anderer oder ohne Fakultätsangabe/)).toBeVisible();

		// Widening the filter brings them back, without a page load.
		await page.getByRole('checkbox', { name: /FK99/ }).check();
		await expect(page.getByRole('row').filter({ hasText: 'Neun, Prof.' })).toBeVisible();
		// And the address carries the selection, so a reload shows the same rows.
		await page.reload();
		await expect(page.getByRole('row').filter({ hasText: 'Neun, Prof.' })).toBeVisible();
	});

	test('makes somebody a user with one click, and it is saved without a save button', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/personen');

		const row = page.getByRole('row').filter({ hasText: 'Sieben, Prof.' });
		const account = row.getByRole('switch', { name: 'Konto' });
		await expect(account).not.toBeChecked();

		await account.click();

		// Admitting grants exactly the one role, and the row shows it immediately.
		await expect(account).toBeChecked();
		await expect(row.getByRole('switch', { name: 'Dozent:in' })).toBeChecked();
		await expect(row.getByRole('switch', { name: 'Administration' })).not.toBeChecked();

		// There is no save button. A reload is the only way to tell that from a screen that only
		// looks as though it saved.
		await page.reload();
		await expect(
			page
				.getByRole('row')
				.filter({ hasText: 'Sieben, Prof.' })
				.getByRole('switch', { name: 'Konto' })
		).toBeChecked();
	});

	test('grants a role in the list, and the study programmes beside it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/personen');

		const row = page.getByRole('row').filter({ hasText: 'Sieben, Prof.' });
		await row.getByRole('switch', { name: 'Studiengangsleitung' }).click();

		// Without a study programme a lead may plan nothing — not everything — so the row says so
		// and offers the codes in the same line.
		await expect(row.getByText('kein Studiengang')).toBeVisible();

		await row.getByRole('switch', { name: 'E2E' }).click();
		await expect(row.getByRole('switch', { name: 'E2E' })).toBeChecked();
		await expect(row.getByText('kein Studiengang')).toHaveCount(0);

		await page.reload();
		const reloaded = page.getByRole('row').filter({ hasText: 'Sieben, Prof.' });
		await expect(reloaded.getByRole('switch', { name: 'Studiengangsleitung' })).toBeChecked();
		await expect(reloaded.getByRole('switch', { name: 'E2E' })).toBeChecked();
	});

	test('shows the same person on the accounts tab', async ({ asPersona }) => {
		// The two tabs are two readings of the same table, and somebody admitted on one has to be
		// administrable on the other — that is where the expiry and the deactivation live.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto(ACCOUNTS);

		await page.getByRole('searchbox', { name: 'Suchen' }).fill('prof.sieben@example.org');
		await page.getByRole('button', { name: 'Anwenden' }).click();

		const row = page.getByRole('row').filter({ hasText: 'prof.sieben@example.org' });
		await expect(row).toContainText('Dozent:in');
		await expect(row).toContainText('Studiengangsleitung');
	});

	test('withdrawing keeps the roles for when somebody is admitted again', async ({ asPersona }) => {
		// Nobody is ever deleted here: deactivating refuses authentication on both doors and
		// keeps every grant, so re-admitting restores what somebody had rather than starting them
		// over. A switch that quietly emptied the roles would be a different thing entirely.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/personen');

		const row = page.getByRole('row').filter({ hasText: 'Sieben, Prof.' });
		await row.getByRole('switch', { name: 'Konto' }).click();
		await expect(row.getByRole('switch', { name: 'Konto' })).not.toBeChecked();
		await expect(row.getByText('deaktiviert')).toBeVisible();

		await row.getByRole('switch', { name: 'Konto' }).click();
		await expect(row.getByRole('switch', { name: 'Konto' })).toBeChecked();
		await expect(row.getByRole('switch', { name: 'Studiengangsleitung' })).toBeChecked();
	});

	test('offers no switch for somebody the ZPA gives no address for', async ({ asPersona }) => {
		// The address is the whole link between the two lists. Offering a switch here would
		// promise something the backend refuses — three of the 257 real ones are in this state.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/personen');

		const row = page.getByRole('row').filter({ hasText: 'Zwoelf, ohne Adresse' });
		await expect(row).toContainText('ohne Adresse kein Konto möglich');
		await expect(row.getByRole('switch', { name: 'Konto' })).toHaveCount(0);
	});
});

test.describe('areas by role', () => {
	test("shows demand to planners and statistics only to the dean's office", async ({
		asPersona
	}) => {
		// Narrowed to the area bar: "Bedarf" also appears in the introductory sentence of the
		// start page, and a test that searches the whole page ends up checking the prose.
		const lecturer = await asPersona(PERSONAS.eins);
		await lecturer.goto('/');
		// .first(): the bar renders every area twice — once side by side from lg, once in the
		// hamburger menu below that. That both carry the same entries is intentional and is
		// checked in responsive.spec.ts.
		const lecturerNav = lecturer.getByRole('navigation');
		await expect(lecturerNav.getByText('Wünsche').first()).toBeVisible();
		await expect(lecturerNav.getByText('Bedarf')).toHaveCount(0);
		await expect(lecturerNav.getByText('Statistik')).toHaveCount(0);

		// Vier plans, so she sees demand and assignment — but not the statistics. That
		// intermediate step is exactly why visibility is a list of roles per area and not a
		// ranking.
		const planner = await asPersona(PERSONAS.vier);
		await planner.goto('/');
		const plannerNav = planner.getByRole('navigation');
		await expect(plannerNav.getByText('Bedarf').first()).toBeVisible();
		await expect(plannerNav.getByText('Zuteilung').first()).toBeVisible();
		await expect(plannerNav.getByText('Statistik')).toHaveCount(0);
	});
});

test.describe('role preview', () => {
	test('takes permissions away and puts them back', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/');

		// Without narrowing: the administration area is reachable.
		await expect(page.getByRole('button', { name: 'Rolle', exact: true })).toBeVisible();

		// Look as a lecturer. The cookie goes to the SSR process, which relays it to the backend
		// as X-Tallox-Assume-Roles — that whole route is the reason this lives here and not in
		// vitest.
		await page
			.context()
			.addCookies([{ name: 'tallox_assume', value: 'LECTURER', url: page.url() }]);
		await page.reload();

		await expect(page.getByRole('status')).toContainText('Vorschau');
		const denied = await page.goto('/verwaltung/personen');
		expect(denied?.status()).toBeGreaterThanOrEqual(400);

		// And the way back. It has to be reachable from exactly this state: a narrowing you can
		// only end where it is currently taking the access away is a trap.
		await page.goto('/');
		await page.getByRole('button', { name: 'Zurück zu meinen Rollen' }).first().click();
		await expect(page.getByRole('status')).toHaveCount(0);
	});

	test('is offered to administrators only', async ({ asPersona }) => {
		// Vier holds two roles (LECTURER + PROGRAMME_LEAD) and still does not get the button: she
		// does not have the question it answers, and what it does — make her demand area
		// disappear — looks like a defect without that question.
		const planner = await asPersona(PERSONAS.vier);
		await planner.goto('/');
		await expect(planner.getByRole('button', { name: 'Rolle', exact: true })).toHaveCount(0);

		const admin = await asPersona(PERSONAS.sechs);
		await admin.goto('/');
		await expect(admin.getByRole('button', { name: 'Rolle', exact: true })).toBeVisible();
	});

	test('stays visible while narrowed', async ({ asPersona }) => {
		// The condition hangs on the HELD roles, not on the effective ones. Otherwise the menu
		// would be gone in exactly the state it is needed in to get back — an administrator
		// narrowed to LECTURER no longer acts as ADMIN.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/');
		await page
			.context()
			.addCookies([{ name: 'tallox_assume', value: 'LECTURER', url: page.url() }]);
		await page.reload();

		await expect(page.getByRole('button', { name: 'Rolle', exact: true })).toBeVisible();
	});

	test('gives nobody a role they do not hold', async ({ asPersona }) => {
		// The heart of the matter. The cookie is not trustworthy and does not have to be: the
		// backend intersects the selection with the roles actually held, and an intersection
		// cannot add anything. Were that ever not so, the preview would be privilege escalation
		// by cookie.
		const page = await asPersona(PERSONAS.eins);
		await page.goto('/');
		await page.context().addCookies([{ name: 'tallox_assume', value: 'ADMIN', url: page.url() }]);
		await page.reload();

		await expect(page.getByRole('link', { name: /Verwaltung/ })).toHaveCount(0);

		const response = await page.goto('/verwaltung/personen');
		expect(response?.status()).toBeGreaterThanOrEqual(400);
	});
});

test.describe('no account', () => {
	test('says so rather than declaring the backend broken', async ({ browser }) => {
		// Somebody with an HM login this installation does not know: through the auth proxy, but
		// with no row in `person`. That used to end up as "Backend nicht erreichbar" in the footer
		// — an answer that sounds like an outage and withholds the one step that helps.
		const context = await browser.newContext({
			extraHTTPHeaders: { 'X-Remote-User': 'niemand@example.org' }
		});
		const page = await context.newPage();

		const response = await page.goto('/');
		expect(response?.status()).toBe(403);
		// src/error.html and not +error.svelte: SvelteKit renders no +error.svelte for an error in
		// the root layout, because that layout is the thing that failed. The page therefore
		// carries its own CSS and does not need the app.
		await expect(page.getByRole('heading', { name: 'Kein Zugang zu Tallox' })).toBeVisible();

		await context.close();
	});
});

test.describe('accessibility', () => {
	test('the administration area is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, ACCOUNTS);
		await checkA11y(page);
	});

	test('the admission list is accessible', async ({ asPersona, checkA11y }) => {
		// Its own check, because it is a different screen behind the same address: two hundred
		// rows of switches, and switches are where a state that is only a colour hides.
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/personen');
		await checkA11y(page);
	});

	test('the preview strip is accessible', async ({ asPersona, checkA11y }) => {
		// A test of its own, because the strip only exists under a condition and the existing
		// a11y check therefore never gets to see it. It carries a semantic colour as a background
		// — exactly the constellation a contrast finding already hung on once in this project.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/');
		await page
			.context()
			.addCookies([{ name: 'tallox_assume', value: 'LECTURER', url: page.url() }]);
		await gotoRendered(page, '/');

		await expect(page.getByRole('status')).toBeVisible();
		await checkA11y(page);
	});
});

test.describe('access diagnosis', () => {
	test('answers the support question with decisions, not with content', async ({ asPersona }) => {
		// The field is @interactiveOnly, and the API console under /api-doku deliberately goes
		// through the token door. Without this page there would be no way to use it in production
		// at all — which is exactly what happened on the first attempt.
		const page = await asPersona(PERSONAS.sechs);
		await page.goto(`/verwaltung/diagnose?mail=${encodeURIComponent(PERSONAS.eins.mail)}`);

		await expect(page.getByRole('heading', { name: PERSONAS.eins.name })).toBeVisible();
		await expect(page.getByText('policy.MayAdministerPeople')).toBeVisible();
		// A lecturer does not administer and does not read other people's wishes — both answers
		// are there, with reasons.
		await expect(page.getByText(/Nur Planung und Dekanat/)).toBeVisible();
	});

	test('says exactly that for an unknown address', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.sechs);
		await page.goto('/verwaltung/diagnose?mail=gibtesnicht%40example.org');

		await expect(page.getByText('Unbekannt')).toBeVisible();
	});

	test('is not reachable for a lecturer', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		const response = await page.goto(
			`/verwaltung/diagnose?mail=${encodeURIComponent(PERSONAS.zwei.mail)}`
		);
		expect(response?.status()).toBeGreaterThanOrEqual(400);
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, `/verwaltung/diagnose?mail=${encodeURIComponent(PERSONAS.eins.mail)}`);
		await checkA11y(page);
	});
});
