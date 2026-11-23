import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Extends vite.config.ts rather than calling sveltekit() again: since SvelteKit 3 the SvelteKit
// options are arguments of that plugin call, and a second, bare call would compile the tests
// without them (no runes mode, no adapter, no version polling).
export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			// Deliberately narrowed to src/: otherwise `pnpm test` pulls the Playwright specs from
			// tests/ in as well and fails because they expect a browser.
			include: ['src/**/*.{test,spec}.{js,ts}'],
			environment: 'node',
			coverage: {
				provider: 'v8',
				include: ['src/lib/**'],
				exclude: [
					'src/lib/gql/__generated__/**',
					'**/*.test.ts',
					// Playwright checks components in a real browser, not vitest. Measuring them here
					// would push the figure down to a third permanently and make every threshold
					// useless — and the convention is to pull logic out of .svelte into a lib module
					// and test that anyway.
					'src/lib/components/**'
				],
				reporter: ['text', 'html', 'lcov'],
				// A ratchet, not a target: the values sit just below the current level. They are not
				// meant to prove enough is tested but to stop a larger untested block arriving
				// unnoticed. Whoever raises them raises them in the same commit as the tests.
				thresholds: {
					statements: 80,
					branches: 75,
					functions: 70,
					lines: 80
				}
			}
		},
		define: {
			__APP_VERSION__: JSON.stringify('test'),
			__BUILD_TIME__: JSON.stringify('test')
		}
	})
);
