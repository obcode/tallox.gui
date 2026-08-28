<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		ALL_COURSE_TYPES,
		ALL_PART_KINDS,
		COURSE_TYPE_LABELS,
		DUTY_LABELS,
		MODULE_KIND_LABELS,
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
		coverageLabel,
		coversLabel,
		sharingState,
		splitSummary,
		trackLetters
	} from '$lib/demand';
	import DemandOverview from '$lib/components/DemandOverview.svelte';
	import { hasAnyRole } from '$lib/roles';
	import {
		PHASE_HINTS,
		PHASE_LABELS,
		semesterName,
		semesterShortName,
		semesterTerm
	} from '$lib/semester';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The overview needs a semester and nothing else. The planning table needs a programme too,
	// because planDemand writes exactly one — so "edit" without one is not a state, it is a
	// question, and the answer to it is the overview.
	const chosen = $derived(data.selected.semester !== '');

	/**
	 * The semesters left to right in the order they happen.
	 *
	 * The backend lists them newest first, which is right for a dropdown and wrong for a bar: the
	 * planning semester is the earliest one offered, so newest-first puts the one everybody wants
	 * at the far right, off the edge of the strip and behind a scroll nobody knows is there.
	 */
	const semesterTabs = $derived([...data.semesters].reverse());

	/** The search block stands open while it is showing something, and folded away otherwise. */
	const foreignOpen = $derived(data.selected.foreignSearch !== '');

	/**
	 * The filter, as the query parameters it is made of.
	 *
	 * Every form on this page owns *some* of these and has to carry the rest across, or clicking
	 * one control silently resets another. Written once here so that "what is the filter made of"
	 * has a single answer, and each form says which parts it provides itself.
	 *
	 * An empty value is left out rather than sent empty: for every one of these, absent and empty
	 * mean the same thing, and a link somebody sends a colleague should not carry six equals
	 * signs with nothing behind them.
	 */
	const filterFields = $derived([
		{ name: 'semester', value: data.selected.semester },
		{ name: 'studiengang', value: data.selected.programme },
		{ name: 'q', value: data.selected.search },
		{ name: 'art', value: data.selected.duty },
		{ name: 'turnus', value: data.selected.bothTerms ? 'alle' : '' },
		{ name: 'offen', value: data.selected.onlyEstimated ? '1' : '' },
		{ name: 'geplant', value: data.selected.onlyPlanned ? '1' : '' }
	]);

	/**
	 * What the switch that widens the term offers, named after the term it would add.
	 *
	 * Spelled out rather than "auch den anderen Turnus": the reader is looking at a winter
	 * semester, and "die nur im Sommersemester laufen" says exactly which modules appear.
	 */
	const otherTermLabel = $derived(
		semesterTerm(data.selected.semester) === 'SS'
			? 'auch Module, die nur im Wintersemester laufen'
			: 'auch Module, die nur im Sommersemester laufen'
	);

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
	/**
	 * Whether this programme has announced its demand as settled, and when.
	 *
	 * An announcement rather than a lock: declaring another instance afterwards stays possible and
	 * is the ordinary case. What it does is tell the colleagues on the wish screen that registering
	 * interest here is worth the effort.
	 */
	const announced = $derived(
		data.completions.find((c) => c.programme.code === data.selected.programme) ?? null
	);

	const mayPlan = $derived(
		hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE']) ||
			data.myProgrammes.some((p) => p.code === data.selected.programme)
	);

	/**
	 * Whether this person plans at all — which is what the toggle's *presence* answers.
	 *
	 * Deliberately a different question from `mayPlan`. That one is about this programme; this
	 * one is about the person, and the two want opposite treatment. Somebody who never plans
	 * should not see a control at all — a lecturer reads this page. Somebody who does plan should
	 * see it even where it cannot be used, disabled and saying why, because a control that
	 * appears and disappears as one clicks through the programmes reads as a bug, and its
	 * absence answers nothing.
	 *
	 * The unscoped programme lead is the case this is really for: they hold the role, the button
	 * is theirs, and what is missing is an assignment somebody else has to make.
	 */
	const plansAtAll = $derived(
		hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE', 'PROGRAMME_LEAD'])
	);

	/**
	 * Whether the planning table is showing, rather than the overview.
	 *
	 * The address asks for it and the permission decides. Somebody without it who types
	 * `?bearbeiten=1` gets the overview — not a planning table with nine disabled controls,
	 * which is a screen that says "you may not" nine times over. Cosmetic either way: the lock is
	 * `policy.MayWriteDemand`, asked again on every save and on the token path too.
	 */
	const editing = $derived(data.selected.editing && mayPlan && data.selected.programme !== '');

	/**
	 * Somebody who holds the role and has not been given a programme.
	 *
	 * Worth its own sentence, because the two refusals have different repairs: "not your
	 * programme" sends somebody to the right one, "no programme assigned" sends them to the
	 * administration. The backend distinguishes them too (PROGRAMME_SCOPE_MISSING); this is the
	 * same distinction made from what the page already knows, not a copy of its German.
	 */
	const leadsNothing = $derived(
		hasAnyRole(data.session?.effectiveRoles ?? [], ['PROGRAMME_LEAD']) &&
			data.myProgrammes.length === 0 &&
			!hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE'])
	);

	/**
	 * The unanswered requests this programme has to answer.
	 *
	 * Read off `covers` on this programme's own instances, which is where an unanswered request
	 * sits: the row that shows it in the asking programme's table is a row this lead does not see
	 * in their own selection. Without collecting them here the request would be invisible on the
	 * only screen that can answer it.
	 */
	const openCoverageRequests = $derived(
		data.instances.flatMap((instance) =>
			(instance.covers ?? [])
				.filter((c) => !c.acceptedAt)
				.map((c) => ({
					guestId: c.instance.id,
					guest: cohortLabel(
						c.instance.programme.code,
						c.instance.programmeSemester,
						c.instance.track
					),
					host: cohortLabel(instance.programme.code, instance.programmeSemester, instance.track),
					module: instance.module.name
				}))
		)
	);

	/**
	 * The cohort a picker was opened for, and what it may point at.
	 *
	 * Both come from the load: the candidates are the schema's own four conditions, so the menu
	 * offers exactly what a request would be allowed to name rather than a list that fails on
	 * click.
	 */
	const coverageSubject = $derived(
		data.instances.find((i) => i.id === data.selected.coverageFor) ?? null
	);

	/**
	 * Why the toggle cannot be used here, or empty when it can.
	 *
	 * Three reasons with three different repairs, so three sentences: choose a programme, choose
	 * a different one, or ask for an assignment. A single "not possible" would send everybody to
	 * the wrong one of the three — and the third is not a refusal at all, it is a waiting room.
	 */
	const editingBlocked = $derived.by(() => {
		if (data.selected.programme === '') {
			// The dean's office reaches this too: they may plan every programme, and "all of them"
			// is still not one. planDemand writes exactly one.
			return 'Zum Bearbeiten bitte einen Studiengang wählen.';
		}
		if (leadsNothing) {
			return 'Ihre Studiengangsleitung ist noch keinem Studiengang zugeordnet.';
		}
		if (!mayPlan) {
			return 'Diesen Studiengang leiten Sie nicht.';
		}
		return '';
	});

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
	 * What the toast says, in the order that matters: a refusal, then what a save did, then that
	 * one is running, then that something is waiting to be saved.
	 *
	 * A single derived value rather than four conditions in the markup, because only one of them
	 * may ever be on screen — two would be two answers to "did that work".
	 */
	const toast = $derived.by(() => {
		if (form && 'error' in form && form.error) {
			return {
				badge: 'error',
				label: 'Nicht gespeichert',
				text: form.error,
				code: 'generic' in form && form.generic ? form.code : ''
			};
		}
		if (showResult && form && 'report' in form && form.report) {
			const r = form.report;
			const refused = r.refused.length > 0 ? ` ${r.refused.length} nicht möglich.` : '';
			return {
				badge: 'success',
				label: 'Gespeichert',
				text:
					`${r.created.length} angelegt, ${r.changed.length} geändert, ` +
					`${r.withdrawn.length} zurückgezogen — ${hoursLabel(r.teachingHours)} geplant.${refused}`,
				code: ''
			};
		}
		if (showResult && form && 'adopted' in form && form.adopted) {
			return {
				badge: 'success',
				label: 'Übernommen',
				text: `${form.adopted} steht jetzt im Bedarf dieses Studiengangs.`,
				code: ''
			};
		}
		if (saving) return { badge: '', label: 'wird gespeichert …', text: '', code: '' };
		if (dirty) return { badge: 'warning', label: 'noch nicht gespeichert', text: '', code: '' };
		return null;
	});

	/**
	 * The withdrawal confirmation, and the two things a modal needs that a banner did not.
	 *
	 * `showConfirm` is dismissal: a preview lives in `form` until the next action, so without a
	 * local flag the dialog would come back the moment anything re-rendered.
	 *
	 * `confirmEl` is the upgrade. The element is rendered with `open`, which daisyUI shows and
	 * which is what carries the question without JavaScript — but `open` alone is a *non-modal*
	 * dialog: no backdrop, no focus trap, ESC does nothing. `showModal()` gives all three, and it
	 * throws on an already-open dialog, hence the close-then-open.
	 */
	let showConfirm = $state(true);
	let confirmEl = $state<HTMLDialogElement | null>(null);
	/**
	 * True while the close-then-open of the upgrade is in flight.
	 *
	 * `close()` fires a `close` event, and without this the dialog would dismiss itself the
	 * instant it was upgraded. Cleared in a `setTimeout` rather than inline or in a microtask:
	 * the event is queued as a task, so it runs before this one either way — and if a browser
	 * ever fired it synchronously instead, the flag is already set by then.
	 */
	let upgradingConfirm = false;

	$effect(() => {
		const el = confirmEl;
		if (!el || el.matches(':modal')) return;
		upgradingConfirm = true;
		el.close();
		el.showModal();
		setTimeout(() => (upgradingConfirm = false), 0);
	});

	// A new preview is a new question, so a dismissal does not carry over to it.
	$effect(() => {
		if (form && 'preview' in form && form.preview) showConfirm = true;
	});

	/**
	 * Abandoning the withdrawal, from the button, from ESC and from the backdrop alike.
	 *
	 * The pending edit goes with it. Leaving the tick off while nothing was saved is the state
	 * that reads as a fault — it is what the badge was complaining about in the first place.
	 */
	function dismissWithdrawal() {
		showConfirm = false;
		// The pending edit goes with it. A same-route navigation reuses this component, so an
		// untick left in `edits` would survive the reload and keep the tick off against a
		// database that still has the instance — the very state the badge was complaining about.
		edits = {};
	}

	/**
	 * ESC and the backdrop, which reach us as a `close` event — and the upgrade, which does too.
	 *
	 * Ignored while the close-then-open is in flight, and ignored if the dialog is open again by
	 * the time the queued event arrives. What is left is a real dismissal.
	 */
	function onConfirmClose() {
		if (upgradingConfirm || confirmEl?.open) return;
		dismissWithdrawal();
	}

	/**
	 * Whether the result of the last save is still worth showing.
	 *
	 * It says what happened, and what happened stops being news. Five seconds is long enough to
	 * read one line and short enough that the next click is not answered by the one before it.
	 */
	let showResult = $state(false);
	$effect(() => {
		if (!form) return;
		showResult = true;
		const timer = setTimeout(() => (showResult = false), 5000);
		return () => clearTimeout(timer);
	});

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
		// `editing` rather than `mayPlan`: switching to the overview is a navigation, so the
		// component is rebuilt anyway — but a timer that fired across it would submit a table
		// nobody is looking at.
		if (!editing) return;
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
			borrowedKinds: row.tracks[i]?.borrowedKinds ?? [],
			// A cohort another study programme holds costs nothing. Without this the live figure
			// would charge it the whole split while the stored figure says zero — the two numbers
			// side by side, disagreeing, on the screen whose job is to show what a change costs.
			covered: !!row.tracks[i]?.coveredBy?.acceptedAt
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

