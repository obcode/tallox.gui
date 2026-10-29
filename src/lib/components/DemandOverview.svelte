<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { resolve } from '$app/paths';
	import {
		DUTY_LABELS,
		MODULE_KIND_LABELS,
		PART_KIND_LABELS,
		dutyBadge,
		moduleName
	} from '$lib/catalogue';
	import {
		borrowedFromLabel,
		alsoPlannedLabel,
		arrangeByBasket,
		coverageLabel,
		coversLabel,
		formatBadges,
		byProgramme,
		cohortCount,
		hoursLabel,
		instancesByYear,
		moduleRowKey,
		moduleRows,
		partGroupLabel,
		splitDrift,
		splitSummary,
		storedTrackHours,
		type DemandOrder,
		type ModuleRow,
		type ReadInstanceLike
	} from '$lib/demand';
	import type { DutyStatus, ModuleKind, ModuleSource } from '$lib/gql/__generated__/graphql';
	import NoteIcon from './NoteIcon.svelte';

	/**
	 * What a semester offers, read-only — the half of this page everybody sees.
	 *
	 * A different table from the planning one, not the planning one greyed out. This answers
	 * "what is being offered"; the planning table answers "what is still missing", and most of
	 * its rows are catalogue modules nobody has ticked. Shown to a lecturer, that is a work list
	 * belonging to somebody else.
	 *
	 * **One row per module**, like the planning table, with its cohorts inside it. A module that
	 * runs in two cohorts is one subject being offered twice, not two subjects — and somebody
	 * reading both screens has to find the same list on each.
	 *
	 * **Nothing here says anything about wishes**, and nothing here ever may: no count, no
	 * "somebody is interested" mark, no colouring by it. Before publication such a figure gives
	 * the confidential information away completely without naming anybody, and a table with one
	 * line per assignable cohort is exactly where somebody would think to add one. See the
	 * workspace CLAUDE.md, "Die drei tragenden Regeln".
	 */
	let {
		instances,
		programme = '',
		basket = '',
		order = 'name'
	}: {
		instances: readonly ReadInstanceLike<ModuleShape>[];
		/** The chosen programme, or empty for the view across all of them. */
		programme?: string;
		/** The chosen basket, or empty for all; only meaningful with a programme. */
		basket?: string;
		order?: DemandOrder;
	} = $props();

	/** The module fields this table reads. Taken from the query, not written out twice. */
	type ModuleShape = ReadInstanceLike['module'] & {
		dutyStatus?: DutyStatus | null;
		baskets?: readonly string[] | null;
		source?: ModuleSource | null;
		kind?: ModuleKind | null;
	};

	// The basket filter and order apply with a programme only, as the page offers them.
	const rows = $derived(
		programme === '' ? moduleRows(instances) : arrangeByBasket(moduleRows(instances), basket, order)
	);

	const byId = $derived(new Map(instances.map((i) => [i.id, i] as const)));

	/**
	 * Whether a row's stored parts have drifted from its module's split.
	 *
	 * This table adds up the stored parts and the planning table multiplies the split by the
	 * groups. Once a split is corrected and not carried over the two differ, and without a word
	 * here the reader has two figures for one cohort and no way to tell which one is wrong.
	 */
	function driftOf(row: ModuleRow<ModuleShape>) {
		const cohorts = row.cohorts.flatMap((c) => {
			const instance = byId.get(c.instanceId);
			return instance ? [instance] : [];
		});
		if (cohorts.length !== row.cohorts.length) return null;
		return splitDrift(
			row.module,
			row.teachingHours,
			cohorts.map((c) => storedTrackHours(c, row.module.practicalKind))
		);
	}
	const groups = $derived(byProgramme(rows));
</script>

