<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import WishCell from '$lib/components/WishCell.svelte';
	import { hoursLabel } from '$lib/demand';
	import { semesterName } from '$lib/semester';
	import {
		closedPhaseHint,
		cohortIn,
		myWishByInstance,
		openPhaseHint,
		othersByInstance,
		othersHint,
		savedHint,
		splitByMySubjects,
		studyGroupLabel,
		trackColumns,
		trackHeading,
		WISH_PRIORITY_LABELS,
		wishesAreOpen,
		wishRowLabel,
		wishRows,
		type WishRow
	} from '$lib/wishes';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form.message : null);
	const refusalsByInstance = $derived.by(() => {
		const byInstance: Record<string, string> = {};
		for (const r of form?.refusals ?? []) byInstance[r.instanceId] = r.message;
		return byInstance;
	});

	const phase = $derived(data.semester?.phase ?? null);
	const open = $derived(wishesAreOpen(phase));
	const published = $derived(data.semester?.wishesPublishedAt ?? null);

	const rows = $derived(wishRows(data.instances));
	const myGroupCodes = $derived(data.mySubjectGroups.map((g) => g.code));
	const split = $derived(splitByMySubjects(rows, myGroupCodes));

	const mine = $derived(myWishByInstance(data.myWishes));
	const others = $derived(othersByInstance(data.wishes, data.me?.mail));

	// Somewhere to jump to. Retired semesters and ones nobody has decided anything about are both
	// in the list, because reading last year's wishes is a legitimate thing to want.
	const semesters = $derived(data.semesters.map((s) => s.code));

	const sections = $derived([
		{ title: 'Meine Fachgruppen', rows: split.mine, own: true },
		{ title: 'Alle weiteren Module', rows: split.others, own: false }
	]);
</script>

