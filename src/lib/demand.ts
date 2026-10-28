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
	/** The part this one was cut from, where it is a piece of one. A piece is not a group. */
	dividedFrom?: string | null;
	/** The other faculty that teaches this part (`FK 04`), or nothing where it is ours. */
	taughtBy?: string | null;
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
 *
 * `fromProgramme` is the cross-programme case: this cohort's demand is covered by another study
 * programme's event, and the part is held over there. It has to be named, because the first
 * argument is the *reading* cohort's programme code and rendering "PA…B" for a part held by PB
 * would be a confident lie.
 */
export function borrowedFromLabel(
	programmeCode: string,
	fromTrack: string,
	fromProgramme?: string | null
): string {
	if (fromProgramme) return fromTrack === '' ? fromProgramme : `${fromProgramme}…${fromTrack}`;
	if (fromTrack === '') return 'einem anderen Zug';
	return `${programmeCode}…${fromTrack}`;
}

/**
 * One side of a coverage link, as much of it as a label needs.
 *
 * The cohort year is carried even though nothing computes with it: without it the label falls back
 * to the "nobody has said" marker and reads "gemeinsam mit DE?A", which looks like a fault in the
 * badge rather than a fact about the other programme.
 */
export type CoverageLike = {
	acceptedAt?: string | null;
	instance: {
		id: string;
		track: string;
		programmeSemester?: number | null;
		programme: { code: string };
	};
};

function coverageCohort(coverage: CoverageLike): string {
	return cohortLabel(
		coverage.instance.programme.code,
		coverage.instance.programmeSemester,
		coverage.instance.track
	);
}

/** The badge on a cohort whose teaching another study programme holds. */
export function coverageLabel(coverage: CoverageLike): string {
	const who = coverageCohort(coverage);
	return coverage.acceptedAt ? `gemeinsam mit ${who}, dort gehalten` : `Anfrage an ${who} läuft`;
}

/** The badge on the cohort that holds the event for somebody else. */
export function coversLabel(coverage: CoverageLike): string {
	const who = coverageCohort(coverage);
	return coverage.acceptedAt ? `hält auch für ${who}` : `Anfrage von ${who}`;
}

/**
 * The badge on a cohort that holds one event for several study programmes.
 *
 * `coversLabel` says it for one link at a time, which is what the demand screens have. Where the
 * whole list belongs on one line — the wish table, which shows the event once — this says it once.
 */
export function heldForLabel(others: readonly SeparateLike[]): string {
	if (others.length === 0) return '';
	return `hält auch für ${separateCohorts(others)}`;
}

/** A cohort of another study programme that offers the same module and holds it itself. */
export type SeparateLike = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	programme: { code: string };
};

/**
 * The badge that says the same module is being offered twice.
 *
 * Neither the holder nor the cohorts held with this one — those have their own two labels. What is
 * left is the case this whole area exists to make avoidable and which nothing said out loud: two
 * programmes running the same event separately because neither knew about the other.
 *
 * Named as an offer rather than as a problem. It may be exactly right — different cohorts, different
 * rooms, different terms — and the screen is not in a position to know. What it can do is say it.
 */
export function alsoPlannedLabel(others: readonly SeparateLike[]): string {
	if (others.length === 0) return '';
	return `auch in ${separateCohorts(others)} geplant (getrennt)`;
}

/**
 * The same fact where there is no room for a sentence.
 *
 * The planning table's columns are narrow, and the long form wraps to five lines beside a stepper
 * — where the only part carrying anything is the list in the middle. So the list is what is shown,
 * and the sentence moves into the `title`.
 */
export function alsoPlannedShort(others: readonly SeparateLike[]): string {
	if (others.length === 0) return '';
	return `auch: ${separateCohorts(others)}`;
}

function separateCohorts(others: readonly SeparateLike[]): string {
	return others.map((o) => cohortLabel(o.programme.code, o.programmeSemester, o.track)).join(', ');
}

/**
 * Who else offers this module, for the row rather than for one of its cohorts.
 *
 * The backend answers per instance, because that is what it has. A row is one module in one
 * programme, and "somebody else also offers this" is true of the module — so the cohorts' answers
 * are one list, deduplicated. Rendering it per cohort said the same sentence twice for a module
 * with two of them.
 */
