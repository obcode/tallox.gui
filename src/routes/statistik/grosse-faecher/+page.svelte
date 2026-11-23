<script lang="ts">
	import { stackedTable } from '#lib/stackedTable.ts';
	import { resolve } from '$app/paths';
	import SortHeader from '#lib/components/SortHeader.svelte';
	import {
		BIG_COURSE_SORT_KEYS,
		REASON_LABELS,
		STATUS_LABELS,
		filterBigCourses,
		rowKey,
		statusBadge,
		statusCounts,
		targetLabel,
		type BigCourseSortKey
	} from '#lib/bigCourses.ts';
	import { formatHours } from '#lib/catalogue.ts';
	import { studyYearLabel } from '#lib/controlling.ts';
	import { hasAnyRole } from '#lib/roles.ts';
	import { semesterShortName } from '#lib/semester.ts';
	import { nextSort, sortRows, type SortState } from '#lib/sorting.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);
	// Cosmetic: the backend has already decided whose rows came back. The sentence only says why a
	// lecturer sees a single row.
	const readsAll = $derived(
		hasAnyRole(roles, ['DEANS_OFFICE', 'SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD'])
	);

	let sort: SortState<BigCourseSortKey> = $state(null);
	const shown = $derived(data.overview ? filterBigCourses(data.overview.rows, data.filter) : []);
	const rows = $derived(sortRows(shown, sort, BIG_COURSE_SORT_KEYS));
	const counts = $derived(statusCounts(shown));
	const onsort = (key: BigCourseSortKey) => (sort = nextSort(sort, key));
</script>

<svelte:head>
	<title>Große Fächer · Tallox</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Große Fächer (FKR 387)</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Wer im Studienjahr im Mittel aus Winter- und Sommersemester mindestens 20 SWS lehrt, hält
			mindestens zwei große Pflicht- oder Korbfächer, ab 10 SWS mindestens eines. Gezählt wird, was
			in der Zuteilung steht, über alle Studiengänge, nicht das Deputat. Groß ist ein Pflicht- oder
			Korbfach (ohne FWP), in dem die Person selbst mindestens 6 SWS hält, auch über mehrere Züge,
			oder das die ganze Kohorte umfasst und in dem sie die Vorlesung hält. Ein Fach, das im Winter
			und im Sommer gehalten wird, zählt zweimal. Nur Professorinnen und Professoren, ohne
			Honorarprofs und Lehrbeauftragte. Der Status ist ein Hinweis, keine Sperre bei der
			<a class="link" href={resolve('/zuteilung')}>Zuteilung</a>.
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<label class="flex flex-col gap-1">
			<span class="label-text text-sm">Studienjahr</span>
			<select
				name="studienjahr"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="select select-sm w-40 max-w-full"
			>
				{#each data.years as y (y)}
					<option value={y} selected={y === data.studyYear}>{studyYearLabel(y)}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="label-text text-sm">Fachgruppe</span>
			<select
				name="fachgruppe"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="select select-sm w-56 max-w-full"
			>
				<option value="" selected={data.filter.group === ''}>alle</option>
				{#each data.subjectGroups as g (g.id)}
					<option value={g.id} selected={g.id === data.filter.group}>{g.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="label-text text-sm">Status</span>
			<select
				name="status"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="select select-sm w-44 max-w-full"
			>
				<option value="" selected={data.filter.status === ''}>alle</option>
				{#each Object.entries(STATUS_LABELS) as [value, label] (value)}
					<option {value} selected={value === data.filter.status}>{label}</option>
				{/each}
			</select>
		</label>
		<noscript><button type="submit" class="btn btn-sm">Anzeigen</button></noscript>
	</form>

	{#if data.refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm" role="alert">
				<span class="badge badge-error badge-sm align-middle">Nicht verfügbar</span>
				{data.refusal}
			</p>
		</div>
	{:else if data.studyYear === null || !data.overview}
		<p class="text-base-content/80 text-sm">Bitte ein Studienjahr wählen.</p>
	{:else}
		<div class="flex flex-col gap-1">
			{#if data.overview.provisional}
				<p class="text-base-content/90 text-sm">
					<span class="badge badge-warning badge-sm align-middle">vorläufig</span>
					Mindestens eines der beiden Semester ist noch nicht in der Zuteilung. Die Zahlen stehen auf
					einer Planung, die noch entsteht; „nicht erfüllt“ ist noch kein Befund.
				</p>
			{/if}
			{#if !readsAll}
				<p class="text-base-content/80 text-sm">
					Du siehst Deine eigene Zeile. Die Übersicht über alle sehen das Dekanat, die
					Fachgruppenleitungen und die Studiengangsleitungen.
				</p>
			{/if}
			<p class="text-base-content/80 text-sm">
				{rows.length}
				{rows.length === 1 ? 'Person' : 'Personen'}: {counts.FULFILLED} erfüllt, {counts.NOT_FULFILLED}
				nicht erfüllt, {counts.NOT_APPLICABLE} nicht anwendbar.
			</p>
		</div>

		{#if rows.length === 0}
			<p class="text-base-content/80 text-sm">
				Keine Professorinnen und Professoren für diese Auswahl.
			</p>
		{:else}
			<div class="border-base-300 bg-base-100 rounded-lg border">
				<table
					class="table-sm table table-stack min-w-[56rem]"
					aria-label="Große Fächer im Studienjahr {studyYearLabel(data.overview.studyYear)}"
					use:stackedTable
				>
					<thead>
						<tr>
							<SortHeader label="Person" key="name" {sort} {onsort} />
							<SortHeader label="Fachgruppen" key="groups" {sort} {onsort} />
							<th class="text-right">WiSe</th>
							<th class="text-right">SoSe</th>
							<SortHeader label="Mittel (SWS)" key="average" {sort} {onsort} align="right" />
							<SortHeader label="Soll" key="target" {sort} {onsort} align="right" />
							<SortHeader label="Ist" key="actual" {sort} {onsort} align="right" />
							<SortHeader label="Status" key="status" {sort} {onsort} />
							<th>Gezählte Fächer</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (rowKey(row))}
							<tr>
								<td class="font-medium">{row.professor.name}</td>
								<td>{row.subjectGroups.map((g) => g.code).join(', ')}</td>
								<td class="text-right tabular-nums">{formatHours(row.winterHours)}</td>
								<td class="text-right tabular-nums">{formatHours(row.summerHours)}</td>
								<td class="text-right tabular-nums">{formatHours(row.averageHours)}</td>
								<td class="text-right tabular-nums">{targetLabel(row.target)}</td>
								<td class="text-right tabular-nums">{row.actual}</td>
								<td>
									<span class="badge badge-sm whitespace-nowrap {statusBadge(row.status)}">
										{STATUS_LABELS[row.status]}
									</span>
								</td>
								<td>
									{#if row.courses.length === 0}
										<span class="text-base-content/80">–</span>
									{:else}
										<ul class="flex flex-col gap-0.5 text-sm">
											{#each row.courses as c (`${c.semester}/${c.moduleId}/${c.programme.code}`)}
												<li>
													{c.moduleName}
													<span class="text-base-content/80 text-xs">
														· {c.programme.code} · {semesterShortName(c.semester)} · {REASON_LABELS[
															c.reason
														]}
													</span>
												</li>
											{/each}
										</ul>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
