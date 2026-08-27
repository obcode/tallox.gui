<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import WishCell from '$lib/components/WishCell.svelte';
	import { formatHours } from '$lib/catalogue';
	import { hoursLabel } from '$lib/demand';
	import { semesterName, semesterShortName } from '$lib/semester';
	import {
		closedPhaseHint,
		cohortIn,
		myWishByInstance,
		openPhaseHint,
		othersByInstance,
		othersHint,
		ownWishesBySemester,
		savedHint,
		splitByMySubjects,
		strongestPriority,
		studyGroupLabel,
		trackColumns,
		trackHeading,
		WISH_PRIORITY_LABELS,
		wishesAreOpen,
		closedSubjectGroups,
		settledProgrammes,
		rowClosedReason,
		demandStateHint,
		wishRowLabel,
		wishRows,
		wishTint,
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

	/**
	 * Which subject groups have shut their round, and which programmes have settled their demand.
	 *
	 * Both are public facts about the process. What they do here is let a row say *why* it takes no
	 * entries before somebody types into it — a field that accepts input and then refuses it is a
	 * worse way to learn the same thing.
	 *
	 * The window list is the exceptions: a group that is not in it is open.
	 */
	const closed = $derived(closedSubjectGroups(data.windows));
	const settled = $derived(settledProgrammes(data.completions));
	const published = $derived(data.semester?.wishesPublishedAt ?? null);

	const rows = $derived(wishRows(data.instances));
	const myGroupCodes = $derived(data.mySubjectGroups.map((g) => g.code));
	const split = $derived(splitByMySubjects(rows, myGroupCodes));

	const mine = $derived(myWishByInstance(data.myWishes));
	const others = $derived(othersByInstance(data.wishes, data.me?.mail));

	// Every semester, grouped by it — not only the one the picker is on. Somebody who entered
	// something for the summer term and then moved the picker has not withdrawn it.
	const ownBySemester = $derived(ownWishesBySemester(data.myWishes));

	/**
	 * Somewhere to jump to. Retired semesters and ones nobody has decided anything about are both
	 * in the list, because reading last year's wishes is a legitimate thing to want.
	 *
	 * Newest first, like the demand page and for the same reason: the planning semester is the
	 * earliest one offered, so oldest-first puts the one everybody wants at the far right, off the
	 * edge of the strip and behind a scroll nobody knows is there.
	 */
	const semesterTabs = $derived([...data.semesters].reverse());

	const sections = $derived([
		{ title: 'Meine Fachgruppen', rows: split.mine, own: true },
		{ title: 'Alle weiteren Module', rows: split.others, own: false }
	]);

	/**
	 * Speichern passiert beim Auswählen und beim Verlassen des Notizfeldes.
	 *
	 * Drei Ereignisse, und jedes hat seinen Grund:
	 *
	 * - `change` ist der Auslöser. Beim Auswahlfeld heißt es „ausgewählt", beim Textfeld „fertig
	 *   getippt" — beides ist genau der Moment. **Nicht `input`:** das feuert je Tastendruck, und
	 *   ein Rundlauf je Buchstabe wäre für eine Notiz das Falsche.
	 * - `input` merkt sich nur, dass etwas offen ist.
	 * - `focusout` fängt das Verlassen des Feldes auf jedem Weg ab. Der Browser feuert `change`
	 *   beim Textfeld nur, wenn *er* die Änderung als Eingabe gesehen hat; alles andere (eine
	 *   Erweiterung, ein Passwortmanager, ein Test, der den Wert setzt) käme sonst nie an. Deshalb
	 *   das Merken oben — sonst schickte jedes Verlassen einer Zelle ein zweites Mal ab.
	 *
	 * Alle drei blubbern, deshalb hängen die Zuhörer am Formular und nicht an jeder der mehreren
	 * hundert Zellen.
	 */
	let formElement = $state<HTMLFormElement | null>(null);
	let saving = $state(false);
	let savedOnce = $state(false);
	/** Etwas wurde getippt und ist noch nicht abgeschickt. Nicht `$state`: nichts rendert es. */
	let dirty = false;
	/**
	 * Eine Änderung, die während eines laufenden Speicherns kam.
	 *
	 * Nicht `$state`, weil nichts davon gerendert wird — und der Grund, dass es das überhaupt
	 * gibt: zwei gleichzeitige Abschickungen tragen beide den *ganzen* Formularzustand, und
	 * käme die ältere als zweite an, überschriebe sie die neuere Zelle wieder mit ihrem alten
	 * Wert. Also immer nur eines unterwegs, und danach bei Bedarf noch einmal.
	 */
	let queued = false;

	function saveNow() {
		if (!open) return;
		if (saving) {
			queued = true;
			return;
		}
		// Synchron zurückgesetzt und nicht erst nach der Antwort: sonst sähe das `focusout`, das
		// unmittelbar auf ein `change` folgt, noch das offene Flag und schickte gleich noch einmal.
		dirty = false;
		formElement?.requestSubmit();
	}

	function saveIfDirty() {
		if (dirty) saveNow();
	}
</script>

{#snippet wishTable(sectionRows: WishRow[])}
	{@const tracks = trackColumns(sectionRows)}
	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
		<table class="table table-sm w-full min-w-[720px]">
			<thead>
				<!--
					Die drei linken Spalten sind fest, den Rest teilen sich die Zug-Spalten — dort
					wird die Notiz getippt. Der Modulname bekommt genug, um in aller Regel in zwei
					Zeilen zu passen; enger war es zwar noch lesbar, aber die Namen im Katalog sind
					lang („Advanced Data Modeling and Analysis with R"), und eine Spalte, in der
					jeder zweite Titel vierzeilig umbricht, kostet mehr, als die Notiz gewinnt.
				-->
				<tr>
					<th class="w-28">Studiengruppe</th>
					<th class="w-72">Modul</th>
					<th class="w-16 text-right" title="Was alle Züge zusammen kosten.">SWS</th>
					{#each tracks as track (track)}
						<th>{trackHeading(track)}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sectionRows as row (row.programme.code + row.module.id)}
					{@const rowTint = wishTint(
						strongestPriority(row.cohorts.map((c) => mine.get(c.instanceId)?.priority))
					)}
					{@const closedReason = rowClosedReason(row, closed)}
					{@const demandHint = demandStateHint(row, settled)}
					<tr>
						<td class="align-top font-mono text-xs {rowTint}">{studyGroupLabel(row)}</td>
						<td class="align-top {rowTint}">
							<a class="link font-medium" href={resolve('/module/[id]', { id: row.module.id })}>
								{row.module.name}
							</a>
							{#if demandHint}
								<!--
									Eine Orientierung, keine Warnung: sich in einen Studiengang einzutragen,
									der seinen Bedarf noch bearbeitet, ist erlaubt und oft sinnvoll. Der
									Hinweis fehlt, sobald gemeldet ist — eine Marke auf jeder Zeile wäre
									Rauschen genau auf den Zeilen, die zählen.
								-->
								<span class="badge badge-ghost badge-xs ml-1 align-middle">{demandHint}</span>
							{/if}
							{#if row.module.subjectGroup}
								<!--
									Ungedämpft, anders als sonst in einer Tabelle — und das ist keine
									Ausnahme von der Regel, sondern sie richtig gelesen: „/80 ist die
									Untergrenze" ist gegen `base-100` gemessen. Diese Zelle steht auf
									der getönten Fläche der Zeile, und dort misst `/80` auf `winter`
									3,48:1. Eine andere Fläche braucht ihre eigene Messung.
								-->
								<span class="block font-mono text-xs">
									{row.module.subjectGroup.code}
								</span>
							{/if}
						</td>
						<!-- Ebenfalls ungedämpft, aus demselben Grund wie das Kürzel eine Zelle weiter. -->
						<td class="align-top text-right {rowTint}">
							{formatHours(row.teachingHours)}
						</td>
						{#each tracks as track (track)}
							{@const cohort = cohortIn(row, track)}
							{@const wish = cohort ? mine.get(cohort.instanceId) : undefined}
							<!--
								Die ganze Zelle wird hinterlegt, nicht nur das Bedienelement darin: was
								man in dieser Tabelle sucht, ist „wo habe ich etwas stehen", und das
								liest sich an der Fläche ab.

								Die Farbe folgt dem **gespeicherten** Wunsch und sonst nichts. Nie
								fremden Eintragungen — das wäre die Heatmap, gegen die die ganze
								Vertraulichkeitsregel geschrieben ist.
							-->
							<td class="align-top {wishTint(wish?.priority ?? '')}">
								{#if cohort}
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
											open={open && closedReason === null}
										/>
									{/key}
									{#if closedReason}
										<p class="text-base-content/80 mt-1 text-xs">{closedReason}</p>
									{/if}
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

	<!--
		Jeder Reiter ist ein Submit-Knopf, wie auf der Bedarfsseite: umgeschaltet wird mit einem
		Klick und nicht mit zweien, und es braucht kein JavaScript dafür — ein Auswahlfeld, das sich
		selbst abschickt, bräuchte welches, und daneben stünde wieder ein Knopf.

		Das <form> steht um die Leiste herum und nie dazwischen: daisyUI stylt über `.tabs > .tab`,
		und ein Formular in der Mitte nimmt der Leiste Rahmen, Abstände und den markierten Zustand.
	-->
	<form method="GET" class="flex flex-col gap-1">
		<span class="label-text text-sm">Semester</span>
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

	{#if data.myWishes.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-medium">
				Meine Eintragungen
				<!--
					Die eigene Zahl ist unbedenklich: sie sagt nichts über andere. Genau deshalb steht
					sie hier und nirgends sonst auf dieser Seite.
				-->
				<span class="text-base-content/80 text-sm font-normal">({data.myWishes.length})</span>
			</h2>
			<p class="text-base-content/80 max-w-3xl text-sm">
				Alles, was Du eingetragen hast — über alle Semester, nicht nur über das oben ausgewählte.
				Die SWS je Semester sind das, was die eingetragenen Züge zusammen kosten; wer davon welchen
				Teil hält, entscheidet die Zuteilung.
			</p>

			<div class="flex flex-col gap-3">
				{#each ownBySemester as group (group.code)}
					<article class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
						<h3 class="text-base font-medium">
							{group.code === '' ? 'Ohne Semester' : semesterName(group.code)}
							{#if group.code === data.semester?.code}
								<span class="badge badge-ghost badge-sm align-middle">angezeigt</span>
							{:else if group.code !== ''}
								<!--
									resolve() baut die Route, der Query-String kommt dahinter — dieselbe
									Route mit anderer Auswahl. Ohne resolve() schlägt
									svelte/no-navigation-without-resolve zu, und zwar zu Recht: ein
									href, das mit „?" beginnt, hängt an der Adresse, auf der man
									gerade steht.
								-->
								<a
									class="link text-sm font-normal"
									href="{resolve('/wuensche')}?semester={group.code}"
								>
									anzeigen
								</a>
							{/if}
							<!--
								Die eigene Summe, und deshalb sagbar: sie handelt von dem, was diese
								Person angeboten hat, und von niemandem sonst.
							-->
							<span class="text-base-content/80 text-sm font-normal">
								· {hoursLabel(group.teachingHours)}
							</span>
						</h3>
						<div class="overflow-x-auto">
							<table class="table table-sm w-full min-w-[480px]">
								<thead>
									<tr>
										<th class="w-56">Zug und Modul</th>
										<th class="w-24">Priorität</th>
										<th>Notiz</th>
									</tr>
								</thead>
								<tbody>
									<!--
										Dieselbe Tönung wie in der Wunschtabelle, damit die drei Stufen
										hier nicht nur als Wort dastehen — man liest diese Liste, um zu
										sehen, was man wo zugesagt hat.

										Ungedämpfter Text, wie drüben und aus demselben Grund: „/80 ist
										die Untergrenze" ist gegen `base-100` gemessen, nicht gegen die
										getönte Fläche.
									-->
									{#each group.wishes as wish (wish.id)}
										<tr class={wishTint(wish.priority)}>
											<td class="font-medium">{wishRowLabel(wish.instance)}</td>
											<td>{WISH_PRIORITY_LABELS[wish.priority]}</td>
											<td>{wish.note}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</article>
				{/each}
			</div>
		</section>
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
			bind:this={formElement}
			onchange={saveNow}
			oninput={() => (dirty = true)}
			onfocusout={saveIfDirty}
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update({ reset: false });
					saving = false;
					savedOnce = true;
					if (queued) {
						queued = false;
						saveNow();
					}
				};
			}}
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
				<p class="text-base-content/90 grow text-sm" aria-live="polite">
					{#if saving}
						<span class="loading loading-spinner loading-xs align-middle"></span>
						wird gespeichert …
					{:else if savedOnce}
						<span class="badge badge-ghost badge-sm align-middle">gespeichert</span>
						Änderungen werden sofort übernommen. Eine Zelle auf „—“ zu stellen zieht die Eintragung zurück.
					{:else}
						Änderungen werden beim Auswählen gespeichert — bei der Notiz, sobald Du das Feld
						verlässt. Eine Zelle auf „—“ zu stellen zieht die Eintragung zurück.
					{/if}
				</p>
				<!--
					Bleibt, obwohl er im Normalfall nichts tut: ohne JavaScript ist er der einzige
					Weg, ein Auswahlfeld abzuschicken. Deshalb unauffällig statt als Hauptaktion —
					und weil er die ganze Tabelle schickt, ist ein Druck darauf folgenlos, wenn
					ohnehin schon alles gespeichert ist.
				-->
				<button type="submit" class="btn btn-ghost btn-sm" disabled={!open || saving}>
					Alles speichern
				</button>
			</div>
		</form>
	{/if}
</div>