export function separatelyPlannedIn(row: DemandRow): SeparateLike[] {
	const seen = new Set<string>();
	const out: SeparateLike[] = [];
	for (const track of row.tracks) {
		for (const other of track.alsoPlannedSeparately ?? []) {
			if (seen.has(other.id)) continue;
			seen.add(other.id);
			out.push(other);
		}
	}
	return out;
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

/**
 * The little of a module the row builders below actually read.
 *
 * Separate from `ModuleLike` because `instanceRows` and `moduleRows` touch exactly these three
 * fields, while `ModuleLike` describes what the *demand* screens render. Constraining the row
 * builders to the larger shape made every caller query a module's split and plannability to get a
 * cohort label out — the wish table is the caller that made that visible. `ModuleLike` satisfies
 * this, so nothing else changes.
 */
export type RowModule = {
	id: string;
	name: string;
	programmeSemester?: number | null;
};

/** A module, as much of it as the demand table needs. */
export type ModuleLike = RowModule & {
	zpaId?: string | null;
	practicalKind?: InstancePartKind | null;
	splitIsEstimated: boolean;
	plannable: boolean;
	components: readonly { kind: InstancePartKind; teachingHours: number }[];
	proposedComponents: readonly { kind: InstancePartKind; teachingHours: number }[];
};

/**
 * An instance, as much of it as the table needs.
 *
 * Generic in the module, because two callers want different amounts of it: the comparison with
 * last year needs an id, and the table needs the whole catalogue entry — an instance may point
 * at a module the catalogue query does not return, and then the instance is the only place the
 * module comes from.
 */
export type InstanceLike<M extends { id: string } = { id: string }> = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	note?: string | null;
	teachingHours: number;
	module: M;
	parts: readonly PartLike[];
	borrowedParts?: readonly {
		fromTrack: string;
		fromProgramme?: { code: string } | null;
		part: PartLike;
	}[];
	coveredBy?: CoverageLike | null;
	covers?: readonly CoverageLike[];
	alsoPlannedSeparately?: readonly SeparateLike[];
	delivery?: DeliveryFormat;
	taughtInEnglish?: boolean;
	taughtInEnglishOverridden?: boolean;
	/** Which seminar this cohort is, for an umbrella module; `null` for nearly every cohort. */
	topic?: string | null;
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
	/**
	 * Another study programme's event that meets this cohort's demand, asked or agreed.
	 *
	 * Where it is agreed the cohort holds nothing of its own: it costs nothing, its group count
	 * is not its own to set, and the controls that would change either have to be shut off — or
	 * the first click sends a number the backend refuses.
	 */
	coveredBy?: CoverageLike | null;
	/** Other programmes' demands this cohort meets, asked or agreed. */
	covers?: readonly CoverageLike[];
	/** Other programmes offering the same module and holding it themselves. */
	alsoPlannedSeparately?: readonly SeparateLike[];
	/** How the cohort is taught, where the instance exists and the page asked. */
	format?: FormatLike;
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
	/**
	 * The planner's sentence beside the row — why four cohorts, why this semester.
	 *
	 * One per row, read off the first cohort: the table writes the same note to every cohort of
	 * a module, so they agree unless somebody wrote them apart through the API, and then the
	 * first is as good a choice as any. A proposal carries last year's note along with last
	 * year's cohorts, for the same reason a copy does — a reason that is a year out of date and
	 * visible beats one that went missing.
	 */
	note: string;
	tracks: RowTrack[];
	/** True while the row's cohorts are real instances rather than a proposal. */
	planned: boolean;
	/** Where the proposal came from, for the badge that says so. */
	proposedFrom?: string;
	/**
	 * True for a row the catalogue filter did not produce — it exists because an instance
	 * points at the module.
	 *
	 * A module of another programme, or one the term filter excludes. The row is shown anyway
	 * and marked, because `planDemand` only ever touches the modules it is told about: a row
	 * that is not on the screen cannot have its tick taken away, and an instance nobody can
	 * withdraw is worse than one nobody meant to declare.
	 */
	foreign?: boolean;
	/** What the planned cohorts cost the faculty. Zero for a row that is only proposed. */
	teachingHours: number;
};

/**
 * The split a row shows: what somebody stated, or the proposal waiting to be confirmed.
 *
 * Only for showing and for what „bestätigen“ sends. Planned is only with a confirmed split — the
 * backend refuses the proposal (since 2026-10-16), and `plannable` says so.
 */
export function effectiveComponents(
	module: ModuleLike
): readonly { kind: InstancePartKind; teachingHours: number }[] {
	return module.components.length > 0 ? module.components : module.proposedComponents;
}

/**
 * The other faculties that teach some of these parts, each once, in the order they appear.
 *
 * Empty for nearly every cohort. Where it is not, the cohort is shared with another faculty by
 * arrangement — half the lecture is theirs — and that is said wherever the cohort is shown,
 * because otherwise its hours look like teaching somebody here still has to give.
 */
export function facultiesElsewhere(parts: readonly PartLike[]): string[] {
	const out: string[] = [];
	for (const p of parts) {
		if (p.taughtBy && !out.includes(p.taughtBy)) out.push(p.taughtBy);
	}
	return out;
}

