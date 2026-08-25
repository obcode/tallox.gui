<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		COURSE_TYPE_LABELS,
		DUTY_LABELS,
		FREQUENCY_LABELS,
		PROGRAMME_STATUS_LABELS,
		componentSummary,
		dutyBadge,
		moduleName,
		spoLabel
	} from '$lib/catalogue';
	import { enhance } from '$app/forms';
	import { hasAnyRole } from '$lib/roles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Cosmetic, like every role check in this application — the backend refuses the mutation
	// anyway, and it refuses it on the token path too. Worth doing so that a lecturer is not shown
	// a column of checkboxes whose button always fails.
	const mayAssign = $derived(hasAnyRole(data.session?.effectiveRoles ?? [], ['ADMIN']));

	const refusal = $derived(form && 'message' in form ? form : null);
	const assigned = $derived(form && 'assigned' in form ? form.assigned : null);

	// The versions of the regulations belonging to the programme currently filtered by. The SPO
	// filter is meaningless without one, so it only appears once a programme has been chosen.
	const spos = $derived(data.programmes.find((p) => p.code === data.filter.programme)?.spos ?? []);

	// How many of the listed modules are the programme's own without counting in any of its
	// regulations. Twenty-six active modules of the real catalogue are in that state, and
	// somebody who does not know it reads the list as incomplete.
	const onlyAtHome = $derived(
		data.filter.programme === '' ? 0 : data.modules.filter((m) => !m.inCatalogue).length
	);

	const withoutSplit = $derived(data.modules.filter((m) => m.components.length === 0).length);

	// The groups offered for assignment. Retired ones are left out — a wound-up group is not
	// somewhere to put a module — but a module already sitting in one still renders as such,
	// which is what the `active` flag on the reference is for.
	const assignableGroups = $derived(data.subjectGroups.filter((g) => g.active));

	// The number of columns, so that the empty row spans the table however it is configured.
	const columnCount = $derived(7 + (data.filter.programme !== '' ? 1 : 0) + (mayAssign ? 1 : 0));
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Modulkatalog</h1>
		<p class="text-base-content/80 text-sm">
			Die Module, wie das ZPA sie führt. Geplant werden nicht Module, sondern Instanzen — hier
			steht, woraus sich Instanzen bilden lassen.
		</p>
	</div>

	<form
		method="GET"
		class="border-base-300 bg-base-100 flex flex-wrap items-end gap-3 rounded-lg border p-4"
	>
		<label class="form-control">
			<span class="label-text text-sm">Studiengang</span>
			<select name="studiengang" class="select select-bordered select-sm">
				<option value="">alle</option>
				<!--
					Auch die, die die Fakultät nicht plant, und markiert: das hier ist der Katalog,
					und deren Module werden weiter gelehrt. Wonach nicht geplant werden kann, sagt
					die Bedarfsseite — dort stehen sie gar nicht erst zur Wahl.
				-->
				{#each data.programmes as programme (programme.code)}
					<option value={programme.code} selected={programme.code === data.filter.programme}>
						{programme.code}{programme.title ? ` — ${programme.title}` : ''}{programme.active
							? ''
							: ' (ohne SPO)'}{programme.planningStatus === 'PLANNED'
							? ''
							: ` (${PROGRAMME_STATUS_LABELS[programme.planningStatus]})`}
					</option>
				{/each}
			</select>
		</label>

		{#if spos.length > 0}
			<label class="form-control">
				<span class="label-text text-sm">Prüfungsordnung</span>
				<select name="spo" class="select select-bordered select-sm">
					<!-- No default, deliberately: ungefiltert ist die Vereinigung über alle Fassungen.
					     Ein Modul, das aus der neuesten gefallen ist, wird den Studierenden der
					     älteren weiter gelehrt. -->
					<option value="">alle Fassungen</option>
					{#each spos as spo (spo.id)}
						<option value={spo.id} selected={spo.id === data.filter.spo}>{spoLabel(spo)}</option>
					{/each}
				</select>
			</label>
		{/if}

		<label class="form-control">
			<span class="label-text text-sm">Turnus</span>
			<select name="turnus" class="select select-bordered select-sm">
				<option value="">alle</option>
				<option value="WS" selected={data.filter.term === 'WS'}>passt ins Wintersemester</option>
				<option value="SS" selected={data.filter.term === 'SS'}>passt ins Sommersemester</option>
			</select>
		</label>

		{#if data.filter.programme !== ''}
			<label class="form-control">
				<span class="label-text text-sm">Art</span>
				<select name="art" class="select select-bordered select-sm">
					<option value="">alle</option>
					<option value="COMPULSORY" selected={data.filter.duty === 'COMPULSORY'}>Pflicht</option>
					<option value="ELECTIVE" selected={data.filter.duty === 'ELECTIVE'}>Wahlpflicht</option>
					<option value="MIXED" selected={data.filter.duty === 'MIXED'}>uneinheitlich</option>
				</select>
			</label>
		{/if}

		<label class="form-control">
			<span class="label-text text-sm">Suchen</span>
			<input
				name="q"
				type="search"
				value={data.filter.search}
				placeholder="Name oder Modulcode"
				class="input input-bordered input-sm"
			/>
		</label>

		<label class="flex items-center gap-2 pb-1 text-sm">
			<input
				name="ohne-aufteilung"
				type="checkbox"
				value="1"
				checked={data.filter.withoutComponents}
				class="checkbox checkbox-sm"
			/>
			ohne SWS-Aufteilung
		</label>

		<label class="flex items-center gap-2 pb-1 text-sm">
			<input
				name="ohne-fachgruppe"
				type="checkbox"
				value="1"
				checked={data.filter.withoutSubjectGroup}
				class="checkbox checkbox-sm"
			/>
			ohne Fachgruppe
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Fachgruppe</span>
			<select name="fachgruppe" class="select select-bordered select-sm">
				<option value="" selected={data.filter.subjectGroup === ''}>alle</option>
				{#each assignableGroups as group (group.id)}
					<option value={group.id} selected={data.filter.subjectGroup === group.id}>
						{group.code} — {group.name}
					</option>
				{/each}
			</select>
		</label>

		<label class="flex items-center gap-2 pb-1 text-sm">
			<input
				name="inaktiv"
				type="checkbox"
				value="1"
				checked={data.filter.includeInactive}
				class="checkbox checkbox-sm"
			/>
			zurückgezogene anzeigen
		</label>

		<button type="submit" class="btn btn-sm">Anwenden</button>
	</form>

	<div class="text-base-content/80 flex flex-wrap gap-x-4 gap-y-1 text-sm">
		<span>{data.modules.length} Module</span>
		{#if withoutSplit > 0}
			<span>
				<span class="badge badge-warning badge-sm align-middle">{withoutSplit}</span>
				ohne SWS-Aufteilung — daraus lässt sich noch keine Instanz bilden
			</span>
		{/if}
		{#if data.modulesWithoutSubjectGroup > 0}
			<span>
				<span class="badge badge-warning badge-sm align-middle"
					>{data.modulesWithoutSubjectGroup}</span
				>
				Module im Katalog ohne Fachgruppe
			</span>
		{/if}
		{#if onlyAtHome > 0}
			<span>
				{onlyAtHome} davon gehören dem Studiengang, stehen aber in keiner seiner Prüfungsordnungen
			</span>
		{/if}
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	{#if assigned}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<!--
					Auch die Null wird gemeldet. „Nichts passiert" und „hat nicht geklappt" sind für
					die Person, die den Knopf gedrückt hat, sonst dasselbe.
				-->
				{assigned.modulesAssigned}
				{assigned.modulesAssigned === 1 ? 'Modul' : 'Module'}
				{#if assigned.subjectGroup}
					nach {assigned.subjectGroup.code} verschoben.
				{:else}
					aus ihrer Fachgruppe genommen.
				{/if}
				Es fehlen noch {assigned.modulesWithoutSubjectGroup}.
			</p>
		</div>
	{/if}

	<form method="POST" action="?/assignSubjectGroup" use:enhance>
		<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
			<table class="table table-sm">
				<thead>
					<tr>
						{#if mayAssign}
							<th><span class="sr-only">Auswählen</span></th>
						{/if}
						<th>Modul</th>
						<th>Heimat</th>
						<th>Fachgruppe</th>
						{#if data.filter.programme !== ''}
							<th>Art</th>
						{/if}
						<th>Verantwortlich</th>
						<th>Turnus</th>
						<th>Lehrform</th>
						<th>SWS-Aufteilung</th>
					</tr>
				</thead>
				<tbody>
					{#each data.modules as module (module.id)}
						<tr>
							{#if mayAssign}
								<td>
									<input
										type="checkbox"
										name="moduleId"
										value={module.id}
										aria-label="{moduleName(module)} auswählen"
										class="checkbox checkbox-sm"
									/>
								</td>
							{/if}
							<td>
								<a class="link font-medium" href={resolve(`/module/${module.id}`)}>
									{moduleName(module)}
								</a>
								{#if !module.active}
									<span class="badge badge-ghost badge-sm ml-1">zurückgezogen</span>
								{/if}
							</td>
							<td>
								{module.homeProgramme.code}
								{#if data.filter.programme !== '' && !module.inCatalogue}
									<span
										class="badge badge-ghost badge-sm ml-1"
										title="Gehört diesem Studiengang, steht aber in keiner seiner Prüfungsordnungen"
									>
										nur Heimat
									</span>
								{/if}
							</td>
							<td class="text-base-content/90">
								{#if module.subjectGroup}
									<span class="font-mono">{module.subjectGroup.code}</span>
									{#if !module.subjectGroup.active}
										<span class="badge badge-ghost badge-sm ml-1">stillgelegt</span>
									{/if}
								{:else}
									<span class="badge badge-warning badge-sm">fehlt</span>
								{/if}
							</td>
							{#if data.filter.programme !== ''}
								<td>
									{#if module.dutyStatus}
										<span class="badge badge-sm {dutyBadge(module.dutyStatus)}">
											{DUTY_LABELS[module.dutyStatus]}
										</span>
									{:else}
										<span class="text-base-content/80">—</span>
									{/if}
								</td>
							{/if}
							<td class="text-base-content/90">
								{#if module.responsible}
									{module.responsible.sortName}
								{:else}
									<!--
									Etwa jedes dreißigste Modul. Zwei Gründe, die hier nicht
									unterschieden werden: das ZPA nennt einen Platzhalter statt einer
									Person, oder eine Adresse, die nicht in der Lehrendenliste steht.
									Beides steht auf der Import-Seite.
								-->
									<span class="text-base-content/80">—</span>
								{/if}
							</td>
							<td class="text-base-content/90">{FREQUENCY_LABELS[module.frequency]}</td>
							<td class="text-base-content/90">
								{COURSE_TYPE_LABELS[module.courseType]}
								{#if module.contactHoursPerWeek != null}
									<span class="text-base-content/80">, {module.contactHoursPerWeek} SWS</span>
								{/if}
							</td>
							<td>
								{#if module.components.length > 0}
									<span class="text-base-content/90">{componentSummary(module.components)}</span>
								{:else}
									<!--
									Ein Badge, keine Textfarbe. `link-warning` auf `base-100` erreicht 1,35:1
									und ist auf den hellen Themes schlicht nicht lesbar — daisyUI paart die
									semantischen Farben mit ihrem `*-content` nur als Hintergrund.
								-->
									<a class="link" href={resolve(`/module/${module.id}`)}>
										<span class="badge badge-warning badge-sm">fehlt</span>
										<span class="ml-1">eintragen</span>
									</a>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan={columnCount} class="text-base-content/80 text-sm">
								Kein Modul passt zu diesen Filtern. Ist der Katalog schon importiert worden?
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if mayAssign}
			<div
				class="border-base-300 bg-base-100 mt-2 flex flex-wrap items-end gap-2 rounded-lg border p-4"
			>
				<label class="form-control">
					<span class="label-text text-sm">Ausgewählte Module zuordnen zu</span>
					<select name="subjectGroup" class="select select-bordered select-sm">
						{#each assignableGroups as group (group.id)}
							<option value={group.id}>{group.code} — {group.name}</option>
						{/each}
						<option value="">— keiner Fachgruppe —</option>
					</select>
				</label>
				<button type="submit" class="btn btn-sm btn-primary">Zuordnen</button>
				<p class="text-base-content/80 w-full text-sm">
					Ein Modul gehört zu genau einer Fachgruppe. Ein bereits zugeordnetes wird
					<strong>verschoben</strong>, in einem Schritt — es gibt keinen Moment, in dem es zu keiner
					gehört. Fachgruppen werden in der
					<a class="link" href={resolve('/verwaltung/fachgruppen')}>Verwaltung</a> angelegt.
				</p>
			</div>
		{/if}
	</form>
</div>
