<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		candidateValue,
		candidatesFor,
		pooledInstances,
		cohortGroups,
		currentValue,
		partHours,
		savedHint,
		type AssignmentLike,
		type CohortGroup
	} from '$lib/assignment';
	import { PHASE_HINTS, PHASE_LABELS, semesterName, semesterShortName } from '$lib/semester';
	import { hoursLabel } from '$lib/demand';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * Newest first, so the semester being planned is not at the far right behind a scrollbar.
	 * The backend answers newest-first and the planning semester is the *earliest* one offered,
	 * which is the one people are looking for.
	 */
	const semesterTabs = $derived([...data.semesters].reverse());

	/** Own subjects first — a preselection and not a rule, so the rest stays on the page. */
	const groupTabs = $derived(
		[...data.subjectGroups].sort((a, b) => {
			const mine = Number(data.myGroups.includes(b.id)) - Number(data.myGroups.includes(a.id));
			return mine !== 0 ? mine : a.code.localeCompare(b.code, 'de');
		})
	);

	/**
	 * The instances of the chosen subject group.
	 *
	 * Filtered here rather than in the query because `courseInstances` has no subject group
	 * argument — the group is derived through the module, and adding a filter for it to the demand
	 * API would be a second place for that derivation to live.
	 */
	const groups: CohortGroup[] = $derived(
		data.group === null
			? []
			: cohortGroups(
					data.instances.filter((i) => i.module.subjectGroup?.id === data.group?.id),
					data.assignments as AssignmentLike[]
				)
	);

	const members = $derived(data.group?.members ?? []);

	/**
	 * Whether this subject group is still taking wishes.
	 *
	 * The list is the exceptions: a group nobody has switched is open. Read the other way round it
	 * would shut every group in the faculty, which is why it is derived here once and not inline.
	 */
	const roundOpen = $derived(
		data.group === null ||
			!data.windows.some((w) => w.subjectGroup.id === data.group?.id && !w.open)
	);

	/** Which row a refusal belongs to, so it can be rendered in that row and nowhere else. */
	const refusalFor = $derived(new Map((form?.refusals ?? []).map((r) => [r.partId, r.message])));

	/**
	 * Whether anything may be filled at all.
	 *
	 * Since 2026-08-28 that is one question with one answer: until the semester is finished.
	 * Filling used to wait for the assignment phase; the wish round turned out to belong to the
	 * subject group rather than to the faculty, and its lead — the same person who fills the
	 * instances — shuts it with the switch below.
	 */
	const open = $derived(data.semester !== null && data.semester.phase !== 'FINAL');
	const published = $derived(data.semester?.assignmentsPublishedAt != null);

	// Saving, the same arrangement the wish screen uses: three events on the form itself, because
	// all three bubble — otherwise every one of a few hundred cells would need a listener.
	let formElement: HTMLFormElement | undefined = $state();
	let saving = $state(false);
	let savedOnce = $state(false);
	// Neither is $state: nothing renders them, and making them reactive would only invite somebody
	// to render them.
	let dirty = false;
	let queued = false;

	function saveNow() {
		if (!open) return;
		if (saving) {
			// One submission in flight at a time. Two carry the *whole* form state each, so the
			// older one landing second would write an outdated cell over a newer one.
			queued = true;
			return;
		}
		// Synchronously, not after the response: the focusout that follows a change would otherwise
		// see the flag still set and send a second time.
		dirty = false;
		formElement?.requestSubmit();
	}

	function saveIfDirty() {
		if (dirty) saveNow();
	}
</script>

<svelte:head><title>Zuteilung · Tallox</title></svelte:head>

<h1 class="text-2xl font-semibold">Zuteilung</h1>

<p class="text-base-content/80 mt-2 max-w-prose">
	Wer hält welchen Teil einer Instanz. Die Eintragungen aus der Wunschphase stehen neben den Zeilen,
	zu denen sie gehören.
</p>

<!-- One form per bar. A GET form submits only the button that was clicked, so a bar that shared
     its form with another would send its own field and nothing else. -->
