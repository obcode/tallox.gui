<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { DUTY_LABELS, dutyBadge, moduleName } from '$lib/catalogue';
	import {
		byYear,
		compareWithPrevious,
		demandRows,
		effectiveComponents,
		hoursLabel,
		partLabel,
		trackLetters,
		trackSummary
	} from '$lib/demand';
	import { hasAnyRole } from '$lib/roles';
	import { PHASE_HINTS, PHASE_LABELS, semesterName } from '$lib/semester';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const chosen = $derived(data.selected.semester !== '' && data.selected.programme !== '');

	const rows = $derived(
		demandRows(data.modules, data.instances, data.previousInstances, data.selected.previous)
	);
	const shown = $derived(
		rows.filter(
			(row) =>
				(!data.selected.onlyEstimated || row.module.splitIsEstimated) &&
				(!data.selected.onlyPlanned || row.planned)
		)
	);
	const groups = $derived(byYear(shown));

	const totalHours = $derived(data.instances.reduce((sum, i) => sum + i.teachingHours, 0));
	const openEstimates = $derived(data.modules.filter((m) => m.splitIsEstimated).length);
	const comparison = $derived(compareWithPrevious(data.instances, data.previousInstances));

	/**
	 * Whether to offer the controls that write. **Cosmetic** — the lock is `policy.MayWriteDemand`
	 * in the backend, and it is asked again on every save. Worth doing because a lecturer reads
	 * this page to see what is offered, and a screen full of controls that all answer "not your
	 * programme" teaches people to ignore refusals.
	 */
	const mayPlan = $derived(
		hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE']) ||
			data.myProgrammes.some((p) => p.code === data.selected.programme)
	);

	/**
	 * A row of this page's table, with the module fields the query asked for.
	 *
	 * Taken off `rows` rather than written out: the shape belongs to the query above, and naming
	 * it twice is how the two stop agreeing.
	 */
	type Row = (typeof rows)[number];

	/** What one row of the table currently says, before it is saved. */
	type Draft = { offered: boolean; tracks: number; groups: number[]; year: string };

	/**
	 * What the server says each row is, and what somebody has changed about it since.
	 *
	 * Two halves on purpose. `seeded` is derived from the load and is therefore always current;
	 * `edits` holds only the rows somebody touched, and is emptied after a save — at which point
	 * the load has run again and `seeded` is the truth. Keeping the edits in a `$state` of their
	 * own is what makes the steppers reactive: a derived object is not deeply reactive, so
	 * writing a field of one changes nothing on the screen.
	 */
	const seeded = $derived(
		Object.fromEntries(rows.map((row) => [row.module.id, draftOf(row)] as const))
	);
	let edits = $state<Record<string, Draft>>({});

	function draft(row: Row): Draft {
		return edits[row.module.id] ?? seeded[row.module.id] ?? draftOf(row);
	}

	function edit(row: Row, change: Partial<Draft>) {
		edits = { ...edits, [row.module.id]: { ...draft(row), ...change } };
	}

	function draftOf(row: Row): Draft {
		const groups = row.tracks.map((t) => t.groups);
		return {
			offered: row.tracks.length > 0,
			tracks: Math.max(1, row.tracks.length),
			groups: groups.length > 0 ? groups : [defaultGroups(row)],
			year: row.programmeSemester == null ? '' : String(row.programmeSemester)
		};
	}

	/** A module with a practical unit runs one group of it until somebody says otherwise. */
	function defaultGroups(row: Row): number {
		return row.module.practicalKind ? 1 : 0;
	}

	/**
	 * Raising the number of cohorts gives the new one as many groups as the last — equal is the
	 * common case, unequal the possible one, and the page starts from the common one.
	 */
	function setTracks(row: Row, count: number) {
		const current = draft(row);
		const tracks = Math.min(8, Math.max(1, count));
		const groups = [...current.groups];
		while (groups.length < tracks) groups.push(groups[groups.length - 1] ?? defaultGroups(row));
		groups.length = tracks;
		edit(row, { tracks, groups });
	}

	function setGroups(row: Row, index: number, count: number) {
		const groups = [...draft(row).groups];
		groups[index] = Math.min(12, Math.max(0, count));
		edit(row, { groups });
	}

	/** Reads a number out of an input that a person may have emptied. */
	function numberOf(target: EventTarget | null): number {
		const value = Number((target as HTMLInputElement | null)?.value);
		return Number.isFinite(value) ? value : 0;
	}

	function lettersOf(row: Row): string[] {
		return trackLetters(
			draft(row).tracks,
			row.tracks.map((t) => t.track)
		);
	}

	/** The split a row is planned with, as one line: `Vorlesung 4 SWS + Praktikum 2 SWS`. */
	function splitLabel(row: Row): string {
		const components = effectiveComponents(row.module);
		if (components.length === 0) return 'keine SWS im Katalog';
		return components.map((c) => partLabel(c)).join(' + ');
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Bedarf</h1>
		<p class="text-base-content/80 text-sm">
			Welche Instanzen muss ein Studiengang in einem Semester anbieten? Eine Zeile je Modul:
			anhaken, Züge und Praktikumsgruppen setzen, speichern. Zugeteilt werden später die Teile —
			Vorlesung und Praktikum können verschiedene Personen halten.
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

		<label class="form-control">
			<span class="label-text text-sm">Suche</span>
			<input
				type="search"
				name="q"
				value={data.selected.search}
				placeholder="Modulname"
				class="input input-bordered input-sm"
			/>
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Art</span>
			<select name="art" class="select select-bordered select-sm">
				<option value="">alle</option>
				<option value="COMPULSORY" selected={data.selected.duty === 'COMPULSORY'}>Pflicht</option>
				<option value="ELECTIVE" selected={data.selected.duty === 'ELECTIVE'}>Wahlpflicht</option>
			</select>
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Turnus</span>
			<select name="turnus" class="select select-bordered select-sm">
				<option value="WS" selected={data.selected.term === 'WS'}>Wintersemester</option>
				<option value="SS" selected={data.selected.term === 'SS'}>Sommersemester</option>
				<option value="" selected={data.selected.term === ''}>alle</option>
			</select>
		</label>

		<label class="flex items-center gap-2 pb-1 text-sm">
			<input
				name="offen"
				type="checkbox"
				value="1"
				checked={data.selected.onlyEstimated}
				class="checkbox checkbox-sm"
			/>
			nur geschätzte Aufteilungen
		</label>

		<label class="flex items-center gap-2 pb-1 text-sm">
			<input
				name="geplant"
				type="checkbox"
				value="1"
				checked={data.selected.onlyPlanned}
				class="checkbox checkbox-sm"
			/>
			nur geplante
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

	{#if form && 'report' in form && form.report}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-success badge-sm align-middle">Gespeichert</span>
				{form.report.created.length} angelegt, {form.report.changed.length} geändert, {form.report
					.withdrawn.length} zurückgezogen. Geplant sind jetzt
				{hoursLabel(form.report.teachingHours)}.
			</p>
			{#if form.report.refused.length > 0}
				<ul class="mt-2 flex flex-col gap-1">
					{#each form.report.refused as refusal, i (i)}
						<li class="text-base-content/90 text-sm">
							<span class="badge badge-warning badge-sm align-middle">Nicht möglich</span>
							{refusal.moduleName}{refusal.track ? ` ${refusal.track}` : ''}: {refusal.message}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	{#if form && 'preview' in form && form.preview}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 font-medium">
				<span aria-hidden="true">⚠️</span> Bitte bestätigen
			</h2>
			<p class="text-base-content/90 text-sm">
				Dieser Schritt zieht {form.preview.withdrawn.length} Instanz(en) zurück. Die Teile gehen mit;
				sobald etwas daran hängt, wird die Instanz einzeln abgelehnt und bleibt.
			</p>
			<ul class="mt-2 flex flex-col gap-1">
				{#each form.preview.withdrawn as change, i (i)}
					<li class="text-base-content/90 text-sm">
						{change.moduleName}{change.track ? ` — Zug ${change.track}` : ''}
					</li>
				{/each}
			</ul>
			{#if form.preview.created.length > 0 || form.preview.changed.length > 0}
				<p class="text-base-content/80 mt-2 text-sm">
					Außerdem: {form.preview.created.length} neu, {form.preview.changed.length} geändert.
				</p>
			{/if}
			<form method="POST" action="?/apply" use:enhance class="mt-3 flex flex-wrap gap-2">
				<input type="hidden" name="semester" value={data.selected.semester} />
				<input type="hidden" name="programme" value={data.selected.programme} />
				<input type="hidden" name="payload" value={form.payload} />
				<button type="submit" class="btn btn-primary btn-sm">Zurückziehen und speichern</button>
			</form>
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
					{#if data.previousInstances.length > 0}
						Gegenüber {semesterName(data.selected.previous)}: {comparison.added} Modul(e) neu,
						{comparison.removed} nicht mehr, {hoursLabel(
							comparison.hoursAfter - comparison.hoursBefore
						)} Unterschied.
					{/if}
					{#if data.current}
						{PHASE_HINTS[data.current.phase]}
					{/if}
				</p>
			</div>
			{#if openEstimates > 0}
				<!-- Als GET-Formular statt als Link: `resolve()` kennt nur den Pfad, die Auswahl steht
				     in Query-Parametern, und ein handgeschriebener Link mit beidem ist genau das, was
				     die Lint-Regel verhindert. -->
				<form method="GET">
					<input type="hidden" name="semester" value={data.selected.semester} />
					<input type="hidden" name="studiengang" value={data.selected.programme} />
					<input type="hidden" name="offen" value="1" />
					<button type="submit" class="badge badge-warning">
						{openEstimates} Aufteilung(en) geschätzt
					</button>
				</form>
			{/if}
			{#if data.current}
				<span class="badge badge-neutral">{PHASE_LABELS[data.current.phase]}</span>
			{/if}
		</div>

		{#if shown.length === 0}
			<div class="border-base-300 bg-base-100 rounded-lg border p-4">
				<p class="text-base-content/80 text-sm">
					Keine Module in dieser Auswahl. Vielleicht ist der Turnus zu eng gesetzt.
				</p>
			</div>
		{/if}

		<!--
			`enhance` mit eigenem Callback: nach dem Speichern hat der Load neu geladen, und die
			Bearbeitungen von vorhin sind damit beantwortet. Sie stehen zu lassen hieße, die
			Zahlen von vor dem Speichern über die frisch geladenen zu legen.
		-->
		<form
			method="POST"
			action="?/plan"
			use:enhance={() =>
				async ({ update }) => {
					edits = {};
					await update({ reset: false });
				}}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="semester" value={data.selected.semester} />
			<input type="hidden" name="programme" value={data.selected.programme} />

			{#each groups as group (group.programmeSemester ?? 'offen')}
				<section class="flex flex-col gap-2">
					<h2 class="text-lg font-medium">
						{#if group.programmeSemester == null}
							Ohne Fachsemester
						{:else}
							{group.programmeSemester}. Fachsemester
						{/if}
						<span class="text-base-content/80 text-sm font-normal">
							({group.rows.length} Module, {hoursLabel(group.teachingHours)})
						</span>
					</h2>

					<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Modul</th>
									<th>Fachsem.</th>
									<th>Aufteilung</th>
									<th>Züge</th>
									<th>Gruppen</th>
									<th>SWS</th>
								</tr>
							</thead>
							<tbody>
								{#each group.rows as row (row.module.id)}
									{@const d = draft(row)}
									{@const letters = lettersOf(row)}
									<tr>
										<td>
											<input type="hidden" name="module" value={row.module.id} />
											<!-- Bei einem Zug steht sein Buchstabe hier, weil es keine Zug-Zeile
											     gibt, in der er stehen könnte. Ein Feld zwischen zwei <tr> wäre
											     ungültiges HTML, und der Browser verschöbe es beim Parsen. -->
											{#if letters.length === 1}
												<input type="hidden" name="track:{row.module.id}:0" value={letters[0]} />
											{/if}
											<label class="flex items-start gap-2">
												<input
													type="checkbox"
													name="offer"
													value={row.module.id}
													checked={draft(row).offered}
													onchange={(e) => edit(row, { offered: e.currentTarget.checked })}
													disabled={!mayPlan || !row.module.plannable}
													class="checkbox checkbox-sm mt-1"
												/>
												<span>
													<a
														class="link font-medium"
														href={resolve('/module/[id]', { id: row.module.id })}
													>
														{moduleName(row.module)}
													</a>
													<span class="flex flex-wrap items-center gap-1">
														{#if row.module.dutyStatus}
															<span class="badge {dutyBadge(row.module.dutyStatus)} badge-sm">
																{DUTY_LABELS[row.module.dutyStatus]}
															</span>
														{/if}
														{#if !row.planned && row.proposedFrom}
															<span class="badge badge-ghost badge-sm">
																Vorschlag aus {semesterName(row.proposedFrom)}
															</span>
														{/if}
														{#if !row.module.plannable}
															<span class="badge badge-ghost badge-sm"> keine SWS im Katalog </span>
														{/if}
													</span>
												</span>
											</label>
										</td>
										<td>
											<input
												type="number"
												min="1"
												max="12"
												name="semester:{row.module.id}"
												value={draft(row).year}
												oninput={(e) => edit(row, { year: e.currentTarget.value })}
												disabled={!mayPlan}
												class="input input-bordered input-xs w-14"
												aria-label="Fachsemester von {moduleName(row.module)}"
											/>
										</td>
										<td class="text-base-content/90 whitespace-nowrap">
											{splitLabel(row)}
											{#if row.module.splitIsEstimated}
												<span class="badge badge-warning badge-sm ml-1">geschätzt</span>
												{#each effectiveComponents(row.module) as component, i (i)}
													<input type="hidden" name="kind:{row.module.id}" value={component.kind} />
													<input
														type="hidden"
														name="hours:{row.module.id}"
														value={component.teachingHours}
													/>
												{/each}
												{#if mayPlan}
													<button
														type="submit"
														formaction="?/confirmSplit"
														name="moduleId"
														value={row.module.id}
														class="btn btn-xs ml-1"
													>
														bestätigen
													</button>
												{/if}
											{/if}
										</td>
										<td>
											<div class="join">
												<button
													type="button"
													class="btn btn-xs join-item"
													onclick={() => setTracks(row, draft(row).tracks - 1)}
													disabled={!mayPlan}
													aria-label="Ein Zug weniger für {moduleName(row.module)}">−</button
												>
												<input
													type="number"
													min="1"
													max="8"
													name="tracks:{row.module.id}"
													value={draft(row).tracks}
													oninput={(e) => setTracks(row, numberOf(e.currentTarget))}
													disabled={!mayPlan}
													class="input input-bordered input-xs join-item w-12 text-center"
													aria-label="Züge von {moduleName(row.module)}"
												/>
												<button
													type="button"
													class="btn btn-xs join-item"
													onclick={() => setTracks(row, draft(row).tracks + 1)}
													disabled={!mayPlan}
													aria-label="Ein Zug mehr für {moduleName(row.module)}">+</button
												>
											</div>
										</td>
										<td>
											{#if !row.module.practicalKind}
												<span class="text-base-content/80 text-sm">—</span>
											{:else if letters.length === 1}
												<div class="join">
													<button
														type="button"
														class="btn btn-xs join-item"
														onclick={() => setGroups(row, 0, draft(row).groups[0] - 1)}
														disabled={!mayPlan}
														aria-label="Eine Gruppe weniger für {moduleName(row.module)}">−</button
													>
													<input
														type="number"
														min="0"
														max="12"
														name="groups:{row.module.id}:0"
														value={draft(row).groups[0]}
														oninput={(e) => setGroups(row, 0, numberOf(e.currentTarget))}
														disabled={!mayPlan}
														class="input input-bordered input-xs join-item w-12 text-center"
														aria-label="Gruppen von {moduleName(row.module)}"
													/>
													<button
														type="button"
														class="btn btn-xs join-item"
														onclick={() => setGroups(row, 0, draft(row).groups[0] + 1)}
														disabled={!mayPlan}
														aria-label="Eine Gruppe mehr für {moduleName(row.module)}">+</button
													>
												</div>
											{:else}
												<span class="text-base-content/90 text-sm">{trackSummary(row.tracks)}</span>
											{/if}
										</td>
										<td class="text-base-content/90 whitespace-nowrap">
											{row.planned ? hoursLabel(row.teachingHours) : '—'}
										</td>
									</tr>

									<!-- Die Zug-Zeilen erscheinen erst ab dem zweiten Zug: der häufige Fall ist
									     einzügig, und für den steht alles in der Zeile darüber. -->
									{#if letters.length > 1}
										<tr>
											<td colspan="6" class="bg-base-200/40">
												<div class="flex flex-wrap items-center gap-4">
													{#each letters as letter, i (i)}
														<div class="flex items-center gap-2">
															<span class="badge badge-neutral badge-sm">
																{data.selected.programme}{d.year || '?'}{letter}
															</span>
															<input
																type="hidden"
																name="track:{row.module.id}:{i}"
																value={letter}
															/>
															<div class="join">
																<button
																	type="button"
																	class="btn btn-xs join-item"
																	onclick={() => setGroups(row, i, draft(row).groups[i] - 1)}
																	disabled={!mayPlan}
																	aria-label="Eine Gruppe weniger für Zug {letter}">−</button
																>
																<input
																	type="number"
																	min="0"
																	max="12"
																	name="groups:{row.module.id}:{i}"
																	value={draft(row).groups[i]}
																	oninput={(e) => setGroups(row, i, numberOf(e.currentTarget))}
																	disabled={!mayPlan}
																	class="input input-bordered input-xs join-item w-12 text-center"
																	aria-label="Gruppen von Zug {letter}"
																/>
																<button
																	type="button"
																	class="btn btn-xs join-item"
																	onclick={() => setGroups(row, i, draft(row).groups[i] + 1)}
																	disabled={!mayPlan}
																	aria-label="Eine Gruppe mehr für Zug {letter}">+</button
																>
															</div>
															{#if row.tracks[i]?.borrowed}
																<span class="badge badge-ghost badge-sm">
																	Vorlesung wird geteilt
																</span>
															{/if}
														</div>
													{/each}
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/each}

			{#if mayPlan && shown.length > 0}
				<div
					class="border-base-300 bg-base-100 flex flex-wrap items-center gap-3 rounded-lg border p-4"
				>
					<button type="submit" class="btn btn-primary btn-sm">Bedarf speichern</button>
					<span class="text-base-content/80 text-sm">
						Gespeichert wird, was hier steht — Module, die der Filter gerade ausblendet, bleiben
						unangetastet.
					</span>
				</div>
			{/if}
		</form>
	{/if}
</div>