/**
 * Whether another faculty teaches every part of a cohort, so that nothing in it is ours.
 *
 * A cohort with no parts at all is not: a covered cohort's teaching is ours, held in another
 * programme, and a cohort whose split nobody has stated is unfinished, not elsewhere.
 */
export function taughtEntirelyElsewhere(parts: readonly PartLike[]): boolean {
	return parts.length > 0 && parts.every((p) => !!p.taughtBy);
}

/**
 * How many parallel groups a cohort runs.
 *
 * Parts of the module's practical kind, and only the ones this cohort holds itself: a lecture
 * held for both cohorts is neither a group nor this cohort's. A piece cut off a laboratory — half
 * of it given by another faculty — is not a second group either; the backend counts the same way,
 * and a stepper that disagreed would add a group on the next save.
 */
export function groupsOf(
	parts: readonly PartLike[],
	practicalKind?: InstancePartKind | null
): number {
	if (!practicalKind) return 0;
	return parts.filter((p) => p.kind === practicalKind && !p.sharedAcrossTracks && !p.dividedFrom)
		.length;
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
	instances: readonly InstanceLike<M>[],
	previous: readonly InstanceLike[],
	previousCode?: string
): DemandRow<M>[] {
	const byModule = groupByModule(instances);
	const previousByModule = groupByModule(previous);

	// The catalogue's modules, and then whatever is planned beyond them. The second half is not
	// a rarity to tidy up later: a module of another programme is a legitimate declaration —
	// borrowing across programmes is what the dean's office's import/export figures are about —
	// and the term filter alone is enough to hide a module somebody planned on purpose.
	const listed = new Set(modules.map((m) => m.id));
	const rows = modules.map((module) => rowFor(module, byModule, previousByModule, previousCode));

	for (const [id, own] of byModule) {
		if (listed.has(id)) continue;
		const row = rowFor(own[0].module, byModule, previousByModule, previousCode);
		row.foreign = true;
		rows.push(row);
	}
	return rows;
}

function rowFor<M extends ModuleLike>(
	module: M,
	byModule: Map<string, InstanceLike<M>[]>,
	previousByModule: Map<string, InstanceLike[]>,
	previousCode?: string
): DemandRow<M> {
	const own = byModule.get(module.id) ?? [];
	if (own.length > 0) {
		return {
			module,
			programmeSemester: own[0].programmeSemester ?? module.programmeSemester ?? null,
			note: own[0].note ?? '',
			tracks: own.map((instance) => ({
				track: instance.track,
				groups: groupsOf(instance.parts, module.practicalKind),
				instanceId: instance.id,
				borrowedKinds: (instance.borrowedParts ?? []).map((b) => b.part.kind),
				lecturePartId: instance.parts.find((p) => p.kind === 'LECTURE')?.id,
				sharedPartId: instance.parts.find((p) => p.sharedAcrossTracks)?.id,
				coveredBy: instance.coveredBy ?? null,
				covers: instance.covers ?? [],
				alsoPlannedSeparately: instance.alsoPlannedSeparately ?? [],
				format: formatOf(instance)
			})),
			planned: true,
			teachingHours: own.reduce((sum, i) => sum + i.teachingHours, 0)
		};
	}

	const before = previousByModule.get(module.id) ?? [];
	return {
		module,
		programmeSemester: before[0]?.programmeSemester ?? module.programmeSemester ?? null,
		note: before[0]?.note ?? '',
		tracks: before.map((instance) => ({
			track: instance.track,
			groups: groupsOf(instance.parts, module.practicalKind),
			borrowedKinds: []
		})),
		planned: false,
		proposedFrom: before.length > 0 ? previousCode : undefined,
		teachingHours: 0
	};
}

function formatOf(
	instance: Pick<
		InstanceLike,
		'id' | 'delivery' | 'taughtInEnglish' | 'taughtInEnglishOverridden' | 'topic'
	>
): FormatLike | undefined {
	if (instance.delivery === undefined) return undefined;
	return {
		id: instance.id,
		delivery: instance.delivery,
		taughtInEnglish: instance.taughtInEnglish ?? false,
		taughtInEnglishOverridden: instance.taughtInEnglishOverridden ?? false,
		topic: instance.topic ?? null
	};
}

function groupByModule<M extends { id: string }>(
	instances: readonly InstanceLike<M>[]
): Map<string, InstanceLike<M>[]> {
	const byModule = new Map<string, InstanceLike<M>[]>();
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
 * The most cohorts one module may have in a semester: one letter each, A to Z.
 *
 * Follows `MaxTracksPerModule` in the backend, which refuses more. Most modules run one or two;
 * an umbrella seminar runs one cohort per seminar actually offered, and that is what needs the
 * whole alphabet.
 */
export const MAX_TRACKS = 26;

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
	return groupByYear(rows);
}

