import { runSql } from './psql';
import { seedSql } from './seed';

/**
 * Creates the cast before the first test runs.
 *
 * Since the backend enforces identity, a persona with no row in `person` is nobody: the proxy
 * header is resolved against the table, and without a match every request answers 401.
 *
 * Locally, without `TALLOX_DB_URL`, nothing happens — the run then goes against the development
 * database, where the people usually already exist.
 */
export default function globalSetup(): void {
	runSql(seedSql(), 'creating the people and the test catalogue');
}
