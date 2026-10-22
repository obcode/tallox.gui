<script lang="ts">
	import { resolve } from '$app/paths';
	import DesiredRangeFields from '$lib/components/DesiredRangeFields.svelte';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import {
		desiredHoursStage,
		desiredRangeLabel,
		filterOverview,
		loadBreakdown,
		OVERVIEW_SORT_KEYS,
		STAGE_LABELS,
		type OverviewSortKey
	} from '$lib/desiredHours';
	import { hasAnyRole } from '$lib/roles';
	import { autosave } from '$lib/saveOnLeave';
	import { semesterName } from '$lib/semester';
	import { nextSort, sortRows, type SortState } from '$lib/sorting';
	import { desiredHoursLabel } from '$lib/wishes';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);
	const stage = $derived(data.semester ? desiredHoursStage(data.semester) : 'OPEN');
	// Cosmetic, like every role check here: the backend has already decided which figures came
	// back. Before publication a lecturer would see a table of empty cells and their own, which is
	// honest and useless — so they get a sentence instead. Leads and the dean's office read
	// something before publication, so the table is theirs from the start.
	const readsBeforePublication = $derived(
		hasAnyRole(roles, ['SUBJECT_GROUP_LEAD', 'DEANS_OFFICE'])
	);
	const showTable = $derived(stage === 'PUBLISHED' || readsBeforePublication);
	const mayCorrect = $derived(
		hasAnyRole(roles, ['DEANS_OFFICE']) && stage !== 'OPEN' && data.semester?.phase !== 'FINAL'
	);
	const own = $derived(data.rows.find((r) => r.person.id === data.me?.id) ?? null);

	let sort: SortState<OverviewSortKey> = $state(null);
	const rows = $derived(sortRows(filterOverview(data.rows, data.filter), sort, OVERVIEW_SORT_KEYS));
	const semesterTabs = $derived([...data.semesters].reverse());
	const refusal = $derived(form && 'message' in form ? form : null);
</script>

<svelte:head>
	<title>SWS im Kollegium · Tallox</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">SWS im Kollegium</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Wer wie viele SWS modulbehaftete Lehre (ohne Abschlussarbeiten) übernehmen möchte und wer
			schon wie viel eingeplant ist — damit alle sehen, ob sie jemandem etwas wegnehmen, der es noch
			braucht, und umgekehrt. Die eigene Angabe steht unter
			<a class="link" href={resolve('/wuensche')}>Wünsche</a>.
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<label class="flex flex-col gap-1">
			<span class="label-text text-sm">Semester</span>
			<select
				name="semester"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="select select-sm w-56 max-w-full"
			>
				{#each semesterTabs as s (s.code)}
					<option value={s.code} selected={s.code === data.selected}>{semesterName(s.code)}</option>
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
					<option value={g.code} selected={g.code === data.filter.group}>{g.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="label-text text-sm">Name</span>
			<input name="q" value={data.filter.query} class="input input-sm w-48" />
		</label>
		<!-- A search field sits in this form, so the button stays: no submit on every keystroke. -->
		<button type="submit" class="btn btn-sm">Filtern</button>
	</form>

	{#if data.semester}
		<p class="text-base-content/90 text-sm">
			<span class="badge badge-ghost badge-sm align-middle">Wunsch-SWS {STAGE_LABELS[stage]}</span>
			{#if stage === 'PUBLISHED'}
				Alle sehen die Bereiche aller. Notizen bleiben bei der Person, den Leitungen ihrer
				Fachgruppen und dem Dekanat.
			{:else if stage === 'FROZEN'}
				Die Fakultätsleitung prüft die Angaben; Änderungen nur noch über das Dekanat. Veröffentlicht
				wird danach.
			{:else}
				Bis zum Stichtag kann jede Person ihre Angabe ändern.
			{/if}
			{#if !data.semester.assignmentsPublishedAt}
				„Eingeplant“ ist vorläufig, bis die Zuteilung veröffentlicht ist.
			{/if}
		</p>
	{/if}

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm" role="alert">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	{#if !data.semester}
		<p class="text-base-content/80 text-sm">Bitte ein Semester wählen.</p>
	{:else if !showTable}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">nicht veröffentlicht</span>
				Die Wunsch-SWS für {semesterName(data.semester.code)} sind noch nicht veröffentlicht. Bis dahin
				sehen nur die Leitungen der Fachgruppen und das Dekanat die Angaben.
				{#if own?.stated}
					Deine eigene: <strong>{desiredRangeLabel(own.minHours!, own.maxHours!)} SWS</strong>.
				{/if}
			</p>
		</div>
	{:else}
		{#if stage !== 'PUBLISHED'}
			<p class="text-base-content/80 text-sm">
				Noch nicht veröffentlicht: Du siehst die Angaben der Personen, für die Du zuständig bist.
				Leere Zellen heißen „nicht angegeben“ oder „für Dich nicht sichtbar“.
			</p>
		{/if}
		<!-- Created afresh for each semester: the fields hold their own text, see DesiredRangeFields. -->
		{#key data.selected}
			<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
				<table class="table-sm table">
					<thead>
						<tr>
							<SortHeader
								label="Person"
								key="name"
								{sort}
								onsort={(key) => (sort = nextSort(sort, key))}
							/>
							<SortHeader
								label="Fachgruppen"
								key="groups"
								{sort}
								onsort={(key) => (sort = nextSort(sort, key))}
							/>
							<SortHeader
								label="möchte (SWS)"
								key="max"
								{sort}
								onsort={(key) => (sort = nextSort(sort, key))}
								align="right"
							/>
							<SortHeader
								label="eingeplant (SWS)"
								key="assigned"
								{sort}
								onsort={(key) => (sort = nextSort(sort, key))}
								align="right"
							/>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.person.id)}
							<tr>
								<td class="font-medium">{row.person.name}</td>
								<td>{row.subjectGroups.map((g) => g.code).join(', ')}</td>
								<td class="text-right whitespace-nowrap">
									{#if mayCorrect}
										<form
											method="POST"
											action="?/correct"
											use:autosave={{ label: `Wunsch-SWS ${row.person.name}` }}
											class="flex items-center justify-end gap-1"
										>
											<input type="hidden" name="semester" value={data.selected} />
											<input type="hidden" name="person" value={row.person.id} />
											<DesiredRangeFields
												min={row.stated ? row.minHours : null}
												max={row.stated ? row.maxHours : null}
												minLabel="SWS von, {row.person.name}"
												maxLabel="SWS bis, {row.person.name}"
												visibleLabels={false}
												size="xs"
											/>
											<noscript
												><button type="submit" class="btn btn-xs">Speichern</button></noscript
											>
										</form>
									{:else if row.stated}
										{desiredRangeLabel(row.minHours!, row.maxHours!)}
									{/if}
								</td>
								<td class="text-right whitespace-nowrap">
									{#if row.assignedLoad}
										{desiredHoursLabel(row.assignedLoad.total)}
										<!-- By subject group, so that a lead sees whom to talk to. -->
										<span class="text-base-content/80 block text-xs">
											{loadBreakdown(row.assignedLoad)}
										</span>
									{/if}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="text-base-content/80 text-sm"
									>Niemand passt zu diesem Filter.</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/key}
	{/if}
</div>
