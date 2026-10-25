<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { enhance } from '$app/forms';
	import { askBeforeLeave, autosave } from '$lib/saveOnLeave';
	import { resolve } from '$app/paths';
	import {
		ALL_PART_KINDS,
		COURSE_TYPE_LABELS,
		FREQUENCY_LABELS,
		teacherRole,
		PART_KIND_LABELS,
		componentMismatch,
		contactHoursLabel,
		filingGroupsFor,
		componentSummary,
		formatHours,
		mayFileModules,
		mayRefileModule,
		mayWriteModuleSplit,
		moduleName,
		spoLabel
	} from '$lib/catalogue';
	import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
	import HandbookLink from '$lib/components/HandbookLink.svelte';
	import { changedLines, refusedLines, splitSummary } from '$lib/splitApplication';
	import { hasAnyRole } from '$lib/roles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Cosmetic, like every role check in this application — the backend refuses the mutation
	// anyway, and it refuses it on the token path too. Worth doing so that a lecturer reads which
	// subject the module belongs to without being offered a control that always fails.
	//
	// The effective roles, not `me.roles`: narrowed to LECTURER, an administrator is offered what a
	// lecturer is. `subjectGroupsLed` already follows the narrowing on the server.
	const roles = $derived(data.session?.effectiveRoles ?? []);
	const led = $derived(data.me?.subjectGroupsLed ?? []);

	// Whether this module is in reach: an administrator and the dean's office move anything, a
	// subject group lead pulls in a module that is in no group and releases one of hers.
	const mayAssign = $derived(mayRefileModule(roles, led, data.module.subjectGroup?.id));
	// Somebody who files modules elsewhere, looking at one filed under a colleague's group. Told
	// why the control is missing rather than left to wonder.
	const filedElsewhere = $derived(!mayAssign && mayFileModules(roles, led));
	// Whether the page is talking to a lead rather than to somebody who reaches every group —
	// the "no group" answer means releasing the module, and the label says so.
	const asLead = $derived(!hasAnyRole(roles, ['ADMIN', 'DEANS_OFFICE']));

	// Retired groups are not somewhere to put a module, and a lead is offered only her own. One
	// the module already sits in still renders as such — that is what the `active` flag on the
	// reference is for.
	const assignableGroups = $derived(
		filingGroupsFor(
			roles,
			data.subjectGroups.filter((g) => g.active),
			led
		)
	);

	const assigned = $derived(form && 'assigned' in form ? form.assigned : null);

	// Whether the split editor is offered at all. The lead of the home programme, the lead of the
	// module's subject group, and the dean's office; everybody else reads the split and is told
	// who enters it, rather than filling in a form that is refused on saving.
	const maySplit = $derived(
		mayWriteModuleSplit(roles, data.me?.programmes ?? [], led, data.module)
	);

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
			data.module.contactHoursPerWeek,
			data.module.semesterSpan
		)
	);

	const overTwoSemesters = $derived(data.module.semesterSpan > 1);

	// What carrying the split over to the existing instances would do, or did. Saving the split
	// asks for the preview by itself, so the gap shows the moment it opens.
	const splitReport = $derived(
		form && 'splitApplication' in form
			? form.splitApplication
			: form && 'splitPreview' in form
				? form.splitPreview
				: null
	);
	const splitChanged = $derived(splitReport ? changedLines(splitReport) : []);
	const splitRefused = $derived(splitReport ? refusedLines(splitReport) : []);

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
				· {contactHoursLabel(data.module.contactHoursPerWeek, data.module.semesterSpan)} laut Modulkatalog
				{#if overTwoSemesters && data.module.contactHoursPerSemester != null}
					({formatHours(data.module.contactHoursPerSemester)} je Semester)
				{/if}
			{/if}
			{#if data.module.credits != null}
				· {data.module.credits} ECTS
			{/if}
		</p>
		{#if data.module.handbookUrl}
			<p class="text-sm"><HandbookLink module={data.module} /></p>
		{/if}
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
					Jetzt in {assigned.subjectGroup.name}.
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
				{data.module.subjectGroup.name}
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
				The same mutation as the batch assignment in the catalogue, with a list of one. No
				second one for the single case: "exactly one subject group, moving in one step" is a
				rule of that mutation, and a second way in would be a second place where it can go
				wrong.
			-->
			<form
				method="POST"
				action="?/subjectGroup"
				use:autosave={{ label: 'Fachgruppe' }}
				class="mt-3 flex flex-wrap items-end gap-2"
			>
				<label class="form-control">
					<span class="label-text text-sm">Fachgruppe</span>
					<select name="subjectGroup" class="select select-bordered select-sm">
						<option value="" selected={data.module.subjectGroup == null}>
							{asLead && data.module.subjectGroup ? '— keine (freigeben) —' : '— keine —'}
						</option>
						{#each assignableGroups as group (group.id)}
							<option value={group.id} selected={group.id === data.module.subjectGroup?.id}>
								{group.name}
							</option>
						{/each}
					</select>
				</label>
				<!-- Saved on choosing. Without JavaScript this is the way to send. -->
				<noscript><button type="submit" class="btn btn-sm">Speichern</button></noscript>
			</form>

			{#if asLead}
				<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
					Als Fachgruppenleitung kannst Du ein Modul ohne Fachgruppe in eine Deiner Fachgruppen
					aufnehmen und ein Modul Deiner Fachgruppe wieder freigeben — es steht dann in keiner
					Fachgruppe, bis jemand es aufnimmt.
				</p>
			{:else if assignableGroups.length === 0}
				<p class="text-base-content/80 mt-2 text-sm">
					Es gibt noch keine Fachgruppe. Angelegt werden sie in der
					<a class="link" href={resolve('/verwaltung/fachgruppen')}>Verwaltung</a>.
				</p>
			{/if}
		{:else if filedElsewhere}
			<!--
				Both ends of a move have to be within reach. Pulling a module over from another
				subject group would be a one-sided act against the other group; its lead releases it,
				then it can be taken in.
			-->
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Dieses Modul gehört zu einer Fachgruppe, die Du nicht leitest. Aufnehmen kannst Du es erst,
				wenn deren Leitung es freigibt — oder das Dekanat bzw. die Administration es umhängt.
			</p>
		{:else}
			<p class="text-base-content/80 mt-1 text-sm">
				Zuordnen kann sie die Leitung der Fachgruppe, das Dekanat oder die Administration — welche
				Fachgruppen es gibt und wer sie leitet, steht unter
				<a class="link" href={resolve('/verwaltung/fachgruppen')}>Fachgruppen</a>.
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
						Having been taken over from the ZPA does not mean being allowed to use Tallox — who
						may sign in is set in the person administration. This is the only place where the
						distinction becomes visible, and it is not a call to action: most teachers need no
						access as long as they do not enter any wishes.
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

	<section
		class="border-base-300 bg-base-100 rounded-lg border p-4"
		aria-labelledby="project-based"
	>
		<h2 id="project-based" class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🧭</span> Praxisbegleitende Lehrveranstaltung (PBLV)
		</h2>
		<p class="text-base-content/80 mb-3 max-w-3xl text-sm">
			PBLVs werden zuletzt vergeben, damit sie nicht als Lückenfüller weggeschnappt werden. Das ZPA
			führt sie nur in einzelnen Studiengängen als Korb, deshalb trägt die Fakultät es hier einmal
			je Modul ein.
		</p>
		{#if maySplit}
			<form method="POST" action="?/projectBased" use:enhance class="flex items-center gap-3">
				<input type="hidden" name="projectBased" value={data.module.projectBased ? '0' : '1'} />
				<span class="text-sm">
					{#if data.module.projectBased}
						<span class="badge badge-secondary badge-sm align-middle">PBLV</span> Dieses Modul ist als
						PBLV gekennzeichnet.
					{:else}
						Dieses Modul ist nicht als PBLV gekennzeichnet.
					{/if}
				</span>
				<button type="submit" class="btn btn-sm">
					{data.module.projectBased ? 'Kennzeichnung entfernen' : 'Als PBLV kennzeichnen'}
				</button>
			</form>
		{:else}
			<p class="text-base-content/90 text-sm">
				{#if data.module.projectBased}
					<span class="badge badge-secondary badge-sm align-middle">PBLV</span>
					Dieses Modul ist als PBLV gekennzeichnet.
				{:else}
					Nicht als PBLV gekennzeichnet.
				{/if}
				Ändern können es die Fachgruppenleitung, die Studiengangsleitung von
				{data.module.homeProgramme.code} und das Dekanat.
			</p>
		{/if}
	</section>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🧮</span> SWS-Aufteilung
		</h2>
		<p class="text-base-content/80 mb-3 text-sm">
			Wie sich die Lehre dieses Moduls auf Vorlesung, Praktikum und Übung aufteilt. Das ZPA nennt
			nur eine Gesamtzahl — die Aufteilung weiß die Fakultät. Sie wird einmal eingetragen und ändert
			sich danach normalerweise nicht. Fehlt sie, lässt sich das Modul nicht planen — die Schätzung
			unten ist ein Vorschlag zum Bestätigen.
		</p>

		<section class="mb-3" aria-labelledby="semester-span">
			<h3 id="semester-span" class="sr-only">Dauer</h3>
			{#if overTwoSemesters}
				<p class="text-base-content/90 text-sm">
					<span class="badge badge-secondary badge-sm align-middle">2 Semester</span>
					Dieses Modul läuft über zwei Semester. Die Aufteilung gilt je Semester, und geplant wird in
					jedem der beiden Semester eine eigene Instanz.
				</p>
			{:else if maySplit}
				<p class="text-base-content/80 text-sm">
					Läuft das Modul über zwei Semester (der Modulkatalog nennt dann die SWS beider Semester
					zusammen), hier markieren — die Aufteilung wird dann je Semester eingetragen.
				</p>
			{/if}
			{#if maySplit}
				<!-- Refill as after saving the split: the proposal depends on the duration. -->
				<form
					method="POST"
					action="?/semesterSpan"
					use:enhance={() =>
						async ({ update }) => {
							await update({ reset: false });
							rows = initialRows();
						}}
					class="mt-2"
				>
					<input type="hidden" name="semesters" value={overTwoSemesters ? '1' : '2'} />
					<button type="submit" class="btn btn-sm">
						{overTwoSemesters ? 'Läuft nur über ein Semester' : 'Läuft über zwei Semester'}
					</button>
				</form>
			{/if}
		</section>

		{#if proposed}
			<p class="text-base-content/90 mb-3 text-sm">
				<span class="badge badge-warning badge-sm align-middle">geschätzt</span>
				Aus Lehrform und SWS abgeleitet, von niemandem bestätigt. Instanzen lassen sich erst anlegen,
				wenn die Aufteilung geprüft und gespeichert ist.
			</p>
		{/if}

		{#if !maySplit}
			{@const shown = proposed ? data.module.proposedComponents : data.module.components}
			{#if shown.length > 0}
				<p class="text-base-content/90 text-sm">{componentSummary(shown)}</p>
			{/if}
			<p class="text-base-content/80 mt-2 text-sm">
				Eintragen können die Fachgruppenleitung dieses Moduls, die Studiengangsleitung von
				{data.module.homeProgramme.code} und das Dekanat.
			</p>
		{:else}
			<!--
			`enhance` without its own callback resets the form after a successful submission, and
			Svelte 5 pulls a `reset` into the bound values. The editor then stood there empty even
			though the split had been saved — and whoever sees that types it in again. So do not
			reset, but refill from the freshly loaded data.
		-->
			<form
				method="POST"
				action="?/components"
				use:askBeforeLeave={{
					label: 'SWS-Aufteilung',
					submit:
						() =>
						async ({ update }) => {
							await update({ reset: false });
							rows = initialRows();
						}
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
								placeholder="leer oder 0 = entfernen"
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
		{/if}

		{#if maySplit && data.module.components.length > 0}
			<section class="border-base-300 mt-4 border-t pt-4" aria-labelledby="split-instances">
				<h3 id="split-instances" class="mb-1 font-medium">Bestehende Instanzen</h3>
				<p class="text-base-content/80 mb-3 max-w-3xl text-sm">
					Instanzen behalten ihre Teile, wenn sich die Aufteilung später ändert — auch die aus dem
					Vorjahr übernommenen. Hier lässt sich die Aufteilung auf alle Instanzen dieses Moduls in
					laufenden Semestern übertragen, in allen Studiengängen. Von Hand geänderte SWS werden
					dabei überschrieben, besetzte Teile werden nicht entfernt. Die Vorschau zeigt vorher, was
					sich ändert.
				</p>

				{#if splitReport}
					<p class="text-base-content/90 text-sm">
						{#if splitReport.dryRun}
							<span class="badge badge-info badge-sm align-middle">Vorschau</span>
						{:else}
							<span class="badge badge-ghost badge-sm align-middle">Übertragen</span>
						{/if}
						{splitSummary(splitReport)}
					</p>
					{#if splitChanged.length > 0}
						<ul class="text-base-content/90 mt-2 flex flex-col gap-1 text-sm">
							{#each splitChanged as line, i (i)}
								<li><span class="font-medium">{line.label}:</span> {line.text}</li>
							{/each}
						</ul>
					{/if}
					{#if splitRefused.length > 0}
						<p class="text-base-content/90 mt-3 text-sm">
							<span class="badge badge-warning badge-sm align-middle">Bleibt, wie es ist</span>
						</p>
						<ul class="text-base-content/90 mt-1 flex flex-col gap-1 text-sm">
							{#each splitRefused as line, i (i)}
								<li><span class="font-medium">{line.label}:</span> {line.text}</li>
							{/each}
						</ul>
					{/if}
				{/if}

				<form method="POST" action="?/applySplit" use:enhance class="mt-3 flex flex-wrap gap-2">
					{#if splitReport?.dryRun && splitReport.changed.length > 0}
						<button type="submit" name="dryRun" value="0" class="btn btn-sm btn-primary">
							Jetzt übertragen
						</button>
					{/if}
					<button type="submit" name="dryRun" value="1" class="btn btn-sm">
						{splitReport ? 'Vorschau aktualisieren' : 'Vorschau: auf Instanzen übertragen'}
					</button>
				</form>
			</section>
		{/if}
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
				<table class="table table-sm table-stack" use:stackedTable>
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
