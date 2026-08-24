import { test, expect, PERSONAS, gotoRendered } from './fixtures';

/**
 * Token management, against the real stack.
 *
 * What is checked here cannot be shown by a unit test: that a token this page creates then works
 * against the *other* door. The route there runs through the identity relay in the SSR, through
 * the mutation in the backend, through hashing the secret and back through authentication — and
 * every one of those stations can be correct on its own while the result is unusable.
 */
test.describe('Personal Access Tokens', () => {
	test('creating shows the token exactly once, and it works', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/konto/tokens');

		const description = `E2E ${Date.now()}`;
		await page.getByLabel('Wofür?').fill(description);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const secretField = page.getByLabel('Neues Token');
		await expect(secretField).toBeVisible();

		const secret = await secretField.inputValue();
		expect(secret).toMatch(/^tallox_[0-9A-HJKMNP-TV-Z]{16}_[A-Za-z0-9_-]{43}$/);

		// The actual proof: the token just issued authenticates against the token door, as its
		// owner.
		const response = await page.request.post(
			`${process.env.TALLOX_SERVER?.replace('/query', '') ?? 'http://localhost:8080'}/api/graphql`,
			{
				headers: { Authorization: `Bearer ${secret}` },
				data: { query: '{ me { mail } }' }
			}
		);
		expect(response.ok()).toBe(true);
		expect(await response.json()).toMatchObject({ data: { me: { mail: PERSONAS.eins.mail } } });

		// And after a reload the secret is gone — it exists only in the response to the mutation.
		// A page that still shows it on second look has stored it somewhere.
		await gotoRendered(page, '/konto/tokens');
		await expect(page.getByLabel('Neues Token')).toHaveCount(0);
		await expect(page.getByText(description)).toBeVisible();
	});

	test('revoking makes the token unusable immediately', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/tokens');

		const description = `Revocation ${Date.now()}`;
		await page.getByLabel('Wofür?').fill(description);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const secret = await page.getByLabel('Neues Token').inputValue();
		const endpoint = `${process.env.TALLOX_SERVER?.replace('/query', '') ?? 'http://localhost:8080'}/api/graphql`;

		const before = await page.request.post(endpoint, {
			headers: { Authorization: `Bearer ${secret}` },
			data: { query: '{ me { mail } }' }
		});
		expect(before.ok()).toBe(true);

		// By the description and not by `.first()`.
		//
		// After creating, SvelteKit reloads the list; `.first()` therefore sometimes hit the new
		// and sometimes still the old first row — the test then revoked a different token, and
		// the one under test kept working. Reported as "flaky", but in fact a test that
		// intermittently checked something other than what its name says.
		const row = page.getByRole('row').filter({ hasText: description });
		await expect(row).toBeVisible();
		await row.getByRole('button', { name: 'Widerrufen' }).click();

		// Wait for the button to be gone, not for the word.
		//
		// `getByText` is case-insensitive by default, so `getByText('widerrufen')` matched the
		// "Widerrufen" button itself — the wait was satisfied before the click had done
		// anything, and the request below then raced the revocation. Reported as flaky; in fact
		// a wait for something that was already true. The same shape as the `.first()` mistake
		// noted above, and the reason this test now names both signals.
		await expect(row.getByRole('button', { name: 'Widerrufen' })).toHaveCount(0);
		await expect(row.getByText('widerrufen', { exact: true })).toBeVisible();

		const after = await page.request.post(endpoint, {
			headers: { Authorization: `Bearer ${secret}` },
			data: { query: '{ me { mail } }' }
		});
		expect(after.status()).toBe(401);
	});

	test("nobody sees another person's tokens", async ({ asPersona }) => {
		const marker = `Only for Eins ${Date.now()}`;

		const eins = await asPersona(PERSONAS.eins);
		await gotoRendered(eins, '/konto/tokens');
		await eins.getByLabel('Wofür?').fill(marker);
		await eins.getByRole('button', { name: 'Anlegen' }).click();
		await expect(eins.getByLabel('Neues Token')).toBeVisible();

		const zwei = await asPersona(PERSONAS.zwei);
		await gotoRendered(zwei, '/konto/tokens');

		// A token is a credential; seeing another person's list means knowing which ids exist —
		// and the id is what a revocation takes.
		await expect(zwei.getByText(marker)).toHaveCount(0);
	});

	test('the page is accessible', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/konto/tokens');
		await checkA11y(page);
	});
});

