import { describe, expect, it } from 'vitest';
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent, withoutQuery } from './sentryScrub';

describe('withoutQuery', () => {
	it('cuts at the query and at the fragment', () => {
		expect(withoutQuery('https://example.org/verwaltung/personen?filter=1&q=Ein')).toBe(
			'https://example.org/verwaltung/personen'
		);
		expect(withoutQuery('/verwaltung/diagnose?mail=prof.eins@example.org')).toBe(
			'/verwaltung/diagnose'
		);
		expect(withoutQuery('/hilfe#wuensche')).toBe('/hilfe');
		expect(withoutQuery('/bedarf')).toBe('/bedarf');
	});
});

describe('scrubBreadcrumb', () => {
	it('strips the query from fetch and navigation addresses', () => {
		const fetch = scrubBreadcrumb({
			category: 'fetch',
			data: {
				url: 'https://example.org/verwaltung/personen/__data.json?filter=1&q=Ein&x-sveltekit-invalidated=01',
				method: 'GET',
				status_code: 200
			}
		});
		expect(fetch.data).toEqual({
			url: 'https://example.org/verwaltung/personen/__data.json',
			method: 'GET',
			status_code: 200
		});
		expect(fetch.category).toBe('fetch');

		const navigation = scrubBreadcrumb({
			category: 'navigation',
			data: { from: '/verwaltung/personen', to: '/verwaltung/personen?filter=1&q=Ein' }
		});
		expect(navigation.data).toEqual({
			from: '/verwaltung/personen',
			to: '/verwaltung/personen'
		});
	});

	it('leaves a breadcrumb without data alone', () => {
		const click = { category: 'ui.click', message: 'a.tab' };
		expect(scrubBreadcrumb(click)).toBe(click);
	});
});

describe('scrubEvent', () => {
	it('strips the query from the request, its referer and every breadcrumb', () => {
		const event = scrubEvent({
			message: 'TypeError',
			request: {
				url: 'https://example.org/verwaltung/personen?q=Ein',
				query_string: 'q=Ein',
				headers: {
					Referer: 'https://example.org/verwaltung/personen?q=Ein',
					'User-Agent': 'Safari'
				}
			},
			breadcrumbs: [{ data: { to: '/verwaltung/personen?q=Ein' } }]
		});

		expect(event.request).toEqual({
			url: 'https://example.org/verwaltung/personen',
			headers: { Referer: 'https://example.org/verwaltung/personen', 'User-Agent': 'Safari' }
		});
		expect(event.breadcrumbs).toEqual([{ data: { to: '/verwaltung/personen' } }]);
		expect(event.message).toBe('TypeError');
		expect(JSON.stringify(event)).not.toContain('Ein');
	});

	it('passes an event without request or breadcrumbs through', () => {
		expect(scrubEvent({ message: 'x' })).toEqual({ message: 'x' });
	});
});

describe('DATA_COLLECTION', () => {
	it('lets the SDK collect nothing on its own', () => {
		const leaves = (value: unknown): unknown[] =>
			value !== null && typeof value === 'object' && !Array.isArray(value)
				? Object.values(value).flatMap(leaves)
				: [value];
		for (const leaf of leaves(DATA_COLLECTION)) {
			expect(leaf === false || (Array.isArray(leaf) && leaf.length === 0)).toBe(true);
		}
	});
});
