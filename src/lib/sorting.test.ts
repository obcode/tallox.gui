import { describe, expect, it } from 'vitest';
import { applyOrder, ariaSort, nextSort, sortRows, type SortState } from './sorting';

type Row = { id: string; name: string; hours?: number | null };

const rows: Row[] = [
	{ id: 'a', name: 'Übersetzerbau', hours: 4 },
	{ id: 'b', name: 'Analysis', hours: null },
	{ id: 'c', name: 'Datenbanken', hours: 2 },
	{ id: 'd', name: 'Betriebssysteme', hours: 4 }
];

const keys = { name: (r: Row) => r.name, hours: (r: Row) => r.hours };

describe('nextSort', () => {
	it('cycles ascending, descending, off', () => {
		const first = nextSort<'name'>(null, 'name');
		expect(first).toEqual({ key: 'name', dir: 'asc' });
		const second = nextSort(first, 'name');
		expect(second).toEqual({ key: 'name', dir: 'desc' });
		expect(nextSort(second, 'name')).toBeNull();
	});

	it('starts ascending on a different column', () => {
		expect(nextSort<'name' | 'hours'>({ key: 'name', dir: 'desc' }, 'hours')).toEqual({
			key: 'hours',
			dir: 'asc'
		});
	});
});

describe('ariaSort', () => {
	it('names the sorted column and nothing else', () => {
		const state: SortState<'name' | 'hours'> = { key: 'name', dir: 'desc' };
		expect(ariaSort(state, 'name')).toBe('descending');
		expect(ariaSort(state, 'hours')).toBe('none');
		expect(ariaSort({ key: 'name', dir: 'asc' }, 'name')).toBe('ascending');
		expect(ariaSort(null, 'name')).toBe('none');
	});
});

describe('sortRows', () => {
	it('keeps the page order when not sorted, as a copy', () => {
		const sorted = sortRows(rows, null, keys);
		expect(sorted).toEqual(rows);
		expect(sorted).not.toBe(rows);
	});

	it('sorts text the German way, umlauts in their place', () => {
		const ids = sortRows(rows, { key: 'name', dir: 'asc' }, keys).map((r) => r.id);
		expect(ids).toEqual(['b', 'd', 'c', 'a']);
		const back = sortRows(rows, { key: 'name', dir: 'desc' }, keys).map((r) => r.id);
		expect(back).toEqual(['a', 'c', 'd', 'b']);
	});

	it('puts IF2 before IF10', () => {
		const labels = [{ l: 'IF10' }, { l: 'IF2' }, { l: 'IF1' }];
		const sorted = sortRows(labels, { key: 'l', dir: 'asc' }, { l: (r) => r.l });
		expect(sorted.map((r) => r.l)).toEqual(['IF1', 'IF2', 'IF10']);
	});

	it('is stable and puts empty values last in both directions', () => {
		const asc = sortRows(rows, { key: 'hours', dir: 'asc' }, keys).map((r) => r.id);
		expect(asc).toEqual(['c', 'a', 'd', 'b']);
		const desc = sortRows(rows, { key: 'hours', dir: 'desc' }, keys).map((r) => r.id);
		expect(desc).toEqual(['a', 'd', 'c', 'b']);
	});

	it('takes a function for columns known only at runtime', () => {
		const byKey = (key: string) => (r: Row) => (key === 'name' ? r.name : r.hours);
		const ids = sortRows(rows, { key: 'name', dir: 'asc' }, byKey).map((r) => r.id);
		expect(ids).toEqual(['b', 'd', 'c', 'a']);
	});

	it('treats the empty string as empty and keeps several empties in page order', () => {
		const xs = [{ v: '' }, { v: 'b' }, { v: undefined }, { v: 'a' }];
		const sorted = sortRows(xs, { key: 'v', dir: 'desc' }, { v: (r) => r.v });
		expect(sorted).toEqual([{ v: 'b' }, { v: 'a' }, { v: '' }, { v: undefined }]);
	});
});

describe('applyOrder', () => {
	it('follows the recorded order and appends unknown rows in page order', () => {
		const xs = [{ k: 'x' }, { k: 'a' }, { k: 'y' }, { k: 'b' }];
		const ordered = applyOrder(xs, (r) => r.k, ['b', 'a']);
		expect(ordered.map((r) => r.k)).toEqual(['b', 'a', 'x', 'y']);
	});

	it('ignores recorded keys that are gone', () => {
		const ordered = applyOrder([{ k: 'a' }], (r) => r.k, ['z', 'a']);
		expect(ordered.map((r) => r.k)).toEqual(['a']);
	});
});
