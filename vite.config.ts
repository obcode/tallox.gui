import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Bake the version in at build time, in three steps:
//   1. APP_VERSION (Docker build arg from the semantic-release tag)
//   2. git describe (local development inside the repository)
//   3. package.json (last resort; it deliberately holds a placeholder)
function appVersion(): string {
	if (process.env.APP_VERSION) return process.env.APP_VERSION;
	try {
		return execSync('git describe --tags --always --dirty', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		try {
			return JSON.parse(readFileSync('package.json', 'utf8')).version ?? 'unknown';
		} catch {
			return 'unknown';
		}
	}
}

// The SvelteKit configuration. Since SvelteKit 3 it is passed to the plugin here; a
// svelte.config.js is refused. vitest.config.ts extends this file, so tests compile with the
// same options.
const kit = sveltekit({
	// The master switch: this whole project runs in runes mode. Legacy syntax (`export let`,
	// `$:`, `on:click`, `createEventDispatcher`, `<slot>`) is a compile error from here on, not
	// a question of style.
	compilerOptions: { runes: true },

	preprocess: vitePreprocess(),

	adapter: adapter(),

	// An open tab asks every five minutes whether a newer build is deployed, so that
	// NewVersionReload can turn the next click into a full load instead of an import of a
	// chunk that no longer exists. It asks on returning to the tab as well.
	version: { pollInterval: 5 * 60_000 },

	// Third-party libraries that ship their .svelte sources sometimes still use legacy
	// syntax. The global runes:true would break them — so for node_modules the mode is left
	// to the compiler, which detects it per component. Not `runes: false`: SvelteKit 3's own
	// root component uses runes syntax and does not compile in legacy mode.
	// This escape hatch is for dependencies, never for src/.
	dynamicCompileOptions({ filename }) {
		if (filename.includes('node_modules')) return { runes: undefined };
	}
});

export default defineConfig({
	plugins: [tailwindcss(), kit],

	define: {
		__APP_VERSION__: JSON.stringify(appVersion()),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString())
	}

	// The vitest configuration lives in vitest.config.ts, not here: `test` does not belong in
	// Vite's UserConfig, and svelte-check rightly reports it as a type error.
});