/**
 * Group anything that has a cohort year and a number of hours, in the order both views show it.
 *
 * Shared by the two, and that is the point of it being generic: the planning table and the
 * overview are read side by side by the same person, and a year that came third in one and
 * second in the other would be read as two different years.
 */
function groupByYear<T extends { programmeSemester: number | null; teachingHours: number }>(
	rows: readonly T[]
): { programmeSemester: number | null; rows: T[]; teachingHours: number }[] {
	const groups = new Map<number | null, T[]>();
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

	// A cohort another programme holds has no lecture of its own to merge, and merging across
	// programmes is coverage rather than a shared lecture — a different mechanism with a
	// different mutation.
	if (row.tracks.some((t) => t.coveredBy?.acceptedAt)) return {};

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
	/** True where another study programme holds this cohort's teaching. */
	covered?: boolean;
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
		// A cohort whose demand another programme covers holds nothing at all: it costs nothing,
		// and the event it attends is counted once at the programme that holds it.
		//
		// Its own flag rather than trusting borrowedKinds to cover every unit of the split. The
		// borrowed list is what the holding cohort actually holds, and a split naming a unit that
		// cohort does not run — an exercise nobody made a part for — would otherwise be charged
		// here, to a cohort that holds no teaching whatsoever.
		if (track.covered) continue;

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

/** A module, as much of it as comparing stored parts with its split needs. */
export type SplitModuleLike = {
	splitIsEstimated: boolean;
	practicalKind?: InstancePartKind | null;
	components: readonly { kind: InstancePartKind; teachingHours: number }[];
};

/** A stored cohort, as much of it as `storedTrackHours` reads. */
export type StoredCohortLike = {
	parts: readonly PartLike[];
	borrowedParts?: readonly { part: Pick<PartLike, 'kind'> }[];
	coveredBy?: { acceptedAt?: string | null } | null;
};

/**
 * A stored cohort as the arithmetic of `plannedHours` reads it: its groups, what it borrows from
 * a sibling, and whether another programme holds it.
 */
export function storedTrackHours(
	cohort: StoredCohortLike,
	practicalKind: InstancePartKind | null | undefined
): TrackHours {
	return {
		groups: groupsOf(cohort.parts, practicalKind),
		borrowedKinds: (cohort.borrowedParts ?? []).map((b) => b.part.kind),
		covered: !!cohort.coveredBy?.acceptedAt
	};
}

/** Stored hours against what the module's split gives the same cohorts. */
export type SplitDrift = { stored: number; bySplit: number };

/**
 * Whether stored cohorts have drifted from their module's split, and by how much.
 *
 * An instance copies its parts' hours from the split when it is declared or a group is added,
 * and keeps them. Corrected afterwards, the split reaches no existing instance until somebody
 * carries it over — and until then the planning table, which multiplies the split by the groups,
 * and the overview, which adds up the stored parts, show two different figures for one cohort.
 * This is the comparison that tells them apart, so both screens can say so.
 *
 * `null` where nothing drifted, and where there is no confirmed split to compare with: an estimate
 * is not something anybody can carry over, and the backend refuses with MODULE_NOT_DECOMPOSED.
 * Hand-edited hours count as drift too — carrying the split over would overwrite them, which is
 * what the preview is there to show.
 */
export function splitDrift(
	module: SplitModuleLike,
	stored: number,
	tracks: readonly TrackHours[]
): SplitDrift | null {
	if (module.splitIsEstimated || module.components.length === 0 || tracks.length === 0) {
		return null;
	}
	const bySplit = plannedHours(module.components, module.practicalKind, tracks);
	// Hours are decimals (1.5 SWS), and a sum of them is not exact.
	if (Math.abs(bySplit - stored) < 1e-6) return null;
	return { stored, bySplit };
}

/**
 * The overview.
 *
 * The other half of this page, and a different table rather than the planning one with its
 * controls greyed out. It answers "what is being offered"; the planning table answers "what is
 * still missing". A read-only version of the planning table would answer neither: most of its
 * rows are catalogue modules nobody has ticked, which is a work list and not an offer.
 *
 * One row per **instance**, because the instance is what gets planned and later assigned — so a
 * lecturer looking for the cohort they want to teach finds a line that is exactly it.
 *
 * Nothing here says anything about wishes. Not a count, not a "somebody is interested" mark, not
 * a colour. Before publication such a figure gives the confidential information away completely
 * without naming anybody, and this table — one line per assignable cohort — is exactly where
 * somebody would think to add it. See the workspace CLAUDE.md, "Die drei tragenden Regeln".
 */

/** An instance as the overview reads it: the module and the programme come with it. */
export type ReadInstanceLike<M extends RowModule = ModuleLike> = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	note?: string | null;
	teachingHours: number;
	module: M;
	programme: { code: string; title?: string | null };
	parts: readonly PartLike[];
	borrowedParts?: readonly {
		fromTrack: string;
		fromProgramme?: { code: string } | null;
		part: PartLike;
	}[];
	coveredBy?: CoverageLike | null;
	covers?: readonly CoverageLike[];
	alsoPlannedSeparately?: readonly SeparateLike[];
	delivery?: DeliveryFormat;
	taughtInEnglish?: boolean;
	taughtInEnglishOverridden?: boolean;
	topic?: string | null;
};

