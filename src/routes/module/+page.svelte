<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		COURSE_TYPE_LABELS,
		DUTY_LABELS,
		FREQUENCY_LABELS,
		componentSummary,
		dutyBadge,
		moduleName,
		spoLabel
	} from '$lib/catalogue';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
				{#each data.programmes as programme (programme.code)}
					<option value={programme.code} selected={programme.code === data.filter.programme}>
						{programme.code}{programme.title ? ` — ${programme.title}` : ''}{programme.active
							? ''
							: ' (ohne SPO)'}
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
		{#if onlyAtHome > 0}
			<span>
				{onlyAtHome} davon gehören dem Studiengang, stehen aber in keiner seiner Prüfungsordnungen
			</span>
		{/if}
	</div>

	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
		<table class="table table-sm">
			<thead>
				<tr>
					<th>Modul</th>
					<th>Heimat</th>
					{#if data.filter.programme !== ''}
						<th>Art</th>
					{/if}
					<th>Turnus</th>
					<th>Lehrform</th>
					<th>SWS-Aufteilung</th>
				</tr>
			</thead>
			<tbody>
				{#each data.modules as module (module.id)}
					<tr>
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
						<td colspan="6" class="text-base-content/80 text-sm">
							Kein Modul passt zu diesen Filtern. Ist der Katalog schon importiert worden?
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
