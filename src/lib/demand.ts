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
	id?: string;
	kind: InstancePartKind;
	teachingHours?: number | null;
	sharedAcrossTracks?: boolean;
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

/**
 * The table.
 *
 * One row per module, the way the faculty has always planned a semester: a tick, a number of
 * cohorts, a number of groups in each. Everything below turns the three lists the page loads —
 * the catalogue, this semester's instances, and the previous comparable semester's — into those
 * rows, and back into the entries `planDemand` takes.
 *
 * Svelte-free, because this is where a demand quietly becomes the wrong one: a cohort counted
 * from the wrong parts, a prefill that carries a module into a semester it does not run in.
 */

/** A module, as much of it as the table needs. */
export type ModuleLike = {
	id: string;
	name: string;
	zpaId?: string | null;
	practicalKind?: InstancePartKind | null;
	splitIsEstimated: boolean;
	plannable: boolean;
	components: readonly { kind: InstancePartKind; teachingHours: number }[];
	proposedComponents: readonly { kind: InstancePartKind; teachingHours: number }[];
	programmeSemester?: number | null;
};

/** An instance, as much of it as the table needs. */
export type InstanceLike = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	teachingHours: number;
	module: { id: string };
	parts: readonly PartLike[];
	borrowedParts?: readonly { fromTrack: string; part: PartLike }[];
};

/** One cohort in a row of the table. */
export type RowTrack = {
	track: string;
	/** How many parallel groups of the practical unit this cohort runs. */
	groups: number;
	/** The instance behind it, or undefined while it is only a proposal. */
	instanceId?: string;
	/**
	 * The kinds a sibling cohort holds for this one — a shared lecture, usually.
	 *
	 * Rendered so the cohort does not look like it is missing a lecture, and never counted: the
	 * point of holding one lecture for two cohorts is that it costs the faculty once.
	 */
	borrowedKinds: InstancePartKind[];
	/** This cohort's own lecture, where it has one — what a merge would share. */
	lecturePartId?: string;
	/** The part this cohort holds for everybody, where it holds one. */
	sharedPartId?: string;
};

/**
 * One row of the table.
 *
 * Generic in the module, so that a page keeps the fields it queried — the badges it renders are
 * not this module's business, and a row that narrowed them away would make every one of them a
 * type error on the screen rather than here.
 */
export type DemandRow<M extends ModuleLike = ModuleLike> = {
	module: M;
	/** The cohort year: what the instances say, else what the regulations say. */
	programmeSemester: number | null;
	tracks: RowTrack[];
	/** True while the row's cohorts are real instances rather than a proposal. */
	planned: boolean;
	/** Where the proposal came from, for the badge that says so. */
	proposedFrom?: string;
	/** What the planned cohorts cost the faculty. Zero for a row that is only proposed. */
	teachingHours: number;
};

/**
 * The split a row is planned with: what somebody stated, or the proposal.
 *
 * The same fall-back the backend makes when it builds the parts, so the hours on the screen are
 * the hours that get written.
 */
export function effectiveComponents(
	module: ModuleLike
): readonly { kind: InstancePartKind; teachingHours: number }[] {
	return module.components.length > 0 ? module.components : module.proposedComponents;
}

/**
 * How many parallel groups a cohort runs.
 *
 * Parts of the module's practical kind, and only the ones this cohort holds itself: a lecture
 * held for both cohorts is neither a group nor this cohort's.
 */
export function groupsOf(
	parts: readonly PartLike[],
	practicalKind?: InstancePartKind | null
): number {
	if (!practicalKind) return 0;
	return parts.filter((p) => p.kind === practicalKind && !p.sharedAcrossTracks).length;
}

/**
 * The rows of the table.
 *
 * A module with instances shows them. A module without shows what the same module had in the
 * previous comparable semester, as a proposal — that is the "take over last year" of the
 * spreadsheet, except that it arrives filled in rather than as a button, and nothing is written
 * until somebody saves.
 */
