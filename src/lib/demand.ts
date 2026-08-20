/**
 * The demand, in the language the faculty speaks it.
 *
 * The same translation `$lib/catalogue.ts` and `$lib/semester.ts` do. Svelte-free on purpose, so
 * vitest can check the parts that are easy to get wrong — and the cohort label is the one that
 * gets read the most often and acted on: somebody looks for IF3A and either finds it or believes
 * their module is not planned.
 */

import { PART_KIND_LABELS, formatHours } from '$lib/catalogue';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';

/** A part of an instance, as much of it as the display needs. */
export type PartLike = {
	kind: InstancePartKind;
	teachingHours?: number | null;
	sharedAcrossTracks?: boolean;
};

/** An instance, as much of it as the display logic needs. */
export type InstanceLike = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	module: { id: string };
};

/**
 * The label the faculty reads: `IF3A` — the programme's code, the cohort year, the cohort.
 *
 * Assembled here and never stored. It is three facts about two rows, and a stored copy would go
 * stale on whichever of them somebody corrected — which is exactly the correction one makes
 * after realising a cohort was filed under the wrong year.
 *
 * A missing cohort year shows as `?` rather than being left out. `IF3A` and `IFA` differ by one
 * character and mean quite different things, and the second would be read as a label rather than
 * as a gap — so the gap is spelled, and the person who can close it is looking right at it.
 */
export function cohortLabel(
	programmeCode: string,
	programmeSemester: number | null | undefined,
	track: string
): string {
	const year = programmeSemester == null ? '?' : String(programmeSemester);
	return `${programmeCode}${year}${track}`;
}

/**
 * One part, as a line: `Vorlesung 2 SWS`.
 *
 * A part whose hours nobody has stated says so instead of showing a zero. Zero is a statement —
 * this credits nobody with anything — and "not settled yet" is the ordinary state of an instance
 * declared before the detail was.
 */
export function partLabel(part: PartLike): string {
	const kind = PART_KIND_LABELS[part.kind];
	if (part.teachingHours == null) return `${kind} (SWS offen)`;
	return `${kind} ${formatHours(part.teachingHours)} SWS`;
}

/**
 * What an instance costs the faculty, as a sentence.
 *
 * The number comes from the backend rather than being summed here, because it is a rule: a
 * shared lecture counts once, at the cohort that holds it, and a sum built in the browser from
 * the parts on screen would count it in both.
 */
export function hoursLabel(teachingHours: number): string {
	return `${formatHours(teachingHours)} SWS`;
}

/**
 * Whether this instance has a sibling cohort — another cohort of the same module in the same
 * programme and semester.
 *
 * What the "hold this once for both cohorts" control hangs off. Cosmetic, like every other
 * role-based hiding here: the backend refuses with `NO_SIBLING_TRACKS` either way. It is worth
 * doing because a button that always refuses teaches people to ignore refusals.
 */
export function hasSibling(instance: InstanceLike, all: readonly InstanceLike[]): boolean {
	return all.some((other) => other.id !== instance.id && other.module.id === instance.module.id);
}

/**
 * The next free cohort letter for a module: A, B, C…
 *
 * Only a proposal for the form. The backend owns the identity and refuses a collision with
 * `TRACK_TAKEN`; what this saves is the click that finds that out.
 *
 * A module that runs once has no letter at all, so the first duplication proposes B and offers
 * A for the original — which is what turns IF1 into IF1A and IF1B in one act.
 */
export function nextTrack(instance: InstanceLike, all: readonly InstanceLike[]): string {
	const taken = new Set(
		all.filter((other) => other.module.id === instance.module.id).map((other) => other.track)
	);
	for (const letter of 'BCDEFGH') {
		if (!taken.has(letter)) return letter;
	}
	return '';
}

/** A group of instances that share a cohort year, for the headings of the page. */
export type CohortYearGroup = {
	/** The cohort year, or null for the instances nobody has given one. */
	programmeSemester: number | null;
	instances: InstanceLike[];
};

/**
 * The demand, grouped by cohort year.
 *
 * That is how a study programme lead reads it — "what does the third semester need" — and it is
 * the order the backend already returns. Grouping here rather than in the query keeps the API
 * answering about instances rather than about a screen's layout.
 *
 * The instances with no cohort year come last rather than first: they are the ones still to be
 * finished, and a list that opened with them would look like a list of problems.
 */
export function byCohortYear<T extends InstanceLike>(
	instances: readonly T[]
): { programmeSemester: number | null; instances: T[] }[] {
	const groups = new Map<number | null, T[]>();
	for (const instance of instances) {
		const key = instance.programmeSemester ?? null;
		const existing = groups.get(key);
		if (existing) existing.push(instance);
		else groups.set(key, [instance]);
	}

	return [...groups.entries()]
		.map(([programmeSemester, group]) => ({ programmeSemester, instances: group }))
		.sort((a, b) => {
			if (a.programmeSemester == null) return 1;
			if (b.programmeSemester == null) return -1;
			return a.programmeSemester - b.programmeSemester;
		});
}

/**
 * The sentence under a borrowed part: who holds it.
 *
 * Named after the cohort rather than after the instance, because that is what the reader is
 * looking at. A sibling with no letter yet is described as "einem anderen Zug" — it happens
 * while somebody is halfway through splitting one cohort into two, and inventing a letter for
 * it would be worse than saying less.
 */
export function borrowedFromLabel(programmeCode: string, fromTrack: string): string {
	if (fromTrack === '') return 'einem anderen Zug';
	return `${programmeCode}…${fromTrack}`;
}