/**
 * Several parts of one kind and one size, as one entry: the three laboratory groups of a cohort.
 *
 * Grouped rather than listed, because a cohort with four groups is four identical lines
 * otherwise, and the number of groups is the fact somebody is actually reading.
 */
export type PartGroup = {
	kind: InstancePartKind;
	teachingHours: number | null;
	count: number;
	/** Held once for all the cohorts of this module — counted at the cohort that owns it. */
	shared: boolean;
	/** The other faculty that teaches these parts. Absent where they are ours, which is nearly always. */
	taughtBy?: string;
	/**
	 * Pieces cut off a part. Kept apart from the parts themselves: folded together, "Vorlesung
	 * 2 SWS ×2" would read as two lectures where there is one lecture held divided.
	 */
	piece?: true;
};

/** One line of the overview. */
export type InstanceRow<M extends RowModule = ModuleLike> = {
	instanceId: string;
	module: M;
	programme: { code: string; title?: string | null };
	programmeSemester: number | null;
	/** The sentence beside the row, empty for none. */
	note: string;
	track: string;
	/** `IF3A`, assembled from the three facts it is made of. */
	label: string;
	parts: PartGroup[];
	/** What another cohort holds for this one, with who holds it. */
	borrowed: {
		fromTrack: string;
		fromProgramme?: string | null;
		kind: InstancePartKind;
	}[];
	teachingHours: number;
	/**
	 * The other study programme's event that meets this cohort's demand, or null.
	 *
	 * A covered line has no parts of its own and 0 SWS, and without this it reads as a cohort
	 * somebody forgot to finish. It is the whole reason the line can say what it is.
	 */
	coveredBy?: CoverageLike | null;
	/** Other programmes' demands this cohort meets. */
	covers?: readonly CoverageLike[];
	/** Other programmes offering the same module and holding it themselves. */
	alsoPlannedSeparately?: readonly SeparateLike[];
	/** How the cohort is taught, where the instance exists and the page asked. */
	format?: FormatLike;
	/** Which seminar the cohort is, for an umbrella module; see `withTopic`. */
	topic: string | null;
};

/**
 * Parts of the same kind and the same size, folded into one entry with a count.
 *
 * Order is preserved from the first part of each kind, which is the order the split states —
 * lecture first, then the practical unit. Sorting by kind here would put the laboratory before
 * the lecture in half the modules, and the split is what people know these by.
 */
export function groupParts(parts: readonly PartLike[]): PartGroup[] {
	const out: PartGroup[] = [];
	for (const part of parts) {
		const hours = part.teachingHours ?? null;
		const shared = part.sharedAcrossTracks ?? false;
		const taughtBy = part.taughtBy ?? null;
		const piece = !!part.dividedFrom;
		const same = out.find(
			(g) =>
				g.kind === part.kind &&
				g.teachingHours === hours &&
				g.shared === shared &&
				(g.taughtBy ?? null) === taughtBy &&
				!!g.piece === piece
		);
		if (same) same.count++;
		else
			out.push({
				kind: part.kind,
				teachingHours: hours,
				count: 1,
				shared,
				...(taughtBy ? { taughtBy } : {}),
				...(piece ? { piece: true as const } : {})
			});
	}
	return out;
}

/**
 * One grouped entry as a line: `Praktikum 2 SWS ×3`.
 *
 * The multiplier only where there is one. `×1` on every lecture would be noise on the majority
 * of lines, and the reader would stop seeing the `×3` that matters.
 */
export function partGroupLabel(group: PartGroup): string {
	const label = partLabel({ kind: group.kind, teachingHours: group.teachingHours });
	// `Vorlesung – Anteil 2 SWS`, the name the assignment screen gives the same piece.
	const base = group.piece
		? label.replace(PART_KIND_LABELS[group.kind], `${PART_KIND_LABELS[group.kind]} – Anteil`)
		: label;
	const counted = group.count > 1 ? `${base} ×${group.count}` : base;
	const shared = group.shared ? `${counted}, für alle Züge` : counted;
	return group.taughtBy ? `${shared}, hält ${group.taughtBy}` : shared;
}