export function demandRows<M extends ModuleLike>(
	modules: readonly M[],
	instances: readonly InstanceLike[],
	previous: readonly InstanceLike[],
	previousCode?: string
): DemandRow<M>[] {
	const byModule = groupByModule(instances);
	const previousByModule = groupByModule(previous);

	return modules.map((module) => {
		const own = byModule.get(module.id) ?? [];
		if (own.length > 0) {
			return {
				module,
				programmeSemester: own[0].programmeSemester ?? module.programmeSemester ?? null,
				tracks: own.map((instance) => ({
					track: instance.track,
					groups: groupsOf(instance.parts, module.practicalKind),
					instanceId: instance.id,
					borrowedKinds: (instance.borrowedParts ?? []).map((b) => b.part.kind),
					lecturePartId: instance.parts.find((p) => p.kind === 'LECTURE')?.id,
					sharedPartId: instance.parts.find((p) => p.sharedAcrossTracks)?.id
				})),
				planned: true,
				teachingHours: own.reduce((sum, i) => sum + i.teachingHours, 0)
			};
		}

		const before = previousByModule.get(module.id) ?? [];
		return {
			module,
			programmeSemester: before[0]?.programmeSemester ?? module.programmeSemester ?? null,
			tracks: before.map((instance) => ({
				track: instance.track,
				groups: groupsOf(instance.parts, module.practicalKind),
				borrowedKinds: []
			})),
			planned: false,
			proposedFrom: before.length > 0 ? previousCode : undefined,
			teachingHours: 0
		};
	});
}

function groupByModule(instances: readonly InstanceLike[]): Map<string, InstanceLike[]> {
	const byModule = new Map<string, InstanceLike[]>();
	for (const instance of instances) {
		const list = byModule.get(instance.module.id);
		if (list) list.push(instance);
		else byModule.set(instance.module.id, [instance]);
	}
	for (const list of byModule.values()) {
		list.sort((a, b) => a.track.localeCompare(b.track));
	}
	return byModule;
}

/**
 * The cohort letters for a given number of cohorts.
 *
 * One cohort has no letter at all — that is the ordinary case and the one the label reads best
 * for. Two or more get A, B, C, because a cohort nobody can name is a cohort nobody can talk
 * about. The existing letters are kept where there are enough of them, so that raising the number
 * does not rename what is already there.
 */
export function trackLetters(count: number, existing: readonly string[] = []): string[] {
	if (count <= 0) return [];
	if (count === 1) return [existing.length === 1 ? existing[0] : ''];

	const letters: string[] = [];
	for (let i = 0; i < count; i++) {
		const kept = existing[i];
		if (kept && kept !== '' && !letters.includes(kept)) {
			letters.push(kept);
			continue;
		}
		// The first letter nobody has yet — not the one at this position. A cohort called C beside
		// a new one would otherwise both be C, which is two instances of one identity: the backend
		// refuses the whole save for it, and the sentence it refuses with explains nothing to the
		// person who only pressed "+".
		let next = 0;
		while (letters.includes(String.fromCharCode(65 + next))) next++;
		letters.push(String.fromCharCode(65 + next));
	}
	return letters;
}

/** The rows of one cohort year, in the order the page shows them. */
export type YearGroup<M extends ModuleLike = ModuleLike> = {
	programmeSemester: number | null;
	rows: DemandRow<M>[];
	/** What the planned cohorts of this year cost the faculty. */
	teachingHours: number;
};

/**
 * The table, grouped by cohort year.
 *
 * How a study programme lead reads it — "what does the third semester need" — and the axis the
 * capacity figures hang off. The rows nobody has filed under a year come last: they are the work
 * still to do, and a list that opened with them would read as a list of problems.
 */
export function byYear<M extends ModuleLike>(rows: readonly DemandRow<M>[]): YearGroup<M>[] {
	const groups = new Map<number | null, DemandRow<M>[]>();
	for (const row of rows) {
		const key = row.programmeSemester ?? null;
		const list = groups.get(key);
		if (list) list.push(row);
		else groups.set(key, [row]);
	}

	return [...groups.entries()]
		.map(([programmeSemester, group]) => ({
			programmeSemester,
			rows: group,
			teachingHours: group.reduce((sum, r) => sum + r.teachingHours, 0)
		}))
		.sort((a, b) => {
			if (a.programmeSemester == null) return 1;
			if (b.programmeSemester == null) return -1;
			return a.programmeSemester - b.programmeSemester;
		});
}

/** What this semester's demand looks like next to the one it was taken over from. */
export type Comparison = {
	added: number;
	removed: number;
	hoursBefore: number;
	hoursAfter: number;
};

/**
 * The comparison line: how this semester's demand differs from the previous comparable one.
 *
 * Modules rather than cohorts, because that is the sentence somebody says out loud — "three
 * subjects more than last year". The hours are the faculty's own figure, and the difference
 * between them is what the capacity calculation reacts to.
 */
