<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { resolve } from '$app/paths';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import { formatHours } from '$lib/catalogue';
	import {
		ENGLISH_NOT_OFFERED,
		cohortLabel,
		englishClosed,
		formatBadges,
		partLabel
	} from '$lib/demand';
	import { cieRows, teachingBySemester } from '$lib/myAssignments';
	import { autosave } from '$lib/saveOnLeave';
	import { semesterName } from '$lib/semester';
	import { nextSort, sortRows, type SortState } from '$lib/sorting';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const semesters = $derived(teachingBySemester(data.assignments, new Set(data.published)));
	const finished = $derived(new Set(data.finished));

	type AssignmentSortKey = 'module' | 'cohort' | 'part';
	type Assignment = (typeof semesters)[number]['assignments'][number];
	// One state for every semester's table, so a click orders them all alike.
	let assignmentSort = $state<SortState<AssignmentSortKey>>(null);
	const onAssignmentSort = (key: AssignmentSortKey) =>
		(assignmentSort = nextSort(assignmentSort, key));
	const assignmentKeys = {
		module: (a: Assignment) => a.instance.module.name,
		cohort: (a: Assignment) =>
			cohortLabel(a.instance.programme.code, a.instance.programmeSemester, a.instance.track),
		part: (a: Assignment) => partLabel(a.part)
	};
</script>

<svelte:head>
	<title>Meine Zuteilungen · Tallox</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Meine Zuteilungen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Wo Du tatsächlich eingeplant bist: jede Vorlesung, jedes Praktikum und jedes Seminar, das Dir
			zugeteilt ist, je Semester mit der Summe der SWS. Solange die Zuteilung eines Semesters nicht
			veröffentlicht ist, ist sie ein Entwurf. Ändern kann sie sich bis zum Ende des Semesters, auch
			nach der Veröffentlichung, etwa wenn jemand ausfällt.
		</p>
	</div>

	{#if semesters.length === 0}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				Dir ist noch nichts zugeteilt. Deine Wünsche trägst Du unter
				<a class="link" href={resolve('/wuensche')}>Wünsche</a> ein.
			</p>
		</div>
	{/if}

	{#each semesters as semester (semester.code)}
		{@const withCie = cieRows(semester.assignments)}
		<section
			class="border-base-300 bg-base-100 rounded-lg border p-4"
			aria-labelledby="semester-{semester.code}"
		>
			<h2 id="semester-{semester.code}" class="flex flex-wrap items-center gap-2 font-medium">
				{semesterName(semester.code)}
				{#if semester.published}
					<span class="badge badge-ghost badge-sm">veröffentlicht</span>
				{:else}
					<span class="badge badge-warning badge-sm">Entwurf</span>
				{/if}
				<span class="text-base-content/80 text-sm font-normal">
					{formatHours(semester.teachingHours)} SWS{semester.partsWithoutHours > 0
						? `, ${semester.partsWithoutHours} Teil${semester.partsWithoutHours === 1 ? '' : 'e'} ohne SWS-Angabe`
						: ''}
				</span>
			</h2>
			{#if !semester.published}
				<p class="text-base-content/80 mt-1 text-sm">
					Noch nicht veröffentlicht. Was hier steht, kann sich noch ändern.
				</p>
			{/if}
			<div class="mt-3 overflow-x-auto">
				<table class="table-sm table table-stack" use:stackedTable>
					<thead>
						<tr>
							<SortHeader
								label="Modul"
								key="module"
								sort={assignmentSort}
								onsort={onAssignmentSort}
							/>
							<SortHeader
								label="Kohorte"
								key="cohort"
								sort={assignmentSort}
								onsort={onAssignmentSort}
							/>
							<SortHeader label="Teil" key="part" sort={assignmentSort} onsort={onAssignmentSort} />
							<th>CiE</th>
							<th>Notiz</th>
						</tr>
					</thead>
					<tbody>
						{#each sortRows(semester.assignments, assignmentSort, assignmentKeys) as a (a.id)}
							<tr>
								<td>
									<a
										class="link font-medium"
										href={resolve('/module/[id]', { id: a.instance.module.id })}
										>{a.instance.module.name}</a
									>
									<!-- Which seminar, for an umbrella module taught many times a semester. -->
									{#if a.instance.topic}
										<span class="block">{a.instance.topic}</span>
									{/if}
								</td>
								<td class="whitespace-nowrap">
									{cohortLabel(
										a.instance.programme.code,
										a.instance.programmeSemester,
										a.instance.track
									)}
									{#each formatBadges(a.instance) as badge (badge)}
										<span class="badge badge-ghost badge-sm ml-1">{badge}</span>
									{/each}
								</td>
								<td class="whitespace-nowrap">{partLabel(a.part)}</td>
								<td>
									<!-- Once per cohort: CiE belongs to the cohort, not to the part. -->
									{#if withCie.has(a.id)}
										{@const closed = englishClosed(
											a.instance.module.englishPossible,
											a.instance.cie
										)}
										<form method="POST" action="?/cie" use:autosave={{ label: 'CiE' }}>
											<input type="hidden" name="id" value={a.instance.id} />
											<label
												class="flex items-center gap-1 text-sm"
												title={closed
													? ENGLISH_NOT_OFFERED
													: 'Als Course in English (CiE) angeboten. Das kannst Du für jeden Zug setzen, den Du hältst.'}
											>
												<input
													type="checkbox"
													name="cie"
													value="true"
													class="checkbox checkbox-sm"
													aria-label="{a.instance.module.name} in {cohortLabel(
														a.instance.programme.code,
														a.instance.programmeSemester,
														a.instance.track
													)} als CiE"
													checked={a.instance.cie}
													disabled={closed || finished.has(semester.code)}
												/>
												CiE
											</label>
											<noscript
												><button type="submit" class="btn btn-xs">Speichern</button></noscript
											>
										</form>
										{#if form?.cieRefusal?.id === a.instance.id}
											<span class="badge badge-error mt-1 whitespace-normal">
												{form.cieRefusal.message}
											</span>
										{/if}
									{/if}
								</td>
								<td class="text-base-content/90 text-sm">{a.note}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
</div>
