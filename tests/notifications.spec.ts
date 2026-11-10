import { expect } from '@playwright/test';
import { CATALOGUE } from './seed';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';

/**
 * Mail: subscriptions one makes oneself, and announcements those who lead the planning send.
 *
 * What the browser can show is the page, the click and what the backend answers; whether a mail
 * then leaves is the backend's dispatcher, tested there against a real database. Serial, because
 * the tests change the same people's subscriptions and the announcement archive.
 */
test.describe.configure({ mode: 'serial' });

function reset(): void {
	runSql(
		`DELETE FROM notification_subscription
		  WHERE person_id IN (SELECT id FROM person WHERE mail IN ('${PERSONAS.eins.mail}', '${PERSONAS.zwei.mail}'));
		 DELETE FROM announcement
		  WHERE sender_id IN (SELECT id FROM person WHERE mail = '${PERSONAS.fuenf.mail}');`,
		'clearing the test subscriptions and announcements'
	);
}

test.beforeAll(reset);
test.afterAll(reset);

test.describe('notifications', () => {
	test('start empty, and the recommended set is one click', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/konto/benachrichtigungen');

		await expect(page.getByRole('heading', { name: 'Benachrichtigungen', level: 1 })).toBeVisible();
		// Always opt-in: nothing is subscribed for anybody.
		await expect(page.getByText('Noch keine.')).toBeVisible();
		await expect(page.getByText(PERSONAS.eins.mail)).toBeVisible();
		await checkA11y(page);

		await page.getByRole('button', { name: 'Empfohlene Abos übernehmen' }).click();
		await expect(page.getByRole('cell', { name: 'meine Vormerkungen' }).first()).toBeVisible();
		await expect(page.getByText('Noch keine.')).toHaveCount(0);
	});

	test('a subscription is the owner’s alone', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/konto/benachrichtigungen');
		await expect(page.getByText('Noch keine.')).toBeVisible();
	});

	test('one is removed by itself', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/konto/benachrichtigungen');
		const rows = page.getByRole('button', { name: /^Abo .* entfernen$/ });
		const before = await rows.count();
		await rows.first().click();
		await expect(rows).toHaveCount(before - 1);
	});

	test('the bell on a module page turns on and off', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, `/module/${CATALOGUE.split}`);

		await page.getByRole('button', { name: /Benachrichtigen, wenn angeboten/ }).click();
		await expect(page.getByRole('button', { name: /Wird gemeldet/ })).toBeVisible();

		await gotoRendered(page, '/konto/benachrichtigungen');
		await expect(
			page.getByRole('cell', { name: 'Modul wird angeboten', exact: true })
		).toBeVisible();

		await gotoRendered(page, `/module/${CATALOGUE.split}`);
		await page.getByRole('button', { name: /Wird gemeldet/ }).click();
		await expect(
			page.getByRole('button', { name: /Benachrichtigen, wenn angeboten/ })
		).toBeVisible();
	});
});

test.describe('announcements', () => {
	test('a lecturer reads them and is offered nothing to write', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/mitteilungen');
		await expect(page.getByRole('heading', { name: 'Rundmails', level: 1 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Neue Rundmail' })).toHaveCount(0);
	});

	test('the dean’s office previews, then sends to the colleagues', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/mitteilungen');
		await expect(page.getByRole('heading', { name: 'Neue Rundmail' })).toBeVisible();

		await page.getByLabel('An').selectOption({ label: 'an das Kollegium' });
		await page.getByLabel('Betreff').fill('Test-Rundmail');
		await page.getByLabel('Text').fill('Liebe Kolleginnen und Kollegen,\n\n- **eins**\n- zwei');
		// Sending only becomes possible after the preview has said how many it reaches.
		await expect(page.getByRole('button', { name: /schicken$/ })).toHaveCount(0);
		// Before the preview: axe tries to run inside the sandboxed frame, which runs no script,
		// and waits out its timeout. The frame holds the mail, not this page.
		await checkA11y(page);
		await page.getByRole('button', { name: 'Vorschau' }).click();

		await expect(page.getByRole('heading', { name: 'So kommt sie an' })).toBeVisible();
		await expect(
			page.frameLocator('iframe[title="Vorschau der Rundmail"]').getByText('eins', { exact: true })
		).toBeVisible();

		page.once('dialog', (d) => d.accept());
		await page.getByRole('button', { name: /^An \d+ Personen? schicken$/ }).click();
		await expect(page.getByText('Verschickt')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Test-Rundmail' })).toBeVisible();
	});

	test('a recipient finds it in the archive, without the count', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/mitteilungen');
		const article = page.getByRole('article').filter({ hasText: 'Test-Rundmail' });
		await expect(article).toBeVisible();
		await expect(article.getByText(/an \d+ Person/)).toHaveCount(0);
		// The body is rendered like the mail: a list and bold, no asterisks.
		await expect(article.locator('li strong', { hasText: 'eins' })).toBeVisible();
		await expect(article.getByRole('listitem')).toHaveCount(2);
		await expect(article.getByText('**')).toHaveCount(0);
	});
});
