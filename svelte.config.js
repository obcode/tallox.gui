import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// The master switch: this whole project runs in runes mode. Legacy syntax (`export let`,
	// `$:`, `on:click`, `createEventDispatcher`, `<slot>`) is a compile error from here on, not
	// a question of style.
	compilerOptions: { runes: true },

	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),

		// An open tab asks every five minutes whether a newer build is deployed, so that
		// NewVersionReload can turn the next click into a full load instead of an import of a
		// chunk that no longer exists. It asks on returning to the tab as well.
		version: { pollInterval: 5 * 60_000 }
	},

	vitePlugin: {
		// Third-party libraries that ship their .svelte sources sometimes still use legacy
		// syntax. The global runes:true would break them — so node_modules is compiled
		// explicitly in (auto-detected) legacy mode.
		// This escape hatch is for dependencies, never for src/.
		dynamicCompileOptions({ filename }) {
			if (filename.includes('node_modules')) return { runes: false };
		}
	}
};

export default config;
