<script lang="ts">
	import { resolve } from '$app/paths';
	import { stackedTable } from '$lib/stackedTable';
	import { semesterName } from '$lib/semester';
	import { personLabel } from '$lib/subjectGroups';
	import { ADVANCE_STATUS_LABELS, advanceStatusBadge, advanceLevelLabel } from '$lib/advanceWishes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Vormerkungen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Was sich Kolleginnen und Kollegen für ein kommendes Semester vorgemerkt haben, bevor der
			Bedarf feststeht — eine Ansage, kein Anspruch. Mit der Freigabe des Bedarfs durch die
			Studiengangsleitung wird jede Vormerkung zum Wunsch auf jedem Zug des Moduls.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Du siehst die Vormerkungen für die Studiengänge und Fachgruppen, die Du leitest, das Dekanat
			alle. Wie bei den Wünschen sieht das übrige Kollegium sie erst nach der Veröffentlichung.
		</p>
	</div>

	<form method="GET" class="flex flex-col gap-1 sm:max-w-sm">
		<label class="flex flex-col gap-1">
			<span class="text-base-content/90 text-sm">Semester</span>
			<select
				class="select select-bordered w-full"
				name="semester"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				{#each data.semesters as code (code)}
					<option value={code} selected={code === data.semester}>{semesterName(code)}</option>
				{/each}
			</select>
		</label>
		<noscript><button class="btn btn-sm mt-1" type="submit">Anzeigen</button></noscript>
	</form>

	{#if data.rows.length === 0}
		<!-- Not "nobody has noted anything down": empty means nothing you may see. -->
		<p class="text-base-content/80 text-sm">
			Für {semesterName(data.semester)} liegt in Deinem Bereich nichts vor, das Du sehen darfst.
		</p>
	{:else}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<table class="table-sm table table-stack min-w-[40rem]" use:stackedTable>
				<thead>
					<tr>
						<th>Modul</th>
						<th>Studiengang</th>
						<th>Person</th>
						<th>Stufe</th>
						<th>Notiz</th>
						<th>Stand</th>
					</tr>
				</thead>
				<tbody>
					{#each data.rows as a (a.id)}
						<tr>
							<td>
								<a class="link" href={resolve('/module/[id]', { id: a.module.id })}
									>{a.module.name || 'Modul ohne Namen'}</a
								>
							</td>
							<td>{a.programme.code}</td>
							<td>{personLabel(a.person)}</td>
							<td>
								{advanceLevelLabel(a.priority, a.maxTracks)}
							</td>
							<td class="text-sm">{a.note}</td>
							<td>
								<span class={advanceStatusBadge(a.status)}>{ADVANCE_STATUS_LABELS[a.status]}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