/**
 * The overview's rows, in the order it shows them.
 *
 * Sorted by cohort year, then by module name, then by cohort letter — so the two cohorts of one
 * module stand together, which is what makes a shared lecture legible: the line that borrows it
 * sits directly under the line that holds it.
 */
export function instanceRows<M extends RowModule>(
	instances: readonly ReadInstanceLike<M>[]
): InstanceRow<M>[] {
	return instances
		.map((instance) => {
			const programmeSemester =
				instance.programmeSemester ?? instance.module.programmeSemester ?? null;
			return {
				instanceId: instance.id,
				module: instance.module,
				programme: instance.programme,
				programmeSemester,
				note: instance.note ?? '',
				track: instance.track,
				label: cohortLabel(instance.programme.code, programmeSemester, instance.track),
				parts: groupParts(instance.parts),
				borrowed: (instance.borrowedParts ?? []).map((b) => ({
					fromTrack: b.fromTrack,
					fromProgramme: b.fromProgramme?.code ?? null,
					kind: b.part.kind
				})),
				teachingHours: instance.teachingHours,
				coveredBy: instance.coveredBy ?? null,
				covers: instance.covers ?? [],
				alsoPlannedSeparately: instance.alsoPlannedSeparately ?? [],
				format: formatOf(instance),
				topic: instance.topic?.trim() || null
			};
		})
		.sort(
			(a, b) =>
				yearOrder(a.programmeSemester, b.programmeSemester) ||
				a.module.name.localeCompare(b.module.name, 'de') ||
				a.track.localeCompare(b.track)
		);
}

/** Rows with no cohort year last — they are the work still to do, not the start of the list. */
function yearOrder(a: number | null, b: number | null): number {
	if (a === b) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return a - b;
}

/**
 * One row of the overview: a module, with the cohorts it is offered in.
 *
 * Not one row per instance, and that is a correction rather than a preference. The planning
 * table shows a module once and counts its cohorts beside it; an overview that listed the same
 * module twice would look like two different offerings of it to the person reading both screens,
 * which is exactly what a cohort is not.
 *
 * The cohorts stay individually visible inside the row, because they are what differs: one may
 * run three laboratory groups and the other two, and one may borrow the lecture the other holds.
 */
export type ModuleRow<M extends RowModule = ModuleLike> = {
	module: M;
	programme: { code: string; title?: string | null };
	programmeSemester: number | null;
	/** The sentence beside the row: the first cohort's, which is every cohort's when the table wrote it. */
	note: string;
	cohorts: InstanceRow<M>[];
	/** What all the cohorts together cost the faculty. A shared lecture is counted once. */
	teachingHours: number;
	/**
	 * The seminar this row is, where it is one cohort of an umbrella module with a topic.
	 *
	 * Such a cohort is a row of its own rather than a column of the module's row: fourteen
	 * seminars of one module are fourteen different things to want, and as columns they would
	 * widen the whole table to fourteen cohorts for the sake of one row.
	 */
	topic?: string;
};

/**
 * The overview's rows: one per module and programme, with its cohorts inside.
 *
 * Keyed by the programme as well as the module, because the same module may be offered by two
 * programmes and those are two demands — the difference between them is what the dean's office's
 * import/export figures are about.
 */
export function moduleRows<M extends RowModule>(
	instances: readonly ReadInstanceLike<M>[]
): ModuleRow<M>[] {
	const rows = instanceRows(instances);

	const byModule = new Map<string, ModuleRow<M>>();
	for (const row of rows) {
		const key = row.topic
			? `${row.programme.code}\u0000${row.module.id}\u0000${row.instanceId}`
			: `${row.programme.code}\u0000${row.module.id}`;
		const existing = byModule.get(key);
		if (existing) {
			existing.cohorts.push(row);
			existing.teachingHours += row.teachingHours;
			continue;
		}
		byModule.set(key, {
			module: row.module,
			programme: row.programme,
			programmeSemester: row.programmeSemester,
			note: row.note,
			cohorts: [row],
			teachingHours: row.teachingHours,
			...(row.topic ? { topic: row.topic } : {})
		});
	}
	// instanceRows already sorted by year, module and cohort, and a Map keeps insertion order —
	// so the rows come out in that order and each row's cohorts are in theirs.
	return [...byModule.values()];
}

/**
 * A key for a row that is unique in a list of them: the programme and the module, and for a
 * seminar's own row its cohort as well — several seminars of one module are several rows.
 */
export function moduleRowKey(row: {
	programme: { code: string };
	module: { id: string };
	cohorts: readonly { instanceId: string }[];
	topic?: string;
}): string {
	const base = `${row.programme.code}\u0000${row.module.id}`;
	return row.topic ? `${base}\u0000${row.cohorts[0]?.instanceId ?? ''}` : base;
}

