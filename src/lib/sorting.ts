/**
 * Sorting a table by clicking its column head.
 *
 * # Three states, and the third one matters
 *
 * A click cycles ascending → descending → off. "Off" is not an arbitrary order but the one the page
 * had before anybody clicked — and that order usually means something: compulsory modules first,
 * PBLV last, the planned programmes before the others. A two-state toggle would lose it for good
 * after the first click, and reloading the page is not a reasonable way to get it back.
 *
 * # Empty values last, in both directions
 *
 * A module without a subject group or a token that was never used has nothing to sort by. Putting
 * it first in one direction would fill the top of the table with dashes, which is the opposite of
 * what somebody clicking a column wants to see.
 *
 * # What a sort key may never be
 *
 * Anything computed from other people's wishes, competences or assignments. A table sorted by
 * interest is the heat map [[no-wish-aggregates]] was written against, with the colour taken out —
 * the order alone says where the others have entered something. Sorting by the reader's own entries
 * is fine, for the same reason the own-entry tint is.
 */

export type SortDir = 'asc' | 'desc';

/** The current sort, or null for the page's own order. */
export type SortState<K extends string = string> = { key: K; dir: SortDir } | null;

/** What a column sorts by. Null and undefined mean "nothing to sort by" and go last. */
export type SortValue = string | number | null | undefined;

/**
 * What each column sorts by: a record for a fixed set of columns, or a function for tables whose
 * columns are only known at runtime (one per track on the wish screen).
 */
export type SortKeys<T, K extends string> =
	Record<K, (row: T) => SortValue> | ((key: K) => (row: T) => SortValue);

/** The state after a click on the head of column `key`. */
export function nextSort<K extends string>(state: SortState<K>, key: K): SortState<K> {
	if (state === null || state.key !== key) return { key, dir: 'asc' };
	if (state.dir === 'asc') return { key, dir: 'desc' };
	return null;
}

/** The value of `aria-sort` for column `key`. */
export function ariaSort<K extends string>(
	state: SortState<K>,
	key: K
): 'ascending' | 'descending' | 'none' {
	if (state === null || state.key !== key) return 'none';
	return state.dir === 'asc' ? 'ascending' : 'descending';
}

function isEmpty(value: SortValue): value is null | undefined | '' {
	return value === null || value === undefined || value === '';
}

/**
 * Compare two present values: numbers as numbers, text the German way.
 *
 * `numeric` so that IF2 comes before IF10, the same as the cohort labels on the assignment screen.
 */
function compareValues(a: string | number, b: string | number): number {
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return String(a).localeCompare(String(b), 'de', { numeric: true });
}

/**
 * The rows in the order `state` asks for, as a new array.
 *
 * Stable: rows with the same value keep the page's own order relative to each other, so sorting
 * by subject group still lists the modules inside each group the way they were listed before.
 */
export function sortRows<T, K extends string>(
	rows: readonly T[],
	state: SortState<K>,
	keys: SortKeys<T, K>
): T[] {
	if (state === null) return [...rows];
	const valueOf = typeof keys === 'function' ? keys(state.key) : keys[state.key];
	const sign = state.dir === 'asc' ? 1 : -1;

	return rows
		.map((row, index) => ({ row, index, value: valueOf(row) }))
		.sort((a, b) => {
			const aEmpty = isEmpty(a.value);
			const bEmpty = isEmpty(b.value);
			if (aEmpty || bEmpty) {
				if (aEmpty && bEmpty) return a.index - b.index;
				return aEmpty ? 1 : -1;
			}
			return sign * compareValues(a.value!, b.value!) || a.index - b.index;
		})
		.map((entry) => entry.row);
}

/**
 * The rows in a previously recorded order of keys.
 *
 * For tables that are edited in place: sorting live by something the reader is changing would
 * move the row away from under the cursor the moment it is saved. The order is recorded on the
 * click instead and kept until the next one. A row the record does not know keeps its place
 * relative to the other unknown ones and goes after all the known ones.
 */
export function applyOrder<T>(
	rows: readonly T[],
	keyOf: (row: T) => string,
	order: readonly string[]
): T[] {
	const position = new Map(order.map((key, index) => [key, index]));
	return rows
		.map((row, index) => ({ row, index, at: position.get(keyOf(row)) }))
		.sort((a, b) => {
			if (a.at === undefined || b.at === undefined) {
				if (a.at === undefined && b.at === undefined) return a.index - b.index;
				return a.at === undefined ? 1 : -1;
			}
			return a.at - b.at;
		})
		.map((entry) => entry.row);
}
