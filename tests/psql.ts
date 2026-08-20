import { execFileSync } from 'node:child_process';

/**
 * Runs SQL against the development database through `psql`.
 *
 * Through the binary rather than through a Postgres client as a dependency: the GUI never speaks
 * to the database, and a library for it in `package.json` would be an invitation to do exactly
 * that one day. `psql` exists in the DevContainer and on the GitHub runner.
 *
 * Without `TALLOX_DB_URL` it does nothing and says so. Most end-to-end tests need no state of
 * their own, and a helper that aborted without a database would make `pnpm test:e2e` unusable on
 * a machine that has none.
 *
 * @returns whether the statements were actually run.
 */
export function runSql(sql: string, purpose: string): boolean {
	const url = process.env.TALLOX_DB_URL;
	if (!url) {
		console.warn(`[e2e] TALLOX_DB_URL is not set — skipping: ${purpose}`);
		return false;
	}

	try {
		execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-q'], {
			input: sql,
			stdio: ['pipe', 'inherit', 'inherit']
		});
		return true;
	} catch (error) {
		// Fail loudly. A silent failure here shows up as an assertion about state that was never
		// arranged, and the cause is written down nowhere.
		throw new Error(`[e2e] Could not run the SQL for: ${purpose}`, { cause: error });
	}
}
