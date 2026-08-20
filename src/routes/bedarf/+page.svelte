<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { PART_KIND_LABELS, DUTY_LABELS, dutyBadge, moduleName } from '$lib/catalogue';
	import {
		borrowedFromLabel,
		byCohortYear,
		cohortLabel,
		hasSibling,
		hoursLabel,
		nextTrack,
		partLabel
	} from '$lib/demand';
	import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
	import { hasAnyRole } from '$lib/roles';
	import { PHASE_HINTS, PHASE_LABELS, semesterName } from '$lib/semester';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const chosen = $derived(data.selected.semester !== '' && data.selected.programme !== '');

	/**
	 * Whether to offer the controls that write.
	 *
	 * **Cosmetic, like every other role-based hiding here.** The same API is reachable with a
	 * Personal Access Token, so what is hidden is not protected — the lock is `policy.MayWriteDemand`
	 * in the backend, and it is asked again on every one of these forms.
	 *
	 * Worth doing anyway, and here more than elsewhere: this page is also the one a lecturer
	 * reads in order to see what is being offered, and a screen full of buttons that all answer
	 * "nicht Ihr Studiengang" teaches people to ignore refusals.
	 *
	 * The roles come from the session and the programmes from the grants, which is the same
	 * intersection the backend makes — except under a role narrowing, where the backend is the
	 * stricter of the two. Being wrong in that direction shows a button that then refuses, which
	 * is the harmless half of a cosmetic rule.
	 */
	const mayPlan = $derived(
		hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE']) ||
			data.myProgrammes.some((p) => p.code === data.selected.programme)
	);
	const groups = $derived(byCohortYear(data.instances));
	const totalHours = $derived(data.instances.reduce((sum, i) => sum + i.teachingHours, 0));

	// The modules an instance can still be declared for: the programme's catalogue, minus the
	// ones without a split — those cannot be declared and are the work list instead.
	const declarable = $derived(data.modules.filter((m) => m.components.length > 0));
	const withoutSplit = $derived(data.modules.filter((m) => m.components.length === 0).length);

	// The other semesters, for the copy. Its own semester is not among them: the backend answers
	// SAME_SEMESTER, and offering it would be a click path into a refusal.
	const otherSemesters = $derived(
		data.semesters.filter((s) => s.code !== data.selected.semester).map((s) => s.code)
	);

	const partKinds = Object.keys(PART_KIND_LABELS) as InstancePartKind[];

	/** Which instance is expanded. Editing means comparing with the neighbours, so the list stays. */
	let editing = $state<string | null>(null);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Bedarf</h1>
		<p class="text-base-content/80 text-sm">
			Welche Instanzen muss ein Studiengang in einem Semester anbieten? Geplant werden nicht Module,
			sondern Instanzen: ein Modul, in einem Semester, für einen Studiengang, für einen Zug.
			Zugeteilt werden später die Teile — Vorlesung und Praktikum können verschiedene Personen
			halten.
		</p>
	</div>

	<form
		method="GET"
		class="border-base-300 bg-base-100 flex flex-wrap items-end gap-3 rounded-lg border p-4"
	>
		<label class="form-control">
			<span class="label-text text-sm">Semester</span>
			<select name="semester" class="select select-bordered select-sm">
				<option value="">bitte wählen</option>
				{#each data.semesters as semester (semester.code)}
					<option value={semester.code} selected={semester.code === data.selected.semester}>
						{semesterName(semester.code)}
					</option>
				{/each}
			</select>
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Studiengang</span>
			<select name="studiengang" class="select select-bordered select-sm">
				<option value="">bitte wählen</option>
				{#if data.myProgrammes.length > 0}
					<optgroup label="Meine Studiengänge">
						{#each data.myProgrammes as programme (programme.code)}
							<option value={programme.code} selected={programme.code === data.selected.programme}>
								{programme.code}{programme.title ? ` — ${programme.title}` : ''}
							</option>
						{/each}
					</optgroup>
				{/if}
				<optgroup label="Alle Studiengänge">
					{#each data.programmes as programme (programme.code)}
						<option value={programme.code} selected={programme.code === data.selected.programme}>
							{programme.code}{programme.title ? ` — ${programme.title}` : ''}
						</option>
					{/each}
				</optgroup>
			</select>
		</label>

		<button type="submit" class="btn btn-primary btn-sm">Anzeigen</button>
	</form>

	{#if form && 'error' in form && form.error}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{form.error}
			</p>
		</div>
	{/if}

	{#if form && 'copied' in form && form.copied}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-success badge-sm align-middle">Übernommen</span>
				{form.copied.created} Instanz(en) angelegt, {form.copied.partsCreated} Teil(e) dazu.
				{#if form.copied.skipped > 0}
					{form.copied.skipped} war(en) hier schon angelegt und wurde(n) nicht angefasst.
				{/if}
			</p>
		</div>
	{/if}

	{#if !chosen}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/80 text-sm">
				Bitte Semester und Studiengang wählen. Beides steht danach in der Adresse, die Ansicht lässt
				sich also verschicken.
			</p>
		</div>
	{:else}
		<div
			class="border-base-300 bg-base-100 flex flex-wrap items-center gap-3 rounded-lg border p-4"
		>
			<div class="grow">
				<h2 class="font-medium">
					{semesterName(data.selected.semester)} · {data.selected.programme}
				</h2>
				<p class="text-base-content/80 text-sm">
					{data.instances.length} Instanz(en), zusammen {hoursLabel(totalHours)} Lehre.
					{#if data.current}
						{PHASE_HINTS[data.current.phase]}
					{/if}
				</p>
			</div>
			{#if data.current}
				<span class="badge badge-neutral">{PHASE_LABELS[data.current.phase]}</span>
			{/if}
		</div>

		{#if mayPlan && withoutSplit > 0}
			<div
				class="border-base-300 bg-base-100 flex flex-wrap items-center gap-3 rounded-lg border p-4"
			>
				<p class="text-base-content/90 grow text-sm">
					<span class="badge badge-warning badge-sm align-middle">Zu tun</span>
					{withoutSplit} Modul(e) dieses Studiengangs haben noch keine SWS-Aufteilung. Ohne sie lässt
					sich keine Instanz anlegen — die Teile der Instanz entstehen daraus.
				</p>
				<!-- Als GET-Formular statt als Link mit Query-String: Ziel ist der Katalog mit zwei
				     Filtern, und `resolve()` kennt nur den Pfad. So steht der Pfad genau einmal und
				     aufgelöst da, und die Filter stehen als Felder daneben. -->
				<form method="GET" action={resolve('/module')}>
					<input type="hidden" name="studiengang" value={data.selected.programme} />
					<input type="hidden" name="ohne-aufteilung" value="1" />
					<button type="submit" class="btn btn-sm">Aufteilungen eintragen</button>
				</form>
			</div>
		{/if}

		{#if mayPlan}
			<div class="border-base-300 bg-base-100 rounded-lg border p-4">
				<h2 class="mb-2 flex items-center gap-2 font-medium">
					<span aria-hidden="true">➕</span> Instanz anlegen
				</h2>
				<p class="text-base-content/80 mb-3 text-sm">
					Die Teile entstehen aus der Aufteilung des Moduls — je eine Vorlesung, je ein Praktikum.
					Weitere Praktikumsgruppen und ein zweiter Zug kommen danach.
				</p>
				<form
					method="POST"
					action="?/declare"
					use:enhance
					class="grid grid-cols-1 gap-3 sm:grid-cols-4"
				>
					<input type="hidden" name="semester" value={data.selected.semester} />
					<input type="hidden" name="programme" value={data.selected.programme} />
					<label class="form-control sm:col-span-2">
						<span class="label-text text-sm">Modul</span>
						<select name="moduleId" class="select select-bordered select-sm" required>
							<option value="">bitte wählen</option>
							{#each declarable as module (module.id)}
								<option value={module.id}>
									{moduleName(module)}{module.dutyStatus
										? ` — ${DUTY_LABELS[module.dutyStatus]}`
										: ''}
								</option>
							{/each}
						</select>
					</label>
					<label class="form-control">
						<span class="label-text text-sm">Zug</span>
						<input
							type="text"
							name="track"
							maxlength="3"
							placeholder="leer lassen"
							class="input input-bordered input-sm"
						/>
					</label>
					<label class="form-control">
						<span class="label-text text-sm">Fachsemester</span>
						<input
							type="number"
							name="programmeSemester"
							min="1"
							max="12"
							placeholder="aus der SPO"
							class="input input-bordered input-sm"
						/>
					</label>
					<div class="sm:col-span-4">
						<button type="submit" class="btn btn-primary btn-sm">Anlegen</button>
					</div>
				</form>
			</div>

			<details class="border-base-300 bg-base-100 rounded-lg border p-4">
				<summary class="cursor-pointer font-medium">
					<span aria-hidden="true">📋</span> Bedarf eines anderen Semesters übernehmen
				</summary>
				<p class="text-base-content/80 mt-3 text-sm">
					Übernommen werden die Instanzen samt ihrer Teile — also auch, wie viele Praktikumsgruppen
					ein Zug hatte. Was hier schon angelegt ist, bleibt unangetastet.
				</p>
				<form method="POST" action="?/copy" use:enhance class="mt-3 flex flex-wrap items-end gap-3">
					<input type="hidden" name="to" value={data.selected.semester} />
					<input type="hidden" name="programme" value={data.selected.programme} />
					<label class="form-control">
						<span class="label-text text-sm">Aus Semester</span>
						<select name="from" class="select select-bordered select-sm" required>
							<option value="">bitte wählen</option>
							{#each otherSemesters as code (code)}
								<option value={code}>{semesterName(code)}</option>
							{/each}
						</select>
					</label>
					<button type="submit" class="btn btn-sm">Übernehmen</button>
				</form>
			</details>
		{/if}

		{#if data.instances.length === 0}
			<div class="border-base-300 bg-base-100 rounded-lg border p-4">
				<p class="text-base-content/80 text-sm">
					Für dieses Semester ist in {data.selected.programme} noch nichts angemeldet.
				</p>
			</div>
		{/if}

		{#each groups as group (group.programmeSemester ?? 'offen')}
			<section class="flex flex-col gap-3">
				<h2 class="text-lg font-medium">
					{#if group.programmeSemester == null}
						Ohne Fachsemester
					{:else}
						{group.programmeSemester}. Fachsemester
					{/if}
					<span class="text-base-content/80 text-sm font-normal">
						({group.instances.length})
					</span>
				</h2>

				{#each group.instances as instance (instance.id)}
					<article class="border-base-300 bg-base-100 rounded-lg border p-4">
						<div class="flex flex-wrap items-baseline gap-2">
							<span class="badge badge-neutral">
								{cohortLabel(data.selected.programme, instance.programmeSemester, instance.track)}
							</span>
							<h3 class="grow font-medium">
								<a class="link" href={resolve('/module/[id]', { id: instance.module.id })}>
									{moduleName(instance.module)}
								</a>
							</h3>
							{#if instance.module.dutyStatus}
								<span class="badge {dutyBadge(instance.module.dutyStatus)} badge-sm">
									{DUTY_LABELS[instance.module.dutyStatus]}
								</span>
							{/if}
							<span class="text-base-content/80 text-sm">{hoursLabel(instance.teachingHours)}</span>
						</div>

						<ul class="mt-3 flex flex-col gap-1">
							{#each instance.parts as part (part.id)}
								<li class="flex flex-wrap items-center gap-2 text-sm">
									<span>{partLabel(part)}</span>
									{#if part.sharedAcrossTracks}
										<span class="badge badge-secondary badge-sm">für alle Züge</span>
									{/if}
								</li>
							{/each}
							{#each instance.borrowedParts as borrowed (borrowed.part.id)}
								<li class="text-base-content/80 flex flex-wrap items-center gap-2 text-sm">
									<span>{partLabel(borrowed.part)}</span>
									<span class="badge badge-ghost badge-sm">
										gehalten mit {borrowedFromLabel(data.selected.programme, borrowed.fromTrack)}
									</span>
								</li>
							{/each}
							{#if instance.parts.length === 0 && instance.borrowedParts.length === 0}
								<li class="text-base-content/80 text-sm">Noch keine Teile.</li>
							{/if}
						</ul>

						{#if mayPlan}
							<div class="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									class="btn btn-sm"
									onclick={() => (editing = editing === instance.id ? null : instance.id)}
									aria-expanded={editing === instance.id}
								>
									{editing === instance.id ? 'Fertig' : 'Bearbeiten'}
								</button>

								<form
									method="POST"
									action="?/duplicate"
									use:enhance
									class="flex items-center gap-2"
								>
									<input type="hidden" name="id" value={instance.id} />
									<input type="hidden" name="track" value={nextTrack(instance, data.instances)} />
									<!-- Hat die Quelle noch keinen Buchstaben, bekommt sie in derselben Aktion
								     ein A: aus IF1 werden IF1A und IF1B in einem Schritt. -->
									<input
										type="hidden"
										name="sourceTrack"
										value={instance.track === '' ? 'A' : ''}
									/>
									<button type="submit" class="btn btn-sm">
										Zug {nextTrack(instance, data.instances)} anlegen
									</button>
								</form>
							</div>
						{/if}

						{#if editing === instance.id && mayPlan}
							<div class="border-base-300 mt-3 flex flex-col gap-4 border-t pt-3">
								<form
									method="POST"
									action="?/change"
									use:enhance
									class="flex flex-wrap items-end gap-3"
								>
									<input type="hidden" name="id" value={instance.id} />
									<label class="form-control">
										<span class="label-text text-sm">Zug</span>
										<input
											type="text"
											name="track"
											maxlength="3"
											value={instance.track}
											class="input input-bordered input-sm w-24"
										/>
									</label>
									<label class="form-control">
										<span class="label-text text-sm">Fachsemester</span>
										<input
											type="number"
											name="programmeSemester"
											min="1"
											max="12"
											value={instance.programmeSemester ?? ''}
											class="input input-bordered input-sm w-28"
										/>
									</label>
									<button type="submit" class="btn btn-sm">Speichern</button>
								</form>

								<div class="flex flex-col gap-2">
									<h4 class="text-sm font-medium">Teile</h4>
									{#each instance.parts as part (part.id)}
										<div class="flex flex-wrap items-end gap-2">
											<form
												method="POST"
												action="?/changePart"
												use:enhance
												class="flex flex-wrap items-end gap-2"
											>
												<input type="hidden" name="id" value={part.id} />
												<label class="form-control">
													<span class="label-text text-sm">Art</span>
													<select name="kind" class="select select-bordered select-sm">
														{#each partKinds as kind (kind)}
															<option value={kind} selected={kind === part.kind}>
																{PART_KIND_LABELS[kind]}
															</option>
														{/each}
													</select>
												</label>
												<label class="form-control">
													<span class="label-text text-sm">SWS</span>
													<input
														type="text"
														name="teachingHours"
														inputmode="decimal"
														value={part.teachingHours ?? ''}
														class="input input-bordered input-sm w-20"
													/>
												</label>
												<button type="submit" class="btn btn-sm">Speichern</button>
											</form>

											{#if part.sharedAcrossTracks}
												<form method="POST" action="?/splitPart" use:enhance>
													<input type="hidden" name="id" value={part.id} />
													<button type="submit" class="btn btn-sm">Züge wieder trennen</button>
												</form>
											{:else if hasSibling(instance, data.instances)}
												<form method="POST" action="?/sharePart" use:enhance>
													<input type="hidden" name="id" value={part.id} />
													<button type="submit" class="btn btn-sm">
														Für alle Züge zusammenlegen
													</button>
												</form>
											{/if}

											<form method="POST" action="?/removePart" use:enhance>
												<input type="hidden" name="id" value={part.id} />
												<button type="submit" class="btn btn-sm">Entfernen</button>
											</form>
										</div>
									{/each}

									<form
										method="POST"
										action="?/addPart"
										use:enhance
										class="flex flex-wrap items-end gap-2"
									>
										<input type="hidden" name="instanceId" value={instance.id} />
										<label class="form-control">
											<span class="label-text text-sm">Teil hinzufügen</span>
											<select name="kind" class="select select-bordered select-sm">
												{#each partKinds as kind (kind)}
													<option value={kind} selected={kind === 'LAB'}>
														{PART_KIND_LABELS[kind]}
													</option>
												{/each}
											</select>
										</label>
										<label class="form-control">
											<span class="label-text text-sm">SWS</span>
											<input
												type="text"
												name="teachingHours"
												inputmode="decimal"
												class="input input-bordered input-sm w-20"
											/>
										</label>
										<button type="submit" class="btn btn-sm">Hinzufügen</button>
									</form>
								</div>

								<form method="POST" action="?/withdraw" use:enhance>
									<input type="hidden" name="id" value={instance.id} />
									<button type="submit" class="btn btn-sm">Instanz zurückziehen</button>
									<span class="text-base-content/80 ml-2 text-sm">
										Die Teile gehen mit. Sobald etwas daran hängt, geht es nicht mehr.
									</span>
								</form>
							</div>
						{/if}
					</article>
				{/each}
			</section>
		{/each}
	{/if}
</div>