/** One cohort year of the overview. */
export type InstanceYearGroup<M extends RowModule = ModuleLike> = {
	programmeSemester: number | null;
	rows: ModuleRow<M>[];
	teachingHours: number;
};

/** The overview, grouped by cohort year — the same axis the planning table uses. */
export function instancesByYear<M extends RowModule>(
	rows: readonly ModuleRow<M>[]
): InstanceYearGroup<M>[] {
	return groupByYear(rows);
}

/** One study programme's part of the overview, when it shows more than one. */
export type ProgrammeGroup<M extends RowModule = ModuleLike> = {
	code: string;
	title: string;
	rows: ModuleRow<M>[];
	/**
	 * What this programme's instances cost the faculty.
	 *
	 * Summed over the rows, which is safe here in a way it is not on the planning table: a
	 * shared lecture is counted at the cohort that owns the row and contributes nothing at the
	 * cohort that borrows it, so adding up `teachingHours` never counts it twice.
	 */
	teachingHours: number;
};

/**
 * The overview by study programme, for the view that shows all of them.
 *
 * "What does the faculty offer next semester" is the question a lecturer asks before they know
 * which programme a module belongs to — so the overview does not insist on a programme, and
 * groups by one instead.
 */
export function byProgramme<M extends ModuleLike>(
	rows: readonly ModuleRow<M>[]
): ProgrammeGroup<M>[] {
	const groups = new Map<string, ModuleRow<M>[]>();
	for (const row of rows) {
		const list = groups.get(row.programme.code);
		if (list) list.push(row);
		else groups.set(row.programme.code, [row]);
	}

	return [...groups.entries()]
		.map(([code, group]) => ({
			code,
			title: group[0].programme.title || code,
			rows: group,
			teachingHours: group.reduce((sum, r) => sum + r.teachingHours, 0)
		}))
		.sort((a, b) => a.code.localeCompare(b.code));
}

/** How many cohorts a set of module rows holds — one instance each, and the figure to say. */
export function cohortCount<M extends ModuleLike>(rows: readonly ModuleRow<M>[]): number {
	return rows.reduce((sum, row) => sum + row.cohorts.length, 0);
}

/**
 * How a cohort is taught — across the semester or in a block, and whether in English.
 *
 * Set on the assignment screen and on the demand screen, both through one form field pair per
 * cohort. The backend owns both defaults: semesterbegleitend, and the language the examination
 * office's catalogue states for the module. A language equal to the catalogue's is stored as
 * "follows the catalogue", so the screen needs no reset button — choosing the catalogue's value
 * is the reset.
 */
export type DeliveryFormat = 'WEEKLY' | 'BLOCK';

export const DELIVERY_LABELS: Record<DeliveryFormat, string> = {
	WEEKLY: 'semesterbegleitend',
	BLOCK: 'Block'
};

/** A cohort, as much of it as the format controls need. */
export type FormatLike = {
	id: string;
	delivery: DeliveryFormat;
	taughtInEnglish: boolean;
	taughtInEnglishOverridden: boolean;
	/** Which seminar the cohort is; see `withTopic`. */
	topic?: string | null;
};

/** The longest topic the backend accepts: a heading, not a paragraph. */
export const MAX_TOPIC_LENGTH = 120;

/**
 * A cohort's label with the seminar it is: `WI3A · Design Thinking`.
 *
 * For the umbrella module the examination office holds once and the faculty runs many times a
 * semester, the letter alone says nothing — fourteen cohorts of one seminar module are fourteen
 * different seminars. Every other cohort has no topic and reads as before.
 */
export function withTopic(label: string, topic: string | null | undefined): string {
	const t = topic?.trim();
	return t ? `${label} · ${t}` : label;
}

/** What one cohort's topic field says, if it differs from what the page rendered. */
export type TopicChange = { instanceId: string; topic: string };

/**
 * The cohorts whose topic changed, read out of a submitted form.
 *
 * Same shape as `formatChanges`: each cohort renders `topic0:<id>` with the topic it was drawn
 * with beside the field `topic:<id>`, and only a cohort whose field differs is written — so a save
 * of the whole table does not restate a stale topic over a colleague's newer one. Compared
 * trimmed, because the backend trims: a trailing space is not a change. An emptied field is a
 * change to no topic, and travels as the empty string the backend reads that way.
 */
export function topicChanges(form: FormData): TopicChange[] {
	const out: TopicChange[] = [];
	for (const [key, original] of form) {
		if (!key.startsWith('topic0:')) continue;
		const id = key.slice('topic0:'.length);
		const field = form.get(`topic:${id}`);
		if (field === null) continue;
		const topic = String(field).trim();
		if (topic === String(original).trim()) continue;
		out.push({ instanceId: id, topic });
	}
	return out;
}

