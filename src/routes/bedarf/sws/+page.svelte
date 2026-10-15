<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatHours } from '$lib/catalogue';
	import { controllingTable, deltaLabel, type ControllingRow } from '$lib/controlling';
	import { semesterName, semesterShortName } from '$lib/semester';

	let { data } = $props();

	const semesterTabs = $derived([...data.semesters].reverse());
	const table = $derived(data.load ? controllingTable(data.load, data.previous) : null);

	function programmeLabel(p: { code: string; title: string }): string {
		return p.title ? `${p.code} – ${p.title}` : p.code;
	}

	function lentLabel(row: ControllingRow): string {
		return row.lent.map((s) => `${s.code} ${formatHours(s.teachingHours)}`).join(' · ');
	}
</script>

<svelte:head>
	<title>SWS-Controlling · Tallox</title>
</svelte:head>

{#snippet rowCells(row: Omit<ControllingRow, 'programme' | 'lent'>, lent: string)}
	<td class="text-right tabular-nums">{formatHours(row.teachingHours)}</td>
	<td class="text-right tabular-nums">{formatHours(row.ownHours)}</td>
	<td class="tabular-nums">
		{formatHours(row.lentHours)}
		{#if lent}
			<span class="text-base-content/80 block text-xs">{lent}</span>
		{/if}
	</td>
	<td class="text-right tabular-nums">{row.instanceCount}</td>
	<td class="text-right tabular-nums">
		{row.fwpInstanceCount}
		{#if row.fwpInstanceCount > 0}
			<span class="text-base-content/80 block text-xs">{formatHours(row.fwpHours)} SWS</span>
		{/if}
	</td>
	<td class="text-right tabular-nums">
		{row.previousHours === null ? '–' : formatHours(row.previousHours)}
	</td>
	<td class="text-right tabular-nums">{deltaLabel(row.delta, formatHours)}</td>
{/snippet}

{#snippet header(first: string)}
	<thead>
		<tr>
			<th>{first}</th>
			<th class="text-right">SWS gesamt</th>
			<th class="text-right">davon eigen</th>
			<th>für andere Studiengänge</th>
			<th class="text-right">Instanzen</th>
			<th class="text-right">davon FWP</th>
			<th class="text-right">
				Vorjahr{#if data.previousCode}<span class="block text-xs font-normal"
						>{semesterShortName(data.previousCode)}</span
					>{/if}
			</th>
			<th class="text-right">Δ</th>
		</tr>
	</thead>
{/snippet}

{#snippet programmeRow(row: ControllingRow)}
	<tr>
		<th scope="row" class="font-medium">
			{programmeLabel(row.programme)}
			{#if row.programme.planningStatus !== 'PLANNED'}
				<span class="badge badge-ghost badge-sm ml-1">nicht von uns geplant</span>
			{/if}
			{#if row.partsWithoutHours > 0}
				<span
					class="badge badge-warning badge-sm ml-1"
					title="Teile ohne SWS-Angabe zählen 0 — die Summe ist zu niedrig"
				>
					{row.partsWithoutHours}
					{row.partsWithoutHours === 1 ? 'Teil' : 'Teile'} ohne SWS
				</span>
			{/if}
		</th>
		{@render rowCells(row, lentLabel(row))}
	</tr>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="max-w-3xl">
		<h1 class="text-2xl font-semibold">SWS-Controlling</h1>
		<p class="text-base-content/80 mt-1 text-sm">
			Was der <a class="link" href={resolve('/bedarf')}>Bedarf</a> eines Semesters an Lehre kostet,
			je <strong>Heimatstudiengang</strong>: die SWS eines Moduls zählen bei dem Studiengang, dem es
			gehört, egal für wen es gelehrt wird. Daran lässt sich ablesen, wie viele FWP sich ein
			Studiengang leisten kann.
		</p>
		<p class="text-base-content/80 mt-2 text-sm">
			Gezählt wird Lehre, nicht die Modul-SWS: eine Vorlesung und jede Praktikumsgruppe einzeln,
			eine für mehrere Züge gemeinsame Vorlesung einmal, ein von einem anderen Studiengang
			mitbetreuter Zug gar nicht. „Für andere Studiengänge“ ist der Teil, der in deren Instanzen
			gelehrt wird. Zum Vergleich steht dasselbe Semester ein Jahr zuvor daneben.
		</p>
	</div>

	<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<form method="GET" class="flex flex-col gap-1">
			<span class="label-text text-sm">Semester</span>
			<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-nowrap overflow-x-auto">
				{#each semesterTabs as semester (semester.code)}
					{@const active = semester.code === data.selected}
					<button
						type="submit"
						name="semester"
						value={semester.code}
						role="tab"
						aria-selected={active}
						class="tab whitespace-nowrap {active ? 'tab-active' : ''}"
					>
						{semesterShortName(semester.code)}
						{#if semester.isPlanningSemester}
							<span class="badge badge-primary badge-xs ml-1">Planung</span>
						{/if}
					</button>
				{/each}
			</div>
		</form>
	</div>

	{#if !table}
		<p class="text-base-content/80 text-sm">
			Es ist noch kein Planungssemester gesetzt. Bitte oben ein Semester wählen.
		</p>
	{:else}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="font-medium">{semesterName(data.selected)}</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="table-sm table">
					{@render header('Studiengang')}
					<tbody>
						{#each table.planned as row (row.programme.code)}
							{@render programmeRow(row)}
						{/each}
						{#each table.others as row (row.programme.code)}
							{@render programmeRow(row)}
						{/each}
					</tbody>
					<!-- daisyUI damps tfoot to /60, below 4.5:1 on the light themes; the total is the figure read most. -->
					<tfoot class="text-base-content">
						<tr>
							<th scope="row">Fakultät gesamt</th>
							{@render rowCells(table.total, '')}
						</tr>
					</tfoot>
				</table>
			</div>
			{#if table.others.length > 0}
				<p class="text-base-content/80 mt-3 text-sm">
					„Nicht von uns geplant“ sind Studiengänge, die die Fakultät nicht selbst plant, deren
					Module hier aber gelehrt werden. Sie zählen in der Summe mit.
				</p>
			{/if}
		</section>
	{/if}
</div>
