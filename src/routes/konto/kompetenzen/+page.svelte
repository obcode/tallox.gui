<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		COMPETENCE_LEVELS,
		COMPETENCE_LEVEL_LABELS,
		belowMinimum,
		competenceByModule,
		minimumHint,
		outsideStatements,
		savedHint,
		sortModules
	} from '$lib/competences';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form : null);
	const rowRefusals = $derived(
		new Map((form && 'refusals' in form ? form.refusals : []).map((r) => [r.moduleId, r.message]))
	);
	const savedCount = $derived(form && 'saved' in form ? (form.saved ?? 0) : null);

	const mineByModule = $derived(competenceByModule(data.mine));
	const statusByGroup = $derived(new Map(data.status.map((s) => [s.subjectGroup.id, s])));
	const groups = $derived(
		[...data.groups]
			.sort((a, b) => a.code.localeCompare(b.code, 'de'))
			.map((g) => ({ ...g, modules: sortModules(g.modules) }))
	);
	const inMyGroups = $derived(new Set(groups.flatMap((g) => g.modules.map((m) => m.id))));
	const outside = $derived(outsideStatements(data.mine, inMyGroups));
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Meine Kompetenzen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Welche Module Du halten <strong>kannst</strong> — auch, wenn es kurzfristig brennt — und
			welche Du in Zukunft gern halten <strong>würdest</strong>. Daraus entsteht für jedes Modul ein
			Pool, auf den die Fachgruppenleitung bei der Zuteilung schaut.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Angeboten werden die Module Deiner Fachgruppen, die Pflichtfächer zuerst. Die Fakultät bittet
			um mindestens drei Pflichtfächer je Fachgruppe — nicht nur die Rosinen. Wer sich ein neues
			Gebiet erschließt, tritt unter
			<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a> der Fachgruppe bei.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Wer das sieht: Du selbst, die Leitung der Fachgruppe des Moduls, die Leitung seines
			Studiengangs und das Dekanat. Kolleg:innen sehen es nicht — auch nicht später.
		</p>
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{:else if savedCount !== null}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				{savedHint(savedCount)}
				{#if rowRefusals.size > 0}
					<span class="badge badge-error badge-sm align-middle">
						{rowRefusals.size === 1 ? 'Eine Zeile' : `${rowRefusals.size} Zeilen`} nicht gespeichert
					</span>
				{/if}
			</p>
		</div>
	{/if}

	{#if groups.length === 0}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				Du bist noch keiner Fachgruppe zugeordnet. Kompetenzen gibst Du für die Module Deiner
				Fachgruppen an — tritt zuerst unter
				<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a> einer bei.
			</p>
		</div>
	{:else}
		{#key data.mine}
			<form
				method="POST"
				action="?/save"
				use:enhance={() =>
					// reset: false — the fields show a state, not an input to be cleared.
					async ({ update }) => {
						await update({ reset: false });
					}}
				class="flex flex-col gap-4"
			>
				{#each groups as group (group.id)}
					{@const status = statusByGroup.get(group.id)}
					<section
						class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
						aria-labelledby="group-{group.id}"
					>
						<h2 id="group-{group.id}" class="text-lg font-semibold">
							<span class="font-mono">{group.code}</span> — {group.name}
						</h2>
						{#if status}
							<p class="text-base-content/80 text-sm">
								{#if belowMinimum(status)}
									<span class="badge badge-warning badge-sm align-middle">Noch zu wenige</span>
								{/if}
								{minimumHint(status)}
							</p>
						{/if}

						{#if group.modules.length === 0}
							<p class="text-base-content/80 text-sm">
								Dieser Fachgruppe ist noch kein Modul zugeordnet.
							</p>
						{:else}
							<div class="overflow-x-auto">
								<table class="table-sm table">
									<thead>
										<tr>
											<th>Modul</th>
											<th>Stufe</th>
											<th>Notiz</th>
										</tr>
									</thead>
									<tbody>
										{#each group.modules as module (module.id)}
											{@const mine = mineByModule.get(module.id)}
											{@const rowRefusal = rowRefusals.get(module.id)}
											<tr>
												<td>
													<a class="link" href={resolve(`/module/${module.id}`)}>
														{module.name || 'Modul ohne Namen'}
													</a>
													<span class="text-base-content/80">({module.homeProgrammeCode})</span>
													{#if module.compulsory}
														<span class="badge badge-neutral badge-sm">Pflicht</span>
													{/if}
													{#if rowRefusal}
														<span class="text-base-content/90 block text-sm">
															<span class="badge badge-error badge-sm">Nicht gespeichert</span>
															{rowRefusal}
														</span>
													{/if}
												</td>
												<td>
													<select
														name="level:{module.id}"
														class="select select-sm"
														aria-label="Stufe für {module.name || 'Modul ohne Namen'}"
													>
														<option value="" selected={!mine}>—</option>
														{#each COMPETENCE_LEVELS as level (level)}
															<option value={level} selected={mine?.level === level}>
																{COMPETENCE_LEVEL_LABELS[level]}
															</option>
														{/each}
													</select>
												</td>
												<td>
													<input
														type="text"
														name="note:{module.id}"
														value={mine?.note ?? ''}
														maxlength="500"
														class="input input-sm w-full min-w-40"
														aria-label="Notiz zu {module.name || 'Modul ohne Namen'}"
													/>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</section>
				{/each}

				<div>
					<button type="submit" class="btn btn-sm btn-primary">Speichern</button>
				</div>
			</form>
		{/key}
	{/if}

	{#if outside.length > 0}
		<section
			class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
			aria-labelledby="outside"
		>
			<h2 id="outside" class="text-lg font-semibold">Außerhalb Deiner Fachgruppen</h2>
			<p class="text-base-content/80 text-sm">
				Diese Angaben stammen aus einer Fachgruppe, der Du nicht mehr angehörst, oder das Modul ist
				inzwischen woanders einsortiert. Sie bleiben stehen, bis Du sie entfernst.
			</p>
			<ul class="flex flex-col gap-1">
				{#each outside as c (c.id)}
					<li class="flex flex-wrap items-center gap-2 text-sm">
						<span>{c.module.name || 'Modul ohne Namen'}</span>
						<span class="text-base-content/80">— {COMPETENCE_LEVEL_LABELS[c.level]}</span>
						<form method="POST" action="?/withdraw" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button type="submit" class="btn btn-xs">Entfernen</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