export function compareWithPrevious(
	instances: readonly InstanceLike[],
	previous: readonly InstanceLike[]
): Comparison {
	const now = new Set(instances.map((i) => i.module.id));
	const before = new Set(previous.map((i) => i.module.id));

	let added = 0;
	for (const id of now) if (!before.has(id)) added++;
	let removed = 0;
	for (const id of before) if (!now.has(id)) removed++;

	return {
		added,
		removed,
		hoursBefore: previous.reduce((sum, i) => sum + i.teachingHours, 0),
		hoursAfter: instances.reduce((sum, i) => sum + i.teachingHours, 0)
	};
}

/**
 * The semester whose demand this one is taken over from: the same term, one year earlier.
 *
 * Not the semester immediately before. A module that runs only in the winter does not appear in
 * the summer before it — 89 of the real catalogue are winter-only — so prefilling a summer from
 * the winter that precedes it would propose a list of modules that cannot run. The faculty's own
 * spreadsheet plans a whole academic year at a time and is copied for the next one, which is the
 * same relation seen from the other side.
 */
export function previousComparableSemester(code: string): string {
	const match = /^(\d{4})-(SS|WS)$/.exec(code);
	if (!match) return '';
	return `${Number(match[1]) - 1}-${match[2]}`;
}

/**
 * The lecture a module could hold once for all its cohorts, or the one it already does.
 *
 * The shared lecture is the case the whole cohort model is arranged around: one person gives it
 * for IF3A and IF3B, it happens once, and its two hours count once. It is never the default —
 * every cohort holds its own until somebody says otherwise — so the control that says otherwise
 * has to be somewhere, and this is what it hangs off.
 *
 * Only meaningful from the second cohort: with one cohort there is nobody to share with, and the
 * backend answers NO_SIBLING_TRACKS.
 */
export function sharingState(row: DemandRow): { sharedPartId?: string; mergeablePartId?: string } {
	if (row.tracks.length < 2) return {};

	const shared = row.tracks.find((t) => t.sharedPartId);
	if (shared) return { sharedPartId: shared.sharedPartId };

	const withLecture = row.tracks.find((t) => t.lecturePartId);
	return { mergeablePartId: withLecture?.lecturePartId };
}

/**
 * The split as one line for a dense table: `Vorlesung 4 + Praktikum 2 SWS`.
 *
 * The unit is written once, at the end. Repeating it per part — "Vorlesung 4 SWS + Praktikum 2
 * SWS" — costs the column forty pixels twice over, and this table has six columns that all want
 * to be visible without scrolling.
 *
 * A part nobody has stated hours for shows a question mark rather than a zero: zero is a
 * statement, and "not settled yet" is a gap.
 */
export function splitSummary(
	components: readonly { kind: InstancePartKind; teachingHours?: number | null }[]
): string {
	if (components.length === 0) return '';

	// A part nobody has stated hours for gets the same question mark a missing cohort year does:
	// short enough for the column, and unmistakably a gap rather than a number.
	const parts = components.map((c) =>
		c.teachingHours == null
			? `${PART_KIND_LABELS[c.kind]} ?`
			: `${PART_KIND_LABELS[c.kind]} ${formatHours(c.teachingHours)}`
	);
	return `${parts.join(' + ')} SWS`;
}

/** One cohort, as much of it as the arithmetic below needs. */
export type TrackHours = {
	groups: number;
	borrowedKinds?: readonly InstancePartKind[];
};

/**
 * What a row costs the faculty, as it currently stands on the screen.
 *
 * The stored figure comes from the backend and covers what is stored; this is the same sum for a
 * row somebody is still editing — ticked but not saved, a group added a moment ago. Without it
 * the column can only say "—" for every row of a semester nobody has planned yet, which is every
 * row on the day this page is most used.
 *
 * Per cohort: every unit of the split once, except the practical one, which is multiplied by the
 * number of groups — and except what a sibling cohort holds for this one, which is counted at
 * the cohort that holds it and nowhere else.
 */
export function plannedHours(
	components: readonly { kind: InstancePartKind; teachingHours: number }[],
	practicalKind: InstancePartKind | null | undefined,
	tracks: readonly TrackHours[]
): number {
	let total = 0;
	for (const track of tracks) {
		for (const component of components) {
			if (track.borrowedKinds?.includes(component.kind)) continue;
			total +=
				component.kind === practicalKind
					? component.teachingHours * track.groups
					: component.teachingHours;
		}
	}
	return total;
}