{#snippet wishTable(sectionRows: WishRow[])}
	{@const tracks = trackColumns(sectionRows)}
	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
		<table class="table table-sm w-full min-w-[720px]">
			<thead>
				<tr>
					<th class="w-28">Studiengruppe</th>
					<th>Modul</th>
					<th class="w-20 text-right" title="Was alle Züge zusammen kosten.">SWS</th>
					{#each tracks as track (track)}
						<th class="w-40">{trackHeading(track)}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sectionRows as row (row.programme.code + row.module.id)}
					<tr>
						<td class="align-top font-mono text-xs">{studyGroupLabel(row)}</td>
						<td class="align-top">
							<a class="link font-medium" href={resolve('/module/[id]', { id: row.module.id })}>
								{row.module.name}
							</a>
							{#if row.module.subjectGroup}
								<span class="text-base-content/80 block font-mono text-xs">
									{row.module.subjectGroup.code}
								</span>
							{/if}
						</td>
						<td class="text-base-content/90 align-top text-right">
							{hoursLabel(row.teachingHours)}
						</td>
						{#each tracks as track (track)}
							{@const cohort = cohortIn(row, track)}
							<td class="align-top">
								{#if cohort}
									{@const wish = mine.get(cohort.instanceId)}
									<!--
										Der Schlüssel ist der gespeicherte Zustand, nicht die Kennung der
										Instanz: die Zelle hält den Eingabestand lokal und soll genau dann
										neu aufsetzen, wenn sich das Gespeicherte geändert hat — nach dem
										Speichern also, und nicht währenddessen.
									-->
									{#key `${wish?.id ?? ''}:${wish?.priority ?? ''}:${wish?.note ?? ''}`}
										<WishCell
											instanceId={cohort.instanceId}
											label="{cohort.label} · {row.module.name}"
											{wish}
											others={others[cohort.instanceId] ?? []}
											{open}
										/>
									{/key}
									{#if refusalsByInstance[cohort.instanceId]}
										<!--
											Farbe als Hintergrund, nie als Textfarbe: text-error liegt auf den
											hellen Themes bei 1,35:1 bis 3,5:1 und ist als Text unlesbar,
											egal was es signalisiert.
										-->
										<p class="text-base-content/80 mt-1 text-xs">
											<span class="badge badge-error badge-xs align-middle">Nicht gespeichert</span>
											{refusalsByInstance[cohort.instanceId]}
										</p>
									{/if}
								{:else}
									<span class="text-base-content/80" aria-hidden="true">—</span>
									<span class="sr-only">wird in diesem Zug nicht angeboten</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Wünsche</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Eine Zeile je Modul, eine Spalte je Zug — dieselbe Aufteilung wie bisher in Confluence. Trag
			ein, was Du halten würdest, und wie gern.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			<strong>Was Du hier einträgst, sehen andere bis zum Stichtag nicht</strong> — auch nicht als Anzahl.
			Das ist der Zweck der Wunschphase: niemand soll sich fragen müssen, ob ein Fach schon „besetzt“
			ist, bevor er sich einträgt.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Wer welchen <em>Teil</em> übernimmt — Vorlesung, ein einzelnes Praktikum — wird erst bei der Zuteilung
			festgelegt, weil das eine Absprache zwischen mehreren ist. Wenn Du dazu schon etwas sagen willst,
			schreib es in die Notiz: „nur die Vorlesung“, „lieber Zug B“.
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<label class="form-control">
			<span class="label-text text-sm">Semester</span>
			<select name="semester" class="select select-bordered select-sm">
				{#each semesters as code (code)}
					<option value={code} selected={code === data.semester?.code}>
						{semesterName(code)}
					</option>
				{/each}
			</select>
		</label>
		<button type="submit" class="btn btn-sm">Anzeigen</button>
	</form>

	{#if data.unusable}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">Kein Semester</span>
				{data.unusable}
			</p>
			<p class="text-base-content/80 mt-1 text-sm">Bitte oben eines auswählen.</p>
		</div>
	{:else if data.semester === null}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">Kein Semester</span>
				Es ist kein Planungssemester festgelegt.
			</p>
			<p class="text-base-content/80 mt-1 text-sm">
				Welches geplant wird, steht unter <a class="link" href={resolve('/semester')}>Semester</a>
				— oder wähle oben eines aus.
			</p>
		</div>
	{:else}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			{#if open}
				<p class="text-base-content/90 text-sm">{openPhaseHint(phase)}</p>
				<p class="text-base-content/80 mt-1 text-sm">
					Eintragen und Ändern geht, solange das Semester nicht abgeschlossen ist — die Wunschphase
					ist der Zeitpunkt, zu dem darum gebeten wird, und keine Frist, nach der nichts mehr
					korrigierbar wäre.
				</p>
			{:else}
				<p class="text-base-content/90 text-sm">
					<span class="badge badge-ghost badge-sm align-middle">abgeschlossen</span>
					{closedPhaseHint(phase)}
				</p>
				<p class="text-base-content/80 mt-1 text-sm">
					Bereits eingetragene Wünsche bleiben sichtbar. In welcher Phase ein Semester steht, steht
					unter <a class="link" href={resolve('/semester')}>Semester</a>.
				</p>
			{/if}
		</div>
	{/if}

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal}
			</p>
		</div>
	{:else if form && 'saved' in form}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">Gespeichert</span>
				{savedHint(form.saved ?? 0)}
				{#if (form.refusals?.length ?? 0) > 0}
					{form.refusals.length} Zelle{form.refusals.length === 1 ? '' : 'n'} nicht — die Meldung steht
					in der Zeile.
				{/if}
			</p>
		</div>
	{/if}

	<p class="text-base-content/80 max-w-3xl text-sm">{othersHint(published)}</p>

	{#if data.instances.length === 0}
		<p class="text-base-content/80 text-sm">
			Für dieses Semester ist noch kein Bedarf angemeldet — es gibt also nichts, worauf man sich
			eintragen könnte. Was angeboten wird, legen die Studiengangsleitungen unter
			<a class="link" href={resolve('/bedarf')}>Bedarf</a> fest.
		</p>
	{:else}
		<!--
			Eine Tabelle, ein Formular, ein Speichern. So wurde die Confluence-Tabelle auch benutzt:
			runtergehen, drei Sachen eintragen, fertig. Und ohne JavaScript funktioniert es genauso,
			was ein Auswahlfeld, das sich selbst abschickt, nicht täte.
		-->
		<form
			method="POST"
			action="?/save"
			use:enhance={() =>
				({ update }) =>
					update({ reset: false })}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="semester" value={data.semester?.code ?? ''} />

			{#each sections as section (section.title)}
				<!--
					Der eigene Abschnitt wird auch dann gerendert, wenn er leer ist. Sonst ist der Satz
					darunter unerreichbar — und wer in keiner Fachgruppe ist, sieht auf dieser Seite nur
					„Alle weiteren Module" und erfährt nie, dass es eine Vorauswahl gäbe.
				-->
				{#if section.rows.length > 0 || section.own}
					<section class="flex flex-col gap-2">
						<h2 class="text-lg font-medium">
							{section.title}
							<span class="text-base-content/80 text-sm font-normal">({section.rows.length})</span>
						</h2>
						{#if section.own && myGroupCodes.length === 0}
							<p class="text-base-content/80 max-w-3xl text-sm">
								Du bist noch keiner Fachgruppe zugeordnet — deshalb steht hier nichts. Welche es
								gibt und was in ihnen steckt, siehst Du unter
								<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a>;
								eintragen kannst Du Dich dort selbst.
							</p>
						{:else if !section.own}
							<p class="text-base-content/80 max-w-3xl text-sm">
								Die Fachgruppe ist eine Vorauswahl und keine Schranke: eintragen kannst Du Dich
								überall. Wer sich ein Gebiet erschließen will, tritt der Fachgruppe bei — das ist
								der Weg, nicht eine Ablehnung.
							</p>
						{/if}

						{#if section.rows.length > 0}
							{@render wishTable(section.rows)}
						{/if}
					</section>
				{/if}
			{/each}

			<div
				class="border-base-300 bg-base-100 sticky bottom-0 flex flex-wrap items-center gap-3 rounded-lg border p-3"
			>
				<button type="submit" class="btn btn-primary btn-sm" disabled={!open}>
					Eintragungen speichern
				</button>
				<p class="text-base-content/80 text-sm">
					Speichert die ganze Tabelle auf einmal. Eine Zeile auf „—“ zu stellen zieht die Eintragung
					zurück.
				</p>
			</div>
		</form>
	{/if}

	{#if data.myWishes.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-medium">
				Meine Eintragungen
				<span class="text-base-content/80 text-sm font-normal">({data.myWishes.length})</span>
			</h2>
			<!--
				Die eigene Zahl ist unbedenklich: sie sagt nichts über andere. Genau deshalb steht
				sie hier und nirgends sonst auf dieser Seite.
			-->
			<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
				<table class="table table-sm w-full min-w-[560px]">
					<thead>
						<tr>
							<th>Zug und Modul</th>
							<th>Priorität</th>
							<th>Notiz</th>
						</tr>
					</thead>
					<tbody>
						{#each data.myWishes as wish (wish.id)}
							<tr>
								<td class="font-medium">{wishRowLabel(wish.instance)}</td>
								<td class="text-base-content/90">{WISH_PRIORITY_LABELS[wish.priority]}</td>
								<td class="text-base-content/80">{wish.note}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
