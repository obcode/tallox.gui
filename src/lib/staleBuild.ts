/**
 * A tab that outlived a deploy.
 *
 * Every page's code lives in hashed chunks under /_app/immutable/. A deploy replaces them all,
 * so a tab opened before it still knows only the old names, and the first page it has not
 * loaded yet fails to import: 404 on the chunk, and the browser's word for it is a TypeError.
 * Nothing is broken — a reload fetches the new build and the page works.
 *
 * SvelteKit asks /_app/version.json and reloads by itself when a navigation fails this way,
 * but not when the failure happens while preloading on hover (`data-sveltekit-preload-data`):
 * that path hands the error to handleError first. The tab then shows the error page on the
 * click, and the collector gets an issue for what was only a stale tab. Reported 2026-11-19.
 */

/** How each browser phrases a dynamic import that could not be fetched. */
const STALE_BUILD_MESSAGES = [
	// Safari
	'Importing a module script failed',
	// Chromium
	'Failed to fetch dynamically imported module',
	// Firefox
	'error loading dynamically imported module',
	// Vite's preload helper, for the stylesheet next to the chunk
	'Unable to preload CSS'
];

export function isStaleBuildError(error: unknown): boolean {
	const message =
		error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
	if (!message) return false;
	return STALE_BUILD_MESSAGES.some((m) => message.includes(m));
}

const RELOAD_KEY = 'tallox:stale-build-reload';

/** A second failure for the same address within this time is not a stale tab. */
export const RELOAD_GUARD_MS = 60_000;

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Whether the error page may reload `href` now — and if so, records that it did.
 *
 * A reload that fails the same way again would reload forever: a chunk missing from the new
 * build, or a proxy that answers every request with a login page. So the same address is
 * reloaded at most once per RELOAD_GUARD_MS; after that the page offers a button instead.
 * Without a storage to remember it in, never: better a button than a loop.
 */
export function claimReload(storage: ReloadStorage | null, href: string, now: number): boolean {
	if (!storage) return false;
	try {
		const raw = storage.getItem(RELOAD_KEY);
		if (raw) {
			const last = JSON.parse(raw) as { href?: unknown; at?: unknown };
			if (last.href === href && typeof last.at === 'number' && now - last.at < RELOAD_GUARD_MS) {
				return false;
			}
		}
		storage.setItem(RELOAD_KEY, JSON.stringify({ href, at: now }));
		return true;
	} catch {
		return false;
	}
}
