<script lang="ts">
	import { resolve } from '$app/paths';
	import { DUTY_LABELS, dutyBadge, formatHours, moduleName } from '$lib/catalogue';
	import {
		balanceBadge,
		controllingTable,
		deltaLabel,
		importGroups,
		quotaTable,
		type ControllingRow
	} from '$lib/controlling';
	import type { DutyStatus } from '$lib/gql/__generated__/graphql';
	import { cohortLabel } from '$lib/demand';
	import { semesterName, semesterShortName } from '$lib/semester';

	let { data } = $props();

	const semesterTabs = $derived([...data.semesters].reverse());
	const table = $derived(data.load ? controllingTable(data.load, data.previous) : null);
	const quotas = $derived(data.load ? quotaTable(data.load) : []);
	const imports = $derived(data.imports ? importGroups(data.imports) : null);
	// The programme asked about may be one the faculty does not plan — it receives modules all the
	// same — so the choice offers it too rather than showing "please choose" over its table.
	const importChoices = $derived(
		data.importsFor === '' || data.programmes.some((p) => p.code === data.importsFor)
			? data.programmes
			: [...data.programmes, { code: data.importsFor, title: '' }]
	);
	const importsHeading = $derived.by(() => {
		if (data.importsFor === '') return 'Module mit fremder Heimat';
		const title = data.programmes.find((p) => p.code === data.importsFor)?.title;
		return `Module mit fremder Heimat für ${title ? `${data.importsFor} – ${title}` : data.importsFor}`;
	});

	function maybeHours(n: number | null): string {
		return n === null ? '–' : formatHours(n);
	}

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

	{#if table}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="quota">
			<h2 id="quota" class="font-medium">Kontingent · {semesterName(data.selected)}</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Das Kontingent ist die verfügbare Lehrleistung eines Studiengangs für das
				<strong>Studienjahr</strong> (Winter und folgender Sommer), wie das Dekanat es aus der Kapazitätsrechnung
				einträgt. Ein Semester darf die Hälfte davon verbrauchen. Ein negativer Saldo heißt: der Studiengang
				lebt über seinen Verhältnissen. Ein positiver: Raum für weitere Wahlfächer oder für einen anderen
				Studiengang.
			</p>
			<div class="mt-3 overflow-x-auto">
				<table class="table-sm table">
					<thead>
						<tr>
							<th>Studiengang</th>
							<th class="text-right">Kontingent Studienjahr</th>
							<th class="text-right">davon dieses Semester</th>
							<th class="text-right">geplant (SWS gesamt)</th>
							<th class="text-right">Saldo</th>
						</tr>
					</thead>
					<tbody>
						{#each quotas as row (row.programme.code)}
							<tr>
								<th scope="row" class="font-medium">{programmeLabel(row.programme)}</th>
								<td class="text-right tabular-nums">{maybeHours(row.yearlyQuota)}</td>
								<td class="text-right tabular-nums">{maybeHours(row.semesterQuota)}</td>
								<td class="text-right tabular-nums">{formatHours(row.teachingHours)}</td>
								<td class="text-right tabular-nums">
									{#if row.balance === null}
										<span class="text-base-content/80 text-xs">kein Kontingent</span>
									{:else}
										<span class={balanceBadge(row.balance)}>
											{deltaLabel(row.balance, formatHours)}
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#if !table}
		<p class="text-base-content/80 text-sm">
			Es ist noch kein Planungssemester gesetzt. Bitte oben ein Semester wählen.
		</p>
	{:else}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="load">
			<h2 id="load" class="font-medium">
				SWS je Heimatstudiengang · {semesterName(data.selected)}
			</h2>
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
	{#if table}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="imports">
			<h2 id="imports" class="font-medium">
				{importsHeading}
			</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Was ein Studiengang in diesem Semester von anderen bezieht, etwa die Wahlpflichtfächer eines
				Korbs. Diese SWS zählen oben beim Heimatstudiengang des Moduls, nicht hier.
			</p>
			<form method="GET" class="mt-3 flex flex-wrap items-end gap-2">
				<input type="hidden" name="semester" value={data.selected} />
				<label class="flex flex-col gap-1">
					<span class="label-text text-sm">Studiengang</span>
					<select name="studiengang" class="select select-sm w-64 max-w-full">
						<option value="" selected={data.importsFor === ''}>– bitte wählen –</option>
						{#each importChoices as p (p.code)}
							<option value={p.code} selected={p.code === data.importsFor}>
								{programmeLabel(p)}
							</option>
						{/each}
					</select>
				</label>
				<button type="submit" class="btn btn-sm">Anzeigen</button>
			</form>

			{#if imports === null}
				<p class="text-base-content/80 mt-3 text-sm">Bitte einen Studiengang wählen.</p>
			{:else if imports.length === 0}
				<p class="text-base-content/80 mt-3 text-sm">
					{data.importsFor} bezieht in diesem Semester kein Modul aus einem anderen Studiengang.
				</p>
			{:else}
				<div class="mt-3 overflow-x-auto">
					<table class="table-sm table">
						<thead>
							<tr>
								<th>Modul</th>
								<th>Zug</th>
								<th>in {data.importsFor}</th>
								<th class="text-right">Lehr-SWS</th>
							</tr>
						</thead>
						{#each imports as group (group.home.code)}
							<tbody>
								<tr>
									<th colspan="3" scope="rowgroup">
										aus {programmeLabel(group.home)}
									</th>
									<th class="text-right tabular-nums">{formatHours(group.teachingHours)}</th>
								</tr>
								{#each group.instances as i (i.id)}
									<tr>
										<td>{moduleName(i.module)}</td>
										<td class="whitespace-nowrap">
											{cohortLabel(data.importsFor, i.programmeSemester, i.track)}
											{#if i.coveredBy}
												<span class="badge badge-ghost badge-sm ml-1">
													{i.coveredBy.acceptedAt ? 'mitbetreut' : 'Mitbetreuung angefragt'}
												</span>
											{/if}
										</td>
										<td>
											{#if i.module.dutyStatus}
												<span class={dutyBadge(i.module.dutyStatus as DutyStatus)}>
													{DUTY_LABELS[i.module.dutyStatus as DutyStatus]}
												</span>
											{:else}
												<span class="text-base-content/80 text-xs">nicht im Katalog</span>
											{/if}
										</td>
										<td class="text-right tabular-nums">{formatHours(i.teachingHours)}</td>
									</tr>
								{/each}
							</tbody>
						{/each}
					</table>
				</div>
			{/if}
		</section>
	{/if}
</div>
