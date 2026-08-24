import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
	testDir: 'tests',
	// Creates the people before the first test runs. Since the backend enforces identity, a
	// persona with no row in `person` is nobody — and every page answers 401.
	globalSetup: './tests/global-setup.ts',
	timeout: 60_000,
	fullyParallel: true,
	// /dev/shm is only 64 MB in the DevContainer — more workers make Chromium crash. On a CI
	// runner that is not an issue; there only the core count limits it.
	workers: CI ? 4 : 2,
	retries: CI ? 2 : 1,

	// A `test.only` committed by accident makes the end-to-end stage green although it barely
	// runs anything — and nobody sees it, because a green tick looks like a green tick.
	forbidOnly: CI,

	reporter: CI
		? [
				// Annotations right on the diff in the pull request.
				['github'],
				['html', { open: 'never' }],
				['list']
			]
		: [['list']],

	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173',
		// On the retry only: a trace per test would be a few hundred megabytes of artefacts nobody
		// looks at on every green run. On a failure it is the only thing that makes a CI error
		// understandable without a reproduction.
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: CI ? 'retain-on-failure' : 'off'
	},

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: { args: ['--disable-dev-shm-usage'] }
			}
		}
	],

	webServer: {
		// npm rather than pnpm on purpose: otherwise the subprocess inherits the Corepack version
		// check and dies on a pnpm minor mismatch.
		command: 'npm run build && npm run preview',
		port: 4173,
		timeout: 180_000,
		// Reuse a running server locally; never in CI — there a server left over from an earlier
		// job would be a test against old code.
		reuseExistingServer: !CI,
		env: {
			// The SSR process needs the backend URL. Without it backend.ts falls back to
			// localhost:8080, which is right locally and is overridden by this value in CI.
			TALLOX_SERVER: process.env.TALLOX_SERVER ?? 'http://localhost:8080/query',
			// The temporary feedback entry, so the suite exercises it at every width and in
			// every theme. A made-up address: the real one belongs in the deployment, not in a
			// public repository, and what is being tested is that the entry appears and points
			// where it was told to.
			PUBLIC_TALLOX_FEEDBACK_URL: 'https://example.org/tallox-feedback'
		}
	}
});