test.describe('token scopes', () => {
	const endpoint = () =>
		`${process.env.TALLOX_SERVER?.replace('/query', '') ?? 'http://localhost:8080'}/api/graphql`;

	test('a token restricted to the planning is refused everywhere else', async ({ asPersona }) => {
		// The whole scope model along the path a colleague actually walks: tick a box here, spend
		// the result at the token door. Every other assertion about scopes is on one half or the
		// other — this is the one where "what I ticked" and "what I got" could disagree.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/konto/tokens');

		const description = `Scoped ${Date.now()}`;
		await page.getByLabel('Wofür?').fill(description);
		await page.getByRole('radio', { name: /Auf einzelne Bereiche einschränken/ }).check();

		// The radio group of the planning area, not a global "lesen" — the form has one per area.
		const planning = page
			.locator('div')
			.filter({ hasText: /^Planung/ })
			.last();
		await planning.getByRole('radio', { name: 'lesen', exact: true }).check();

		await page.getByRole('button', { name: 'Anlegen' }).click();

		const secret = await page.getByLabel('Neues Token').inputValue();

		const semesters = await page.request.post(endpoint(), {
			headers: { Authorization: `Bearer ${secret}` },
			data: { query: '{ semesters { code } }' }
		});
		expect(await semesters.json()).not.toHaveProperty('errors');

		// The owner holds LECTURER, so `me` would answer for an unscoped token of hers. It is the
		// scope alone that refuses it here.
		const me = await page.request.post(endpoint(), {
			headers: { Authorization: `Bearer ${secret}` },
			data: { query: '{ me { mail } }' }
		});
		const refused = await me.json();
		expect(refused.errors?.[0]?.extensions?.code).toBe('INSUFFICIENT_SCOPE');

		// And buildInfo still answers, because a token whose diagnosis field is scoped off cannot
		// tell a broken credential from a broken route.
		const version = await page.request.post(endpoint(), {
			headers: { Authorization: `Bearer ${secret}` },
			data: { query: '{ buildInfo { version } }' }
		});
		expect(await version.json()).not.toHaveProperty('errors');

		// And the list says what the token can reach, so the owner can check without spending it.
		await gotoRendered(page, '/konto/tokens');
		const row = page.getByRole('row').filter({ hasText: description });
		await expect(row).toContainText('Planung (lesen)');
	});

	test('leaving it unrestricted is the default and says so', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/tokens');

		const description = `Unscoped ${Date.now()}`;
		await page.getByLabel('Wofür?').fill(description);
		await page.getByRole('button', { name: 'Anlegen' }).click();

		const secret = await page.getByLabel('Neues Token').inputValue();

		const me = await page.request.post(endpoint(), {
			headers: { Authorization: `Bearer ${secret}` },
			data: { query: '{ me { mail } }' }
		});
		expect(await me.json()).toMatchObject({ data: { me: { mail: PERSONAS.zwei.mail } } });

		await gotoRendered(page, '/konto/tokens');
		await expect(page.getByRole('row').filter({ hasText: description })).toContainText(
			'unbeschränkt'
		);
	});

	test('asking to restrict without choosing an area is refused, not silently unrestricted', async ({
		asPersona
	}) => {
		// The trap this dialogue exists to avoid. An empty selection means "no limits" to the
		// backend, so a page that showed "kein Zugriff" everywhere and submitted it would mint
		// the most permissive token of all.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/konto/tokens');

		await page.getByLabel('Wofür?').fill(`Empty ${Date.now()}`);
		await page.getByRole('radio', { name: /Auf einzelne Bereiche einschränken/ }).check();
		await page.getByRole('button', { name: 'Anlegen' }).click();

		await expect(page.getByText(/mindestens einen Bereich/)).toBeVisible();
		await expect(page.getByLabel('Neues Token')).toHaveCount(0);
	});
});
