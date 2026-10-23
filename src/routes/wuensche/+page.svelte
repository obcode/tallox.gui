<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import { autosave, trackSaves } from '$lib/saveOnLeave';
	import WishCell from '$lib/components/WishCell.svelte';
	import DesiredRangeFields from '$lib/components/DesiredRangeFields.svelte';
	import { applyOrder, nextSort, sortRows, type SortState } from '$lib/sorting';
	import { formatHours } from '$lib/catalogue';
	import {
		facultiesElsewhere,
		formatBadges,
		heldForLabel,
		hoursLabel,
		moduleRowKey,
		withTopic
	} from '$lib/demand';
	import { semesterName, semesterShortName } from '$lib/semester';
	import {
		heldForOthers,
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
		desiredHoursLabel,
		wishRowLabel,
		wishRows,
		wishTint,
		OWN_WISH_SORT,
		trackSortKey,
		wishSortValue,
		type OwnWishSortKey,
		type WishRow,
		type WishSortKey
	} from '$lib/wishes';
	import { desiredHoursStage, loadBreakdown, STAGE_HINTS, STAGE_LABELS } from '$lib/desiredHours';
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
	const desiredStage = $derived(data.semester ? desiredHoursStage(data.semester) : 'OPEN');
	// Open for one's own figure until the dean's office freezes it, and never once the semester is
	// over. The backend decides; this only saves a refusal on every keystroke.
	const desiredEditable = $derived(open && desiredStage === 'OPEN');

	// The note keeps its own text for the reason DesiredRangeFields gives: the page reloads after
	// every save, and must not rewrite a field somebody is typing into.
	const storedNote = () => data.desiredHours?.note ?? '';
	let desiredNote = $state(untrack(storedNote));
	let syncedNote = untrack(storedNote);
	let noteField: HTMLInputElement | undefined = $state();
	$effect(() => {
		const stored = storedNote();
		untrack(() => {
			if (desiredNote === syncedNote && document.activeElement !== noteField) {
				desiredNote = stored;
			}
			syncedNote = stored;
		});
	});

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

	// The reader's own entries keep their line even where the cohort is held elsewhere — otherwise
	// an entry made before the coupling would have nowhere to be withdrawn.
	const rows = $derived(wishRows(data.instances, new Set(data.myWishes.map((w) => w.instance.id))));
	const myGroupCodes = $derived(data.mySubjectGroups.map((g) => g.code));
	const mine = $derived(myWishByInstance(data.myWishes));

	/**
	 * Sorting by column head, one state for both sections.
	 *
	 * The order is recorded on the click rather than recomputed live: sorted by the own priority, a
	 * row would otherwise move away from under the cursor the moment its entry is saved. It is
	 * sorted again on the next click and when the semester changes; whatever turns up in between
	 * goes last.
	 *
	 * Sorted by `mine` only, never by other people's entries — see `wishSortValue`.
	 */
	let wishSort = $state<SortState<WishSortKey>>(null);
	const rowKey = (row: WishRow) => `${row.programme.code}\u0000${row.module.id}`;
	const wishOrder = $derived.by(() => {
		const sort = wishSort;
		void data.semester?.code;
		return untrack(() =>
			sort === null ? null : sortRows(rows, sort, wishSortValue(mine)).map(rowKey)
		);
	});
	const sortedRows = $derived(wishOrder === null ? rows : applyOrder(rows, rowKey, wishOrder));
	const split = $derived(splitByMySubjects(sortedRows, myGroupCodes));
	const onWishSort = (key: WishSortKey) => (wishSort = nextSort(wishSort, key));

	let ownSort = $state<SortState<OwnWishSortKey>>(null);
	const onOwnSort = (key: OwnWishSortKey) => (ownSort = nextSort(ownSort, key));
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
	 * Saving happens on selecting and on leaving the note field.
	 *
	 * Three events, and each has its reason:
	 *
	 * - `change` is the trigger. On the select it means "selected", on the text field "finished
	 *   typing" — both are exactly the moment. **Not `input`:** that fires on every keystroke,
	 *   and a round trip per letter would be the wrong thing for a note.
	 * - `input` only notes that something is pending.
	 * - `focusout` catches leaving the field by any route. The browser fires `change` on the text
	 *   field only if *it* saw the change as input; anything else (an extension, a password
	 *   manager, a test that sets the value) would otherwise never arrive. Hence the noting
	 *   above — otherwise every time a cell is left it would submit a second time.
	 *
	 * All three bubble, which is why the listeners hang on the form and not on each of the
	 * several hundred cells.
	 */
	let formElement = $state<HTMLFormElement | null>(null);
	let saving = $state(false);
	let savedOnce = $state(false);
	/** Something was typed and has not been submitted yet. Not `$state`: nothing renders it. */
	let dirty = false;
	/**
	 * A change that came in while a save was running.
	 *
	 * Not `$state`, because none of it is rendered — and the reason it exists at all: two
	 * simultaneous submissions both carry the *whole* form state, and if the older one arrived
	 * second, it would overwrite the newer cell with its old value again. So only ever one in
	 * flight, and afterwards once more if needed.
	 */
	let queued = false;

	function saveNow() {
		if (!open) return;
		if (saving) {
			queued = true;
			return;
		}
		// Reset synchronously and not only after the response: otherwise the `focusout` that
		// immediately follows a `change` would still see the pending flag and submit once more.
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
					The three left columns are fixed, the track columns share the rest — that is where the
					note is typed. The module name gets enough to fit in two lines as a rule; narrower was
					still readable, but the names in the catalogue are long („Advanced Data Modeling and
					Analysis with R“), and a column in which every second title wraps over four lines costs
					more than the note gains.
				-->
				<tr>
					<SortHeader
						class="w-28"
						label="Studiengruppe"
						key="group"
						sort={wishSort}
						onsort={onWishSort}
					/>
					<SortHeader class="w-72" label="Modul" key="module" sort={wishSort} onsort={onWishSort} />
					<SortHeader
						class="w-16 text-right"
						label="SWS"
						key="hours"
						align="right"
						title="Was alle Züge zusammen kosten."
						sort={wishSort}
						onsort={onWishSort}
					/>
					{#each tracks as track (track)}
						<!-- By the reader's own priority in this track, never by anybody else's. -->
						<SortHeader
							label={trackHeading(track)}
							key={trackSortKey(track)}
							title="Nach der eigenen Priorität sortieren"
							sort={wishSort}
							onsort={onWishSort}
						/>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sectionRows as row (moduleRowKey(row))}
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
							<!-- One seminar of an umbrella module: the topic is what is being wished for. -->
							{#if row.topic}
								<span class="block font-medium">{row.topic}</span>
							{/if}
							{#if heldForOthers(row).length > 0}
								<!--
									One course, several programmes. The covered track no longer appears as a row of
									its own — it would be the same offering a second time, once with its real SWS and
									once with zero. What it is held for still belongs here: whoever registers,
									registers for all of them.
								-->
								<span class="badge badge-outline badge-xs ml-1 align-middle">
									{heldForLabel(heldForOthers(row))}
								</span>
							{/if}
							{#if demandHint}
								<!--
									A pointer, not a warning: registering for a programme that is still working on
									its demand is allowed and often sensible. The hint disappears as soon as the
									demand has been announced as settled — a mark on every row would be noise on
									exactly the rows that count.
								-->
								<span class="badge badge-ghost badge-xs ml-1 align-middle">{demandHint}</span>
							{/if}
							{#if row.module.subjectGroup}
								<!--
									Not muted, unlike elsewhere in a table — and that is not an exception to the
									rule but the rule read correctly: "/80 is the lower limit" is measured against
									`base-100`. This cell sits on the row's tinted surface, and there `/80`
									measures 3.48:1 on `winter`. A different surface needs its own measurement.
								-->
								<span class="block text-xs">
									{row.module.subjectGroup.name}
								</span>
							{/if}
						</td>
						<!-- Also not muted, for the same reason as the short code one cell further on. -->
						<td class="align-top text-right {rowTint}">
							{formatHours(row.teachingHours)}
						</td>
						{#each tracks as track (track)}
							{@const cohort = cohortIn(row, track)}
							{@const wish = cohort ? mine.get(cohort.instanceId) : undefined}
							<!--
								The whole cell gets a background, not just the control in it: what one looks for in
								this table is "where do I have something", and that is read off the surface.

								The colour follows the **saved** wish and nothing else. Never other people's
								entries — that would be the heatmap the whole confidentiality rule is written
								against.
							-->
							<td class="align-top {wishTint(wish?.priority ?? '')}">
								{#if cohort}
									<!--
										The key is the saved state, not the instance's id: the cell keeps the input
										state locally and should start over exactly when what is saved has changed —
										that is, after saving, and not during it.
									-->
									{#key `${wish?.id ?? ''}:${wish?.priority ?? ''}:${wish?.note ?? ''}`}
										<WishCell
											instanceId={cohort.instanceId}
											label={withTopic(`${cohort.label} · ${row.module.name}`, row.topic)}
											{wish}
											others={others[cohort.instanceId] ?? []}
											open={open && closedReason === null}
										/>
									{/key}
									<!-- Block and English sit with the track, not with the module: two tracks
									     of the same module can be held differently. -->
									{#each cohort.format ? formatBadges(cohort.format) : [] as mark (mark)}
										<span class="badge badge-info badge-xs mt-1 mr-1 align-middle">{mark}</span>
									{/each}
									<!-- Part of it is held by another faculty: the wish is still for the
									     track, and the note says which half. -->
									{@const elsewhere = facultiesElsewhere(cohort.parts)}
									{#if elsewhere.length > 0}
										<span
											class="badge badge-ghost badge-xs mt-1 mr-1 align-middle"
											title="Diesen Teil hält eine andere Fakultät; er wird hier nicht besetzt."
										>
											teils {elsewhere.join(', ')}
										</span>
									{/if}
									{#if closedReason}
										<p class="text-base-content/80 mt-1 text-xs">{closedReason}</p>
									{/if}
									{#if refusalsByInstance[cohort.instanceId]}
										<!--
											Colour as background, never as text colour: text-error sits at 1.35:1 to 3.5:1
											on the light themes and is unreadable as text, whatever it signals.
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
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Jede Fachgruppe führt ihre eigene Wunschrunde: die <strong>Fachgruppenleitung</strong> öffnet
			und schließt sie, und veröffentlicht werden die Wünsche eines Semesters vom Dekanat. Welche
			Module zuerst stehen, bestimmst Du unter
			<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a>.
		</p>
	</div>

	<!--
		Every tab is a submit button, as on the demand page: switching takes one click and not
		two, and it needs no JavaScript — a select that submits itself would need some, and
		there would be a button beside it again.

		The <form> goes around the bar and never in between: daisyUI styles via `.tabs > .tab`,
		and a form in the middle takes the bar's border, spacing and selected state away.
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
				Welches geplant wird, legt das Dekanat fest — bis dahin wähle oben eines aus.
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
					Bereits eingetragene Wünsche bleiben sichtbar.
				</p>
			{/if}
		</div>
	{/if}

	{#if data.semester}
		<section
			class="border-base-300 bg-base-100 rounded-lg border p-4"
			aria-labelledby="desired-hours"
		>
			<h2 id="desired-hours" class="font-medium">Wie viel möchtest Du halten?</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Wie viele SWS modulbehaftete Lehre Du in {semesterName(data.semester.code)} übernehmen möchtest
				— ohne Abschlussarbeiten, als Bereich von–bis oder als eine Zahl. Bis zur Veröffentlichung lesen
				das nur Du, die Leitungen Deiner Fachgruppen und das Dekanat; danach sehen alle den Bereich unter
				<a class="link" href={resolve('/wuensche/kollegium')}>SWS im Kollegium</a>, die Notiz nie.
				Leer heißt „nicht angegeben“; 0 ist eine Angabe.
			</p>
			<p class="text-base-content/90 mt-1 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">{STAGE_LABELS[desiredStage]}</span>
				{STAGE_HINTS[desiredStage]}
			</p>
			<!-- Created afresh for each semester: the fields hold their own text, see DesiredRangeFields. -->
			{#key data.semester.code}
				<form
					method="POST"
					action="?/desiredHours"
					use:autosave={{ label: 'Wie viel möchtest Du halten?' }}
					class="mt-3 flex flex-wrap items-end gap-2"
				>
					<input type="hidden" name="semester" value={data.semester.code} />
					<DesiredRangeFields
						min={data.desiredHours?.minHours}
						max={data.desiredHours?.maxHours}
						disabled={!desiredEditable}
					/>
					<label class="flex min-w-48 flex-1 flex-col gap-1">
						<span class="label-text text-sm">Notiz (optional, wird nicht veröffentlicht)</span>
						<input
							name="note"
							class="input input-sm w-full max-w-md"
							maxlength="500"
							bind:value={desiredNote}
							bind:this={noteField}
							disabled={!desiredEditable}
						/>
					</label>
					<!-- Saved on leaving a field or Enter. Without JavaScript this is the way to send. -->
					<noscript>
						<button type="submit" class="btn btn-sm" disabled={!desiredEditable}>Speichern</button>
					</noscript>
				</form>
			{/key}
			{#if data.desiredHours?.correctedBy}
				<p class="text-base-content/80 mt-2 text-sm">
					Nach Absprache geändert durch {data.desiredHours.correctedBy} (Dekanat).
				</p>
			{/if}
			<p class="text-base-content/80 mt-2 text-sm">
				Bereits eingeplant:
				{#if data.ownLoad}
					<strong>{desiredHoursLabel(data.ownLoad.total)} SWS</strong>
					({loadBreakdown(data.ownLoad)}){#if !data.semester.assignmentsPublishedAt}, vorläufig{/if}
				{:else}
					noch nichts
				{/if}
			</p>
			{#if form && 'desiredHoursMessage' in form}
				<p class="text-base-content/90 mt-2 text-sm" role="alert">
					<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
					{form.desiredHoursMessage}
				</p>
			{:else if form && 'desiredHoursSaved' in form}
				<p class="text-base-content/90 mt-2 text-sm" role="status">
					<span class="badge badge-ghost badge-sm align-middle">Gespeichert</span>
				</p>
			{/if}
		</section>
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
					{form.refusals?.length} Zelle{form.refusals?.length === 1 ? '' : 'n'} nicht — die Meldung steht
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
					One's own figure is harmless: it says nothing about others. That is exactly why it
					is here and nowhere else on this page.
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
									resolve() builds the route, the query string goes after it — the same
									route with a different selection. Without resolve()
									svelte/no-navigation-without-resolve kicks in, and rightly so: an
									href that starts with „?“ is appended to the address one is currently
									on.
								-->
								<a
									class="link text-sm font-normal"
									href="{resolve('/wuensche')}?semester={group.code}"
								>
									anzeigen
								</a>
							{/if}
							<!--
								One's own total, and therefore sayable: it is about what this person has
								offered, and about nobody else.
							-->
							<span class="text-base-content/80 text-sm font-normal">
								· {hoursLabel(group.teachingHours)}
							</span>
						</h3>
						<div class="overflow-x-auto">
							<table class="table table-sm w-full min-w-[480px]">
								<thead>
									<tr>
										<SortHeader
											class="w-56"
											label="Zug und Modul"
											key="label"
											sort={ownSort}
											onsort={onOwnSort}
										/>
										<SortHeader
											class="w-24"
											label="Priorität"
											key="priority"
											sort={ownSort}
											onsort={onOwnSort}
										/>
										<SortHeader label="Notiz" key="note" sort={ownSort} onsort={onOwnSort} />
									</tr>
								</thead>
								<tbody>
									<!--
										The same tint as in the wish table, so that the three levels are not just a
										word here — one reads this list to see what one has committed to where.

										Unmuted text, as over there and for the same reason: "/80 is the lower
										limit" is measured against `base-100`, not against the tinted surface.
									-->
									{#each sortRows(group.wishes, ownSort, OWN_WISH_SORT) as wish (wish.id)}
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

	<p class="text-base-content/80 max-w-3xl text-sm">{othersHint(published, data.leadsGroups)}</p>

	{#if data.instances.length === 0}
		<p class="text-base-content/80 text-sm">
			Für dieses Semester ist noch kein Bedarf angemeldet — es gibt also nichts, worauf man sich
			eintragen könnte. Was angeboten wird, legen die Studiengangsleitungen unter
			<a class="link" href={resolve('/bedarf')}>Bedarf</a> fest.
		</p>
	{:else}
		<!--
			One table, one form, one save. That is how the Confluence table was used too: go down,
			enter three things, done. And it works the same without JavaScript, which a select
			that submits itself would not.
		-->
		<form
			method="POST"
			action="?/save"
			bind:this={formElement}
			onchange={saveNow}
			oninput={() => (dirty = true)}
			onfocusout={saveIfDirty}
			use:trackSaves={{
				// `open` because saveNow sends nothing in a closed round, and waiting on it would hang.
				waiting: () => open && (dirty || queued),
				flush: saveNow,
				submit: () => {
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
				}
			}}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="semester" value={data.semester?.code ?? ''} />

			{#each sections as section (section.title)}
				<!--
					One's own section is rendered even when it is empty. Otherwise the sentence below it
					is unreachable — and whoever is in no subject group sees only „Alle weiteren Module“
					on this page and never learns that there would be a preselection.
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
					Stays, although normally it does nothing: without JavaScript it is the only way to
					submit a select. Hence inconspicuous rather than the main action — and because it
					sends the whole table, pressing it has no effect when everything is already saved
					anyway.
				-->
				<button type="submit" class="btn btn-ghost btn-sm" disabled={!open || saving}>
					Alles speichern
				</button>
			</div>
		</form>
	{/if}
</div>
