<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		ALL_PART_KINDS,
		COURSE_TYPE_LABELS,
		FREQUENCY_LABELS,
		teacherRole,
		PART_KIND_LABELS,
		componentMismatch,
		formatHours,
		moduleName,
		spoLabel
	} from '$lib/catalogue';
	import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
	import { hasAnyRole } from '$lib/roles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Cosmetic, like every role check in this application — the backend refuses the mutation
	// anyway, and it refuses it on the token path too. Worth doing so that a lecturer reads which
	// subject the module belongs to without being offered a control that always fails.
	const mayAssign = $derived(hasAnyRole(data.session?.effectiveRoles ?? [], ['ADMIN']));

	// Retired groups are not somewhere to put a module. One the module already sits in still
	// renders as such — that is what the `active` flag on the reference is for.
	const assignableGroups = $derived(data.subjectGroups.filter((g) => g.active));

	const assigned = $derived(form && 'assigned' in form ? form.assigned : null);

	type Row = { kind: InstancePartKind; hours: string };

	// The rows of the split editor. Seeded from what is stored, and from the proposal derived
	// from the course type when nothing is — a form somebody has to fill from an empty state is
	// how a bounded task turns into a chore.
	let rows = $state<Row[]>(initialRows());

	function initialRows(): Row[] {
		if (data.module.components.length > 0) {
			return data.module.components.map((c) => ({
				kind: c.kind,
				hours: formatHours(c.teachingHours)
			}));
		}
		// The proposal comes from the server. It used to be computed here as well, in a second
		// implementation of the same rule — and an instance may now be declared from it, so the
		// two disagreeing would mean the form showed one split and the database held another.
		return data.module.proposedComponents.map((c) => ({
			kind: c.kind,
			hours: formatHours(c.teachingHours)
		}));
	}

	const proposed = $derived(data.module.splitIsEstimated);

	const enteredHours = $derived(
		rows.reduce((sum, r) => {
			const value = Number(r.hours.replace(',', '.'));
			return Number.isFinite(value) ? sum + value : sum;
		}, 0)
	);

	const mismatch = $derived(
		componentMismatch(
			rows.some((r) => r.hours.trim() !== '') ? enteredHours : null,
			data.module.contactHoursPerWeek
		)
	);

	// Grouped by programme, because "where does this count" is a question about programmes and
	// the versions are the detail underneath.
	//
	// The programmes come out of a Set and the rows are filtered per programme, rather than a Map
	// being filled: a mutable Map inside a derivation is the thing `svelte/prefer-svelte-reactivity`
	// warns about, and reaching for SvelteMap here would add reactivity to a value that is built
	// and read in the same expression.
	const byProgramme = $derived(
		[...new Set(data.module.offerings.map((o) => o.spo.programme.code))]
			.sort((a, b) => a.localeCompare(b))
			.map(
				(code) =>
					[code, data.module.offerings.filter((o) => o.spo.programme.code === code)] as const
			)
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<a class="link text-base-content/80 text-sm" href={resolve('/module')}>← Modulkatalog</a>
		<h1 class="text-2xl font-semibold">{moduleName(data.module)}</h1>
		<p class="text-base-content/80 text-sm">
			Heimatstudiengang {data.module.homeProgramme.code}
			· {COURSE_TYPE_LABELS[data.module.courseType]}
			· {FREQUENCY_LABELS[data.module.frequency]}
			{#if data.module.contactHoursPerWeek != null}
				· {data.module.contactHoursPerWeek} SWS laut Modulkatalog
			{/if}
			{#if data.module.credits != null}
				· {data.module.credits} ECTS
			{/if}
		</p>
	</div>

	{#if form && 'message' in form && form.message}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{form.message}
			</p>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🗂️</span> Fachgruppe
		</h2>

		{#if assigned}
			<p class="text-base-content/90 mb-2 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">Gespeichert</span>
				{#if assigned.subjectGroup}
					Jetzt in {assigned.subjectGroup.code} — {assigned.subjectGroup.name}.
				{:else}
					Aus der Fachgruppe herausgenommen.
				{/if}
				{#if assigned.modulesWithoutSubjectGroup > 0}
					Ohne Fachgruppe sind noch {assigned.modulesWithoutSubjectGroup} Module.
				{/if}
			</p>
		{/if}

		{#if data.module.subjectGroup}
			<p class="text-base-content/90 text-sm">
				<span class="font-mono">{data.module.subjectGroup.code}</span>
				— {data.module.subjectGroup.name}
				{#if !data.module.subjectGroup.active}
					<span class="badge badge-ghost badge-sm align-middle">stillgelegt</span>
				{/if}
			</p>
		{:else}
			<p class="text-base-content/90 text-sm">
				Dieses Modul ist noch keiner Fachgruppe zugeordnet.
			</p>
		{/if}

		<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
			Ein Modul gehört zu genau einer Fachgruppe. Ein bereits zugeordnetes wird verschoben, in einem
			Schritt — es gibt keinen Moment, in dem es zu keiner gehört. Die Fachgruppe entscheidet mit,
			wer die Instanzen dieses Moduls besetzt und wer vor der Veröffentlichung die Wünsche darauf
			sieht.
		</p>

		{#if mayAssign}
			<!--
				Dieselbe Mutation wie die Stapelzuordnung im Katalog, mit einer Liste von einem.
				Keine zweite für den Einzelfall: „genau eine Fachgruppe, Verschieben in einem
				Schritt" ist eine Regel jener Mutation, und ein zweiter Weg hinein wäre eine zweite
				Stelle, an der sie schiefgehen kann.
			-->
			<form
				method="POST"
				action="?/subjectGroup"
				use:enhance
				class="mt-3 flex flex-wrap items-end gap-2"
			>
				<label class="form-control">
					<span class="label-text text-sm">Fachgruppe</span>
					<select name="subjectGroup" class="select select-bordered select-sm">
						<option value="" selected={data.module.subjectGroup == null}>— keine —</option>
						{#each assignableGroups as group (group.id)}
							<option value={group.id} selected={group.id === data.module.subjectGroup?.id}>
								{group.code} — {group.name}
							</option>
						{/each}
					</select>
				</label>
				<button type="submit" class="btn btn-sm">Speichern</button>
			</form>

			{#if assignableGroups.length === 0}
				<p class="text-base-content/80 mt-2 text-sm">
					Es gibt noch keine Fachgruppe. Angelegt werden sie in der
					<a class="link" href={resolve('/verwaltung/fachgruppen')}>Verwaltung</a>.
				</p>
			{/if}
		{:else}
			<p class="text-base-content/80 mt-1 text-sm">
				Zuordnen kann sie die Administration — welche Fachgruppen es gibt und wer sie leitet, steht
				unter <a class="link" href={resolve('/verwaltung/fachgruppen')}>Fachgruppen</a>.
			</p>
		{/if}
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">👤</span> Modulverantwortung
		</h2>
		{#if data.module.responsible}
			{@const person = data.module.responsible}
			<p class="text-base-content/90 text-sm">
				<span class="font-medium">{person.name}</span>
				{#if teacherRole(person)}
					<span class="text-base-content/80"> — {teacherRole(person)}</span>
				{/if}
				{#if person.faculty}
					<span class="text-base-content/80"> · {person.faculty}</span>
				{/if}
				{#if person.lastSemester}
					<span class="text-base-content/80"> · zuletzt {person.lastSemester}</span>
				{/if}
			</p>
			{#if person.mail}
				<p class="text-base-content/80 font-mono text-xs">{person.mail}</p>
			{/if}
			<p class="text-base-content/80 mt-2 text-sm">
				{#if !person.active}
					<span class="badge badge-ghost badge-sm align-middle">lehrt laut ZPA nicht mehr</span>
				{/if}
				{#if person.isUser}
					<span class="badge badge-ghost badge-sm align-middle">hat einen Tallox-Zugang</span>
				{:else}
					<!--
						Aus dem ZPA übernommen zu sein heißt nicht, Tallox benutzen zu dürfen — wer
						sich anmelden darf, steht in der Personenverwaltung. Das hier ist die einzige
						Stelle, an der die Unterscheidung sichtbar wird, und sie ist keine
						Aufforderung: die meisten Lehrenden brauchen keinen Zugang, solange sie keine
						Wünsche eintragen.
					-->
					<span class="text-base-content/80">Kein Tallox-Zugang.</span>
				{/if}
			</p>
		{:else}
			<p class="text-base-content/80 text-sm">
				Das ZPA nennt niemanden, den Tallox zuordnen kann — entweder einen Platzhalter statt einer
				Person, oder eine Adresse, die nicht in der Lehrendenliste steht. Beides steht im Bericht
				auf der ZPA-Seite.
			</p>
		{/if}
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🧮</span> SWS-Aufteilung
		</h2>
		<p class="text-base-content/80 mb-3 text-sm">
			Wie sich die Lehre dieses Moduls auf Vorlesung, Praktikum und Übung aufteilt. Das ZPA nennt
			nur eine Gesamtzahl — die Aufteilung weiß die Fakultät. Sie wird einmal eingetragen und ändert
			sich danach normalerweise nicht. Fehlt sie, plant Tallox mit der Schätzung unten.
		</p>

		{#if proposed}
			<p class="text-base-content/90 mb-3 text-sm">
				<span class="badge badge-warning badge-sm align-middle">geschätzt</span>
				Aus Lehrform und SWS abgeleitet, von niemandem bestätigt. Instanzen lassen sich damit schon anlegen
				— bitte trotzdem prüfen und speichern.
			</p>
		{/if}

		<!--
			`enhance` ohne eigenen Callback setzt das Formular nach einem erfolgreichen Absenden
			zurück, und Svelte 5 zieht ein `reset` in die gebundenen Werte. Der Editor stand danach
			leer da, obwohl die Aufteilung gespeichert war — und wer das sieht, tippt sie noch
			einmal ein. Also nicht zurücksetzen, sondern aus den frisch geladenen Daten neu füllen.
		-->
		<form
			method="POST"
			action="?/components"
			use:enhance={() =>
				async ({ update }) => {
					await update({ reset: false });
					rows = initialRows();
				}}
			class="flex flex-col gap-3"
		>
			{#each rows as row, i (i)}
				<div class="flex flex-wrap items-end gap-2">
					<label class="form-control">
						<span class="label-text text-sm">Art</span>
						<select name="kind" bind:value={row.kind} class="select select-bordered select-sm">
							{#each ALL_PART_KINDS as kind (kind)}
								<option value={kind}>{PART_KIND_LABELS[kind]}</option>
							{/each}
						</select>
					</label>
					<label class="form-control">
						<span class="label-text text-sm">SWS</span>
						<input
							name="teachingHours"
							type="text"
							inputmode="decimal"
							bind:value={row.hours}
							placeholder="leer = entfernen"
							class="input input-bordered input-sm w-32"
						/>
					</label>
				</div>
			{/each}

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="btn btn-sm btn-ghost"
					onclick={() => (rows = [...rows, { kind: 'LAB', hours: '' }])}
				>
					Teil hinzufügen
				</button>
				<button type="submit" class="btn btn-sm btn-primary">Aufteilung speichern</button>
				<span class="text-base-content/80 text-sm">
					Summe: {formatHours(enteredHours)} SWS
				</span>
			</div>

			{#if mismatch}
				<!-- A note, never a refusal: twelve modules carry no hours in the source at all and
				     several carry a figure that does not match what is taught. A hard rule would make
				     exactly those unplannable. -->
				<p class="text-base-content/90 text-sm">
					<span class="badge badge-warning badge-sm align-middle">Abweichung</span>
					{mismatch}
				</p>
			{/if}
		</form>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">📗</span> Wo dieses Modul zählt
		</h2>
		{#if byProgramme.length === 0}
			<p class="text-base-content/80 text-sm">
				In keiner Prüfungsordnung, die das ZPA noch ausliefert. Das Modul gehört
				{data.module.homeProgramme.code} und lässt sich weiterhin planen.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>Studiengang</th>
							<th>Prüfungsordnung</th>
							<th>Art</th>
							<th>ab Fachsemester</th>
							<th>Modulcode</th>
							<th>Schwerpunkt</th>
						</tr>
					</thead>
					<tbody>
						{#each byProgramme as [code, offerings] (code)}
							{#each offerings as offering (offering.spo.id)}
								<tr>
									<td class="font-medium">{code}</td>
									<td>{spoLabel(offering.spo)}</td>
									<td>
										<span
											class="badge badge-sm {offering.isDuty ? 'badge-primary' : 'badge-ghost'}"
										>
											{offering.isDuty ? 'Pflicht' : 'Wahlpflicht'}
										</span>
									</td>
									<td class="text-base-content/90">{offering.minProgrammeSemester ?? '—'}</td>
									<td class="text-base-content/90 font-mono text-xs">
										{offering.moduleCodes.join(', ') || '—'}
									</td>
									<td class="text-base-content/90">{offering.focuses.join(', ') || '—'}</td>
								</tr>
							{/each}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#if data.module.zpaId}
		<p class="text-base-content/80 text-xs">
			ZPA-Kennung {data.module.zpaId}. Die Stammdaten kommen aus dem ZPA und werden hier nicht
			geändert — nur die SWS-Aufteilung gehört Tallox.
		</p>
	{/if}
</div>
