import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';

/**
 * The ZPA import page, against the real stack.
 *
 * Two things here that no Go test sees. The four backend fields are `@interactiveOnly`, so the
 * API console under /api-doku — which goes through the token door — answers `null` for all of
 * them; without this page they are unreachable in production, which is exactly what happened to
 * `diagnoseAccess` on its first attempt. And the page has to be honest about an installation
 * that has never imported, which is the state every fresh database is in and the one a
 * developer sees first.
 */
test.describe('the ZPA import page', () => {
	test('the dean’s office sees it and can ask for a run', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/verwaltung/zpa');

		await expect(page.getByRole('heading', { name: 'ZPA-Import' })).toBeVisible();

		// The one thing on this page that must always be readable. On a database with no runs
		// it says so in a sentence rather than showing a dash — an installation that has never
		// imported is one whose module catalogue is empty, and that is not a detail.
		await expect(page.getByText(/erfolgreichen? Abgleich/i).first()).toBeVisible();

		await expect(page.getByRole('button', { name: 'Jetzt abgleichen' })).toBeVisible();

		await checkA11y(page);
	});

	test('an administrator sees it too', async ({ asPersona }) => {
		// The union of ADMIN and DEANS_OFFICE is the first rule in the backend that joins those
		// two roles, so both halves are worth an assertion here: the act is operational, the
		// need for it arises in planning.
		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/zpa');

		await expect(page.getByRole('heading', { name: 'ZPA-Import' })).toBeVisible();
	});

	test('a lecturer is refused', async ({ asPersona }) => {
		// Cosmetic hiding is not the point — the lock is policy.MayReadZPAImport and it is
		// checked through both doors in Go. What this proves is that the refusal arrives as a
		// page and not as a broken screen.
		const page = await asPersona(PERSONAS.eins);
		const response = await page.goto('/verwaltung/zpa');

		expect(response?.status()).toBe(403);
	});

	test('the entry is not in a lecturer’s menu', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		await expect(page.getByRole('link', { name: /ZPA-Import/ })).toHaveCount(0);
	});
});

/**
 * Following a run while it is going.
 *
 * The run happens in the backend, detached from the request that started it, and the page
 * follows it by loading itself again. No Go test sees that half — whether the page actually
 * re-reads, and stops when the run is over — and nothing short of a real browser against a real
 * stack does. The run is arranged in the database rather than started through the button: there
 * is no ZPA behind the end-to-end stack, and a row is exactly what the page reads.
 *
 * Serial, and cleaned up afterwards: a RUNNING row greys out the button for every other test,
 * and a finished one would hold off a manual run for ten minutes.
 */
test.describe('a run in progress', () => {
	test.describe.configure({ mode: 'serial' });

	const RUN = 'e2e00000-0000-4000-8000-00000000c0de';
	const kind = (name: string) =>
		`INSERT INTO zpa_sync_run_kind (run_id, kind, status, fetched) VALUES ('${RUN}', '${name}', 'SUCCEEDED', 1);`;
	const reset = () => runSql(`DELETE FROM zpa_sync_run WHERE id = '${RUN}';`, 'removing the run');

	test.skip(!process.env.TALLOX_DB_URL, 'needs the database to arrange a run');
	test.beforeEach(() => {
		reset();
	});
	test.afterEach(() => {
		reset();
	});

	test('is shown endpoint by endpoint and replaced by its result without a reload', async ({
		asPersona,
		checkA11y
	}) => {
		runSql(
			`INSERT INTO zpa_sync_run (id, trigger, started_at)
			   VALUES ('${RUN}', 'MANUAL', now() - interval '5 seconds');
			 ${kind('SPO')} ${kind('BASKET')} ${kind('TEACHER')}`,
			'arranging a run in progress'
		);

		const page = await asPersona(PERSONAS.sechs);
		await gotoRendered(page, '/verwaltung/zpa');

		const bar = page.getByRole('progressbar', { name: 'Fortschritt des Abgleichs' });
		await expect(bar).toHaveAttribute('value', '3');
		await expect(bar).toHaveAttribute('max', '5');
		await expect(page.getByText(/^3 von 5 Quellen übernommen: .*SPOs/)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Jetzt abgleichen' })).toBeDisabled();
		await checkA11y(page);

		// The next endpoint arrives while the page is open.
		runSql(kind('MODULE'), 'one more endpoint');
		await expect(bar).toHaveAttribute('value', '4');

		// And the run ends. Nothing reloads the page — what replaces the bar is the polling.
		let reloaded = false;
		page.on('load', () => (reloaded = true));
		runSql(
			`${kind('MSBA')}
			 UPDATE zpa_sync_run SET status = 'SUCCEEDED', finished_at = now() WHERE id = '${RUN}';`,
			'finishing the run'
		);
		await expect(bar).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Jetzt abgleichen' })).toBeEnabled();
		await expect(page.getByText('Dauert etwa eine Viertelminute.')).toBeVisible();
		expect(reloaded).toBe(false);
	});
});
