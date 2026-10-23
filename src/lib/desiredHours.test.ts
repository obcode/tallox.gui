import { describe, expect, it } from 'vitest';

import {
	gaugeScale,
	loadGauge,
	desiredHoursStage,
	desiredRangeLabel,
	filterOverview,
	loadBreakdown,
	OVERVIEW_SORT_KEYS,
	parseDesiredRange,
	parseOverviewFilter,
	type OverviewRow
} from './desiredHours';

describe('the range somebody types', () => {
	it('reads two ends, and one end alone as a single figure', () => {
		expect(parseDesiredRange('6', '10')).toEqual({ min: 6, max: 10 });
		expect(parseDesiredRange('12,5', '')).toEqual({ min: 12.5, max: 12.5 });
		expect(parseDesiredRange('', '8')).toEqual({ min: 8, max: 8 });
	});

	it('takes the figure back when both are empty', () => {
		expect(parseDesiredRange('', '  ')).toBeNull();
	});

	it('says what is wrong, before a round trip', () => {
		expect(parseDesiredRange('12', '10')).toEqual({ error: expect.stringContaining('Minimum') });
		expect(parseDesiredRange('7,3', '10')).toEqual({ error: expect.stringContaining('halben') });
		expect(parseDesiredRange('6', '41')).toEqual({ error: expect.stringContaining('40') });
	});

	it('is written the way the faculty writes it', () => {
		expect(desiredRangeLabel(8, 8)).toBe('8');
		expect(desiredRangeLabel(6, 10)).toBe('6–10');
		expect(desiredRangeLabel(12.5, 14)).toBe('12,5–14');
	});
});

describe('where a semester stands', () => {
	it('is open, frozen or published, from the two marks', () => {
		expect(desiredHoursStage({})).toBe('OPEN');
		expect(desiredHoursStage({ desiredHoursFrozenAt: '2026-11-01T10:00:00Z' })).toBe('FROZEN');
		expect(
			desiredHoursStage({
				desiredHoursFrozenAt: '2026-11-01T10:00:00Z',
				desiredHoursPublishedAt: '2026-11-08T10:00:00Z'
			})
		).toBe('PUBLISHED');
	});
});

describe('the load somebody already holds', () => {
	it('names each subject group, and the modules in none last', () => {
		expect(
			loadBreakdown({
				total: 14,
				bySubjectGroup: [
					{ subjectGroup: { name: 'Mathematik' }, hours: 4 },
					{ subjectGroup: { name: 'Softwarefächer' }, hours: 8 },
					{ subjectGroup: null, hours: 2 }
				]
			})
		).toBe('Mathematik 4 · Softwarefächer 8 · ohne Fachgruppe 2');
	});
});

describe('the overview of the faculty', () => {
	const row = (name: string, groups: string[], stated = false, max?: number): OverviewRow => ({
		person: { id: name, name: `Prof. ${name}`, sortName: name },
		subjectGroups: groups.map((code) => ({ id: `g-${code.toLowerCase()}`, code, name: code })),
		stated,
		minHours: stated ? max : null,
		maxHours: stated ? max : null
	});
	const rows = [row('Eins', ['MATHE', 'SWE'], true, 12), row('Zwei', ['SWE']), row('Drei', [])];

	it('reads the filter from the address', () => {
		expect(parseOverviewFilter(new URLSearchParams('q=%20ein%20&fachgruppe=g-swe'))).toEqual({
			query: 'ein',
			group: 'g-swe'
		});
	});

	it('narrows by name and by membership', () => {
		expect(filterOverview(rows, { query: 'zwei', group: '' }).map((r) => r.person.id)).toEqual([
			'Zwei'
		]);
		expect(filterOverview(rows, { query: '', group: 'g-swe' }).map((r) => r.person.id)).toEqual([
			'Eins',
			'Zwei'
		]);
		expect(filterOverview(rows, { query: '', group: '' })).toHaveLength(3);
	});

	// A figure the reader may not see arrives as "not stated", so sorting by it can only ever
	// order what the reader is allowed to read.
	it('sorts an unstated figure as empty', () => {
		expect(OVERVIEW_SORT_KEYS.max(rows[0])).toBe(12);
		expect(OVERVIEW_SORT_KEYS.max(rows[1])).toBeNull();
		expect(OVERVIEW_SORT_KEYS.groups(rows[2])).toBeNull();
		expect(OVERVIEW_SORT_KEYS.assigned(rows[0])).toBeNull();
	});
});

describe('loadGauge', () => {
	it('judges planned hours against the wished range', () => {
		expect(loadGauge(10, { min: 14, max: 18 }, 20).verdict).toBe('UNDER');
		expect(loadGauge(14, { min: 14, max: 18 }, 20).verdict).toBe('WITHIN');
		expect(loadGauge(18, { min: 14, max: 18 }, 20).verdict).toBe('WITHIN');
		expect(loadGauge(19, { min: 14, max: 18 }, 20).verdict).toBe('OVER');
		expect(loadGauge(19, null, 20).verdict).toBe('UNSTATED');
	});

	it('draws the range as a band and the plan as a fill, on the given scale', () => {
		const gauge = loadGauge(10, { min: 14, max: 18 }, 20);
		expect(gauge.planned).toBe(50);
		expect(gauge.range).toEqual({ start: 70, width: 20 });
		expect(loadGauge(10, null, 20).range).toBeNull();
	});

	// Past the end of the scale the bar stops at the edge; the number beside it says the rest.
	it('stops at the end of the scale', () => {
		expect(loadGauge(40, { min: 14, max: 30 }, 20).planned).toBe(100);
		expect(loadGauge(40, { min: 14, max: 30 }, 20).range).toEqual({ start: 70, width: 30 });
		expect(loadGauge(5, null, 0).planned).toBe(0);
	});
});

describe('gaugeScale', () => {
	it('is the largest value shown, never below the floor', () => {
		expect(gaugeScale([4, 12, null, undefined])).toBe(20);
		expect(gaugeScale([4, 26, 18])).toBe(26);
		expect(gaugeScale([], 10)).toBe(10);
	});
});
