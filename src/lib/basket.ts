/**
 * The basket filter and order for screens that list cohorts of several study programmes side by
 * side: the assignment page and its read-only overview.
 *
 * A basket belongs to one programme's regulations — "Pflichtmodule" of one programme is not the
 * "Pflichtmodule" of another — so a choice here names the programme as well, and a cohort matches
 * only in its own programme. The demand page shows one programme at a time and keeps its simpler
 * helpers in `$lib/demand`.
 *
 * Everything here reads catalogue data only. Nothing is sorted or filtered by who holds a part or
 * who wishes for it: that would be the aggregate the assignment screen must never show.
 */

/** A cohort, as much of it as the basket filter needs: its programme and its module's baskets there. */
export type CohortBasketLike = {
	programme: { code: string };
	baskets?: readonly string[] | null;
};

/** One entry of the "Korb" selection. */
export type BasketOption = { value: string; label: string };

/** A chosen basket of one programme, or none. */
export type BasketChoice = { programme: string; basket: string } | null;

/** The order the "Sortierung" switch offers. */
export type CohortOrder = 'name' | 'basket';

/** The reading order of baskets, the same as on the demand page and in the statistics. */
function basketCompare(a: string, b: string): number {
	return a.localeCompare(b, 'de');
}

/**
 * The address value of a choice. The programme code comes first and never holds a colon, so the
 * first colon separates the two even where a basket name carries one of its own.
 */
export function basketValue(programme: string, basket: string): string {
	return `${programme}:${basket}`;
}

/** Reads a choice back from the address; anything without a programme and a basket is none. */
export function parseBasketChoice(raw: string | null | undefined): BasketChoice {
	const value = (raw ?? '').trim();
	const at = value.indexOf(':');
	if (at <= 0 || at === value.length - 1) return null;
	return { programme: value.slice(0, at), basket: value.slice(at + 1) };
}

/**
 * The baskets to offer: every basket a cohort on the screen sits in, once, with its programme in
 * the label, by programme and then basket.
 *
 * Read off the cohorts rather than asked of the backend, for the reason given on the demand page:
 * a basket nothing on the screen sits in would filter to an empty table.
 */
export function cohortBasketOptions(cohorts: readonly CohortBasketLike[]): BasketOption[] {
	const seen = new Map<string, { programme: string; basket: string }>();
	for (const cohort of cohorts) {
		for (const basket of cohort.baskets ?? []) {
			const value = basketValue(cohort.programme.code, basket);
			if (!seen.has(value)) seen.set(value, { programme: cohort.programme.code, basket });
		}
	}
	return [...seen.entries()]
		.sort(
			([, a], [, b]) =>
				a.programme.localeCompare(b.programme, 'de') || basketCompare(a.basket, b.basket)
		)
		.map(([value, { programme, basket }]) => ({ value, label: `${programme} · ${basket}` }));
}

/**
 * The cohorts under the chosen basket; every cohort where none is chosen.
 *
 * Per cohort, not per module: a module taught in two programmes keeps only the cohorts of the
 * programme whose basket was chosen. A module in two baskets of that programme matches both.
 */
export function cohortsInBasket<T extends CohortBasketLike>(
	cohorts: readonly T[],
	choice: BasketChoice
): T[] {
	if (choice === null) return [...cohorts];
	return cohorts.filter(
		(c) => c.programme.code === choice.programme && (c.baskets ?? []).includes(choice.basket)
	);
}

/** The basket a module is sorted under: the first of its baskets in reading order, or none. */
export function firstOf(baskets: readonly string[] | null | undefined): string | null {
	return [...(baskets ?? [])].sort(basketCompare)[0] ?? null;
}

/** Compares two first baskets, modules without one last. */
export function compareFirstBaskets(a: string | null, b: string | null): number {
	if (a === b) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	return basketCompare(a, b);
}
