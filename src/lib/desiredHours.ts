/**
 * The desired teaching hours as a range, the three states the dean's office moves a semester
 * through, and the overview of the faculty.
 *
 * Svelte-free so that the parsing runs in the form action and the labels and the filter in the
 * page, from one copy that vitest checks. Nothing here decides who sees what: the backend has
 * filtered every figure before it arrives, and a figure the reader may not see comes as "not
 * stated" — the overview cannot tell the two apart and must not try.
 */

import { parseDesiredHours, desiredHoursLabel } from '$lib/wishes';

/** A range as stated: one end alone is a single figure, so min and max are always both set. */
export type DesiredRange = { min: number; max: number };

/**
 * What somebody typed into "von" and "bis". Both empty takes the figure back (null); one end alone
 * is a single figure; anything else is a sentence saying what is wrong.
 */
export function parseDesiredRange(
	minText: string,
	maxText: string
): DesiredRange | null | { error: string } {
	const min = parseDesiredHours(minText);
	const max = parseDesiredHours(maxText);
	if (min === 'invalid' || max === 'invalid') {
		return { error: 'Bitte Zahlen zwischen 0 und 40 eingeben, in halben Stunden.' };
	}
	if (min === null && max === null) return null;
	const low = min ?? max!;
	const high = max ?? min!;
	if (low > high) return { error: 'Das Minimum darf nicht über dem Maximum liegen.' };
	return { min: low, max: high };
}

/** A range the way the faculty writes it: "8", "6–10", "12,5–14". */
export function desiredRangeLabel(min: number, max: number): string {
	return min === max
		? desiredHoursLabel(max)
		: `${desiredHoursLabel(min)}–${desiredHoursLabel(max)}`;
}

/**
 * Where a semester's desired hours stand. Read from the two marks on the semester; the dean's
 * office sets them, and the database holds that published implies frozen.
 */
export type DesiredHoursStage = 'OPEN' | 'FROZEN' | 'PUBLISHED';

export function desiredHoursStage(semester: {
	desiredHoursFrozenAt?: string | null;
	desiredHoursPublishedAt?: string | null;
}): DesiredHoursStage {
	if (semester.desiredHoursPublishedAt) return 'PUBLISHED';
	if (semester.desiredHoursFrozenAt) return 'FROZEN';
	return 'OPEN';
}

/** The stage as a badge. */
export const STAGE_LABELS: Record<DesiredHoursStage, string> = {
	OPEN: 'offen',
	FROZEN: 'eingefroren',
	PUBLISHED: 'veröffentlicht'
};

/** One sentence per stage, for the person stating their own figure. */
export const STAGE_HINTS: Record<DesiredHoursStage, string> = {
	OPEN: 'Du kannst Deine Angabe ändern, bis das Dekanat sie zum Stichtag einfriert.',
	FROZEN: 'Eingefroren: Die Fakultätsleitung prüft die Angaben. Änderungen bitte über das Dekanat.',
	PUBLISHED:
		'Veröffentlicht: Alle sehen Deinen Bereich, Deine Notiz nicht. Änderungen nur über das Dekanat.'
};

/** What somebody already holds, as the backend sums it: in total and by subject group. */
export type AssignedLoad = {
	total: number;
	bySubjectGroup: readonly { subjectGroup?: { code: string } | null; hours: number }[];
};

/** "MATHE 4 · SWE 8 · ohne Fachgruppe 2" — whom to talk to, in the order the backend sends. */
export function loadBreakdown(load: AssignedLoad): string {
	return load.bySubjectGroup
		.map(
			(share) =>
				`${share.subjectGroup?.code ?? 'ohne Fachgruppe'} ${desiredHoursLabel(share.hours)}`
		)
		.join(' · ');
}

/** One colleague in the overview, as the page reads them. */
export type OverviewRow = {
	person: { id: string; name: string; sortName?: string | null };
	subjectGroups: readonly { id: string; code: string; name: string }[];
	stated: boolean;
	minHours?: number | null;
	maxHours?: number | null;
	assignedLoad?: AssignedLoad | null;
};

/** The overview's filter, as it travels in the address. */
export type OverviewFilter = { query: string; group: string };

export function parseOverviewFilter(params: URLSearchParams): OverviewFilter {
	return { query: (params.get('q') ?? '').trim(), group: params.get('fachgruppe') ?? '' };
}

/**
 * The rows matching a name and a subject group. The group filter is by membership — "who is in
 * MATHE" — and not by where somebody holds their load; that would be a second question.
 */
export function filterOverview<T extends OverviewRow>(
	rows: readonly T[],
	filter: OverviewFilter
): T[] {
	const needle = filter.query.toLocaleLowerCase('de-DE');
	return rows.filter(
		(row) =>
			(needle === '' ||
				row.person.name.toLocaleLowerCase('de-DE').includes(needle) ||
				(row.person.sortName ?? '').toLocaleLowerCase('de-DE').includes(needle)) &&
			(filter.group === '' || row.subjectGroups.some((g) => g.code === filter.group))
	);
}

/** The columns a click on a head sorts by. Unstated and unseen are both empty, and go last. */
export const OVERVIEW_SORT_KEYS = {
	name: (row: OverviewRow) => row.person.sortName || row.person.name,
	groups: (row: OverviewRow) => row.subjectGroups.map((g) => g.code).join(', ') || null,
	min: (row: OverviewRow) => (row.stated ? (row.minHours ?? null) : null),
	max: (row: OverviewRow) => (row.stated ? (row.maxHours ?? null) : null),
	assigned: (row: OverviewRow) => row.assignedLoad?.total ?? null
} as const;

export type OverviewSortKey = keyof typeof OVERVIEW_SORT_KEYS;
