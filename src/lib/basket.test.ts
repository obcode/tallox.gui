import { describe, expect, it } from 'vitest';
import {
	basketValue,
	cohortBasketOptions,
	cohortsInBasket,
	compareFirstBaskets,
	firstOf,
	parseBasketChoice
} from './basket';

const cohort = (id: string, programme: string, baskets: string[] | null) => ({
	id,
	programme: { code: programme },
	baskets
});

describe('the basket choice in the address', () => {
	it('reads back what it wrote, even where the basket carries a colon of its own', () => {
		expect(parseBasketChoice(basketValue('IG', 'PA: Wahlpflicht'))).toEqual({
			programme: 'IG',
			basket: 'PA: Wahlpflicht'
		});
	});

	it('is none without both halves', () => {
		for (const raw of [null, undefined, '', '  ', 'IG', 'IG:', ':Korb']) {
			expect(parseBasketChoice(raw)).toBeNull();
		}
	});
});

describe('cohortBasketOptions', () => {
	// A basket belongs to one programme: the same name in two programmes is two entries.
	it('offers each basket once per programme, by programme and then basket', () => {
		const options = cohortBasketOptions([
			cohort('a', 'IG', ['Wahlpflicht B', 'Wahlpflicht A']),
			cohort('b', 'IF', ['Pflichtmodule']),
			cohort('c', 'IG', ['Wahlpflicht A', 'Pflichtmodule']),
			cohort('d', 'IF', null)
		]);
		expect(options).toEqual([
			{ value: 'IF:Pflichtmodule', label: 'IF · Pflichtmodule' },
			{ value: 'IG:Pflichtmodule', label: 'IG · Pflichtmodule' },
			{ value: 'IG:Wahlpflicht A', label: 'IG · Wahlpflicht A' },
			{ value: 'IG:Wahlpflicht B', label: 'IG · Wahlpflicht B' }
		]);
	});

	it('offers nothing where no cohort sits in a basket', () => {
		expect(cohortBasketOptions([cohort('a', 'IF', []), cohort('b', 'IF', null)])).toEqual([]);
	});
});

describe('cohortsInBasket', () => {
	const cohorts = [
		cohort('ig-a', 'IG', ['Wahlpflicht A', 'Wahlpflicht B']),
		cohort('ig-b', 'IG', ['Wahlpflicht B']),
		// The same basket name in another programme is not the same basket.
		cohort('if-a', 'IF', ['Wahlpflicht A']),
		cohort('ig-none', 'IG', null)
	];

	it('keeps every cohort where no basket is chosen', () => {
		expect(cohortsInBasket(cohorts, null)).toEqual(cohorts);
	});

	// Per cohort: a module in two baskets matches both, and only in its own programme.
	it('keeps the cohorts of the chosen programme that sit in the basket', () => {
		const ids = (basket: string) =>
			cohortsInBasket(cohorts, { programme: 'IG', basket }).map((c) => c.id);
		expect(ids('Wahlpflicht A')).toEqual(['ig-a']);
		expect(ids('Wahlpflicht B')).toEqual(['ig-a', 'ig-b']);
		expect(ids('Pflichtmodule')).toEqual([]);
	});
});

describe('the basket order', () => {
	it('sorts a module under its first basket in reading order', () => {
		expect(firstOf(['Wahlpflicht B', 'Ästhetik', 'Wahlpflicht A'])).toBe('Ästhetik');
		expect(firstOf([])).toBeNull();
		expect(firstOf(null)).toBeNull();
	});

	it('puts modules without a basket last', () => {
		const sorted = ['B', null, 'A'].sort(compareFirstBaskets);
		expect(sorted).toEqual(['A', 'B', null]);
	});
});
