<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		ALL_PART_KINDS,
		DUTY_LABELS,
		PART_KIND_LABELS,
		dutyBadge,
		formatHours,
		moduleName
	} from '$lib/catalogue';
	import {
		byYear,
		cohortLabel,
		compareWithPrevious,
		demandRows,
		effectiveComponents,
		hoursLabel,
		plannedHours,
		sharingState,
		splitSummary,
		trackLetters
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

	/** What the rows of one cohort year cost as they stand — the same figure the SWS column shows. */
	function groupHours(rows: Row[]): number {
		return rows.reduce((sum, row) => sum + liveHours(row), 0);
	}

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

	/** Whether anything on the screen differs from what is stored. */
	const dirty = $derived(Object.keys(edits).length > 0);

	/**
	 * Rows that stand ticked because the previous semester had them, and are not stored yet.
	 *
	 * Worth a sentence of its own: the table saves itself, so the first change anybody makes
	 * adopts the whole proposal along with it. That is what "prefilled" means — but it should be
	 * read before it happens, not deduced afterwards from "73 angelegt".
	 */
	const proposedRows = $derived(shown.filter((row) => !row.planned && row.tracks.length > 0));

	/**
	 * The module whose split is being corrected, if any.
	 *
	 * One at a time: the editor replaces the line it is about, and two open at once would be two
	 * places where the same "speichern" means different things.
	 */
	let editingSplit = $state<string | null>(null);

	function draft(row: Row): Draft {
		return edits[row.module.id] ?? seeded[row.module.id] ?? draftOf(row);
	}

	function edit(row: Row, change: Partial<Draft>) {
		edits = { ...edits, [row.module.id]: { ...draft(row), ...change } };
		editSeq++;
		scheduleSave();
	}

	/**
	 * Saving without a button, and why it still has one.
	 *
	 * Every tick and every step is a decision somebody has made, and a screen that keeps them
	 * only in the browser until a separate act is a screen that loses them — to a closed tab, a
	 * mistaken back button, a colleague's question. So the form submits itself.
	 *
	 * Not per keystroke: the changes are collected for a moment and go together, because
	 * pressing "+" three times is one decision and three round trips would also be three chances
	 * for them to arrive out of order.
	 *
	 * The button stays. Without JavaScript nothing here submits itself, and the page has worked
	 * without it so far — that is what a form action is for.
	 */
	let formEl = $state<HTMLFormElement | null>(null);
	let saving = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	/** Counts the edits, so a save that finishes late does not discard a newer one. */
	let editSeq = $state(0);

	function scheduleSave() {
		if (!mayPlan) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => formEl?.requestSubmit(), 600);
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

	/**
	 * What a row costs the faculty as it currently stands — ticked or not, saved or not.
	 *
	 * The stored figure only covers what is stored, so on the day this page is most used — a
	 * semester nobody has planned yet — it would say "—" in every line. This says what saving
	 * would cost, and it moves while somebody clicks.
	 */
	function liveHours(row: Row): number {
		const current = draft(row);
		if (!current.offered) return 0;

		const tracks = Array.from({ length: current.tracks }, (_, i) => ({
			groups: current.groups[i] ?? 0,
			// Only the cohorts that exist can be borrowing anything.
			borrowedKinds: row.tracks[i]?.borrowedKinds ?? []
		}));
		return plannedHours(effectiveComponents(row.module), row.module.practicalKind, tracks);
	}

	/** The cohort year as the row currently states it, for the label. */
	function yearOf(row: Row): number | null {
		const year = Number(draft(row).year);
		return Number.isFinite(year) && year > 0 ? year : null;
	}

	/**
	 * The name a screen reader gets for a group stepper.
	 *
	 * One cohort: the module, because that is what distinguishes the control on the page. Several:
	 * the cohort, because that is what distinguishes it from the one below.
	 */
	function groupLabel(row: Row, letters: string[], letter: string, direction = ''): string {
		const what = letters.length > 1 ? `Zug ${letter}` : moduleName(row.module);
		if (direction === 'mehr') return `Eine Gruppe mehr für ${what}`;
		if (direction === 'weniger') return `Eine Gruppe weniger für ${what}`;
		return `Gruppen von ${what}`;
	}

	/** The split a row is planned with, as one line: `Vorlesung 4 + Praktikum 2 SWS`. */
	function splitLabel(row: Row): string {
		const components = effectiveComponents(row.module);
		if (components.length === 0) return 'keine SWS im Katalog';
		return splitSummary(components);
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
				{#if 'generic' in form && form.generic && form.code}
					<!--
						Der Code steht nur dabei, wenn der Satz der allgemeine ist. „Das hat nicht
						geklappt" allein ist für niemanden beantwortbar — für die Person davor nicht
						und für die, die sie danach fragt, auch nicht.
					-->
					<span class="text-base-content/80">(Code: {form.code})</span>
				{/if}
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
			<form
				method="POST"
				action="?/apply"
				use:enhance={() =>
					async ({ update }) => {
						// Die Entscheidung ist gefallen, also gilt wieder, was der Server sagt.
						edits = {};
						await update({ reset: false });
					}}
				class="mt-3 flex flex-wrap gap-2"
			>
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
					{data.instances.length} Instanz(en), zusammen {hoursLabel(totalHours)} Lehre gespeichert.
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
			{#if proposedRows.length > 0}
				<span class="badge badge-ghost">
					{proposedRows.length} vorbelegt — wird mit der nächsten Änderung übernommen
				</span>
			{/if}
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
			`enhance` mit eigenem Callback. Nach dem Speichern hat der Load neu geladen, und die
			Bearbeitungen von vorhin sind damit beantwortet — außer es kam eine Vorschau zurück
			(dann steht die Entscheidung noch aus) oder jemand hat inzwischen weitergeklickt.
		-->
		<form
			bind:this={formEl}
			method="POST"
			action="?/plan"
			use:enhance={() => {
				const seq = editSeq;
				saving = true;
				return async ({ result, update }) => {
					const preview =
						result.type === 'success' && !!(result.data as { preview?: unknown })?.preview;
					// Eine Vorschau lässt die Häkchen stehen: das weggenommene ist genau das, worüber
					// gerade entschieden wird. Und wer während des Speicherns weitergeklickt hat,
					// behält seine neueren Zahlen — sonst überschriebe die Antwort von eben sie.
					if (!preview && editSeq === seq) edits = {};
					// Der Aufteilungs-Editor schließt: was er beantworten sollte, ist beantwortet,
					// und ein Formular, das über der Zeile stehen bleibt, die es gerade geschrieben
					// hat, liest sich, als wäre nichts passiert.
					editingSplit = null;
					await update({ reset: false });
					saving = false;
					if (editSeq !== seq) scheduleSave();
				};
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
							({group.rows.length} Module, {hoursLabel(groupHours(group.rows))})
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
									{@const letters = lettersOf(row)}
									<tr>
										<td>
											<input type="hidden" name="module" value={row.module.id} />
											<!-- Die Buchstaben der Züge, wie die Seite sie zeigt. Sie stehen hier
											     und nicht bei den Zählern, weil ein Feld auch dann mitgeschickt
											     werden muss, wenn das Modul gar keine Gruppen kennt. -->
											{#each letters as letter, i (i)}
												<input type="hidden" name="track:{row.module.id}:{i}" value={letter} />
											{/each}
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
										<td class="text-base-content/90">
											<!--
												Die Aufteilung links, die Marke und der Knopf rechts am Spaltenrand.
												Hinter dem Text her stünden sie in jeder Zeile woanders — und was
												hier durchgegangen wird, ist eine Spalte von Schätzungen, keine
												Zeile: das Auge braucht sie untereinander.
											-->
											{#if editingSplit === row.module.id}
												<!--
													Geändert wird hier, wo die Zahl steht: „4+2 statt 3+3" ist eine
													Korrektur von zwei Feldern und keine Reise auf eine andere Seite —
													und die Seite, auf der man gerade fünfzehn Häkchen gesetzt hat,
													verlässt man dafür nicht. Eine Einheit hinzuzunehmen bleibt der
													Modulseite vorbehalten, die der Modulname verlinkt.
												-->
												<div class="flex flex-wrap items-center gap-1">
													{#each effectiveComponents(row.module) as component, i (i)}
														<select
															name="kind:{row.module.id}"
															class="select select-bordered select-xs"
															aria-label="Art des {i + 1}. Teils von {moduleName(row.module)}"
														>
															{#each ALL_PART_KINDS as kind (kind)}
																<option value={kind} selected={kind === component.kind}>
																	{PART_KIND_LABELS[kind]}
																</option>
															{/each}
														</select>
														<input
															type="text"
															inputmode="decimal"
															name="hours:{row.module.id}"
															value={formatHours(component.teachingHours)}
															class="input input-bordered input-xs w-14"
															aria-label="SWS des {i + 1}. Teils von {moduleName(row.module)}"
														/>
													{/each}
													<button
														type="submit"
														formaction="?/confirmSplit"
														name="moduleId"
														value={row.module.id}
														class="btn btn-primary btn-xs"
													>
														speichern
													</button>
													<button
														type="button"
														class="btn btn-xs"
														onclick={() => (editingSplit = null)}
													>
														abbrechen
													</button>
												</div>
											{:else}
												<!--
													Zwei Zeilen: oben die Aufteilung, darunter alles, was man mit ihr tun
													kann. Nebeneinander wuchs die Spalte um die Breite der Knöpfe, und
													bei zwei Zügen schob das die SWS-Spalte aus dem Bild — die Zahl,
													die man beim Klicken beobachtet.
												-->
												<div class="flex flex-col gap-1">
													<span class="whitespace-nowrap">{splitLabel(row)}</span>
													<span class="flex flex-wrap items-center gap-1">
														{#if row.module.splitIsEstimated}
															<span class="badge badge-warning badge-sm">geschätzt</span>
															{#if mayPlan}
																<button
																	type="submit"
																	formaction="?/confirmSplit"
																	name="moduleId"
																	value={row.module.id}
																	class="btn btn-xs"
																>
																	bestätigen
																</button>
															{/if}
														{/if}
														{#if mayPlan && row.module.plannable}
															<button
																type="button"
																class="btn btn-xs"
																onclick={() => (editingSplit = row.module.id)}
															>
																ändern
															</button>
														{/if}
														<!-- Einmal je Modul, nicht je Zug: „einmal für beide gehalten" ist
														     eine Aussage über die Vorlesung, und der Rückweg ist derselbe
														     Knopf, weil ein Sabbatical die Entscheidung revidiert. -->
														{#if mayPlan}
															{@const sharing = sharingState(row)}
															{#if sharing.sharedPartId}
																<button
																	type="submit"
																	formaction="?/sharePart"
																	name="partId"
																	value={sharing.sharedPartId}
																	class="btn btn-xs"
																	title="Jeder Zug hält seine Vorlesung wieder selbst"
																>
																	Vorlesung trennen
																</button>
																<input type="hidden" name="split" value="1" />
															{:else if sharing.mergeablePartId}
																<button
																	type="submit"
																	formaction="?/sharePart"
																	name="partId"
																	value={sharing.mergeablePartId}
																	class="btn btn-xs"
																	title="Eine Vorlesung für alle Züge — sie findet einmal statt und zählt einmal"
																>
																	Vorlesung zusammenlegen
																</button>
															{/if}
														{/if}
													</span>
												</div>
												{#if row.module.splitIsEstimated}
													<!-- Was „bestätigen" absendet: die Schätzung, so wie sie danebensteht. -->
													{#each effectiveComponents(row.module) as component, i (i)}
														<input
															type="hidden"
															name="kind:{row.module.id}"
															value={component.kind}
														/>
														<input
															type="hidden"
															name="hours:{row.module.id}"
															value={component.teachingHours}
														/>
													{/each}
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
												<!-- Nichts zu vervielfachen: ein Modul, das nur aus einer Vorlesung
												     besteht, hat keine Gruppen — parallele Vorlesungen meint hier
												     niemand. -->
												<span class="text-base-content/80 text-sm">—</span>
											{:else}
												<div class="flex flex-col gap-1">
													{#each letters as letter, i (i)}
														<div class="flex items-center gap-1">
															{#if letters.length > 1}
																<span class="badge badge-neutral badge-sm">
																	{cohortLabel(data.selected.programme, yearOf(row), letter)}
																</span>
															{/if}
															<div class="join">
																<button
																	type="button"
																	class="btn btn-xs join-item"
																	onclick={() => setGroups(row, i, draft(row).groups[i] - 1)}
																	disabled={!mayPlan}
																	aria-label={groupLabel(row, letters, letter, 'weniger')}>−</button
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
																	aria-label={groupLabel(row, letters, letter)}
																/>
																<button
																	type="button"
																	class="btn btn-xs join-item"
																	onclick={() => setGroups(row, i, draft(row).groups[i] + 1)}
																	disabled={!mayPlan}
																	aria-label={groupLabel(row, letters, letter, 'mehr')}>+</button
																>
															</div>
															{#if row.tracks[i]?.borrowedKinds.length}
																<span class="badge badge-ghost badge-sm">Vorlesung geteilt</span>
															{/if}
														</div>
													{/each}
												</div>
											{/if}
										</td>
										<td class="text-base-content/90 whitespace-nowrap">
											{#if draft(row).offered}
												{hoursLabel(liveHours(row))}
												{#if row.planned && liveHours(row) !== row.teachingHours}
													<!-- Was auf dem Bildschirm steht, ist noch nicht, was in der
													     Datenbank steht. Beides zu zeigen ist der Unterschied
													     zwischen „ich habe geändert" und „ich habe gespeichert". -->
													<span class="text-base-content/80 text-xs">
														(gespeichert {hoursLabel(row.teachingHours)})
													</span>
												{/if}
											{:else if row.planned}
												<span class="text-base-content/80">
													{hoursLabel(row.teachingHours)} — wird zurückgezogen
												</span>
											{:else}
												<span class="text-base-content/80">—</span>
											{/if}
										</td>
									</tr>
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
					{#if saving}
						<span class="badge badge-neutral">wird gespeichert …</span>
					{:else if dirty}
						<span class="badge badge-warning">noch nicht gespeichert</span>
					{/if}
					<span class="text-base-content/80 text-sm">
						Jede Änderung wird von selbst gespeichert; der Knopf ist für den Fall, dass das Skript
						im Browser nicht läuft. Gespeichert wird, was hier steht — Module, die der Filter gerade
						ausblendet, bleiben unangetastet.
					</span>
				</div>
			{/if}
		</form>
	{/if}
</div>
