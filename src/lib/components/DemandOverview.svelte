<script lang="ts">
	import { resolve } from '$app/paths';
	import { DUTY_LABELS, PART_KIND_LABELS, dutyBadge, moduleName } from '$lib/catalogue';
	import {
		borrowedFromLabel,
		byProgramme,
		hoursLabel,
		instanceRows,
		instancesByYear,
		moduleCount,
		partGroupLabel,
		type InstanceRow,
		type ReadInstanceLike
	} from '$lib/demand';
	import type { DutyStatus } from '$lib/gql/__generated__/graphql';

	/**
	 * What a semester offers, read-only — the half of this page everybody sees.
	 *
	 * A different table from the planning one, not the planning one greyed out. This answers
	 * "what is being offered"; the planning table answers "what is still missing", and most of
	 * its rows are catalogue modules nobody has ticked. Shown to a lecturer, that is a work list
	 * belonging to somebody else.
	 *
	 * One row per instance, because the instance is what gets planned and later assigned — so
	 * somebody looking for the cohort they want to teach finds a line that is exactly it.
	 *
	 * **Nothing here says anything about wishes**, and nothing here ever may: no count, no
	 * "somebody is interested" mark, no colouring by it. Before publication such a figure gives
	 * the confidential information away completely without naming anybody, and a table with one
	 * line per assignable cohort is exactly where it would occur to somebody to put one. See the
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
	};

	const rows = $derived(instanceRows(instances));
	const groups = $derived(byProgramme(rows));
</script>

{#snippet table(list: InstanceRow<ModuleShape>[], code: string)}
	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
		<table class="table table-sm w-full min-w-[720px]">
			<thead>
				<tr>
					<th>Instanz</th>
					<th>Modul</th>
					<th>Teile</th>
					<th class="text-right">SWS</th>
				</tr>
			</thead>
			<tbody>
				{#each list as row (row.instanceId)}
					<tr>
						<td class="font-medium whitespace-nowrap">{row.label}</td>
						<td>
							<a class="link" href={resolve('/module/[id]', { id: row.module.id })}>
								{moduleName(row.module)}
							</a>
							{#if row.module.dutyStatus}
								<span class="badge {dutyBadge(row.module.dutyStatus)} badge-sm ml-1">
									{DUTY_LABELS[row.module.dutyStatus]}
								</span>
							{/if}
						</td>
						<td class="text-base-content/90">
							<span class="flex flex-col gap-0.5">
								{#each row.parts as part, i (i)}
									<span>{partGroupLabel(part)}</span>
								{/each}
								<!--
									The borrowed parts are shown, and they have to be: a cohort with three
									laboratory groups and no lecture looks like a planning mistake, when what
									it actually is is the case the whole cohort model exists for. Never
									counted — the point of holding one lecture for two cohorts is that it
									costs the faculty once.
								-->
								{#each row.borrowed as borrowed, i (i)}
									<span class="text-base-content/80">
										{PART_KIND_LABELS[borrowed.kind]} mit {borrowedFromLabel(
											code || row.programme.code,
											borrowed.fromTrack
										)} zusammen
									</span>
								{/each}
							</span>
						</td>
						<td class="text-right whitespace-nowrap">{hoursLabel(row.teachingHours)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

{#snippet years(list: InstanceRow<ModuleShape>[], code: string)}
	{#each instancesByYear(list) as year (year.programmeSemester ?? 'offen')}
		<section class="flex flex-col gap-2">
			<h3 class="font-medium">
				{#if year.programmeSemester == null}
					Ohne Fachsemester
				{:else}
					{year.programmeSemester}. Fachsemester
				{/if}
				<span class="text-base-content/80 text-sm font-normal">
					({year.rows.length} Instanz(en), {moduleCount(year.rows)} Modul(e), {hoursLabel(
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
					({group.rows.length} Instanz(en), {moduleCount(group.rows)} Modul(e), {hoursLabel(
						group.teachingHours
					)})
				</span>
			</h2>
			{@render years(group.rows, group.code)}
		</section>
	{/each}
{/if}
