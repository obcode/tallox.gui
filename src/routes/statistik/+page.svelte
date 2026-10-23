<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { resolve } from '$app/paths';
	import { DUTY_LABELS, dutyBadge, formatHours, moduleName, programmeLabel } from '$lib/catalogue';
	import {
		balanceBadge,
		controllingTable,
		deltaLabel,
		basketGroups,
		importGroups,
		quotaTable,
		semesterQuotaRule,
		studyYearLabel,
		studyYearSemesters,
		studyYearTable,
		type ControllingRow
	} from '$lib/controlling';
	import type { DutyStatus } from '$lib/gql/__generated__/graphql';
	import { cohortLabel } from '$lib/demand';
	import QuotaBars from '$lib/components/QuotaBars.svelte';
	import { semesterName, semesterShortName } from '$lib/semester';

	let { data } = $props();

	const semesterTabs = $derived([...data.semesters].reverse());
	const table = $derived(data.load ? controllingTable(data.load, data.previous) : null);
	const quotas = $derived(data.load ? quotaTable(data.load) : []);
	const year = $derived(
		data.year ? studyYearTable(data.year.rows, new Set(data.year.reviewed)) : null
	);
	const yearSemesters = $derived(data.studyYear ? studyYearSemesters(data.studyYear) : null);
	const imports = $derived(data.imports ? importGroups(data.imports) : null);
	const baskets = $derived(data.baskets ? basketGroups(data.baskets) : null);
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

	function foreignLabel(row: ControllingRow): string {
		return row.foreign.map((s) => `${s.code} ${formatHours(s.teachingHours)}`).join(' · ');
	}
</script>

<svelte:head>
	<title>SWS-Controlling · Tallox</title>
</svelte:head>

