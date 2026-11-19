import { describe, expect, it } from 'vitest';
import { claimReload, isStaleBuildError, RELOAD_GUARD_MS } from './staleBuild';

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value)
	};
}

describe('isStaleBuildError', () => {
	it.each([
		['Safari', new TypeError('Importing a module script failed.')],
		[
			'Chromium',
			new TypeError(
				'Failed to fetch dynamically imported module: https://example.org/_app/immutable/nodes/7.abc.js'
			)
		],
		[
			'Firefox',
			new TypeError(
				'error loading dynamically imported module: https://example.org/_app/immutable/nodes/7.abc.js'
			)
		],
		['Vite', new Error('Unable to preload CSS for /_app/immutable/assets/7.abc.css')]
	])('recognises %s', (_, error) => {
		expect(isStaleBuildError(error)).toBe(true);
	});

	it('leaves every other error to the report', () => {
		expect(
			isStaleBuildError(new TypeError("Cannot read properties of undefined (reading 'id')"))
		).toBe(false);
		expect(isStaleBuildError(new Error('Internal Error'))).toBe(false);
		expect(isStaleBuildError(undefined)).toBe(false);
		expect(isStaleBuildError({ message: 'Importing a module script failed.' })).toBe(false);
	});
});

describe('claimReload', () => {
	const href = 'https://example.org/verwaltung/zpa';

	it('reloads an address once, then not again within the guard', () => {
		const storage = memoryStorage();
		expect(claimReload(storage, href, 1_000)).toBe(true);
		expect(claimReload(storage, href, 1_000 + RELOAD_GUARD_MS - 1)).toBe(false);
	});

	it('reloads again once the guard has passed', () => {
		const storage = memoryStorage();
		expect(claimReload(storage, href, 1_000)).toBe(true);
		expect(claimReload(storage, href, 1_000 + RELOAD_GUARD_MS)).toBe(true);
	});

	it('does not hold one address against another', () => {
		const storage = memoryStorage();
		expect(claimReload(storage, href, 1_000)).toBe(true);
		expect(claimReload(storage, 'https://example.org/bedarf', 1_001)).toBe(true);
	});

	it('never reloads without a place to remember it', () => {
		expect(claimReload(null, href, 1_000)).toBe(false);
		const broken = {
			getItem: () => {
				throw new Error('SecurityError');
			},
			setItem: () => {}
		};
		expect(claimReload(broken, href, 1_000)).toBe(false);
	});

	it('treats a garbled record as no record', () => {
		const storage = memoryStorage();
		storage.setItem('tallox:stale-build-reload', 'not json');
		expect(claimReload(storage, href, 1_000)).toBe(false);
	});
});