{#snippet table(list: ModuleRow<ModuleShape>[], code: string)}
	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
		<!--
			`table-fixed` with fixed column shares, as in the planning table: otherwise the browser
			sizes every cohort-year block by its content, and the module name takes half the width in
			one block and a third in the next — four tables one below the other, no two with the same
			column in the same place.
		-->
		<table class="table table-fixed table-sm w-full min-w-[720px] table-stack" use:stackedTable>
			<colgroup>
				<col style="width: 38%" />
				<col style="width: 8%" />
				<col style="width: 42%" />
				<col style="width: 12%" />
			</colgroup>
			<thead>
				<tr>
					<th>Modul</th>
					<th class="text-right">Züge</th>
					<th>Teile</th>
					<th class="text-right">SWS</th>
				</tr>
			</thead>
			<tbody>
				{#each list as row (moduleRowKey(row))}
					{@const drift = driftOf(row)}
					<tr>
						<td class="align-top">
							<a class="link font-medium" href={resolve('/module/[id]', { id: row.module.id })}>
								{moduleName(row.module)}
							</a>
							<!-- One seminar of an umbrella module, a row of its own. -->
							{#if row.topic}
								<span class="block font-medium">{row.topic}</span>
							{/if}
							<span class="flex flex-wrap items-center gap-1">
								{#if row.module.dutyStatus}
									<span class="badge {dutyBadge(row.module.dutyStatus)} badge-sm">
										{DUTY_LABELS[row.module.dutyStatus]}
									</span>
								{/if}
								{#if row.module.kind === 'FWP_PLACEHOLDER'}
									<span class="badge badge-accent badge-sm">
										{MODULE_KIND_LABELS.FWP_PLACEHOLDER}
									</span>
								{:else if row.module.source === 'LOCAL'}
									<span class="badge badge-ghost badge-sm">eigene Lehrveranstaltung</span>
								{/if}
							</span>
							<!--
								The planning note, for the reader who would otherwise take four tracks of one module
								for a mistake. It sits with the row, not with the track, because that is where it
								was written.
							-->
							{#if row.note !== ''}
								<!--
									Set as a comment, not as a second line of running text: speech bubble, italic,
									muted, against a fine edge like a quotation. Whoever skims the table should see
									that somebody has said something *about* it here — and not read a field of the
									module that they do not know.
								-->
								<p
									class="text-base-content/80 border-base-300 mt-1 flex items-start gap-1 border-l-2 pl-2 text-sm italic"
								>
									<NoteIcon class="mt-0.5 size-4 shrink-0" />
									<span class="sr-only">Notiz:</span>
									<span>{row.note}</span>
								</p>
							{/if}
						</td>
						<td class="align-top text-right">{row.cohorts.length}</td>
						<td class="text-base-content/90 align-top">
							<!--
								One line per track, but inside the module row: what differs between the tracks is
								exactly this — three lab groups against two, and a shared lecture that only one of
								the two holds.

								The track name only goes in front when there is more than one: for a single-track
								module — the usual case — it would be a column of repetition.
							-->
							<span class="flex flex-col gap-0.5">
								{#each row.cohorts as cohort (cohort.instanceId)}
									<span class="flex flex-wrap items-baseline gap-1">
										{#if row.cohorts.length > 1}
											<span class="badge badge-neutral badge-sm">{cohort.label}</span>
										{/if}
										{#each cohort.parts as part, i (i)}
											<span>{partGroupLabel(part)}{i < cohort.parts.length - 1 ? ' ·' : ''}</span>
										{/each}
										<!--
											The borrowed parts are listed too, and they have to be: a track with
											three labs and no lecture looks like a planning error, where in reality
											it is the very case the track model exists for. They are never counted —
											the point of a lecture for two tracks is that it costs the faculty
											once.
										-->
										{#each cohort.borrowed as borrowed, i (i)}
											<span class="text-base-content/80">
												{PART_KIND_LABELS[borrowed.kind]} mit {borrowedFromLabel(
													code || row.programme.code,
													borrowed.fromTrack,
													borrowed.fromProgramme
												)} zusammen
											</span>
										{/each}
										<!--
											The cross-programme case, and the reason it needs a label of its own
											at all: a covered row has no parts of its own and 0 SWS. Without this
											sentence it reads as a track somebody forgot to create — and that is
											exactly the state the whole mechanism is meant to avoid.
										-->
										<!-- Only what departs from the usual case: a block, an English-taught
										     course. Semester-long and in German is stated nowhere. -->
										{#each cohort.format ? formatBadges(cohort.format) : [] as mark (mark)}
											<span class="badge badge-info badge-sm">{mark}</span>
										{/each}
										{#if cohort.coveredBy}
											<span class="badge badge-outline badge-sm">
												{coverageLabel(cohort.coveredBy)}
											</span>
										{/if}
										{#each cohort.covers ?? [] as covered, i (i)}
											<span class="badge badge-outline badge-sm">{coversLabel(covered)}</span>
										{/each}
										<!--
											And the case that previously had no display at all: the same module,
											planned twice because neither knew about the other. Phrased as an offer
											and not as an error — it may be exactly right, and this screen cannot
											know that. What it can do is say it.
										-->
										{#if (cohort.alsoPlannedSeparately ?? []).length > 0}
											<span class="badge badge-ghost badge-sm">
												{alsoPlannedLabel(cohort.alsoPlannedSeparately ?? [])}
											</span>
										{/if}
									</span>
								{/each}
							</span>
							<!-- Under the cohorts, because the parts are what the sentence is about. -->
							{#if drift}
								<p class="text-base-content/80 mt-1 flex flex-wrap items-baseline gap-1 text-xs">
									<span class="badge badge-warning badge-sm">nicht übertragen</span>
									<span>
										Die gespeicherten Teile ergeben {hoursLabel(drift.stored)}, die aktuelle
										Aufteilung ({splitSummary(row.module.components)}) {hoursLabel(drift.bySplit)}.
									</span>
									<span>
										Übertragen lässt sie sich auf der
										<a
											class="link"
											href="{resolve('/module/[id]', { id: row.module.id })}#split-instances"
											>Modulseite</a
										>.
									</span>
								</p>
							{/if}
						</td>
						<td class="align-top text-right whitespace-nowrap">{hoursLabel(row.teachingHours)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

{#snippet years(list: ModuleRow<ModuleShape>[], code: string)}
	{#each instancesByYear(list) as year (year.programmeSemester ?? 'offen')}
		<section class="flex flex-col gap-2">
			<h3 class="font-medium">
				{#if year.programmeSemester == null}
					Ohne Fachsemester
				{:else}
					{year.programmeSemester}. Fachsemester
				{/if}
				<span class="text-base-content/80 text-sm font-normal">
					({year.rows.length} Modul(e), {cohortCount(year.rows)} Instanz(en), {hoursLabel(
						year.teachingHours
					)})
				</span>
			</h3>
			{@render table(year.rows, code)}
		</section>
	{/each}
{/snippet}

{#if rows.length === 0}
	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<p class="text-base-content/80 text-sm">Für diese Auswahl ist noch kein Bedarf angemeldet.</p>
	</div>
{:else if programme !== ''}
	{@render years(rows, programme)}
{:else}
	<!--
		Across all programmes, grouped by one. "Was bietet die Fakultät an" is asked before
		anybody knows which programme a module belongs to, so the overview does not insist on a
		programme — but a flat list of nineteen programmes' instances is not readable either.
	-->
	{#each groups as group (group.code)}
		<section class="flex flex-col gap-3">
			<h2 class="text-lg font-medium">
				{group.title}
				<span class="text-base-content/80 text-sm font-normal">
					({group.rows.length} Modul(e), {cohortCount(group.rows)} Instanz(en), {hoursLabel(
						group.teachingHours
					)})
				</span>
			</h2>
			{@render years(group.rows, group.code)}
		</section>
	{/each}
{/if}