<form method="GET" class="mt-6 flex flex-col gap-1">
	<span class="label-text text-sm">Semester</span>
	{#if data.selected.group !== ''}
		<input type="hidden" name="fachgruppe" value={data.selected.group} />
	{/if}
	<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-nowrap overflow-x-auto">
		{#each semesterTabs as semester (semester.code)}
			{@const active = semester.code === data.semester?.code}
			<button
				type="submit"
				name="semester"
				value={semester.code}
				role="tab"
				aria-selected={active}
				class="tab whitespace-nowrap {active ? 'tab-active' : ''}"
			>
				{semesterShortName(semester.code)}
				{#if semester.isPlanningSemester}
					<span class="badge badge-primary badge-xs ml-1">Planung</span>
				{/if}
			</button>
		{/each}
	</div>
</form>

{#if data.unusable}
	<div class="card bg-base-200 mt-4 max-w-prose">
		<div class="card-body">
			<h2 class="card-title text-base">Kein Semester</h2>
			<p>{data.unusable}</p>
		</div>
	</div>
{:else if data.semester === null}
	<div class="card bg-base-200 mt-4 max-w-prose">
		<div class="card-body">
			<h2 class="card-title text-base">Es ist kein Planungssemester festgelegt</h2>
			<p>Unter <a class="link" href={resolve('/semester')}>Semester</a> lässt sich eines wählen.</p>
		</div>
	</div>
{:else}
	<p class="text-base-content/80 mt-3">
		<strong>{semesterName(data.semester.code)}</strong> · {PHASE_LABELS[data.semester.phase]} —
		{PHASE_HINTS[data.semester.phase]}
	</p>

	{#if !open}
		<div class="alert alert-info mt-3 max-w-prose">
			<span> Dieses Semester ist abgeschlossen. Zuteilungen lassen sich nicht mehr ändern. </span>
		</div>
	{/if}

	{#if published}
		<div class="alert alert-success mt-3 max-w-prose">
			<span>Die Zuteilungen dieses Semesters sind veröffentlicht und für alle sichtbar.</span>
		</div>
	{/if}

	<form method="GET" class="mt-5 flex flex-col gap-1">
		<span class="label-text text-sm">Fachgruppe</span>
		<input type="hidden" name="semester" value={data.semester.code} />
		<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-nowrap overflow-x-auto">
			{#each groupTabs as group (group.id)}
				{@const active = group.id === data.group?.id}
				<button
					type="submit"
					name="fachgruppe"
					value={group.id}
					role="tab"
					aria-selected={active}
					class="tab whitespace-nowrap {active ? 'tab-active' : ''}"
					title={group.name}
				>
					{group.code}
					{#if data.myGroups.includes(group.id)}
						<span class="badge badge-ghost badge-xs ml-1">meine</span>
					{/if}
				</button>
			{/each}
		</div>
	</form>

	{#if data.group === null}
		<div class="card bg-base-200 mt-4 max-w-prose">
			<div class="card-body">
				<h2 class="card-title text-base">Fachgruppe wählen</h2>
				<p>
					Besetzt wird fachgruppenweise. Das ist auch die Einheit, in der die Zuständigkeit liegt —
					und eine Seite mit allen Instanzen der Fakultät und allen Lehrenden darin wäre keine.
				</p>
			</div>
		</div>
	{:else}
		<!--
			Der Schalter für die Wunschphase dieser Fachgruppe. Ein eigenes Formular und eine eigene
			Action: das Speichern der Tabelle ist ein Bündel kleiner Entscheidungen, dies ist eine
			Entscheidung über die Runde selbst — und ein versehentlicher Klick soll nicht bei jedem
			automatischen Speichern mitreisen.
		-->
		<!--
			Die Parameter stehen in der Action-URL, nicht nur im Rumpf. Ohne `use:enhance` navigiert
			der Browser wirklich nach `?/window` — und der ersetzt den Query-String der Seite, also
			landet man danach ohne Semester und ohne Fachgruppe auf dem Planungssemester. Der Rumpf
			trägt sie trotzdem, weil die Action sie von dort liest.
		-->
		<form
			method="POST"
			action="?/window&semester={data.semester.code}&fachgruppe={data.group.id}"
			class="mt-5"
		>
			<input type="hidden" name="semester" value={data.semester.code} />
			<input type="hidden" name="fachgruppe" value={data.group.id} />
			<input type="hidden" name="open" value={roundOpen ? 'false' : 'true'} />
			<div class="alert {roundOpen ? 'alert-info' : 'alert-warning'} max-w-3xl">
				<span>
					{#if roundOpen}
						Die Wunschphase von <strong>{data.group.name}</strong> ist offen — es können noch Eintragungen
						dazukommen.
					{:else}
						Die Wunschphase von <strong>{data.group.name}</strong> ist geschlossen.
					{/if}
				</span>
				<button type="submit" class="btn btn-sm">
					{roundOpen ? 'Wunschphase schließen' : 'Wunschphase öffnen'}
				</button>
			</div>
		</form>

		<form method="GET" class="mt-5 flex flex-wrap items-end gap-2">
			<input type="hidden" name="semester" value={data.semester.code} />
			<input type="hidden" name="fachgruppe" value={data.group.id} />
			<label class="form-control">
				<span class="label-text text-sm">Weitere Person suchen</span>
				<input
					type="search"
					name="q"
					value={data.selected.search}
					placeholder="Name oder Adresse"
					class="input input-bordered input-sm w-64"
				/>
			</label>
			<button type="submit" class="btn btn-sm">Suchen</button>
			{#if data.selected.search !== ''}
				<span class="text-base-content/70 text-sm">
					{data.found.length}
					{data.found.length === 1 ? 'Treffer' : 'Treffer'} — stehen in jeder Auswahl unten.
				</span>
			{/if}
		</form>

		{#if groups.length === 0}
			<div class="card bg-base-200 mt-4 max-w-prose">
				<div class="card-body">
					<h2 class="card-title text-base">Nichts zu besetzen</h2>
					<p>
						Für <strong>{data.group.name}</strong> ist in diesem Semester keine Instanz mit Teilen
						angemeldet. Das ist eine Aussage über den Bedarf, nicht über die Zuteilung — auf der
						<a class="link" href="{resolve('/bedarf')}?semester={data.semester.code}"
							>Bedarfsseite</a
						>
						steht, was angeboten wird.
					</p>
				</div>
			</div>
		{:else}
			<form
				method="POST"
				action="?/save"
				bind:this={formElement}
				onchange={saveNow}
				oninput={() => (dirty = true)}
				onfocusout={saveIfDirty}
				use:enhance={() => {
					saving = true;
					return async ({ update }) => {
						// reset:false — a reset puts every field back to its rendered default, which
						// is the state before the save rather than after it.
						await update({ reset: false });
						saving = false;
						savedOnce = true;
						if (queued) {
							queued = false;
							saveNow();
						}
					};
				}}
			>
				<!-- The action's query string replaces the page's, so the semester has to travel in
				     the body. Reading it from the URL in the action looked right and silently
				     saved nothing. -->
				<input type="hidden" name="semester" value={data.semester.code} />

				{#each groups as group (group.instance.id)}
					{@const wishesHere = data.wishes.filter((w) => w.instance.id === group.instance.id)}
					<section class="mt-6">
						<h2 class="text-lg font-semibold">
							{group.instance.module.name}
							<span class="badge badge-neutral ml-2">{group.label}</span>
							<span class="text-base-content/70 ml-2 text-sm font-normal">
								{hoursLabel(group.instance.teachingHours)} gesamt
							</span>
						</h2>

						<div class="overflow-x-auto">
							<table class="table-zebra table mt-2">
								<thead>
									<tr>
										<th class="w-40">Teil</th>
										<th class="w-20 text-right">SWS</th>
										<th class="w-72">Wer</th>
										<th>Notiz</th>
									</tr>
								</thead>
								<tbody>
									{#each group.rows as row (row.part.id)}
										{@const pooled = pooledInstances(group.instance)}
										{@const candidates = candidatesFor(
											pooled.ids,
											wishesHere,
											members,
											data.found,
											row.assignment,
											pooled.programmes
										)}
										{@const refusal = refusalFor.get(row.part.id)}
										<tr>
											<td>
												{row.heading}
												{#if row.part.sharedAcrossTracks}
													<span
														class="badge badge-ghost badge-xs ml-1"
														title="Wird für beide Züge gehalten und zählt einmal."
													>
														zugübergreifend
													</span>
												{/if}
											</td>
											<td class="text-right">{partHours(row.part)}</td>
											<td>
												<!-- The value is `p:<id>` or `t:<id>`; the backend takes exactly
												     one of the two and canonicalises a teacher who has an account. -->
												<select
													name="who:{row.part.id}"
													class="select select-bordered select-sm w-full"
													aria-label="Wer hält {row.heading} in {group.label}, {group.instance
														.module.name}"
													disabled={!open}
													value={currentValue(row.assignment)}
												>
													<option value="">— nicht besetzt —</option>
													{#each candidates as candidate (candidateValue(candidate))}
														<option value={candidateValue(candidate)}>
															{candidate.name}{candidate.hint ? ` (${candidate.hint})` : ''}
														</option>
													{/each}
												</select>
												{#if refusal}
													<span class="badge badge-error mt-1 whitespace-normal">{refusal}</span>
												{/if}
											</td>
											<td>
												<input
													type="text"
													name="note:{row.part.id}"
													value={row.assignment?.note ?? ''}
													maxlength="500"
													placeholder="z. B. vertretungsweise"
													class="input input-bordered input-sm w-full"
													aria-label="Notiz zu {row.heading} in {group.label}"
													disabled={!open}
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						{#if wishesHere.length > 0}
							<p class="text-base-content/70 mt-1 text-sm">
								Eingetragen: {wishesHere.map((w) => w.person.name).join(', ')}
							</p>
						{/if}
					</section>
				{/each}

				<div
					class="bg-base-100 border-base-300 sticky bottom-0 mt-6 flex items-center gap-3 border-t py-3"
				>
					<button type="submit" class="btn btn-ghost btn-sm">Alles speichern</button>
					<span class="text-base-content/70 text-sm" aria-live="polite">
						{#if saving}
							Wird gespeichert …
						{:else if form?.message}
							{form.message}
						{:else if savedOnce || form}
							{savedHint(form?.saved ?? 0)}
							{#if (form?.refusals ?? []).length > 0}
								{(form?.refusals ?? []).length} Zeile(n) nicht — siehe oben.
							{/if}
						{:else}
							Änderungen werden automatisch gespeichert.
						{/if}
					</span>
				</div>
			</form>
		{/if}
	{/if}
{/if}