/**
 * The short marks a cohort carries where it is only read: nothing for the ordinary weekly German
 * cohort, so the marks stand out where they mean something.
 */
export function formatBadges(instance: Pick<FormatLike, 'delivery' | 'taughtInEnglish'>): string[] {
	const out: string[] = [];
	if (instance.delivery === 'BLOCK') out.push('Block');
	if (instance.taughtInEnglish) out.push('Englisch');
	return out;
}

/** What one cohort's controls say, if it differs from what the page rendered. */
export type FormatChange = {
	instanceId: string;
	delivery: DeliveryFormat;
	taughtInEnglish: boolean;
};

/**
 * The cohorts whose format controls changed, read out of a submitted form.
 *
 * Each cohort renders `fmt0:<id>` and `en0:<id>` with the values it was drawn with, beside the
 * controls `fmt:<id>` (a select) and `en:<id>` (a checkbox, absent when unticked). The originals
 * are what makes the checkbox readable at all — an unticked box sends nothing — and they keep a
 * save of the whole table from restating every cohort's format: only a cohort somebody touched is
 * written, so a colleague's change to another cohort is not overwritten with a stale page.
 */
export function formatChanges(form: FormData): FormatChange[] {
	const out: FormatChange[] = [];
	for (const [key, original] of form) {
		if (!key.startsWith('fmt0:')) continue;
		const id = key.slice('fmt0:'.length);
		const chosen = String(form.get(`fmt:${id}`) ?? original);
		if (chosen !== 'WEEKLY' && chosen !== 'BLOCK') continue;
		const english = form.get(`en:${id}`) === 'true';
		const wasEnglish = form.get(`en0:${id}`) === 'true';
		if (chosen === String(original) && english === wasEnglish) continue;
		out.push({ instanceId: id, delivery: chosen, taughtInEnglish: english });
	}
	return out;
}

/** Anything that knows the baskets its module sits in for the chosen programme. */
export type BasketLike = { module: { baskets?: readonly string[] | null } };

/** The basket order the faculty reads, and the one `controlling.ts#basketGroups` uses as well. */
function basketCompare(a: string, b: string): number {
	return a.localeCompare(b, 'de');
}

/**
 * The baskets to offer in the "Korb" selection: every basket a row sits in, once, in order.
 *
 * Read off the rows rather than asked of the backend, because the question is "which baskets does
 * this list have", and a basket nothing on the screen sits in would filter to an empty table.
 * Compulsory modules count too: their basket ("Pflichtmodule" and the like) is a real grouping of
 * the regulations, even though the line under the module name leaves it out.
 */
export function basketOptions(rows: readonly BasketLike[]): string[] {
	const seen = new Set<string>();
	for (const row of rows) for (const basket of row.module.baskets ?? []) seen.add(basket);
	return [...seen].sort(basketCompare);
}

/**
 * Whether a row belongs under the chosen basket; the empty choice means every basket.
 *
 * A module in two baskets matches both: somebody looking at one basket has to find every module
 * that can fill it.
 */
export function inBasket(row: BasketLike, basket: string): boolean {
	return basket === '' || (row.module.baskets ?? []).includes(basket);
}

/** The basket a row is sorted under: the first of its baskets in reading order. */
export function firstBasket(row: BasketLike): string | null {
	const baskets = [...(row.module.baskets ?? [])].sort(basketCompare);
	return baskets[0] ?? null;
}

/**
 * The rows ordered by basket, rows without one last.
 *
 * Stable, and comparing nothing but the basket: within a basket the rows keep the order the page
 * gave them (by name), and the year grouping that follows keeps its years and its totals, because
 * it only regroups what it is given. A module in two baskets is sorted once, under its first —
 * two copies of a row with input fields in it would be two places to change one thing.
 */
export function sortByBasket<T extends BasketLike>(rows: readonly T[]): T[] {
	return [...rows].sort((a, b) => {
		const x = firstBasket(a);
		const y = firstBasket(b);
		if (x === y) return 0;
		if (x === null) return 1;
		if (y === null) return -1;
		return basketCompare(x, y);
	});
}

/** The order the "Sortierung" switch offers. */
export type DemandOrder = 'name' | 'basket';

/** The basket filter and order, applied the same way in both views of the demand page. */
export function arrangeByBasket<T extends BasketLike>(
	rows: readonly T[],
	basket: string,
	order: DemandOrder
): T[] {
	const kept = rows.filter((row) => inBasket(row, basket));
	return order === 'basket' ? sortByBasket(kept) : kept;
}