{#snippet rowCells(row: Omit<ControllingRow, 'programme' | 'foreign'>, foreign: string)}
	<td class="text-right tabular-nums">{formatHours(row.teachingHours)}</td>
	<td class="text-right tabular-nums">{formatHours(row.ownHours)}</td>
	<td class="tabular-nums">
		{formatHours(row.foreignHours)}
		{#if foreign}
			<span class="text-base-content/80 block text-xs">{foreign}</span>
		{/if}
	</td>
	<td class="text-right tabular-nums">{row.instanceCount}</td>
	<td class="text-right tabular-nums">
		{row.fwpInstanceCount}
		{#if row.fwpInstanceCount > 0}
			<span class="text-base-content/80 block text-xs">{formatHours(row.fwpHours)} SWS</span>
		{/if}
	</td>
	<!-- The year before is a side note since the study year is the figure that counts. -->
	<td class="text-base-content/80 text-right tabular-nums">
		{row.previousHours === null ? '–' : formatHours(row.previousHours)}
	</td>
	<td class="text-base-content/80 text-right tabular-nums">
		{deltaLabel(row.delta, formatHours)}
	</td>
{/snippet}

{#snippet header(first: string)}
	<thead>
		<tr>
			<th>{first}</th>
			<th class="text-right">SWS gesamt</th>
			<th class="text-right">eigene Module</th>
			<th>fremde Module</th>
			<th class="text-right">Instanzen</th>
			<th class="text-right">davon FWP</th>
			<th class="text-right font-normal">
				Vorjahr (zum Vergleich){#if data.previousCode}<span class="block text-xs"
						>{semesterShortName(data.previousCode)}</span
					>{/if}
			</th>
			<th class="text-right font-normal">Δ</th>
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
			{#if row.externalHours > 0}
				<!-- Not in the figure beside it: another faculty teaches it, so it costs nobody here. -->
				<span
					class="badge badge-ghost badge-sm ml-1"
					title="Diese SWS hält eine andere Fakultät. Sie zählen nicht zu den SWS dieses Studiengangs."
				>
					+ {formatHours(row.externalHours)} SWS andere Fakultät
				</span>
			{/if}
		</th>
		{@render rowCells(row, foreignLabel(row))}
	</tr>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="max-w-3xl">
		<h1 class="text-2xl font-semibold">SWS-Controlling</h1>
		<p class="text-base-content/80 mt-1 text-sm">
			Was der <a class="link" href={resolve('/bedarf')}>Bedarf</a> eines Semesters an Lehre kostet,
			je Studiengang. <strong>Es zahlt, wer die Veranstaltung hält:</strong> Plant DC eine eigene Analysis,
			zählt sie bei DC, auch wenn das Modul im Katalog IF gehört. Hängt sich ein Zug an die Veranstaltung
			eines anderen Studiengangs an (mitbetreut), kostet er nichts; es zahlt der Studiengang, der sie
			hält. Daran lässt sich ablesen, wie viele FWP sich ein Studiengang leisten kann.
		</p>
		<p class="text-base-content/80 mt-2 text-sm">
			Gezählt wird Lehre, nicht die Modul-SWS: eine Vorlesung und jede Praktikumsgruppe einzeln,
			eine für mehrere Züge gemeinsame Vorlesung einmal, ein von einem anderen Studiengang
			mitbetreuter Zug gar nicht. „Fremde Module“ ist der Teil, der in eigenen Instanzen für Module
			mit fremder Heimat ausgegeben wird. Am Rand steht zum Vergleich dasselbe Semester ein Jahr
			zuvor.
		</p>
	</div>

	<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<form method="GET" class="flex flex-col gap-1">
			<span class="label-text text-sm">Semester</span>
			<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-wrap">
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
		{#if data.load}
			<!-- A plain link: the file is a GET, and its Content-Disposition makes it a download.
			     No `download` attribute — with it Chromium fetches the link as a separate download
			     request, and what came back here was the error page rather than the file.
			     `data-sveltekit-reload` keeps the client router from treating the endpoint as a page. -->
			<div class="flex flex-wrap items-center gap-3">
				<a
					class="btn btn-sm btn-outline"
					href="{resolve('/gui-api/export/semester')}?semester={data.selected}"
					data-sveltekit-reload
				>
					Als Excel exportieren
				</a>
				<span class="text-base-content/80 text-sm">
					Planung je Teil mit Besetzung und das SWS-Controlling von {semesterName(data.selected)} — zum
					Weiterarbeiten in einer Tabelle. Besetzungen nur, soweit Du sie hier sehen darfst.
				</span>
			</div>
		{/if}
	</div>

	{#if year && yearSemesters && data.studyYear}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="year">
			<h2 id="year" class="font-medium">Studienjahr {studyYearLabel(data.studyYear)}</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Das Kontingent ist die verfügbare Lehrleistung eines Studiengangs für das ganze Studienjahr,
				wie das Dekanat es aus der Kapazitätsrechnung einträgt. Daneben steht, was Winter- und
				Sommersemester davon verbrauchen, und was übrig bleibt. Ein negativer Rest heißt: der
				Studiengang lebt über seinen Verhältnissen. Ein positiver: Luft für weitere Wahlfächer oder
				für einen anderen Studiengang.
			</p>
			<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
				<strong>Das Sommersemester durchspielen:</strong> Sein Bedarf lässt sich schon jetzt anlegen —
				ein Klick auf die Zahl führt in die Bedarfsplanung — und zählt hier sofort mit. Es ist echter
				Bedarf: alle können ihn lesen, und Dozierende können sich darauf schon eintragen.
			</p>
			<div class="mt-4 max-w-3xl">
				<QuotaBars
					rows={year}
					winterLabel={semesterShortName(yearSemesters.winter)}
					summerLabel={semesterShortName(yearSemesters.summer)}
				/>
			</div>
			<div class="mt-3 overflow-x-auto">
				<table class="table-sm table table-stack" use:stackedTable>
					<thead>
						<tr>
							<th>Studiengang</th>
							<th class="text-right">Kontingent</th>
							<th class="text-right">{semesterShortName(yearSemesters.winter)}</th>
							<th class="text-right">{semesterShortName(yearSemesters.summer)}</th>
							<th class="text-right">Rest</th>
							<th>Review {semesterShortName(data.selected)}</th>
						</tr>
					</thead>
					<tbody>
						{#each year as row (row.programme.code)}
							<tr>
								<th scope="row" class="font-medium">
									{programmeLabel(row.programme)}
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
								<td class="text-right tabular-nums">{maybeHours(row.yearlyQuota)}</td>
								<td class="text-right tabular-nums">
									<a
										class="link"
										href={resolve(
											`/bedarf?semester=${yearSemesters.winter}&studiengang=${row.programme.code}`
										)}>{formatHours(row.winterHours)}</a
									>
								</td>
								<td class="text-right tabular-nums">
									<a
										class="link"
										href={resolve(
											`/bedarf?semester=${yearSemesters.summer}&studiengang=${row.programme.code}`
										)}>{formatHours(row.summerHours)}</a
									>
								</td>
								<td class="text-right tabular-nums">
									{#if row.remaining === null}
										<span class="text-base-content/80 text-xs">kein Kontingent</span>
									{:else}
										<span class={balanceBadge(row.remaining)}>
											{deltaLabel(row.remaining, formatHours)}
										</span>
									{/if}
								</td>
								<td>
									{#if row.reviewed}
										<span class="badge badge-success badge-sm">Review fertig</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#if table}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="quota">
			<h2 id="quota" class="font-medium">Dieses Semester · {semesterName(data.selected)}</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				{semesterQuotaRule(data.selected)}
			</p>
			<div class="mt-3 overflow-x-auto">
				<table class="table-sm table table-stack" use:stackedTable>
					<thead>
						<tr>
							<th>Studiengang</th>
							<th class="text-right">verfügbar in diesem Semester</th>
							<th class="text-right">geplant (SWS gesamt)</th>
							<th class="text-right">Saldo</th>
						</tr>
					</thead>
					<tbody>
						{#each quotas as row (row.programme.code)}
							<tr>
								<th scope="row" class="font-medium">{programmeLabel(row.programme)}</th>
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
				SWS je Studiengang · {semesterName(data.selected)}
			</h2>
			<div class="mt-3 overflow-x-auto">
				<table class="table-sm table table-stack" use:stackedTable>
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
					„Nicht von uns geplant“ sind Studiengänge, die die Fakultät nicht selbst plant, für die
					hier aber eigene Veranstaltungen gehalten werden. Sie zählen in der Summe mit.
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
				Korbs. Eine eigene Instanz kostet den eigenen Studiengang; eine mitbetreute kostet nichts
				und zählt bei dem Studiengang, der die Veranstaltung hält.
			</p>
			<form method="GET" class="mt-3 flex flex-wrap items-end gap-2">
				<input type="hidden" name="semester" value={data.selected} />
				<label class="flex flex-col gap-1">
					<span class="label-text text-sm">Studiengang</span>
					<select
						name="studiengang"
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
						class="select select-sm w-64 max-w-full"
					>
						<option value="" selected={data.importsFor === ''}>– bitte wählen –</option>
						{#each importChoices as p (p.code)}
							<option value={p.code} selected={p.code === data.importsFor}>
								{programmeLabel(p)}
							</option>
						{/each}
					</select>
				</label>
				<noscript><button type="submit" class="btn btn-sm">Anzeigen</button></noscript>
			</form>

			{#if imports === null}
				<p class="text-base-content/80 mt-3 text-sm">Bitte einen Studiengang wählen.</p>
			{:else if imports.length === 0}
				<p class="text-base-content/80 mt-3 text-sm">
					{data.importsFor} bezieht in diesem Semester kein Modul aus einem anderen Studiengang.
				</p>
			{:else}
				<div class="mt-3 overflow-x-auto">
					<table class="table-sm table table-stack" use:stackedTable>
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
		{#if baskets !== null}
			<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="baskets">
				<h2 id="baskets" class="font-medium">Wahlpflicht nach Korb · {data.importsFor}</h2>
				<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
					Welche Wahlpflichtmodule eines Korbs der Prüfungsordnung in diesem Semester laufen, eigene
					wie fremde. Ein Modul in zwei Körben steht in beiden; die Summen der Körbe zusammen zählen
					es deshalb doppelt. Pflichtmodule stehen nicht hier.
				</p>
				{#if baskets.length === 0}
					<p class="text-base-content/80 mt-3 text-sm">
						{data.importsFor} bietet in diesem Semester kein Wahlpflichtmodul an.
					</p>
				{:else}
					<div class="mt-3 overflow-x-auto">
						<table class="table-sm table table-stack" use:stackedTable>
							<thead>
								<tr>
									<th>Modul</th>
									<th>Zug</th>
									<th>auch in</th>
									<th class="text-right">Lehr-SWS</th>
								</tr>
							</thead>
							{#each baskets as group (group.basket ?? '')}
								<tbody>
									<tr>
										<th colspan="3" scope="rowgroup">{group.basket ?? 'ohne Korb'}</th>
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
											<td class="text-base-content/80 text-xs">{i.alsoIn.join(' · ')}</td>
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
	{/if}
</div>