<!--
	Der Zustand des Speicherns steht über der Seite, nicht in ihr.

	Im Fluss stand er zwischen Kopf und Tabelle, und jede Meldung schob die Tabelle nach unten und
	wieder zurück — bei einer Seite, die sich nach jedem Klick selbst speichert, also bei jedem
	Klick. Was sich beim Lesen bewegt, liest niemand.
-->
<div
	class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
	role="status"
	aria-live="polite"
>
	{#if toast}
		<div
			class="border-base-300 bg-base-100 pointer-events-auto rounded-lg border px-4 py-2 shadow-lg"
		>
			<p class="text-base-content/90 flex flex-wrap items-center gap-2 text-sm">
				{#if toast.badge}
					<span class="badge badge-{toast.badge} badge-sm">{toast.label}</span>
				{:else}
					<span class="badge badge-neutral badge-sm">{toast.label}</span>
				{/if}
				{toast.text}
				{#if toast.code}
					<span class="text-base-content/80">(Code: {toast.code})</span>
				{/if}
			</p>
		</div>
	{/if}
</div>

<!--
	Die Filter der aktuellen Ansicht als versteckte Felder.

	Jedes GET-Formular auf dieser Seite, das nur *einen* Parameter setzen will, muss die übrigen
	mitschicken — sonst fällt beim Umschalten der Sicht die halbe Auswahl weg. Einmal geschrieben,
	dreimal benutzt.
-->
<!--
	Der Teil des Filters, den dieses Formular nicht selbst trägt.

	Ein GET-Formular schickt nur seine eigenen Felder — und von seinen Absende-Knöpfen nur den
	geklickten. Wer also einen Studiengang anklickt, schickt genau `studiengang`, und alles
	andere fällt weg: die Seite landete wieder im Planungssemester, weil `semester` fehlte.

	`own` nennt die Parameter, für die dieses Formular ein sichtbares Bedienelement hat. Alles
	andere reist als verstecktes Feld mit. Zwei Felder desselben Namens in einem Formular sind
	kein Ausweg: `searchParams.get` nimmt das erste, also gewönne je nach Reihenfolge im Markup
	mal das versteckte, mal das sichtbare — genau die stille Abhängigkeit, die hier nirgends
	sein soll.
-->
{#snippet carriedOver(own: readonly string[])}
	{#each filterFields as field (field.name)}
		{#if !own.includes(field.name) && field.value !== ''}
			<input type="hidden" name={field.name} value={field.value} />
		{/if}
	{/each}
{/snippet}

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<!-- Begrenzt, damit der Schalter oben rechts steht und nicht unter den Absatz rutscht. -->
		<div class="max-w-2xl">
			<h1 class="text-2xl font-semibold">Bedarf</h1>
			<p class="text-base-content/80 text-sm">
				{#if editing}
					Welche Instanzen muss ein Studiengang in einem Semester anbieten? Eine Zeile je Modul:
					anhaken, Züge und Praktikumsgruppen setzen. Zugeteilt werden später die Teile — Vorlesung
					und Praktikum können verschiedene Personen halten.
				{:else}
					Was in diesem Semester angeboten wird — eine Zeile je Modul, mit den Zügen, in denen es
					läuft. Zugeteilt und gewünscht wird später der einzelne Teil eines Zuges: Vorlesung und
					Praktikum können verschiedene Personen halten.
				{/if}
			</p>
		</div>

		<!--
			Der Umschalter, wie in Moodle: oben rechts, und er steht in der Adresse.
			Client-Zustand wären zwei Ansichten unter einer Adresse — nicht verschickbar, und der
			Zurück-Knopf zeigte die falsche.
		-->
		{#if plansAtAll && data.selected.programme !== '' && data.current}
			<!--
				Die Fertigmeldung. Eigenes Formular und eigene Action, weil sie eine Aussage über den
				Stand ist und keine Änderung an der Planung — und weil sie auch dann gilt, wenn
				gerade niemand bearbeitet.
			-->
			<form
				method="POST"
				action="?/complete&semester={data.current.code}&studiengang={data.selected.programme}"
				class="shrink-0"
			>
				<input type="hidden" name="semester" value={data.current.code} />
				<input type="hidden" name="programme" value={data.selected.programme} />
				<input type="hidden" name="complete" value={announced ? 'false' : 'true'} />
				<button
					type="submit"
					class="btn btn-sm {announced ? 'btn-ghost' : ''}"
					disabled={!mayPlan}
					title={mayPlan ? undefined : editingBlocked || undefined}
				>
					{announced ? 'Meldung zurücknehmen' : 'Bedarf ist fertig'}
				</button>
			</form>
		{/if}
		{#if plansAtAll}
			<form method="GET" class="shrink-0">
				{@render carriedOver([])}
				{#if editing}
					<button type="submit" name="bearbeiten" value="" class="btn btn-sm">Ansicht</button>
				{:else}
					<!--
						Abgeschaltet statt versteckt, wenn er hier nicht geht: wer plant, soll den
						Knopf immer an derselben Stelle finden. Einer, der beim Durchklicken der
						Studiengänge kommt und geht, liest sich wie ein Fehler — und seine
						Abwesenheit beantwortet nichts, während der `title` genau sagt, was fehlt.
					-->
					<button
						type="submit"
						name="bearbeiten"
						value="1"
						class="btn btn-sm btn-primary"
						disabled={editingBlocked !== ''}
						title={editingBlocked || undefined}
					>
						Bearbeiten
					</button>
				{/if}
			</form>
		{/if}
	</div>

	{#if leadsNothing}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-warning badge-sm align-middle">Kein Studiengang</span>
				Ihre Studiengangsleitung ist noch keinem Studiengang zugeordnet — bitte in der Verwaltung eintragen
				lassen. Lesen können Sie den Bedarf trotzdem.
			</p>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<!--
			Semester und Studiengang schalten sofort um, der Rest nicht.

			Die Reiter sind Absende-Knöpfe eines GET-Formulars: SvelteKit fängt die ab und macht
			daraus eine echte Navigation, also stimmt `page.url` und der Load läuft — ohne
			`replaceState`, ohne zweiten Zustand neben der Adresse, und ohne Skript tut es dasselbe
			mit vollem Seitenaufbau.

			**Ein Formular je Leiste**, und das ist keine Kosmetik. Ein Formular schickt von seinen
			Absende-Knöpfen nur den geklickten — beide Leisten in einem Formular hieß also: wer
			einen Studiengang anklickt, schickt `studiengang` und sonst nichts, landet ohne
			`semester` und damit im Planungssemester. Umgekehrt genauso. Jede Leiste trägt jetzt
			den Rest des Filters als versteckte Felder mit (`carriedOver`).

			Das <form> steht um die Leiste herum, nie dazwischen: daisyUI stylt über `.tabs > .tab`,
			und ein Formular in der Mitte nimmt der Leiste Rahmen, Abstände und den markierten
			Zustand.
		-->
		<form method="GET" class="flex flex-col gap-1">
			{@render carriedOver(['semester'])}
			{#if data.selected.editing}
				<input type="hidden" name="bearbeiten" value="1" />
			{/if}

			<div class="flex flex-col gap-1">
				<span class="label-text text-sm">Semester</span>
				<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-nowrap overflow-x-auto">
					{#each semesterTabs as semester (semester.code)}
						{@const active = semester.code === data.selected.semester}
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
			</div>
		</form>

		<form method="GET" class="flex flex-col gap-1">
			{@render carriedOver(['studiengang'])}
			{#if data.selected.editing}
				<input type="hidden" name="bearbeiten" value="1" />
			{/if}

			<div class="flex flex-col gap-1">
				<span class="label-text text-sm">Studiengang</span>
				<!--
					Alle geplanten Studiengänge als Knöpfe, nicht nur die eigenen mit einer
					Auswahlliste daneben. Die Liste ist kurz genug dafür, seit sie nur noch die
					enthält, die die Fakultät wirklich plant: die des Prüfungsamts, die jemand
					anderes betreibt oder die ausgelaufen sind, stehen gar nicht mehr darin.
				-->
				<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-nowrap overflow-x-auto">
					<!-- „alle" gibt es nur in der Lesesicht: planDemand schreibt genau einen. -->
					{#if !data.selected.editing}
						{@const active = data.selected.programme === ''}
						<button
							type="submit"
							name="studiengang"
							value=""
							role="tab"
							aria-selected={active}
							class="tab {active ? 'tab-active' : ''}"
						>
							alle
						</button>
					{/if}
					{#each data.programmes as programme (programme.code)}
						{@const active = programme.code === data.selected.programme}
						{@const mine = data.myProgrammes.some((p) => p.code === programme.code)}
						<button
							type="submit"
							name="studiengang"
							value={programme.code}
							role="tab"
							aria-selected={active}
							title={programme.title || programme.code}
							class="tab whitespace-nowrap {active ? 'tab-active' : ''}"
						>
							<!-- Die eigenen fett: die Reihenfolge bleibt alphabetisch, damit ein
							     Studiengang immer an derselben Stelle steht, und wer plant, findet
							     seinen trotzdem sofort. -->
							<span class={mine ? 'font-semibold' : ''}>{programme.code}</span>
						</button>
					{/each}
				</div>
			</div>
		</form>

		<!--
			Der Rest der Zeile gehört zur Bearbeiten-Sicht, und zwar ganz.

			Suche, Art, Turnus und die beiden Häkchen filtern die *Katalogliste*, aus der die
			Planungstabelle ihre Zeilen macht — und die wird nur beim Bearbeiten überhaupt geladen.
			In der Lesesicht standen fünf Bedienelemente, die nichts taten.

			Er schaltet nicht sofort um — eine Suche, die nach jedem Buchstaben lädt, ist keine.
			Eigenes Formular, weil ein Absenden hier nicht dasselbe bedeutet wie ein Reiterklick
			oben: dort ist der Knopf die Auswahl, hier ist er das Ende einer Eingabe.

			Diese fünf trägt es selbst, also dürfen sie nicht *auch* versteckt mitreisen: zwei
			Felder gleichen Namens, und `searchParams.get` nähme das erste — die Auswahllisten
			hätten stumm den alten Wert wieder eingesetzt.
		-->
		{#if editing}
			<form method="GET" class="flex flex-wrap items-end gap-3">
				{@render carriedOver(['q', 'art', 'turnus', 'offen', 'geplant'])}
				<input type="hidden" name="bearbeiten" value="1" />
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
						<option value="COMPULSORY" selected={data.selected.duty === 'COMPULSORY'}>
							Pflicht
						</option>
						<option value="ELECTIVE" selected={data.selected.duty === 'ELECTIVE'}>
							Wahlpflicht
						</option>
					</select>
				</label>

				<!--
					Der Turnus folgt dem Semester, und die einzige Entscheidung darüber ist, ob man
					weiter aufmacht. Vorher waren es drei Möglichkeiten, von denen zwei Unsinn
					waren: bei einem gewählten Wintersemester fragt „Sommersemester" nach genau den
					Modulen, die darin nicht laufen können.
				-->
				<label class="flex items-center gap-2 pb-1 text-sm">
					<input
						name="turnus"
						type="checkbox"
						value="alle"
						checked={data.selected.bothTerms}
						class="checkbox checkbox-sm"
					/>
					{otherTermLabel}
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
		{/if}
	</div>

	{#if editing}
		<!--
			Ein Fach hereinholen, das nicht für diesen Studiengang markiert ist.

			Der Notfall, den die Fakultät ausdrücklich braucht: ein Modul muss angeboten werden und
			steht in keinem Katalog dieses Studiengangs. Erlaubt ist das im Backend längst — die
			Berechtigung hängt am Studiengang der Instanz und nie an der Heimat des Moduls, denn
			genau dieser Unterschied *ist* die Import/Export-Zahl des Dekanats.

			Eigene Suche und nicht der Filter oben: der Filter beschreibt die Tabelle, und ein
			Filter, der plötzlich fremde Module einmischte, machte jedes Speichern zu einem Ritt
			über einen Katalog, den niemand überblickt.
		-->
		<details class="border-base-300 bg-base-100 rounded-lg border p-4" open={foreignOpen}>
			<summary class="cursor-pointer text-sm font-medium">
				Fach aus einem anderen Studiengang hereinholen
			</summary>

			<form method="GET" class="mt-3 flex flex-wrap items-end gap-2">
				{@render carriedOver([])}
				<input type="hidden" name="bearbeiten" value="1" />
				<label class="form-control">
					<span class="label-text text-sm">Modul suchen</span>
					<input
						type="search"
						name="fremd"
						value={data.selected.foreignSearch}
						placeholder="Name oder Modulkürzel"
						class="input input-bordered input-sm"
					/>
				</label>
				<button type="submit" class="btn btn-sm">Suchen</button>
			</form>

			{#if data.selected.foreignSearch !== ''}
				{#if data.foreignMatches.length === 0}
					<p class="text-base-content/80 mt-3 text-sm">Kein Modul mit diesem Namen.</p>
				{:else}
					<ul class="mt-3 flex flex-col gap-2">
						{#each data.foreignMatches as match (match.id)}
							<li class="flex flex-wrap items-center gap-2 text-sm">
								<a class="link" href={resolve('/module/[id]', { id: match.id })}>
									{moduleName(match)}
								</a>
								<span class="badge badge-ghost badge-sm">
									{match.homeProgramme.code}
								</span>
								{#if !match.plannable}
									<span class="badge badge-ghost badge-sm">keine SWS im Katalog</span>
								{/if}
								<!--
									Eigenes Formular, nicht die große Tabelle: für dieses Modul gibt es dort
									noch keine Zeile — es ist genau das, was die Katalogabfrage nicht
									liefert. Nach dem Anlegen steht es als gewöhnliche, markierte Zeile da.
								-->
								<form method="POST" action="?/adopt" use:enhance>
									<input type="hidden" name="semester" value={data.selected.semester} />
									<input type="hidden" name="programme" value={data.selected.programme} />
									<input type="hidden" name="moduleId" value={match.id} />
									<button type="submit" class="btn btn-xs" disabled={!match.plannable}>
										in den Bedarf übernehmen
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</details>

		<!--
			Eine Lehrveranstaltung anlegen, die es im ZPA nicht gibt — und der FWP-Platzhalter.

			Beides dieselbe Form: eine `module`-Zeile, die die Fakultät selbst einträgt. Ein
			Platzhalter ist danach ein Modul wie jedes andere; „wir brauchen drei" sind drei Züge
			davon, gesetzt mit dem Zug-Zähler, den die Tabelle schon hat.

			Angelegt *und* für dieses Semester angemeldet in einem Schritt: wer dieses Formular
			öffnet, hat die Entscheidung getroffen. Eine Zeile, die im Katalog steht und nicht im
			Bedarf, wäre ein zweiter, unsichtbarer Schritt.
		-->
		<details class="border-base-300 bg-base-100 rounded-lg border p-4">
			<summary class="cursor-pointer text-sm font-medium">
				Eigene Lehrveranstaltung oder FWP-Platzhalter anlegen
			</summary>

			<form
				method="POST"
				action="?/createLocal"
				use:enhance
				class="mt-3 flex flex-wrap items-end gap-3"
			>
				<input type="hidden" name="semester" value={data.selected.semester} />
				<input type="hidden" name="programme" value={data.selected.programme} />

				<label class="form-control">
					<span class="label-text text-sm">Name</span>
					<input
						type="text"
						name="name"
						required
						placeholder="z. B. FWP-Platzhalter (technisch)"
						class="input input-bordered input-sm w-64"
					/>
				</label>

				<label class="form-control">
					<!-- Nicht nur „Art": die Filterleiste hat schon eine, und die meint Pflicht
					     oder Wahlpflicht. -->
					<span class="label-text text-sm">Art der Lehrveranstaltung</span>
					<select name="kind" class="select select-bordered select-sm">
						<option value="MODULE">{MODULE_KIND_LABELS.MODULE}</option>
						<option value="FWP_PLACEHOLDER">{MODULE_KIND_LABELS.FWP_PLACEHOLDER}</option>
					</select>
				</label>

				<label class="form-control">
					<span class="label-text text-sm">Zerlegungsart</span>
					<select name="courseType" class="select select-bordered select-sm">
						{#each ALL_COURSE_TYPES as type (type)}
							<option value={type} selected={type === 'SU_WITH_LAB'}>
								{COURSE_TYPE_LABELS[type]}
							</option>
						{/each}
					</select>
				</label>

				<label class="form-control">
					<span class="label-text text-sm">SWS gesamt</span>
					<input
						type="number"
						name="hours"
						min="1"
						max="30"
						value="4"
						class="input input-bordered input-sm w-20"
					/>
				</label>

				<label class="form-control">
					<span class="label-text text-sm">Übungsteil</span>
					<select name="practical" class="select select-bordered select-sm">
						<option value="">nur Vorlesung</option>
						{#each ALL_PART_KINDS as kind (kind)}
							{#if kind !== 'LECTURE'}
								<option value={kind} selected={kind === 'LAB'}>{PART_KIND_LABELS[kind]}</option>
							{/if}
						{/each}
					</select>
				</label>

				<label class="form-control">
					<!-- Das einzige Feld dieser Form, das nicht das Modul beschreibt, sondern die
					     Instanz, die im selben Schritt angemeldet wird. Es steht trotzdem hier: eine
					     lokale Zeile steht in keiner SPO, also gibt es nichts, woraus sich das
					     Fachsemester vorbelegen ließe — leer bliebe es sonst bis jemand die Zeile in
					     der Tabelle sucht, und dort steht sie unter „Ohne Fachsemester" ganz unten.

					     Leer ist erlaubt und heißt genau das: niemand hat es gesagt. Nachtragen geht
					     in der Zeile, wie bei jeder anderen Instanz auch. -->
					<span class="label-text text-sm">Fachsemester</span>
					<input
						type="number"
						name="year"
						min="1"
						max="12"
						placeholder="optional"
						class="input input-bordered input-sm w-24"
					/>
				</label>

				<button type="submit" class="btn btn-primary btn-sm">Anlegen und anmelden</button>
			</form>

			<p class="text-base-content/80 mt-2 text-sm">
				Die Aufteilung folgt der Schätzregel: der Übungsteil bekommt 2 SWS, die Vorlesung den Rest.
				Ändern lässt sie sich danach in der Zeile — das Fachsemester ebenso, das hier leer bleiben
				darf. Ein Platzhalter wird wie jedes andere Modul geplant —
				<strong>drei davon sind drei Züge</strong>.
			</p>
		</details>
	{/if}

	<!--
		Der Rückzug fragt in einem Modal nach, nicht in einem Kasten über der Tabelle.

		Der Kasten stand oben, die Marke „noch nicht gespeichert" unten rechts — und die Marke ist
		auffälliger. Wer ein Häkchen wegnimmt und die Seite nicht gerade ganz oben hat, sieht die
		Frage nicht und liest den Entwurfszustand als Fehler.

		OHNE JAVASCRIPT MUSS ES TROTZDEM DASTEHEN

		Diese Seite kommt ohne JavaScript aus — das Formular hat einen Speichern-Knopf, und die
		Vorschau ist eine servergerenderte Antwort. Ein `<dialog>`, das nur `showModal()` öffnet,
		verlöre die Rückfrage genau dort. Deshalb steht `open` als Attribut am Element: daisyUI
		zeigt `.modal[open]` an, also ist die Frage auch ohne JavaScript sichtbar und bedienbar.
		Mit JavaScript wird daraus im Effekt ein echtes Modal — Backdrop, Fokusfalle, ESC.
	-->
	{#if showConfirm && form && 'preview' in form && form.preview}
		<dialog
			bind:this={confirmEl}
			open
			class="modal"
			aria-labelledby="withdraw-confirm-title"
			onclose={onConfirmClose}
		>
			<div class="modal-box">
				<h2 id="withdraw-confirm-title" class="mb-2 font-medium">
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
				<div class="modal-action">
					<!--
						Der Weg hinaus, den der Kasten nicht hatte. Ein Modal ohne Abbruch ist eine
						Sackgasse — und ohne JavaScript ist ein `type="button"` gar nichts, also ist
						es ein GET auf dieselbe Adresse: das lädt die Seite neu und damit den
						gespeicherten Stand, was genau das ist, was „abbrechen" hier heißt.
					-->
					<form method="GET" onsubmit={dismissWithdrawal}>
						{@render carriedOver([])}
						<input type="hidden" name="bearbeiten" value="1" />
						<button type="submit" class="btn btn-sm">Abbrechen</button>
					</form>
					<form
						method="POST"
						action="?/apply"
						use:enhance={() =>
							async ({ update }) => {
								// Die Entscheidung ist gefallen, also gilt wieder, was der Server sagt.
								edits = {};
								await update({ reset: false });
							}}
					>
						<input type="hidden" name="semester" value={data.selected.semester} />
						<input type="hidden" name="programme" value={data.selected.programme} />
						<input type="hidden" name="payload" value={form.payload} />
						<button type="submit" class="btn btn-primary btn-sm">Zurückziehen und speichern</button>
					</form>
				</div>
			</div>
			<!--
				Klick daneben schließt, wie bei jedem Modal. Ein `form method="dialog"` braucht kein
				JavaScript und ist genau dafür da.
			-->
			<form method="dialog" class="modal-backdrop">
				<button type="submit" aria-label="Dialog schließen">schließen</button>
			</form>
		</dialog>
	{/if}

	{#if !chosen}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/80 text-sm">
				Bitte ein Semester wählen. Die Auswahl steht danach in der Adresse, die Ansicht lässt sich
				also verschicken.
			</p>
		</div>
	{:else}
		<div
			class="border-base-300 bg-base-100 flex flex-wrap items-center gap-3 rounded-lg border p-4"
		>
			<div class="grow">
				<h2 class="font-medium">
					{semesterName(data.selected.semester)} · {data.selected.programme || 'alle Studiengänge'}
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
					{@render carriedOver(['offen'])}
					<input type="hidden" name="bearbeiten" value="1" />
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

		<!--
			Anfragen anderer Studiengänge, ganz oben und außerhalb der Tabelle.

			Ohne diesen Abschnitt ist eine Anfrage auf dem einzigen Schirm unsichtbar, auf dem sie
			beantwortet werden kann: sie steht in der Zeile des *fragenden* Studiengangs, und den
			sieht die haltende Leitung in ihrer eigenen Auswahl gar nicht. Sie hängt an den
			Instanzen dieses Studiengangs — `covers` —, also genau da, wo die Zusage hingehört.
		-->
		{#if mayPlan && openCoverageRequests.length > 0}
			<form method="POST" action="?/coverage" use:enhance class="flex flex-col gap-2">
				<div class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
					<h2 class="font-medium">Anfragen anderer Studiengänge</h2>
					<p class="text-base-content/80 text-sm">
						Ein anderer Studiengang möchte seinen Bedarf durch eine Ihrer Lehrveranstaltungen
						mitdecken lassen. Bestätigen heißt: die Veranstaltung findet einmal statt, Sie halten
						sie, und ihre SWS zählen einmal — bei Ihnen.
					</p>
					{#each openCoverageRequests as request (request.guestId)}
						<div class="flex flex-wrap items-center gap-2">
							<span class="badge badge-neutral badge-sm">{request.host}</span>
							<span class="text-sm">
								angefragt von <strong>{request.guest}</strong> für {request.module}
							</span>
							<button
								type="submit"
								name="accept"
								value={request.guestId}
								class="btn btn-primary btn-xs"
							>
								bestätigen
							</button>
							<!-- Ablehnen und Lösen sind dieselbe Sache: der Bedarf ist nicht gedeckt. -->
							<button type="submit" name="release" value={request.guestId} class="btn btn-xs">
								ablehnen
							</button>
						</div>
					{/each}
				</div>
			</form>
		{/if}

		<!--
			Das Formular, das den Picker öffnet, steht hier — außerhalb der Planungstabelle.

			Ein Knopf mit `formmethod="GET"` *innerhalb* des Planungsformulars schickte dessen
			gesamten Inhalt als Query-String ab, also jedes Häkchen und jede Gruppenzahl der Tabelle.
			Formulare lassen sich nicht schachteln, also verweisen die Zeilenknöpfe per `form`-Attribut
			hierher: sie senden dann nur ihren eigenen Namen und die Filter, die hier drinstehen.
		-->
		{#if editing}
			<form method="GET" id="coverage-picker" class="hidden">
				{@render carriedOver([])}
				<input type="hidden" name="bearbeiten" value="1" />
			</form>
		{/if}

		<!--
			Der Picker: welche Instanz eines anderen Studiengangs diesen Bedarf mitdecken soll.

			Ein Abschnitt an der Adresse statt eines Dialogs, wie die Bearbeiten-Ansicht auch:
			nachladbar, weitergebbar, und mit dem Zurück-Knopf zu schließen. Die Liste kommt aus
			dem Load und ist genau das, was der Fremdschlüssel akzeptieren würde — ein Menü mit
			Einträgen, die beim Klick scheitern, wäre schlimmer als ein kurzes Menü.
		-->
		{#if mayPlan && coverageSubject}
			<div class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
				<h2 class="font-medium">
					{cohortLabel(
						coverageSubject.programme.code,
						coverageSubject.programmeSemester,
						coverageSubject.track
					)} — {coverageSubject.module.name} mitdecken lassen
				</h2>
				<p class="text-base-content/80 text-sm">
					Der Bedarf bleibt bestehen und zählt weiter für Ihren Studiengang. Was sich ändert: die
					Veranstaltung findet einmal statt, der andere Studiengang hält sie, und ihre SWS zählen
					dort. Wirksam wird das erst, wenn die dortige Leitung zustimmt.
				</p>

				{#if data.coverageCandidates.length === 0}
					<p class="text-base-content/80 text-sm">
						Kein anderer Studiengang hat dieses Modul in diesem Semester angemeldet — oder die
						vorhandenen sind selbst schon gedeckt. Ohne eine Instanz dort gibt es nichts, worauf
						sich dieser Bedarf beziehen könnte.
					</p>
				{:else}
					<form method="POST" action="?/coverage" use:enhance class="flex flex-col gap-2">
						{#each data.coverageCandidates as candidate (candidate.id)}
							<div class="flex flex-wrap items-center gap-2">
								<span class="badge badge-neutral badge-sm">
									{cohortLabel(
										candidate.programme.code,
										candidate.programmeSemester,
										candidate.track
									)}
								</span>
								<span class="text-base-content/80 text-sm">
									{hoursLabel(candidate.teachingHours)}
									{#if (candidate.covers ?? []).length > 0}
										· deckt schon {(candidate.covers ?? []).length} weitere(n) Bedarf
									{/if}
								</span>
								<!--
									Die Kandidaten-Id sitzt auf dem Knopf, nicht in einem versteckten Feld:
									ein Formular mit einem versteckten Feld je Kandidat schickt alle mit,
									und `coveredBy` wäre immer der erste der Liste statt der angeklickte.
								-->
								<button
									type="submit"
									name="coveredBy"
									value={candidate.id}
									class="btn btn-primary btn-xs"
								>
									anfragen
								</button>
							</div>
						{/each}
						<input type="hidden" name="ask" value={coverageSubject.id} />
					</form>
				{/if}

				<form method="GET" class="self-start">
					<!-- `deckung` gehört nicht zu den Filtern und reist deshalb nicht mit: genau
					     das schließt den Picker. -->
					{@render carriedOver([])}
					<input type="hidden" name="bearbeiten" value="1" />
					<button type="submit" class="btn btn-ghost btn-xs">schließen</button>
				</form>
			</div>
		{/if}

		{#if !editing}
			<!--
				Die Lesesicht: dieselbe Kornung wie die Planungstabelle — eine Zeile je Modul, die
				Züge darin —, aber nur, was tatsächlich angemeldet ist. Keine ausgegraute
				Planungstabelle: deren Zeilen sind zum größten Teil Module, die niemand angehakt
				hat, also eine Arbeitsliste, und die gehört jemand anderem.
			-->
			<DemandOverview instances={data.instances} programme={data.selected.programme} />
		{:else}
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
							<!--
							`table-fixed` mit festen Spaltenanteilen: sonst misst der Browser die Spalten
							nach ihrem Inhalt, und jede gespeicherte Zahl — aus „—" wird „14 SWS" —
							vermisst die ganze Tabelle neu. Nebenbei stehen damit die Spalten aller
							Fachsemester-Blöcke untereinander, was sie vorher nicht taten.
						-->
							<table class="table table-fixed table-sm w-full min-w-[900px]">
								<colgroup>
									<col style="width: 28%" />
									<col style="width: 8%" />
									<col style="width: 26%" />
									<col style="width: 11%" />
									<col style="width: 17%" />
									<col style="width: 10%" />
								</colgroup>
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
																<span class="badge badge-ghost badge-sm">
																	keine SWS im Katalog
																</span>
															{/if}
															<!-- Eine Zeile, die der Filter nicht geliefert hat: das
															     Modul gehört woanders hin, oder der Turnus blendet es
															     aus. Sie steht trotzdem da, denn planDemand fasst nur
															     an, was auf dem Bildschirm stand — eine unsichtbare
															     Zeile ließe sich nie wieder abwählen. -->
															{#if row.foreign}
																<span class="badge badge-ghost badge-sm">
																	außerhalb des Filters
																</span>
															{/if}
															<!-- Eine Zeile, die das Prüfungsamt nicht kennt. Der
															     Unterschied ist kein Nebenschauplatz: „aktiv" und
															     „zurückgezogen" sind Aussagen des Prüfungsamts, und über
															     eine eigene Zeile macht es keine. -->
															{#if row.module.kind === 'FWP_PLACEHOLDER'}
																<span class="badge badge-accent badge-sm">
																	{MODULE_KIND_LABELS.FWP_PLACEHOLDER}
																</span>
															{:else if row.module.source === 'LOCAL'}
																<span class="badge badge-ghost badge-sm">
																	eigene Lehrveranstaltung
																</span>
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
														<span>{splitLabel(row)}</span>
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
														     Knopf, weil ein Sabbatical die Entscheidung revidiert.

														     Für einen Platzhalter gar nicht: drei FWPs sind drei
														     verschiedene Fächer, keine drei Kohorten desselben — da gibt
														     es keine gemeinsame Vorlesung zusammenzulegen. -->
															{#if mayPlan && row.module.kind !== 'FWP_PLACEHOLDER'}
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
															<!--
																Die Deckung, je Zug statt je Modul — anders als die geteilte
																Vorlesung, denn welcher Zug seinen Bedarf woanders decken
																lässt, ist eine Aussage über genau diesen Zug.

																Immer nur ein Knopf: ohne Verweis „decken lassen", bei
																offener Anfrage „zurückziehen", bei stehender Deckung
																„lösen". Die Gegenseite bestätigt in ihrer eigenen Zeile,
																weiter unten — sie ist der einzige Schirm, auf dem das
																beantwortet werden kann.
															-->
															{#if mayPlan && row.module.kind !== 'FWP_PLACEHOLDER'}
																{#each row.tracks as cohortTrack, i (i)}
																	{#if cohortTrack.instanceId}
																		{#if cohortTrack.coveredBy}
																			<button
																				type="submit"
																				formaction="?/coverage"
																				name="release"
																				value={cohortTrack.instanceId}
																				class="btn btn-xs"
																				title={cohortTrack.coveredBy.acceptedAt
																					? 'Dieser Zug hält seine Lehre wieder selbst'
																					: 'Die Anfrage zurückziehen'}
																			>
																				{cohortTrack.coveredBy.acceptedAt
																					? 'Deckung lösen'
																					: 'Anfrage zurückziehen'}
																			</button>
																		{:else}
																			<!--
																				Ein GET-Formular statt eines Links, aus demselben
																				Grund wie überall sonst hier: `resolve()` kennt nur
																				den Pfad, die Auswahl steht in Query-Parametern,
																				und ein handgeschriebener Link mit beidem ist genau
																				das, was die Lint-Regel verhindert.
																			-->
																			<button
																				type="submit"
																				form="coverage-picker"
																				name="deckung"
																				value={cohortTrack.instanceId}
																				class="btn btn-xs"
																				title="Diesen Bedarf von einem anderen Studiengang mitdecken lassen"
																			>
																				decken lassen
																			</button>
																		{/if}
																	{/if}
																{/each}
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
															<!--
																Ein gedeckter Zug hält gar keine eigene Lehre — ein anderer
																Studiengang hält sie. Seine Gruppenzahl ist deshalb nicht
																seine, und der Stepper ist abgeschaltet statt nur auf 0 zu
																stehen: der erste Klick schickte sonst `groups: 1` und
																holte sich ein INSTANCE_COVERED, das der Schirm hätte
																vermeiden können.
															-->
															{@const covered = !!row.tracks[i]?.coveredBy?.acceptedAt}
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
																		disabled={!mayPlan || covered}
																		aria-label={groupLabel(row, letters, letter, 'weniger')}
																		>−</button
																	>
																	<input
																		type="number"
																		min="0"
																		max="12"
																		name="groups:{row.module.id}:{i}"
																		value={draft(row).groups[i]}
																		oninput={(e) => setGroups(row, i, numberOf(e.currentTarget))}
																		disabled={!mayPlan || covered}
																		class="input input-bordered input-xs join-item w-12 text-center"
																		aria-label={groupLabel(row, letters, letter)}
																		title={covered
																			? 'Deckung lösen, um wieder eigene Teile zu planen'
																			: undefined}
																	/>
																	<button
																		type="button"
																		class="btn btn-xs join-item"
																		onclick={() => setGroups(row, i, draft(row).groups[i] + 1)}
																		disabled={!mayPlan || covered}
																		aria-label={groupLabel(row, letters, letter, 'mehr')}>+</button
																	>
																</div>
																{#if row.tracks[i]?.coveredBy}
																	<span class="badge badge-outline badge-sm">
																		{coverageLabel(row.tracks[i].coveredBy!)}
																	</span>
																{:else if row.tracks[i]?.borrowedKinds.length}
																	<span class="badge badge-ghost badge-sm">Vorlesung geteilt</span>
																{/if}
																{#each row.tracks[i]?.covers ?? [] as covers, c (c)}
																	<span class="badge badge-outline badge-sm"
																		>{coversLabel(covers)}</span
																	>
																{/each}
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
						<span class="text-base-content/80 text-sm">
							Jede Änderung wird von selbst gespeichert; der Knopf ist für den Fall, dass das Skript
							im Browser nicht läuft. Gespeichert wird, was hier steht — Module, die der Filter
							gerade ausblendet, bleiben unangetastet.
						</span>
					</div>
				{/if}
			</form>
		{/if}
	{/if}
</div>
