<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { resolve } from '$app/paths';
	import {
		ALL_COURSE_TYPES,
		ALL_PART_KINDS,
		COURSE_TYPE_LABELS,
		DUTY_LABELS,
		basketLabel,
		MODULE_KIND_LABELS,
		PART_KIND_LABELS,
		dutyBadge,
		formatHours,
		mayWriteModuleSplit,
		moduleName
	} from '$lib/catalogue';
	import {
		arrangeByBasket,
		basketOptions,
		byYear,
		cohortLabel,
		compareWithPrevious,
		demandRows,
		effectiveComponents,
		hoursLabel,
		plannedHours,
		alsoPlannedLabel,
		alsoPlannedShort,
		coverageLabel,
		coversLabel,
		DELIVERY_LABELS,
		sharingState,
		separatelyPlannedIn,
		splitDrift,
		splitSummary,
		trackLetters,
		MAX_TRACKS,
		MAX_TOPIC_LENGTH,
		rowListsCie
	} from '$lib/demand';
	import DemandOverview from '$lib/components/DemandOverview.svelte';
	import GearIcon from '$lib/components/GearIcon.svelte';
	import SplitApplicationReport from '$lib/components/SplitApplicationReport.svelte';
	import NoteIcon from '$lib/components/NoteIcon.svelte';
	import { hasAnyRole } from '$lib/roles';
	import { askBeforeLeave, trackSaves } from '$lib/saveOnLeave';
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
		{ name: 'geplant', value: data.selected.onlyPlanned ? '1' : '' },
		{ name: 'korb', value: data.selected.basket },
		{ name: 'sortierung', value: data.selected.order === 'basket' ? 'korb' : '' },
		{ name: 'cie', value: data.selected.onlyCie ? '1' : '' }
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
		arrangeByBasket(
			rows.filter(
				(row) =>
					(!data.selected.onlyEstimated || row.module.splitIsEstimated) &&
					(!data.selected.onlyPlanned || row.planned) &&
					(!data.selected.onlyCie || rowListsCie(row))
			),
			data.selected.basket,
			data.selected.order
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

	/**
	 * The same after the assignment: the programme lead has reviewed the whole once more. Offered
	 * from the review on — before it, there is nothing yet to review — and in a finished semester
	 * too, where saying so afterwards is still worth something.
	 */
	const reviewed = $derived(
		data.reviews.find((c) => c.programme.code === data.selected.programme) ?? null
	);
	const reviewPhase = $derived(data.current?.phase === 'REVIEW' || data.current?.phase === 'FINAL');

	const mayPlan = $derived(
		hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE']) ||
			data.myProgrammes.some((p) => p.code === data.selected.programme)
	);

	/**
	 * The modules whose split this person may state — not the same as planning the programme: a
	 * module counts here and may be at home elsewhere. `policy.MayWriteModuleSplit`, mirrored.
	 *
	 * Ids rather than a check on `row.module`, because the row's module type is what the table and
	 * the instances have in common, and the home programme is not part of that.
	 */
	const splittable = $derived(
		data.modules
			.filter((m) =>
				mayWriteModuleSplit(data.session?.effectiveRoles ?? [], data.myProgrammes, data.led, m)
			)
			.map((m) => m.id)
	);
	const maySplit = (module: { id: string }) => splittable.includes(module.id);

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
	 * The baskets of the chosen programme, for the "Korb" selection in both views.
	 *
	 * Only with a programme: a basket belongs to one programme's regulations, and across all of
	 * them the same name can mean different things. The chosen one stays in the list even when no
	 * row has it any more, or the selection would show „alle“ while still filtering.
	 */
	const baskets = $derived.by(() => {
		if (data.selected.programme === '') return [];
		const options = basketOptions(editing ? rows : data.instances);
		if (data.selected.basket !== '' && !options.includes(data.selected.basket))
			options.push(data.selected.basket);
		return options;
	});

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
			return 'Deine Studiengangsleitung ist noch keinem Studiengang zugeordnet.';
		}
		if (!mayPlan) {
			return 'Diesen Studiengang leitest Du nicht.';
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
	type Draft = {
		offered: boolean;
		tracks: number;
		groups: number[];
		year: string;
		note: string;
	};

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
			// What happened in *other* programmes goes after it and not into the total: a row that
			// came about next to another programme holds nothing, and a host that withdrew has handed
			// its teaching on. Both are invisible when all it says is „1 angelegt“.
			const coupled =
				r.coupled.length > 0
					? ` ${r.coupled.length} gemeinsam mit einem anderen Studiengang geplant.`
					: '';
			const promoted = r.promoted
				.map(
					(p) => ` ${p.programme?.code ?? 'Ein anderer Studiengang'} hält jetzt ${p.moduleName}.`
				)
				.join('');
			return {
				badge: 'success',
				label: 'Gespeichert',
				text:
					`${r.created.length} angelegt, ${r.changed.length} geändert, ` +
					`${r.withdrawn.length} zurückgezogen — ${hoursLabel(r.teachingHours)} geplant.` +
					`${coupled}${promoted}${refused}`,
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
	 * An edit that is kept but not yet saved: the note, while it is being typed.
	 *
	 * A stepper click is a decision and goes off after a moment. A sentence is not finished at
	 * its third letter, and saving it there would reload the row under the cursor — so the note
	 * is kept on every keystroke (the badge says "noch nicht gespeichert") and saved when the
	 * field is left, which is what `change` fires on.
	 */
	function editLater(row: Row, change: Partial<Draft>) {
		edits = { ...edits, [row.module.id]: { ...draft(row), ...change } };
		editSeq++;
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

	/**
	 * The edit counter as it was when the last save left. Differs from `editSeq` exactly while
	 * something is waiting to be sent — the timer, or a note still being typed — which is what
	 * leaving the page has to wait for.
	 */
	let sentSeq = 0;

	const planSubmit: SubmitFunction = () => {
		const seq = editSeq;
		sentSeq = seq;
		saving = true;
		// A row menu that a submission came from closes. Without this the popover stays open over
		// the reloaded table, and the next click on „⋯“ closes it instead of opening it — the
		// toggle only knows the one direction.
		closeRowMenus();
		return async ({ result, update }) => {
			const preview =
				result.type === 'success' && !!(result.data as { preview?: unknown })?.preview;
			// A preview leaves the ticks in place: the one taken away is exactly what is being decided
			// right now. And whoever kept clicking while the save was running keeps their newer
			// figures — otherwise the response from just now would overwrite them.
			if (!preview && editSeq === seq) edits = {};
			// The split editor closes: what it was meant to answer has been answered, and a form that
			// stays open above the row it has just written reads as if nothing had happened.
			editingSplit = null;
			await update({ reset: false });
			saving = false;
			if (editSeq !== seq) scheduleSave();
		};
	};

	/** Closes every open row menu. Popovers are browser state, not component state. */
	function closeRowMenus() {
		for (const menu of document.querySelectorAll<HTMLElement>('[popover]')) {
			if (menu.matches(':popover-open')) menu.hidePopover();
		}
	}

	function draftOf(row: Row): Draft {
		const groups = row.tracks.map((t) => t.groups);
		return {
			offered: row.tracks.length > 0,
			tracks: Math.max(1, row.tracks.length),
			groups: groups.length > 0 ? groups : [defaultGroups(row)],
			year: row.programmeSemester == null ? '' : String(row.programmeSemester),
			note: row.note
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
		const tracks = Math.min(MAX_TRACKS, Math.max(1, count));
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

	/**
	 * Whether the stored parts of a row have drifted from its module's split.
	 *
	 * The cohorts as they are stored, not as the row is being edited: an unsaved group is not
	 * drift, it is a change on its way. Without this the SWS column showed the split's figure with
	 * „(gespeichert …)“ beside it for good, which read as a save that never happened — while the
	 * overview, adding up the stored parts, showed the other figure.
	 */
	function driftOf(row: Row) {
		if (!row.planned) return null;
		return splitDrift(
			row.module,
			row.teachingHours,
			row.tracks.map((t) => ({
				groups: t.groups,
				borrowedKinds: t.borrowedKinds,
				covered: !!t.coveredBy?.acceptedAt
			}))
		);
	}

	/**
	 * Whether carrying the split over can still reach this semester. The backend leaves the
	 * instances of a FINAL semester alone, so offering it there would offer nothing.
	 */
	const splitCarriesOver = $derived(data.current?.phase !== 'FINAL');

	/**
	 * The question after a split was changed, or the preview asked for from a row.
	 *
	 * Asked only where there is something to say: a module with no instance in a running semester,
	 * or whose instances already follow the split, gets no dialog — a question with no decision in
	 * it teaches people to click dialogs away. After carrying over it stays open with the result,
	 * which is the answer to the click.
	 */
	const splitResult = $derived.by(() => {
		if (!form || !('splitReport' in form) || !form.splitReport) return null;
		const report = form.splitReport;
		const pending = report.changed.length > 0 || report.refused.length > 0;
		if (report.dryRun && !pending && 'confirmed' in form) return null;
		const row = rows.find((r) => r.module.id === form.splitModuleId);
		return {
			report,
			moduleId: form.splitModuleId,
			name: row ? moduleName(row.module) : 'dieses Moduls',
			afterChange: 'confirmed' in form
		};
	});

	/** Dismissal, by the result it dismissed — a new result is a new question. */
	let dismissedSplit = $state<unknown>(null);
	const splitDialog = $derived(splitResult && dismissedSplit !== form ? splitResult : null);
	let splitEl = $state<HTMLDialogElement | null>(null);
	let upgradingSplit = false;

	// The same upgrade as the withdrawal question: rendered with `open` so it is there without
	// JavaScript, raised to a real modal with it.
	$effect(() => {
		const el = splitEl;
		if (!el || el.matches(':modal')) return;
		upgradingSplit = true;
		el.close();
		el.showModal();
		setTimeout(() => (upgradingSplit = false), 0);
	});

	function dismissSplit() {
		dismissedSplit = form;
	}

	function onSplitClose() {
		if (upgradingSplit || splitEl?.open) return;
		dismissSplit();
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
	The saving state sits above the page, not inside it.

	In the flow it stood between the header and the table, and every message pushed the table
	down and back up again — on a page that saves itself after every click, that means on every
	click. Nobody reads what moves while they are reading it.
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
	The filters of the current view as hidden fields.

	Every GET form on this page that wants to set only *one* parameter has to send the others
	along — otherwise switching the view drops half the selection. Written once, used three
	times.
	-->
<!--
	The part of the filter this form does not carry itself.

	A GET form sends only its own fields — and of its submit buttons only the one that was
	clicked. So whoever clicks a programme sends exactly `studiengang`, and everything else is
	dropped: the page landed back in the planning semester because `semester` was missing.

	`own` names the parameters for which this form has a visible control. Everything else
	travels along as a hidden field. Two fields of the same name in one form are no way out:
	`searchParams.get` takes the first, so depending on the order in the markup sometimes the
	hidden one would win and sometimes the visible one — exactly the silent dependency that is
	not supposed to exist anywhere here.
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
		<!-- Limited so the switch stays at the top right and does not slip under the paragraph. -->
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
			<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
				Den Bedarf legt die <strong>Studiengangsleitung</strong> für ihren Studiengang fest, das
				Dekanat für alle. Voraussetzung je Modul ist die SWS-Aufteilung aus dem
				<a class="link" href={resolve('/module')}>Modulkatalog</a>; fehlt sie, steht hier ein
				Vorschlag, und das Modul lässt sich erst planen, wenn er bestätigt ist. Wer fertig ist,
				meldet es oben rechts — das ist eine Ansage an die anderen, keine Sperre. Was der Bedarf je
				Studiengang an SWS kostet und wie viel davon das Kontingent hergibt, zeigt das
				SWS-Controlling unter
				<a class="link" href={resolve('/statistik')}>Statistik</a>. Der ganze Ablauf steht auf der
				<a class="link" href={resolve('/')}>Startseite</a>.
			</p>
		</div>

		<!--
			The toggle, as in Moodle: top right, and it lives in the address.
			Client state would be two views under one address — not shareable, and the back button
			would show the wrong one.
		-->
		{#if plansAtAll && data.selected.programme !== '' && data.current}
			<!--
				The completion notice. Its own form and its own action, because it is a statement about
				the state of things and not a change to the planning — and because it holds even when
				nobody is editing at the moment.
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
			{#if reviewPhase}
				<form
					method="POST"
					action="?/review&semester={data.current.code}&studiengang={data.selected.programme}"
					class="shrink-0"
				>
					<input type="hidden" name="semester" value={data.current.code} />
					<input type="hidden" name="programme" value={data.selected.programme} />
					<input type="hidden" name="complete" value={reviewed ? 'false' : 'true'} />
					<button
						type="submit"
						class="btn btn-sm {reviewed ? 'btn-ghost' : ''}"
						disabled={!mayPlan}
						title={mayPlan ? undefined : editingBlocked || undefined}
					>
						{reviewed ? 'Review-Meldung zurücknehmen' : 'Review fertig'}
					</button>
				</form>
			{/if}
		{/if}
		{#if plansAtAll}
			<form method="GET" class="shrink-0">
				{@render carriedOver([])}
				{#if editing}
					<button type="submit" name="bearbeiten" value="" class="btn btn-sm">Ansicht</button>
				{:else}
					<!--
						Disabled rather than hidden when it does not work here: whoever plans should always find
						the button in the same place. One that comes and goes while clicking through the
						programmes reads like a bug — and its absence answers nothing, while the `title` says
						exactly what is missing.
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
				Deine Studiengangsleitung ist noch keinem Studiengang zugeordnet — bitte in der Verwaltung eintragen
				lassen. Lesen kannst Du den Bedarf trotzdem.
			</p>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<!--
			Semester and programme switch immediately, the rest does not.

			The tabs are submit buttons of a GET form: SvelteKit intercepts them and turns them into a
			real navigation, so `page.url` is right and the load runs — without `replaceState`, without
			a second state next to the address, and without a script it does the same with a full page
			load.

			**One form per bar**, and that is not cosmetic. A form sends only the clicked one of its
			submit buttons — so both bars in one form meant: whoever clicks a programme sends
			`studiengang` and nothing else, and arrives without `semester` and therefore in the
			planning semester. The same the other way round. Each bar now carries the rest of the
			filter along as hidden fields (`carriedOver`).

			The <form> goes around the bar, never in between: daisyUI styles via `.tabs > .tab`, and a
			form in the middle takes the bar's border, spacing and selected state away.
		-->
		<form method="GET" class="flex flex-col gap-1">
			{@render carriedOver(['semester'])}
			{#if data.selected.editing}
				<input type="hidden" name="bearbeiten" value="1" />
			{/if}

			<div class="flex flex-col gap-1">
				<span class="label-text text-sm">Semester</span>
				<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-wrap">
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
					All planned programmes as buttons, not just one's own with a dropdown beside them. The
					list is short enough for that since it only contains the ones the faculty actually plans:
					the rest from the ZPA, which somebody else runs or which have expired, are not in it at
					all any more.
				-->
				<div role="tablist" class="tabs tabs-box w-fit max-w-full flex-wrap">
					<!-- „alle“ exists only in the read view: planDemand writes exactly one. -->
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
							<!-- One's own in bold: the order stays alphabetical so that a programme always
							     stands in the same place, and whoever plans still finds theirs at once. -->
							<span class={mine ? 'font-semibold' : ''}>{programme.code}</span>
						</button>
					{/each}
				</div>
			</div>
		</form>

		<!--
			The rest of the row belongs to the edit view, and entirely so.

			Search, kind, term and the two checkboxes filter the *catalogue list* from which the
			planning table makes its rows — and that is only loaded at all while editing. The read
			view had five controls that did nothing.

			It does not switch immediately — a search that reloads after every letter is not one.
			Its own form, because submitting here does not mean the same as a tab click above:
			there the button is the selection, here it is the end of an input.

			It carries these five itself, so they must not *also* travel along hidden: two fields
			of the same name, and `searchParams.get` would take the first — the dropdowns would
			silently have put the old value back.
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
					<!--
						`aria-label`, although the label wraps the field: with a wrapping label the accessible
						name is the entire text content — here, then, „Art alle Pflicht Wahlpflicht
						uneinheitlich“. The field would thus be read out as its own list of options.
					-->
					<select name="art" aria-label="Art" class="select select-bordered select-sm">
						<option value="">alle</option>
						<option value="COMPULSORY" selected={data.selected.duty === 'COMPULSORY'}>
							Pflicht
						</option>
						<option value="ELECTIVE" selected={data.selected.duty === 'ELECTIVE'}>
							Wahlpflicht
						</option>
						<!--
							The same third option as in the module catalogue. Without it there was no way to
							filter by it — and worse: the server accepts `art=MIXED`, so the field said „alle“
							while the filter was in effect.
						-->
						<option value="MIXED" selected={data.selected.duty === 'MIXED'}> uneinheitlich </option>
					</select>
				</label>

				<!--
					The term follows the semester, and the only decision about it is whether to open it up
					further. Before, there were three options, two of which were nonsense: with a winter
					semester selected, „Sommersemester“ asks for exactly the modules that cannot run in
					it.
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

				<label class="flex items-center gap-2 pb-1 text-sm">
					<input
						name="cie"
						type="checkbox"
						value="1"
						checked={data.selected.onlyCie}
						class="checkbox checkbox-sm"
					/>
					nur CiE
				</label>

				<button type="submit" class="btn btn-primary btn-sm">Anzeigen</button>
			</form>
		{/if}

		<!--
			Basket and order, in both views. A programme like one whose modules all sit in the first
			Fachsemester is structured by its baskets alone, and the year groups say nothing there.

			Its own form, because it switches on change and the search above must not: a filter of
			dropdowns submits itself, a search field waits for its button.
		-->
		{#if baskets.length > 0}
			<form method="GET" class="flex flex-wrap items-end gap-3" data-testid="basket-filter">
				{@render carriedOver(['korb', 'sortierung'])}
				{#if editing}
					<input type="hidden" name="bearbeiten" value="1" />
				{/if}
				<label class="form-control">
					<span class="label-text text-sm">Korb</span>
					<select
						name="korb"
						aria-label="Korb"
						class="select select-bordered select-sm max-w-full"
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						<option value="">alle</option>
						{#each baskets as basket (basket)}
							<option value={basket} selected={data.selected.basket === basket}>{basket}</option>
						{/each}
					</select>
				</label>
				<label class="form-control">
					<span class="label-text text-sm">Sortierung</span>
					<select
						name="sortierung"
						aria-label="Sortierung"
						class="select select-bordered select-sm"
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						<option value="">nach Name</option>
						<option value="korb" selected={data.selected.order === 'basket'}>nach Korb</option>
					</select>
				</label>
				<noscript><button type="submit" class="btn btn-primary btn-sm">Anzeigen</button></noscript>
			</form>
		{/if}
	</div>

	{#if editing}
		<!--
			Bringing in a subject that is not marked for this programme.

			The emergency the faculty explicitly needs: a module has to be offered and is in none of
			this programme's catalogues. The backend has allowed that for a long time — the permission
			depends on the programme of the instance and never on the module's home, because exactly
			that difference *is* the dean's office's import/export figure.

			Its own search and not the filter above: the filter describes the table, and a filter that
			suddenly mixed in modules from elsewhere would turn every save into a ride across a
			catalogue nobody can survey.
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
									<span class="badge badge-ghost badge-sm">
										{match.splitIsEstimated
											? 'Aufteilung noch nicht bestätigt'
											: 'keine SWS im Katalog'}
									</span>
								{/if}
								<!--
									Its own form, not the big table: there is no row for this module there yet — it is
									exactly what the catalogue query does not return. Once created it appears as an
									ordinary, ticked row.
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
			Creating a course that does not exist in the ZPA — and the FWP placeholder.

			Both are the same form: a `module` row the faculty enters itself. A placeholder is then a
			module like any other; "we need three" is three tracks of it, set with the track counter
			the table already has.

			Created *and* registered for this semester in one step: whoever opens this form has made
			the decision. A row that is in the catalogue and not in the demand would be a second,
			invisible step.
		-->
		<details class="border-base-300 bg-base-100 rounded-lg border p-4">
			<summary class="cursor-pointer text-sm font-medium">
				Eigene Lehrveranstaltung oder FWP-Platzhalter anlegen
			</summary>

			<form
				method="POST"
				action="?/createLocal"
				use:askBeforeLeave={{ label: 'Eigene Lehrveranstaltung oder FWP-Platzhalter' }}
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

				{#if data.filingGroups.length > 0}
					<label class="form-control">
						<!--
							Filed right here, not later. A locally created module comes into the world without a
							subject group, and an instance whose module is in none reaches no subject group lead —
							which is why it appeared under no tab at all on the assignment page. That is exactly
							what happened with the short-notice FWP.
						-->
						<span class="label-text text-sm">Fachgruppe</span>
						<select name="fachgruppe" class="select select-bordered select-sm w-56">
							<option value="">noch keine</option>
							{#each data.filingGroups as group (group.id)}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
					</label>
				{/if}

				<label class="form-control">
					<!-- Not just „Art“: the filter bar already has one, and that one means compulsory
					     or elective. -->
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
					<!-- The only field of this form that describes not the module but the instance
					     registered in the same step. It is here anyway: a local row is in no
					     regulations, so there is nothing to prefill the cohort year from — otherwise it
					     would stay empty until somebody looks for the row in the table, and there it
					     sits right at the bottom under „Ohne Fachsemester“.

					     Empty is allowed and means exactly that: nobody has said. It can be filled in
					     later in the row, as for any other instance. -->
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
			{#if data.filingGroups.length === 0}
				<!--
					The sentence describing the rest of the way. Only somebody who leads a subject group or
					is the dean's office may file it here — the programme lead creates the course but does
					not assign it to a group. Without this hint the module would silently be left without a
					subject group.
				-->
				<p class="text-base-content/80 mt-2 text-sm">
					Die neue Lehrveranstaltung gehört zunächst <strong>keiner Fachgruppe</strong> an. Besetzen
					lässt sie sich trotzdem — auf der
					<a class="link" href="{resolve('/zuteilung')}?semester={data.selected.semester}"
						>Zuteilungsseite</a
					>
					unter „ohne Fachgruppe“. Einsortiert wird sie von der Leitung der Fachgruppe, dem Dekanat oder
					der Administration im <a class="link" href={resolve('/module')}>Modulkatalog</a>; danach
					erscheint sie dort, wo die Fachgruppe besetzt.
				</p>
			{/if}
		</details>
	{/if}

	<!--
		The withdrawal asks in a modal, not in a box above the table.

		The box was at the top, the „noch nicht gespeichert“ badge at the bottom right — and the
		badge is the more eye-catching of the two. Whoever removes a tick without having the page
		scrolled right to the top does not see the question and reads the draft state as an error.

		WITHOUT JAVASCRIPT IT MUST STILL BE THERE

		This page works without JavaScript — the form has a save button, and the preview is a
		server-rendered response. A `<dialog>` opened only by `showModal()` would lose the
		confirmation exactly there. That is why `open` is set as an attribute on the element:
		daisyUI shows `.modal[open]`, so the question is visible and usable without JavaScript too.
		With JavaScript it effectively becomes a real modal — backdrop, focus trap, ESC.
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
					Dieser Schritt zieht {form.preview.withdrawn.length} Instanz(en) zurück. Die Teile gehen mit.
					Bleibt das Modul angeboten, gehen Wünsche für einen wegfallenden Zug auf einen verbleibenden
					über. Ist schon jemand zugeteilt, wird die Instanz einzeln abgelehnt und bleibt.
				</p>
				<ul class="mt-2 flex flex-col gap-1">
					{#each form.preview.withdrawn as change, i (i)}
						<li class="text-base-content/90 text-sm">
							{change.moduleName}{change.track ? ` — Zug ${change.track}` : ''}
						</li>
					{/each}
				</ul>
				<!--
					What would happen in *another* programme, and in the conditional at that.

					The dry run says who would take over the course — but saving can still fail afterwards:
					an instance may have a wish attached, and `wish.course_instance_id` is ON DELETE
					RESTRICT. The handover is in the same transaction and is then rolled back with it. To
					promise „GS5 übernimmt“ would therefore be a commitment the backend does not have to
					keep.
				-->
				{#if form.preview.promoted.length > 0}
					<p class="text-base-content/90 mt-2 text-sm">
						Ein anderer Studiengang übernähme die Lehre — mitsamt Gruppen und Zuteilung:
					</p>
					<ul class="mt-1 flex flex-col gap-1">
						{#each form.preview.promoted as change, i (i)}
							<li class="text-base-content/90 text-sm">
								{change.programme?.code ?? 'Ein anderer Studiengang'} → {change.moduleName}
							</li>
						{/each}
					</ul>
				{/if}
				{#if form.preview.created.length > 0 || form.preview.changed.length > 0}
					<p class="text-base-content/80 mt-2 text-sm">
						Außerdem: {form.preview.created.length} neu, {form.preview.changed.length} geändert.
					</p>
				{/if}
				<div class="modal-action">
					<!--
						The way out the box did not have. A modal without a cancel is a dead end — and without
						JavaScript a `type="button"` is nothing at all, so it is a GET to the same address: that
						reloads the page and with it the saved state, which is exactly what „abbrechen“ means
						here.
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
				Clicking beside it closes, as with every modal. A `form method="dialog"` needs no
				JavaScript and exists for exactly that.
			-->
			<form method="dialog" class="modal-backdrop">
				<button type="submit" aria-label="Dialog schließen">schließen</button>
			</form>
		</dialog>
	{/if}

	<!--
		Carrying a changed split over to the existing instances.

		An instance keeps the parts it was declared with, so a split changed from a row reaches none
		of them until somebody carries it over — and nothing on this page said so. The question comes
		right after the change, with the backend's preview in it, and the same preview can be asked
		for from any row whose stored parts have drifted. The work is the module page's mutation;
		this is only a second place to ask for it.

		A modal for the reason the withdrawal question is one, and built the same way: `open` as an
		attribute so it stands without JavaScript, raised to a real modal with it.
	-->
	{#if splitDialog}
		<dialog
			bind:this={splitEl}
			open
			class="modal"
			aria-labelledby="split-apply-title"
			onclose={onSplitClose}
		>
			<div class="modal-box">
				<h2 id="split-apply-title" class="mb-2 font-medium">
					Aufteilung von {splitDialog.name} auf bestehende Instanzen übertragen?
				</h2>
				{#if splitDialog.report.dryRun}
					<p class="text-base-content/90 mb-3 text-sm">
						{#if splitDialog.afterChange}
							Die neue Aufteilung ist gespeichert.
						{/if}
						Bestehende Instanzen behalten ihre gespeicherten SWS, bis Du die Aufteilung überträgst — in
						allen Studiengängen, in denen das Modul in einem laufenden Semester geplant ist. Von Hand
						geänderte SWS werden dabei überschrieben, besetzte Teile werden nicht entfernt.
					</p>
				{/if}
				<SplitApplicationReport report={splitDialog.report} />
				<div class="modal-action flex-wrap">
					{#if splitDialog.report.dryRun && splitDialog.report.changed.length > 0}
						<form
							method="POST"
							action="?/applySplit"
							use:enhance={() =>
								async ({ update }) => {
									await update({ reset: false });
								}}
						>
							<input type="hidden" name="moduleId" value={splitDialog.moduleId} />
							<button type="submit" name="dryRun" value="0" class="btn btn-primary btn-sm">
								Jetzt übertragen
							</button>
						</form>
					{/if}
					<!-- Like „Abbrechen“ in the withdrawal question: without JavaScript a GET to the same
					     address, which is what leaving it as it is means. -->
					<form method="GET" onsubmit={dismissSplit}>
						{@render carriedOver([])}
						<input type="hidden" name="bearbeiten" value="1" />
						<button type="submit" class="btn btn-sm">
							{splitDialog.report.dryRun ? 'Nicht übertragen' : 'Fertig'}
						</button>
					</form>
				</div>
			</div>
			<form method="dialog" class="modal-backdrop">
				<button type="submit" aria-label="Dialog schließen">schließen</button>
			</form>
		</dialog>
	{/if}

	<!--
		What the rows' „Vorschau: übertragen“ buttons submit. A form of its own outside the table,
		referenced by `form=`, for the reason the coverage picker is: forms do not nest, and a button
		inside the table form would send the whole table along with it.
	-->
	{#if editing}
		<form method="POST" action="?/applySplit" id="split-apply" use:enhance>
			<input type="hidden" name="dryRun" value="1" />
		</form>
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
				<!-- As a GET form rather than a link: `resolve()` only knows the path, the selection is
				     in query parameters, and a hand-written link with both is exactly what the lint
				     rule prevents. -->
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
			Requests from other programmes, at the very top and outside the table.

			Without this section a request is invisible on the only screen on which it can be
			answered: it sits in the row of the *requesting* programme, and the holding lead does not
			even see that one in their own selection. It hangs off this programme's instances —
			`covers` —, so exactly where the agreement belongs.
		-->
		{#if mayPlan && openCoverageRequests.length > 0}
			<form method="POST" action="?/coverage" use:enhance class="flex flex-col gap-2">
				<div class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
					<h2 class="font-medium">Anfragen anderer Studiengänge</h2>
					<p class="text-base-content/80 text-sm">
						Ein anderer Studiengang möchte ein Modul gemeinsam mit Dir anbieten. Bestätigen heißt:
						die Veranstaltung findet einmal statt, Dein Studiengang hält sie, und ihre SWS zählen
						einmal — bei Deinem.
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
							<!-- Declining and releasing are the same thing: the demand is not covered. -->
							<button type="submit" name="release" value={request.guestId} class="btn btn-xs">
								ablehnen
							</button>
						</div>
					{/each}
				</div>
			</form>
		{/if}

		<!--
			The form that opens the picker lives here — outside the planning table.

			A button with `formmethod="GET"` *inside* the planning form would send that form's entire
			content as a query string, i.e. every tick and every group count in the table. Forms cannot
			be nested, so the row buttons point here via the `form` attribute: they then send only
			their own name and the filters contained here.
		-->
		{#if editing}
			<form method="GET" id="coverage-picker" class="hidden">
				{@render carriedOver([])}
				<input type="hidden" name="bearbeiten" value="1" />
			</form>
		{/if}

		<!--
			The picker: which instance of another programme should also cover this demand.

			A section at the address instead of a dialog, like the edit view: reloadable, shareable,
			and closed with the back button. The list comes from the load and is exactly what the
			foreign key would accept — a menu with entries that fail when clicked would be worse than
			a short menu.
		-->
		{#if mayPlan && coverageSubject}
			<div class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
				<h2 class="font-medium">
					{cohortLabel(
						coverageSubject.programme.code,
						coverageSubject.programmeSemester,
						coverageSubject.track
					)} — {coverageSubject.module.name} gemeinsam mit einem anderen Studiengang planen
				</h2>
				<p class="text-base-content/80 text-sm">
					Der Bedarf bleibt bestehen und zählt weiter für Deinen Studiengang. Was sich ändert: die
					Veranstaltung findet einmal statt, der andere Studiengang hält sie, und ihre SWS zählen
					dort. Wirksam wird das erst, wenn die dortige Leitung zustimmt. Anfragen bei:
				</p>

				{#if data.coverageCandidates.length === 0}
					<p class="text-base-content/80 text-sm">
						Kein anderer Studiengang hat dieses Modul in diesem Semester angemeldet — oder die
						vorhandenen halten es selbst schon mit jemandem gemeinsam. Ohne eine Instanz dort gibt
						es nichts, womit sich dieser Zug zusammenlegen ließe.
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
									The candidate id sits on the button, not in a hidden field: a form with one hidden
									field per candidate sends all of them, and `coveredBy` would always be the first
									in the list instead of the one clicked.
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
					<!-- `deckung` is not one of the filters and therefore does not travel along: exactly
					     that is what closes the picker. -->
					{@render carriedOver([])}
					<input type="hidden" name="bearbeiten" value="1" />
					<button type="submit" class="btn btn-ghost btn-xs">schließen</button>
				</form>
			</div>
		{/if}

		{#if !editing}
			<!--
				The read view: the same grain as the planning table — one row per module, the tracks
				inside it —, but only what is actually registered. No greyed-out planning table: most of
				its rows are modules nobody has ticked, so it is a work list, and that belongs to
				somebody else.
			-->
			<DemandOverview
				instances={data.instances}
				programme={data.selected.programme}
				basket={data.selected.basket}
				order={data.selected.order}
			/>
		{:else}
			{#if shown.length === 0}
				<div class="border-base-300 bg-base-100 rounded-lg border p-4">
					<p class="text-base-content/80 text-sm">
						Keine Module in dieser Auswahl. Vielleicht ist der Turnus zu eng gesetzt.
					</p>
				</div>
			{/if}

			<!--
			`enhance` with its own callback. After saving, the load has reloaded, and with that the
			edits from before are answered — unless a preview came back (then the decision is still
			pending) or somebody has kept clicking in the meantime.
		-->
			<form
				bind:this={formEl}
				method="POST"
				action="?/plan"
				use:trackSaves={{
					waiting: () => editing && editSeq !== sentSeq,
					flush: () => {
						clearTimeout(saveTimer);
						formEl?.requestSubmit();
					},
					submit: planSubmit
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
							`table-fixed` with fixed column shares: otherwise the browser sizes the columns by
							their content, and every saved figure — „—“ becomes „14 SWS“ — re-measures the whole
							table. As a side effect the columns of all cohort-year blocks now line up, which they
							did not before.
						-->
							<table
								class="table table-fixed table-sm w-full min-w-[900px] table-stack"
								use:stackedTable
							>
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
												<!-- The track letters, as the page shows them. They are here and not with
											     the counters, because a field has to be sent along even when the module
											     has no groups at all. -->
												{#each letters as letter, i (i)}
													<input type="hidden" name="track:{row.module.id}:{i}" value={letter} />
												{/each}
												<!-- A disabled checkbox is not submitted, and a missing "offer" tells
												     the server "unticked". Without this field every save withdrew the
												     cohorts of a module planned while its split was still an estimate:
												     the tick nobody could click was the one that disappeared. Only for a
												     row the server holds: a proposal must stay unsent, as before. -->
												{#if row.planned && (!mayPlan || !row.module.plannable)}
													<input type="hidden" name="offer" value={row.module.id} />
												{/if}
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
																<span class={dutyBadge(row.module.dutyStatus)}>
																	{DUTY_LABELS[row.module.dutyStatus]}
																</span>
															{/if}
															{#if row.module.projectBased}
																<span
																	class="badge badge-secondary badge-sm"
																	title="Praxisbegleitende Lehrveranstaltung — wird zuletzt vergeben"
																	>PBLV</span
																>
															{/if}
															{#if basketLabel(row.module.dutyStatus, row.module.baskets)}
																<span class="text-base-content/80 text-xs">
																	{basketLabel(row.module.dutyStatus, row.module.baskets)}
																</span>
															{/if}
															{#if !row.planned && row.proposedFrom}
																<span class="badge badge-ghost badge-sm">
																	Vorschlag aus {semesterName(row.proposedFrom)}
																</span>
															{/if}
															<!-- Planning happens only with a confirmed split: an estimate
															     produced parts that were left behind after confirming. With an
															     estimate, „bestätigen“ is in the split column. -->
															{#if !row.module.plannable && !row.module.splitIsEstimated}
																<span class="badge badge-ghost badge-sm">
																	keine SWS im Katalog
																</span>
															{/if}
															<!-- A row the filter did not return: the module belongs elsewhere,
															     or the term hides it. It is shown anyway, because planDemand only
															     touches what was on the screen — an invisible row could never be
															     deselected again. -->
															{#if row.foreign}
																<span class="badge badge-ghost badge-sm">
																	außerhalb des Filters
																</span>
															{/if}
															<!-- A row the ZPA does not know. The difference is not a
															     side issue: „aktiv“ and „zurückgezogen“ are statements by
															     the ZPA, and it makes none about a row of our own. -->
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
												<!--
													The note sits under the name and only on a registered row: it explains an
													offering, and a row without a tick has none. It is sent as a field of the
													row, so for all tracks at once — like the cohort year.
												-->
												{#if draft(row).offered}
													<!-- The field carries the same speech bubble as the comment shown, so
													     that while typing one already sees what it will appear as afterwards.
													     -->
													<label class="input input-xs mt-1 w-full max-w-sm">
														<NoteIcon class="text-base-content/80 size-4 shrink-0" />
														<input
															type="text"
															name="note:{row.module.id}"
															value={draft(row).note}
															maxlength="2000"
															placeholder="Notiz, z. B. warum vier Züge"
															oninput={(e) => editLater(row, { note: e.currentTarget.value })}
															onchange={() => scheduleSave()}
															disabled={!mayPlan}
															class="italic"
															aria-label="Notiz zu {moduleName(row.module)}"
														/>
													</label>
												{/if}
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
													class="input input-xs input-stepper w-14 text-center"
													aria-label="Fachsemester von {moduleName(row.module)}"
												/>
											</td>
											<td class="text-base-content/90">
												<!--
												The split on the left, the badge and the button at the right edge of the
												column. Following the text they would sit somewhere different in every row —
												and what is scanned here is a column of estimates, not a row: the eye needs
												them lined up.
											-->
												{#if editingSplit === row.module.id}
													<!--
													Changed here, where the figure is: „4+2 statt 3+3“ is a correction of two
													fields and not a trip to another page — and one does not leave the page on
													which one has just set fifteen ticks for it. Adding a unit stays reserved
													for the module page, which the module name links to. Removing one works
													here: empty or 0 — and that is written beside it, because otherwise nobody
													would guess it.
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
														<span class="text-base-content/80 basis-full text-xs">
															Leer oder 0 entfernt einen Teil. Weitere Teile auf der Modulseite.
															{#if row.planned}
																Bestehende Instanzen behalten ihre gespeicherten SWS; nach dem
																Speichern zeigt eine Vorschau, was sich beim Übertragen ändern
																würde.
															{/if}
														</span>
													</div>
												{:else}
													<!--
													Two lines: the split on top, below it everything one can do with it. Side
													by side the column grew by the width of the buttons, and with two tracks
													that pushed the SWS column out of view — the figure one watches while
													clicking.
												-->
													<div class="flex flex-col gap-1">
														<span>{splitLabel(row)}</span>
														<span class="flex flex-wrap items-center gap-1">
															{#if row.module.splitIsEstimated}
																<span class="badge badge-warning badge-sm">geschätzt</span>
																{#if maySplit(row.module)}
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
															{#if maySplit(row.module) && row.module.splitIsEstimated}
																<!-- As long as it is an estimate, changing sits here next to
															     confirming: people should see that something is still to be done.
															     Once confirmed it moves into the row's menu. -->
																<button
																	type="button"
																	class="btn btn-xs"
																	onclick={() => (editingSplit = row.module.id)}
																>
																	ändern
																</button>
															{/if}
															<!--
																The case that previously had no display at all: the same module,
																planned twice because neither knew about the other. Phrased as an
																offer and not as an error.

																Once per row and here rather than with the groups: it is a
																statement about the module, not about a track — in the track loop
																the same sentence appeared twice for two tracks, and in the narrow
																column it wrapped over five lines. Short, because only the list in
																the middle carries anything anyway; the full sentence is in the
																`title`.
															-->
															{#if separatelyPlannedIn(row).length > 0}
																<span
																	class="badge badge-ghost badge-sm whitespace-nowrap"
																	title={alsoPlannedLabel(separatelyPlannedIn(row))}
																>
																	{alsoPlannedShort(separatelyPlannedIn(row))}
																</span>
															{/if}
															<!--
																The row's menu: everything that is rarely needed on a registered
																row — changing the split, one lecture for all tracks, holding a
																track together with another programme. In the row itself these
																buttons stood in threes and fours, and the table filled up although
																almost no row ever needs any of them.

																A popover (top layer) and not a daisyUI dropdown: the table sits in
																`overflow-x-auto`, and a dropdown inside it would be cut off at the
																table's edge. Without JavaScript: the browser does the opening via
																`popovertarget`, and the buttons inside still belong to the planning
																form.
															-->
															{#if mayPlan && row.module.plannable && (row.planned || !row.module.splitIsEstimated)}
																<!-- A cog and a proper button: three dots in ghost style were too
															     inconspicuous for what is behind them. -->
																<button
																	type="button"
																	class="btn btn-xs"
																	popovertarget="row-menu-{row.module.id}"
																	aria-label="Weitere Einstellungen für {moduleName(row.module)}"
																	title="Weitere Einstellungen: Aufteilung, Vorlesung für alle Züge, gemeinsam mit anderen Studiengängen"
																>
																	<GearIcon class="size-4" />
																</button>
																<div
																	id="row-menu-{row.module.id}"
																	popover="auto"
																	class="border-base-300 bg-base-100 text-base-content m-auto w-[min(30rem,92vw)] rounded-lg border p-4 shadow-lg backdrop:bg-neutral/30"
																>
																	<div class="flex flex-col gap-3 text-sm">
																		<div class="flex items-start justify-between gap-2">
																			<h3 class="font-medium">{moduleName(row.module)}</h3>
																			<button
																				type="button"
																				class="btn btn-ghost btn-xs"
																				popovertarget="row-menu-{row.module.id}"
																				popovertargetaction="hide"
																				aria-label="Menü schließen"
																			>
																				✕
																			</button>
																		</div>

																		{#if !row.module.splitIsEstimated && maySplit(row.module)}
																			<section class="flex flex-col gap-1">
																				<h4
																					class="text-base-content/80 text-xs font-medium uppercase"
																				>
																					Aufteilung
																				</h4>
																				<div>
																					<button
																						type="button"
																						class="btn btn-xs"
																						popovertarget="row-menu-{row.module.id}"
																						popovertargetaction="hide"
																						onclick={() => (editingSplit = row.module.id)}
																					>
																						Aufteilung ändern
																					</button>
																				</div>
																			</section>
																		{/if}

																		<!-- Once per module, not per track: „einmal für beide gehalten“
																	     is a statement about the lecture, and the way back is the
																	     same button, because a sabbatical revises the decision.

																	     Not at all for a placeholder: three FWPs are three different
																	     subjects, not three cohorts of the same one — there is no
																	     shared lecture to merge. -->
																		{#if row.planned && row.module.kind !== 'FWP_PLACEHOLDER'}
																			{@const sharing = sharingState(row)}
																			{#if sharing.sharedPartId || sharing.mergeablePartId}
																				<section class="flex flex-col gap-1">
																					<h4
																						class="text-base-content/80 text-xs font-medium uppercase"
																					>
																						Vorlesung
																					</h4>
																					<p class="text-base-content/80">
																						Bei mehreren Zügen kann die Vorlesung einmal für alle
																						stattfinden. Sie zählt dann einmal.
																					</p>
																					<div>
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
																						{:else}
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
																					</div>
																				</section>
																			{/if}

																			<!--
																				Together or separate, per track: which track holds its
																				module together with another programme is a statement about
																				exactly that track. The usual case needs no button: whoever
																				plans next to another programme is together with it
																				immediately — then this says „getrennt planen“. „gemeinsam
																				planen“ is the after-the-fact route via the picker, and the
																				other side confirms it in its own row.
																			-->
																			<section class="flex flex-col gap-1">
																				<h4
																					class="text-base-content/80 text-xs font-medium uppercase"
																				>
																					Gemeinsam mit anderen Studiengängen
																				</h4>
																				<p class="text-base-content/80">
																					Ein Zug kann sein Modul mit dem Zug eines anderen
																					Studiengangs zusammen halten: die Veranstaltung findet
																					einmal statt, dort.
																				</p>
																				{#each row.tracks as cohortTrack, i (i)}
																					{#if cohortTrack.instanceId}
																						<div class="flex flex-wrap items-center gap-1">
																							<span class="badge badge-neutral badge-sm">
																								{cohortLabel(
																									data.selected.programme,
																									yearOf(row),
																									letters[i] ?? cohortTrack.track
																								)}
																							</span>
																							{#if cohortTrack.coveredBy}
																								<!-- No status badge here: that sits with the track
																							     in the table, and the button itself says where
																							     the track stands. -->
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
																										? 'getrennt planen'
																										: 'Anfrage zurückziehen'}
																								</button>
																							{:else}
																								<!--
																									A GET form instead of a link: `resolve()` knows
																									only the path, the selection is in query
																									parameters. The form sits outside the table
																									(`coverage-picker`).
																								-->
																								<button
																									type="submit"
																									form="coverage-picker"
																									name="deckung"
																									value={cohortTrack.instanceId}
																									class="btn btn-xs"
																								>
																									gemeinsam planen
																								</button>
																							{/if}
																						</div>
																					{/if}
																				{/each}
																			</section>
																		{/if}
																	</div>
																</div>
															{/if}
														</span>
													</div>
													{#if row.module.splitIsEstimated}
														<!-- What „bestätigen“ submits: the estimate, as it stands beside it.
														     -->
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
														max={MAX_TRACKS}
														name="tracks:{row.module.id}"
														value={draft(row).tracks}
														oninput={(e) => setTracks(row, numberOf(e.currentTarget))}
														disabled={!mayPlan}
														class="input input-xs input-stepper join-item w-12 text-center"
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
												<!--
													One row per track, always — even for a module without groups. Before,
													there was a „—“ here, and the track's coverage sat in the split column,
													with one identically worded button per track and no name beside it:
													two tracks, two buttons, and neither said which was which. Now it
													sits with the track, next to its name.
												-->
												<div class="flex flex-col gap-1">
													{#each letters as letter, i (i)}
														<!--
																A covered track holds no teaching of its own — another
																programme holds it. Its group count is therefore not its
																own, and the stepper is disabled rather than merely set to
																0: otherwise the first click would send `groups: 1` and
																get back an INSTANCE_COVERED that the screen could have
																avoided.
															-->
														{@const covered = !!row.tracks[i]?.coveredBy?.acceptedAt}
														<div class="flex flex-wrap items-center gap-1">
															{#if letters.length > 1}
																<span class="badge badge-neutral badge-sm">
																	{cohortLabel(data.selected.programme, yearOf(row), letter)}
																</span>
															{/if}
															<!-- Nothing to multiply for a module that consists of a single
															     lecture — nobody means parallel lectures here. -->
															{#if row.module.practicalKind}
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
																		class="input input-xs input-stepper join-item w-12 text-center"
																		aria-label={groupLabel(row, letters, letter)}
																		title={covered
																			? 'Getrennt planen, um wieder eigene Teile zu setzen'
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
															{/if}
															{#if row.tracks[i]?.coveredBy}
																<!-- `h-auto`: daisyUI fixes a badge to one line's height, and this sentence
																     wraps in a narrow column — it then spilled over the stepper and the
																     select beside it. -->
																<span class="badge badge-outline badge-sm h-auto py-0.5 text-left">
																	{coverageLabel(row.tracks[i].coveredBy!)}
																</span>
															{:else if row.tracks[i]?.borrowedKinds.length}
																<span class="badge badge-ghost badge-sm">Vorlesung geteilt</span>
															{/if}
															{#each row.tracks[i]?.covers ?? [] as covers, c (c)}
																<span class="badge badge-outline badge-sm h-auto py-0.5 text-left"
																	>{coversLabel(covers)}</span
																>
															{/each}
															<!-- How the track is held. The same fields as on the
															     assignment page; only a track whose fields differ from the
															     initial values sent along is saved. -->
															{#if row.tracks[i]?.format}
																{@const format = row.tracks[i].format!}
																<input
																	type="hidden"
																	name="fmt0:{format.id}"
																	value={format.delivery}
																/>
																<input
																	type="hidden"
																	name="en0:{format.id}"
																	value={String(format.taughtInEnglish)}
																/>
																<input
																	type="hidden"
																	name="cie0:{format.id}"
																	value={String(format.cie)}
																/>
																<select
																	name="fmt:{format.id}"
																	class="select select-bordered select-xs w-auto"
																	aria-label="Durchführung von {moduleName(
																		row.module
																	)} in {cohortLabel(data.selected.programme, yearOf(row), letter)}"
																	disabled={!mayPlan}
																	value={format.delivery}
																	onchange={scheduleSave}
																>
																	{#each Object.entries(DELIVERY_LABELS) as [value, label] (value)}
																		<option {value}>{label}</option>
																	{/each}
																</select>
																<label
																	class="flex items-center gap-1 text-xs"
																	title={format.taughtInEnglishOverridden
																		? 'Für diesen Zug festgelegt.'
																		: 'Wie im Modulkatalog des ZPA angegeben, sonst Deutsch.'}
																>
																	<input
																		type="checkbox"
																		name="en:{format.id}"
																		value="true"
																		class="checkbox checkbox-xs"
																		aria-label="{moduleName(row.module)} in {cohortLabel(
																			data.selected.programme,
																			yearOf(row),
																			letter
																		)} auf Englisch"
																		disabled={!mayPlan}
																		checked={format.taughtInEnglish}
																		onchange={scheduleSave}
																	/>
																	EN
																</label>
																<label
																	class="flex items-center gap-1 text-xs"
																	title="Als Course in English (CiE) angeboten. Eigene Kennzeichnung, unabhängig von der Unterrichtssprache."
																>
																	<input
																		type="checkbox"
																		name="cie:{format.id}"
																		value="true"
																		class="checkbox checkbox-xs"
																		aria-label="{moduleName(row.module)} in {cohortLabel(
																			data.selected.programme,
																			yearOf(row),
																			letter
																		)} als CiE"
																		disabled={!mayPlan}
																		checked={format.cie}
																		onchange={scheduleSave}
																	/>
																	CiE
																</label>
																<!-- Which seminar this cohort is, for an umbrella module planned as
																     one cohort per seminar. Only where there are several cohorts or a
																     topic is already set, so the ordinary row does not carry one more
																     empty field. -->
																{#if letters.length > 1 || format.topic}
																	<input
																		type="hidden"
																		name="topic0:{format.id}"
																		value={format.topic ?? ''}
																	/>
																	<input
																		type="text"
																		name="topic:{format.id}"
																		value={format.topic ?? ''}
																		maxlength={MAX_TOPIC_LENGTH}
																		placeholder="Thema"
																		title="Welches Seminar dieser Zug ist, etwa bei einem Sammelmodul. Erscheint in der Wunschphase und in der Zuteilung."
																		class="input input-bordered input-xs w-48"
																		aria-label="Thema von {moduleName(row.module)} in {cohortLabel(
																			data.selected.programme,
																			yearOf(row),
																			letter
																		)}"
																		disabled={!mayPlan}
																		onchange={scheduleSave}
																	/>
																{/if}
															{/if}
														</div>
													{/each}
												</div>
											</td>
											<td class="text-base-content/90 whitespace-nowrap">
												{#if draft(row).offered}
													{@const drift = driftOf(row)}
													{hoursLabel(liveHours(row))}
													{#if row.planned && liveHours(row) !== row.teachingHours}
														<!-- What is on the screen is not yet what is in the
													     database. Showing both is the difference between
													     „ich habe geändert“ and „ich habe gespeichert“. -->
														<span class="text-base-content/80 text-xs">
															(gespeichert {hoursLabel(row.teachingHours)})
														</span>
													{/if}
													<!-- The other reason the two figures differ, and the one that does
													     not go away by saving: the stored parts keep the hours of an
													     older split. Said here, with the way to fix it, because the
													     overview shows the stored figure and nothing else would explain
													     why the two screens disagree. -->
													{#if drift}
														<div
															class="mt-1 flex flex-col items-start gap-1 text-xs whitespace-normal"
														>
															<span class="badge badge-warning badge-sm">nicht übertragen</span>
															<span class="text-base-content/80">
																Die gespeicherten Teile ergeben {hoursLabel(drift.stored)}, die
																Aufteilung {hoursLabel(drift.bySplit)}.
																{#if !splitCarriesOver}
																	Im abgeschlossenen Semester bleibt es dabei.
																{:else if !maySplit(row.module)}
																	Übertragen können die Studiengangsleitung des Heimatstudiengangs,
																	die Fachgruppenleitung des Moduls und das Dekanat.
																{/if}
															</span>
															{#if splitCarriesOver && maySplit(row.module)}
																<button
																	type="submit"
																	form="split-apply"
																	name="moduleId"
																	value={row.module.id}
																	class="btn btn-xs"
																	aria-label="Vorschau: Aufteilung von {moduleName(
																		row.module
																	)} auf Instanzen übertragen"
																>
																	Vorschau: übertragen
																</button>
															{/if}
														</div>
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
