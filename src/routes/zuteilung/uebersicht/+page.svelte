<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { resolve } from '$app/paths';
	import { assignmentOverview } from '$lib/assignmentOverview';
	import { PART_KIND_LABELS, formatHours, programmeLabel } from '$lib/catalogue';
	import { semesterName } from '$lib/semester';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const overview = $derived(
		data.published ? assignmentOverview(data.instances, data.assignments) : []
	);
	const semesterTabs = $derived([...data.semesters].reverse());
</script>

<svelte:head>
	<title>Zuteilung · Übersicht · Tallox</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Wer hält was</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Die veröffentlichte Zuteilung eines Semesters, nur zum Lesen: je Studiengang, Modul und
			Kohorte, wer welchen Teil hält. Was Dir selbst zugeteilt ist, steht unter
			<a class="link" href={resolve('/konto/zuteilungen')}>Meine Zuteilungen</a>, auch schon vor der
			Veröffentlichung.
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
					<option value={s.code} selected={s.code === data.selected.semester}>
						{semesterName(s.code)}
					</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="label-text text-sm">Studiengang</span>
			<select
				name="studiengang"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="select select-sm w-64 max-w-full"
			>
				<option value="" selected={data.selected.programme === ''}>alle</option>
				{#each data.programmes as p (p.code)}
					<option value={p.code} selected={p.code === data.selected.programme}>
						{programmeLabel(p)}
					</option>
				{/each}
			</select>
		</label>
		<noscript><button type="submit" class="btn btn-sm">Anzeigen</button></noscript>
	</form>

	{#if data.selected.semester === ''}
		<p class="text-base-content/80 text-sm">Bitte ein Semester wählen.</p>
	{:else if !data.published}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">nicht veröffentlicht</span>
				Die Zuteilung für {semesterName(data.selected.semester)} ist noch nicht veröffentlicht. Bis dahin
				ist sie ein Entwurf der Fachgruppenleitungen; Deine eigenen Teile siehst Du unter
				<a class="link" href={resolve('/konto/zuteilungen')}>Meine Zuteilungen</a>.
			</p>
		</div>
	{:else if overview.length === 0}
		<p class="text-base-content/80 text-sm">In diesem Semester ist dazu nichts geplant.</p>
	{:else}
		{#each overview as programme (programme.code)}
			<section
				class="border-base-300 bg-base-100 rounded-lg border p-4"
				aria-labelledby="programme-{programme.code}"
			>
				<h2 id="programme-{programme.code}" class="font-medium">
					{programmeLabel(programme)}
				</h2>
				<div class="mt-3 overflow-x-auto">
					<table class="table-sm table table-stack" use:stackedTable>
						<thead>
							<tr>
								<th>Modul</th>
								<th>Kohorte</th>
								<th>Teil</th>
								<th>hält</th>
							</tr>
						</thead>
						{#each programme.modules as module (module.id)}
							<tbody>
								{#each module.cohorts as cohort, c (cohort.instanceId)}
									{#if cohort.rows.length === 0}
										<tr>
											<td class="font-medium">{c === 0 ? module.name : ''}</td>
											<td>{cohort.label}</td>
											<td colspan="2" class="text-base-content/80 text-sm">
												{cohort.heldWith ? `gemeinsam mit ${cohort.heldWith}` : 'keine Teile'}
											</td>
										</tr>
									{/if}
									{#each cohort.rows as row, r (row.partId)}
										<tr>
											<td class="font-medium">
												{#if c === 0 && r === 0}
													<a class="link" href={resolve('/module/[id]', { id: module.id })}
														>{module.name}</a
													>
													{#if module.projectBased}
														<span class="badge badge-secondary badge-sm ml-1">PBLV</span>
													{/if}
												{/if}
											</td>
											<td class="whitespace-nowrap">{r === 0 ? cohort.label : ''}</td>
											<td class="whitespace-nowrap">
												{PART_KIND_LABELS[row.kind]}{row.teachingHours != null
													? ` ${formatHours(row.teachingHours)} SWS`
													: ''}
											</td>
											<td>
												{#if row.taughtBy}
													<span class="text-base-content/80 text-sm">{row.taughtBy}</span>
												{:else if row.assignee}
													{row.assignee}
												{:else}
													<span class="badge badge-warning badge-sm">nicht besetzt</span>
												{/if}
											</td>
										</tr>
									{/each}
								{/each}
							</tbody>
						{/each}
					</table>
				</div>
			</section>
		{/each}
	{/if}
</div>
