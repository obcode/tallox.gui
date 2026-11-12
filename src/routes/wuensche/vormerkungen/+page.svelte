<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { askBeforeLeave } from '$lib/saveOnLeave';
	import { stackedTable } from '$lib/stackedTable';
	import { semesterName } from '$lib/semester';
	import { programmeTitle } from '$lib/startOverview';
	import { WISH_PRIORITIES, WISH_PRIORITY_LABELS } from '$lib/wishes';
	import {
		ADVANCE_STATUS_LABELS,
		advanceStatusBadge,
		advanceBySemester,
		advanceStatusHint,
		advanceLevelLabel
	} from '$lib/advanceWishes';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form.message : null);
	const groups = $derived(advanceBySemester(data.mine));

	/** Own subject groups first, the rest of the programme's catalogue below — a preselection. */
	const moduleGroups = $derived.by(() => {
		const mine = new Set(data.mySubjectGroupIds);
		const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'de');
		const named = data.modules.filter((m) => m.name.trim() !== '');
		return {
			own: named.filter((m) => m.subjectGroup && mine.has(m.subjectGroup.id)).sort(byName),
			other: named.filter((m) => !m.subjectGroup || !mine.has(m.subjectGroup.id)).sort(byName)
		};
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Vormerkungen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Was Du in einem kommenden Semester gern halten möchtest, auch wenn der Bedarf dafür noch nicht
			feststeht — gern Jahre im Voraus. Sobald die Studiengangsleitung den Bedarf freigibt, wird aus
			der Vormerkung ein <a class="link" href={resolve('/wuensche')}>Wunsch</a> auf jedem Zug des Moduls,
			mit Stufe und Notiz. Bietet der Studiengang das Modul dann nicht an, steht hier „nicht angeboten“.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			<strong>Eine Vormerkung ist kein Anspruch</strong>, sondern eine Ansage. Wer sie sieht: Du
			selbst, die Leitung der Fachgruppe des Moduls, die Leitung des Studiengangs und das Dekanat —
			und alle, sobald die Wünsche des Semesters veröffentlicht sind. Wie viele sich etwas
			vorgemerkt haben, zeigt Tallox niemandem.
		</p>
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4" role="alert">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal}
			</p>
		</div>
	{/if}

	<section
		class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4"
		aria-labelledby="new-advance"
	>
		<h2 id="new-advance" class="text-lg font-semibold">Vormerken</h2>

		<!-- The programme first: the module list is its catalogue. Switches on change. -->
		<form method="GET" class="flex flex-col gap-1 sm:max-w-sm">
			<label class="flex flex-col gap-1">
				<span class="text-base-content/90 text-sm">Studiengang</span>
				<select
					class="select select-bordered w-full"
					name="programme"
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				>
					<option value="" selected={data.programme === ''}>— bitte wählen —</option>
					{#each data.programmes as p (p.code)}
						<option value={p.code} selected={p.code === data.programme}>
							{p.code} · {programmeTitle(p)}
						</option>
					{/each}
				</select>
			</label>
			<noscript><button class="btn btn-sm mt-1" type="submit">Module anzeigen</button></noscript>
		</form>

		{#if data.programme !== ''}
			<form
				method="POST"
				action="?/save"
				use:askBeforeLeave={{ label: 'Neue Vormerkung' }}
				class="grid grid-cols-1 gap-3 sm:grid-cols-2"
			>
				<input type="hidden" name="programme" value={data.programme} />
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Semester</span>
					<select class="select select-bordered w-full" name="semester" required>
						{#each data.semesters as code (code)}
							<option value={code}>{semesterName(code)}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Modul</span>
					<select class="select select-bordered w-full" name="module" required>
						<option value="">— bitte wählen —</option>
						{#if moduleGroups.own.length > 0}
							<optgroup label="Meine Fachgruppen">
								{#each moduleGroups.own as m (m.id)}
									<option value={m.id}>{m.name}</option>
								{/each}
							</optgroup>
						{/if}
						<optgroup label={moduleGroups.own.length > 0 ? 'Weitere Module' : 'Module'}>
							{#each moduleGroups.other as m (m.id)}
								<option value={m.id}>{m.name}</option>
							{/each}
						</optgroup>
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Stufe</span>
					<select class="select select-bordered w-full" name="priority">
						{#each WISH_PRIORITIES as p (p)}
							<option value={p} selected={p === 'HAPPY_TO'}>{WISH_PRIORITY_LABELS[p]}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Höchstens so viele Züge</span>
					<select class="select select-bordered w-full" name="maxTracks">
						<option value="">alle</option>
						{#each [1, 2, 3] as n (n)}
							<option value={n}>{n === 1 ? 'einen' : n}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1 sm:col-span-2">
					<span class="text-base-content/90 text-sm">Notiz</span>
					<input
						class="input input-bordered w-full"
						name="note"
						maxlength="500"
						placeholder="z. B. „nur die Vorlesung“"
					/>
				</label>
				<div class="flex flex-wrap items-center gap-3 sm:col-span-2">
					<button class="btn btn-primary btn-sm" type="submit">Vormerken</button>
					<p class="text-base-content/80 text-sm">
						Dasselbe Modul im selben Semester und Studiengang noch einmal vorzumerken, ändert die
						bestehende Vormerkung.
					</p>
				</div>
			</form>
		{/if}
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="mine">
		<h2 id="mine" class="text-lg font-semibold">Meine Vormerkungen</h2>
		{#if groups.length === 0}
			<p class="text-base-content/80 text-sm">Du hast noch nichts vorgemerkt.</p>
		{/if}
		{#each groups as group (group.semester)}
			<article class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
				<h3 class="font-semibold">{group.name}</h3>
				<table class="table-sm table table-stack" use:stackedTable>
					<thead>
						<tr>
							<th>Modul</th>
							<th>Studiengang</th>
							<th>Stufe</th>
							<th>Notiz</th>
							<th>Stand</th>
							<th><span class="sr-only">Zurückziehen</span></th>
						</tr>
					</thead>
					<tbody>
						{#each group.rows as a (a.id)}
							<tr>
								<td>
									<a class="link" href={resolve('/module/[id]', { id: a.module.id })}
										>{a.module.name || 'Modul ohne Namen'}</a
									>
								</td>
								<td>{a.programme.code}</td>
								<td>
									{advanceLevelLabel(a.priority, a.maxTracks)}
								</td>
								<td class="text-sm">{a.note}</td>
								<td>
									<span class={advanceStatusBadge(a.status)}>{ADVANCE_STATUS_LABELS[a.status]}</span
									>
									<p class="text-base-content/80 mt-1 text-xs">
										{advanceStatusHint(a.status, a.programme.code)}
									</p>
								</td>
								<td data-label="">
									<form method="POST" action="?/withdraw" use:enhance>
										<input type="hidden" name="id" value={a.id} />
										<button
											class="btn btn-ghost btn-xs"
											type="submit"
											aria-label="Vormerkung {a.module.name} ({a.programme
												.code}, {group.name}) zurückziehen"
										>
											Zurückziehen
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</article>
		{/each}
	</section>
</div>
