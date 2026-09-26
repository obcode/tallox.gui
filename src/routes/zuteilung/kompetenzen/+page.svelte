<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		COMPETENCE_LEVELS,
		COMPETENCE_LEVEL_OTHERS,
		belowMinimum,
		holderLabel,
		isTeacherRow,
		poolsByModule,
		sortModules
	} from '$lib/competences';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form.message : null);
	const pools = $derived(poolsByModule(data.competences));
	const modules = $derived(sortModules(data.group?.modules ?? []));
	const below = $derived(data.members.filter(belowMinimum));
	const groups = $derived([...data.groups].sort((a, b) => a.code.localeCompare(b.code, 'de')));
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Kompetenzen einer Fachgruppe</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Wer die Module der Fachgruppe halten kann, wer sie gern halten würde, welche Module niemand
			abdeckt — und wer noch unter den erbetenen drei Pflichtfächern liegt. Die Angaben machen die
			Kolleg:innen selbst unter <a class="link" href={resolve('/konto/kompetenzen')}
				>Meine Kompetenzen</a
			>; für Lehrende ohne Konto trägst Du sie hier ein.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Vertraulich: Sichtbar für die Leitung der Fachgruppe, die Leitung des Studiengangs eines
			Moduls und das Dekanat — nicht für die Kolleg:innen untereinander.
			<a class="link" href={resolve('/zuteilung')}>Zurück zur Zuteilung</a>
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<label class="flex flex-col gap-1 text-sm">
			<span>Fachgruppe</span>
			<select name="fachgruppe" class="select select-sm" value={data.selected.group}>
				<option value="">— wählen —</option>
				{#each groups as g (g.id)}
					<option value={g.id}>{g.code} — {g.name}</option>
				{/each}
			</select>
		</label>
		<button type="submit" class="btn btn-sm">Anzeigen</button>
	</form>

	{#if groups.length === 0}
		<p class="text-base-content/80 text-sm">
			Du leitest keine Fachgruppe. Diese Seite ist für Fachgruppenleitungen und das Dekanat.
		</p>
	{:else if !data.group}
		<p class="text-base-content/80 text-sm">Wähle eine Fachgruppe.</p>
	{:else}
		{#if refusal}
			<div class="border-base-300 bg-base-100 rounded-lg border p-4">
				<p class="text-base-content/90 text-sm">
					<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
					{refusal}
				</p>
			</div>
		{/if}

		<section
			class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
			aria-labelledby="pool"
		>
			<h2 id="pool" class="text-lg font-semibold">
				Wer kann was — <span class="font-mono">{data.group.code}</span>
			</h2>
			{#if modules.length === 0}
				<p class="text-base-content/80 text-sm">
					Dieser Fachgruppe ist noch kein Modul zugeordnet.
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table-sm table">
						<thead>
							<tr>
								<th>Modul</th>
								<th>{COMPETENCE_LEVEL_OTHERS.CAN_TEACH}</th>
								<th>{COMPETENCE_LEVEL_OTHERS.WOULD_LIKE}</th>
							</tr>
						</thead>
						<tbody>
							{#each modules as module (module.id)}
								{@const pool = pools.get(module.id)}
								<tr>
									<td>
										{module.name || 'Modul ohne Namen'}
										<span class="text-base-content/80">({module.homeProgrammeCode})</span>
										{#if module.compulsory}
											<span class="badge badge-neutral badge-sm">Pflicht</span>
										{/if}
									</td>
									{#each [pool?.canTeach ?? [], pool?.wouldLike ?? []] as holders, column (column)}
										<td>
											{#if holders.length === 0}
												<span class="text-base-content/80">—</span>
											{:else}
												<ul class="flex flex-col gap-0.5">
													{#each holders as c (c.id)}
														<li class="flex flex-wrap items-center gap-1">
															<span>{holderLabel(c)}</span>
															{#if isTeacherRow(c)}
																<span class="badge badge-ghost badge-sm">ohne Konto</span>
																<form method="POST" action="?/withdrawTeacher" use:enhance>
																	<input type="hidden" name="id" value={c.id} />
																	<button
																		type="submit"
																		class="btn btn-xs"
																		aria-label="{c.holder.name} bei {module.name} entfernen"
																	>
																		Entfernen
																	</button>
																</form>
															{/if}
														</li>
													{/each}
												</ul>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		{#if data.countsRefused}
			<div class="border-base-300 bg-base-100 rounded-lg border p-4">
				<p class="text-base-content/90 text-sm">{data.countsRefused}</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<section
					class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
					aria-labelledby="gaps"
				>
					<h2 id="gaps" class="text-lg font-semibold">Wenn es brennt, kann es niemand</h2>
					{#if data.gaps.length === 0}
						<p class="text-base-content/80 text-sm">
							Für jedes Modul hat jemand „kann halten“ angegeben.
						</p>
					{:else}
						<ul class="flex flex-col gap-0.5 text-sm">
							{#each data.gaps as gap (gap.id)}
								<li>
									{gap.name || 'Modul ohne Namen'}
									{#if gap.compulsory}
										<span class="badge badge-neutral badge-sm">Pflicht</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<section
					class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
					aria-labelledby="below"
				>
					<h2 id="below" class="text-lg font-semibold">Unter den erbetenen Pflichtfächern</h2>
					<p class="text-base-content/80 text-sm">
						Mitglieder der Fachgruppe mit weniger als {data.members[0]?.minimum ?? 3} Pflichtfächern als
						„kann halten“. Ein Hinweis zum Nachfragen, keine Sperre.
					</p>
					{#if below.length === 0}
						<p class="text-base-content/80 text-sm">Niemand.</p>
					{:else}
						<ul class="flex flex-col gap-0.5 text-sm">
							{#each below as m (m.member.personId)}
								<li>
									{m.member.name}
									<span class="text-base-content/80">— {m.canTeachCompulsory} von {m.minimum}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		{/if}

		<section
			class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4"
			aria-labelledby="teacher"
		>
			<h2 id="teacher" class="text-lg font-semibold">Für Lehrende ohne Konto eintragen</h2>
			<p class="text-base-content/80 text-sm">
				Lehrbeauftragte und Kolleg:innen anderer Hochschulen können sich nicht anmelden. Wer ein
				Konto hat, trägt seine Kompetenzen selbst ein und erscheint deshalb in der Suche nicht.
			</p>

			<form method="GET" class="flex flex-wrap items-end gap-2">
				<input type="hidden" name="fachgruppe" value={data.selected.group} />
				<label class="flex flex-col gap-1 text-sm">
					<span>Person suchen</span>
					<input
						type="search"
						name="q"
						value={data.selected.search}
						class="input input-sm"
						placeholder="Name oder Adresse"
					/>
				</label>
				<button type="submit" class="btn btn-sm">Suchen</button>
			</form>

			{#if data.selected.search !== '' && data.found.length === 0}
				<p class="text-base-content/80 text-sm">Niemand ohne Konto gefunden.</p>
			{:else if data.found.length > 0}
				<form
					method="POST"
					action="?/setTeacher"
					use:enhance
					class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
				>
					<label class="flex flex-col gap-1 text-sm">
						<span>Person</span>
						<select name="teacher" class="select select-sm" required>
							{#each data.found as t (t.id)}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span>Modul</span>
						<select name="module" class="select select-sm" required>
							{#each modules as module (module.id)}
								<option value={module.id}>{module.name || 'Modul ohne Namen'}</option>
							{/each}
						</select>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span>Stufe</span>
						<select name="level" class="select select-sm">
							{#each COMPETENCE_LEVELS as level (level)}
								<option value={level}>{COMPETENCE_LEVEL_OTHERS[level]}</option>
							{/each}
						</select>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span>Notiz</span>
						<input type="text" name="note" maxlength="500" class="input input-sm" />
					</label>
					<div>
						<button type="submit" class="btn btn-sm btn-primary">Eintragen</button>
					</div>
				</form>
			{/if}
		</section>
	{/if}
</div>
