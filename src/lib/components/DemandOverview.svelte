<script lang="ts">
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
		byProgramme,
		cohortCount,
		hoursLabel,
		instancesByYear,
		moduleRows,
		partGroupLabel,
		type ModuleRow,
		type ReadInstanceLike
	} from '$lib/demand';
	import type { DutyStatus, ModuleKind, ModuleSource } from '$lib/gql/__generated__/graphql';

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
		programme = ''
	}: {
		instances: readonly ReadInstanceLike<ModuleShape>[];
		/** The chosen programme, or empty for the view across all of them. */
		programme?: string;
	} = $props();

	/** The module fields this table reads. Taken from the query, not written out twice. */
	type ModuleShape = ReadInstanceLike['module'] & {
		dutyStatus?: DutyStatus | null;
		source?: ModuleSource | null;
		kind?: ModuleKind | null;
	};

	const rows = $derived(moduleRows(instances));
	const groups = $derived(byProgramme(rows));
</script>

{#snippet table(list: ModuleRow<ModuleShape>[], code: string)}
	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
		<table class="table table-sm w-full min-w-[720px]">
			<thead>
				<tr>
					<th>Modul</th>
					<th class="w-16 text-right">Züge</th>
					<th>Teile</th>
					<th class="w-24 text-right">SWS</th>
				</tr>
			</thead>
			<tbody>
				{#each list as row (row.programme.code + row.module.id)}
					<tr>
						<td class="align-top">
							<a class="link font-medium" href={resolve('/module/[id]', { id: row.module.id })}>
								{moduleName(row.module)}
							</a>
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
						</td>
						<td class="align-top text-right">{row.cohorts.length}</td>
						<td class="text-base-content/90 align-top">
							<!--
								Eine Zeile je Zug, aber innerhalb der Modulzeile: was sich zwischen den
								Zügen unterscheidet, ist genau das hier — drei Praktikumsgruppen gegen
								zwei, und eine geteilte Vorlesung, die nur einer von beiden hält.

								Der Zug-Name steht nur davor, wenn es mehr als einen gibt: bei einem
								einzügigen Modul — dem Regelfall — wäre er eine Spalte Wiederholung.
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
											Die geliehenen Teile stehen mit da, und das müssen sie: ein Zug mit
											drei Praktika und ohne Vorlesung sieht nach einem Planungsfehler
											aus, wo er in Wirklichkeit der Fall ist, für den das Zug-Modell
											existiert. Gezählt werden sie nie — der Sinn einer Vorlesung für
											zwei Züge ist, dass sie die Fakultät einmal kostet.
										-->
										{#each cohort.borrowed as borrowed, i (i)}
											<span class="text-base-content/80">
												{PART_KIND_LABELS[borrowed.kind]} mit {borrowedFromLabel(
													code || row.programme.code,
													borrowed.fromTrack
												)} zusammen
											</span>
										{/each}
									</span>
								{/each}
							</span>
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
