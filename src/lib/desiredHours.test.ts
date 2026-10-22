import { describe, expect, it } from 'vitest';

import {
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
					{ subjectGroup: { code: 'MATHE' }, hours: 4 },
					{ subjectGroup: { code: 'SWE' }, hours: 8 },
					{ subjectGroup: null, hours: 2 }
				]
			})
		).toBe('MATHE 4 · SWE 8 · ohne Fachgruppe 2');
	});
});

describe('the overview of the faculty', () => {
	const row = (name: string, groups: string[], stated = false, max?: number): OverviewRow => ({
		person: { id: name, name: `Prof. ${name}`, sortName: name },
		subjectGroups: groups.map((code) => ({ id: code, code, name: code })),
		stated,
		minHours: stated ? max : null,
		maxHours: stated ? max : null
	});
	const rows = [row('Eins', ['MATHE', 'SWE'], true, 12), row('Zwei', ['SWE']), row('Drei', [])];

	it('reads the filter from the address', () => {
		expect(parseOverviewFilter(new URLSearchParams('q=%20ein%20&fachgruppe=SWE'))).toEqual({
			query: 'ein',
			group: 'SWE'
		});
	});

	it('narrows by name and by membership', () => {
		expect(filterOverview(rows, { query: 'zwei', group: '' }).map((r) => r.person.id)).toEqual([
			'Zwei'
		]);
		expect(filterOverview(rows, { query: '', group: 'SWE' }).map((r) => r.person.id)).toEqual([
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
