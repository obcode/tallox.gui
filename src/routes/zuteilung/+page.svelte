<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		candidateValue,
		candidateLabel,
		candidatesFor,
		commonNote,
		commonValue,
		moduleBlocks,
		pooledInstances,
		cohortGroups,
		currentValue,
		partHours,
		partsSummary,
		savedHint,
		cohortsWithoutInterest,
		isWideOpen,
		instancesOfTab,
		instancesOfDegree,
		programmeSections,
		programmesWithoutDegree,
		mayFillUnfiled,
		mayShowGaps,
		MIXED_CHOICE,
		UNFILED,
		type AssignmentLike,
		type CohortGroup,
		cohortLabel,
		ownRows,
		isArranged,
		divisionDefault
	} from '$lib/assignment';
	import { ALL_DEGREES, DEGREE_LABELS, degreeParam, programmeLabel } from '$lib/catalogue';
	import { trackSaves } from '$lib/saveOnLeave';
	import GearIcon from '$lib/components/GearIcon.svelte';
	import { facultiesElsewhere } from '$lib/demand';
	import { PHASE_HINTS, PHASE_LABELS, semesterName, semesterShortName } from '$lib/semester';
	import { DELIVERY_LABELS, MAX_TOPIC_LENGTH, hoursLabel, withTopic } from '$lib/demand';
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
			return mine !== 0 ? mine : a.name.localeCompare(b.name, 'de');
		})
	);

	/**
	 * The instances of the chosen subject group.
	 *
	 * Filtered here rather than in the query because `courseInstances` has no subject group
	 * argument — the group is derived through the module, and adding a filter for it to the demand
	 * API would be a second place for that derivation to live.
	 */
	/** The chosen tab: a subject group id, the sentinel for "in no group", or nothing. */
	const tab = $derived(data.selected.group === '' ? null : data.selected.group);

	/** Whether the tab in the address is the one for instances nobody has filed. */
	const unfiled = $derived(tab === UNFILED);

	/** Whether to offer that tab at all — the two roles that may fill such an instance. */
	const offerUnfiled = $derived(mayFillUnfiled(data.session?.effectiveRoles ?? []));

	/** The instances of the tab, before the degree filter: what the notice below is about. */
	const tabInstances = $derived(instancesOfTab(data.instances, tab));

	/** What the table shows: the tab, cut to one degree where somebody chose one. */
	const shown = $derived(instancesOfDegree(tabInstances, data.selected.degree));

	const groups: CohortGroup[] = $derived(cohortGroups(shown, data.assignments as AssignmentLike[]));

	/**
	 * The programmes a degree filter leaves out because nobody has recorded theirs. Named on the
	 * page rather than dropped without a word: a cohort that vanished is a cohort nobody fills.
	 */
	const withoutDegree = $derived(
		data.selected.degree === null ? [] : programmesWithoutDegree(tabInstances)
	);

	/**
	 * The table's sections: one per study programme where somebody asked for that, otherwise one
	 * without a heading — the module blocks as they always were. Opt-in, because a group such as
	 * mathematics fills one module across several programmes in a single block.
	 */
	const sections = $derived(
		data.selected.byProgramme
			? programmeSections(groups)
			: [{ programme: null, blocks: moduleBlocks(groups) }]
	);

	/**
	 * How many cohorts each module has on this tab, across sections. Whether a cohort offers a
	 * topic field depends on it, and cutting the table by programme must not take the field away.
	 */
	const cohortsOfModule = $derived(
		groups.reduce(
			(count, g) => count.set(g.instance.module.id, (count.get(g.instance.module.id) ?? 0) + 1),
			new Map<string, number>()
		)
	);

	const members = $derived(data.group?.members ?? []);
	const desired = $derived(
		new Map(data.desired.map((d) => [d.person.id, { min: d.minHours, max: d.maxHours }] as const))
	);
	const load = $derived(new Map(data.load.map((l) => [l.person.id, l.total] as const)));

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

	/**
	 * Whether this tab has a wish round to switch.
	 *
	 * A module in no subject group has no door and is always open — absent means open, and there
	 * is no group whose lead could shut it. Rendering the switch here would offer a control that
	 * belongs to nobody.
	 */
	const hasWishRound = $derived(data.group !== null);

	/**
	 * The instances of this subject group that nobody has registered interest in yet.
	 *
	 * Only for a subject group this person **leads** — there they read the entries anyway, so
	 * this is a re-sorting of existing rows and not new information. Anywhere else the list
	 * would be silently wrong: the `wishes` are filtered server-side, so for everybody else
	 * they are only their own, and „niemand eingetragen“ would then be a lie and a leak at
	 * once.
	 *
	 * And no number, anywhere: names of tracks, nothing counted, nothing coloured, nothing
	 * sorted by it.
	 */
	const showGaps = $derived(mayShowGaps(tab, data.session?.effectiveRoles ?? [], data.led));

	const gaps = $derived(showGaps ? cohortsWithoutInterest(shown, data.wishes) : []);

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

	/**
	 * Whether an event comes from inside a row menu.
	 *
	 * The menus' fields belong to the table's form — a popover cannot hold a form of its own inside
	 * another one — so their changes bubble to the same listeners. They are not cells: typing the
	 * hours of a piece is not something to autosave, and saving would re-render the menu under the
	 * person typing in it.
	 */
	const inRowMenu = (target: EventTarget | null) =>
		target instanceof Element && target.closest('[popover]') !== null;

	/** Closes every open row menu. Popovers are browser state, not component state. */
	function closeRowMenus() {
		for (const menu of document.querySelectorAll<HTMLElement>('[popover]')) {
			if (menu.matches(':popover-open')) menu.hidePopover();
		}
	}

	/**
	 * The view, as the query parameters it is made of — the same arrangement as on `/bedarf`.
	 *
	 * Every GET form on this page owns some of these and has to carry the rest across, or choosing
	 * a subject group silently drops the degree. Written once here so that "what is the view made
	 * of" has a single answer, and each form says which parts it provides itself. An empty value
	 * is left out: absent and empty mean the same for all of them.
	 */
	const filterFields = $derived([
		{ name: 'semester', value: data.semester?.code ?? data.selected.semester },
		{ name: 'fachgruppe', value: data.selected.group },
		{ name: 'q', value: data.selected.search },
		{ name: 'abschluss', value: degreeParam(data.selected.degree) },
		{ name: 'nach', value: data.selected.byProgramme ? 'studiengang' : '' }
	]);

	/**
	 * The address a POST goes to. Without JavaScript the browser navigates there, and `?/save`
	 * replaces the page's query string — so the whole view travels in the action's address, and
	 * the page comes back where it was rather than on the planning semester with no group.
	 */
	const actionUrl = (name: string) =>
		`?/${name}` +
		filterFields
			.filter((field) => field.value !== '')
			.map((field) => `&${field.name}=${encodeURIComponent(field.value)}`)
			.join('');

	/**
	 * Which cohorts show their parts, where somebody has said so.
	 *
	 * Without an entry the data decides: a cohort whose parts are held by different people opens,
	 * because that is precisely what the one dropdown above it cannot say. Once somebody has opened
	 * or shut one themselves their answer stands — otherwise it would fold up under them the moment
	 * a save made the parts agree, which is the moment they were looking at it.
	 */
	let expanded: Record<string, boolean> = $state({});
	const expandedFor = (id: string, byDefault: boolean) => expanded[id] ?? byDefault;

	/**
	 * Keep a cohort's dropdown and its parts saying the same thing.
	 *
	 * For the browser only. The server ranks the two by comparing them with what is stored and needs
	 * no help — but every save carries both, and a cohort naming somebody while a part below it
	 * names somebody else is a form that contradicts itself between two saves.
	 *
	 * On the elements rather than through state, because these selects are uncontrolled: their value
	 * is the rendered default and the browser owns it afterwards, which is what lets a save leave
	 * the rest of the form untouched.
	 */
	function harmonise(target: EventTarget | null) {
		if (!(target instanceof HTMLSelectElement)) return;

		const section = target.closest('[data-cohort]');
		if (section === null) return;

		const all = section.querySelector<HTMLSelectElement>('select[name^="all:"]');
		const parts = [...section.querySelectorAll<HTMLSelectElement>('select[name^="who:"]')];
		if (all === null || parts.length === 0) return;

		if (target === all) {
			// "Leave them as they are" is the one choice that says nothing about a single part.
			if (all.value === MIXED_CHOICE) return;
			for (const part of parts) part.value = all.value;
			return;
		}

		const values = new Set(parts.map((part) => part.value));
		all.value = values.size === 1 ? [...values][0] : MIXED_CHOICE;
	}
</script>

<svelte:head><title>Zuteilung · Tallox</title></svelte:head>

<h1 class="text-2xl font-semibold">Zuteilung</h1>

<p class="text-base-content/80 mt-2 max-w-prose">
	Wer hält eine Instanz — im Regelfall eine Person für alle ihre Teile. Getrennt wird, wo es so
	abgesprochen ist. Die Eintragungen aus der Wunschphase stehen bei der Instanz, zu der sie gehören.
</p>
<p class="text-base-content/80 mt-2 max-w-prose">
	Besetzt wird nach <strong>Fachgruppe</strong>: zuständig ist deren Leitung, daneben die
	Studiengangsleitung des Studiengangs und das Dekanat. Welcher Fachgruppe ein Modul gehört, steht
	im <a class="link" href={resolve('/module')}>Modulkatalog</a>. Auch Lehrende ohne Tallox-Konto
	sind zuteilbar. Der Zwischenstand bleibt vertraulich, bis das Dekanat die Zuteilung
	veröffentlicht.
</p>
<p class="text-base-content/80 mt-2 max-w-prose">
	Nach den Wünschen bietet jede Auswahl an, wer das Modul laut
	<a class="link" href={resolve('/zuteilung/kompetenzen')}>Kompetenzen</a> halten kann oder sich dafür
	interessiert. Dort steht auch, welche Module niemand abdeckt.
</p>

<!-- One form per bar. A GET form submits only the button that was clicked, so a bar that shared
     its form with another would send its own field and nothing else. -->
<form method="GET" class="mt-6 flex flex-col gap-1">
	<span class="label-text text-sm">Semester</span>
	{@render carriedOver(['semester'])}
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
			<p>Das Dekanat legt es fest.</p>
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
		{@render carriedOver(['fachgruppe'])}
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
				>
					{group.name}
					{#if data.myGroups.includes(group.id)}
						<span class="badge badge-ghost badge-xs ml-1">meine</span>
					{/if}
				</button>
			{/each}
			{#if offerUnfiled}
				<!--
					Instances whose module is in no subject group. Not a special case one could argue
					away: a locally created module — that is how a short-notice FWP is registered —
					comes into the world without a subject group, and without this tab it fell out of
					every selection. Only for the two roles that may staff it via the
					programme.
				-->
				<button
					type="submit"
					name="fachgruppe"
					value={UNFILED}
					role="tab"
					aria-selected={unfiled}
					class="tab whitespace-nowrap {unfiled ? 'tab-active' : ''}"
					title="Instanzen, deren Modul noch keiner Fachgruppe zugeordnet ist"
				>
					ohne Fachgruppe
				</button>
			{/if}
		</div>
	</form>

	{#if tab === null}
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
			The view: only bachelor or only master, and grouped by programme on request. Both only
			cut what the page has already loaded — for a subject group like WI, whose lead staffs
			bachelor and master modules separately.
		-->
		<form method="GET" class="mt-5 flex flex-wrap items-end gap-3">
			{@render carriedOver(['abschluss', 'nach'])}
			<label class="form-control">
				<span class="label-text text-sm">Abschluss</span>
				<select
					name="abschluss"
					aria-label="Abschluss"
					class="select select-bordered select-sm"
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				>
					<option value="">alle</option>
					{#each ALL_DEGREES as degree (degree)}
						<option value={degreeParam(degree)} selected={data.selected.degree === degree}>
							{DEGREE_LABELS[degree]}
						</option>
					{/each}
				</select>
			</label>
			<label class="form-control">
				<span class="label-text text-sm">Gruppiert nach</span>
				<select
					name="nach"
					aria-label="Gruppiert nach"
					class="select select-bordered select-sm"
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				>
					<option value="">Modul</option>
					<option value="studiengang" selected={data.selected.byProgramme}>Studiengang</option>
				</select>
			</label>
			<noscript><button type="submit" class="btn btn-sm">Anzeigen</button></noscript>
		</form>

		{#if withoutDegree.length > 0}
			<p class="text-base-content/80 mt-2 max-w-prose text-sm">
				<span class="badge badge-warning badge-sm align-middle">Abschluss fehlt</span>
				Ohne eingetragenen Abschluss und deshalb nicht im Filter:
				{withoutDegree.map((p) => programmeLabel(p)).join(', ')}. Den Abschluss trägt das Dekanat
				unter <a class="link" href={resolve('/verwaltung/studiengaenge')}>Studiengänge</a> ein.
			</p>
		{/if}

		<!--
			The switch for this subject group's wish phase. Its own form and its own action: saving
			the table is a bundle of small decisions, this is a decision about the round itself —
			and an accidental click should not travel along with every automatic save.
		-->
		<!--
			The parameters are in the action URL, not only in the body. Without `use:enhance` the
			browser really navigates to `?/window` — and that replaces the page's query string, so
			afterwards one lands on the planning semester without a semester and without a subject
			group. The body carries them anyway, because the action reads them from there.
		-->
		{#if hasWishRound && data.group}
			<form method="POST" action={actionUrl('window')} class="mt-5">
				<input type="hidden" name="semester" value={data.semester.code} />
				<input type="hidden" name="fachgruppe" value={data.group.id} />
				<input type="hidden" name="open" value={roundOpen ? 'false' : 'true'} />
				<div class="alert {roundOpen ? 'alert-info' : 'alert-warning'}">
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
		{:else}
			<div class="alert alert-info mt-5 max-w-prose">
				<span>
					Diese Instanzen gehören zu Modulen, die noch <strong>keiner Fachgruppe</strong>
					zugeordnet sind — so kommt ein lokal angelegtes Modul auf die Welt. Besetzen lässt sich das
					über den Studiengang. Eine Wunschrunde haben sie nicht: die gehört einer Fachgruppe, und ohne
					Fachgruppe ist sie immer offen. Einsortieren im
					<a class="link" href={resolve('/module')}>Modulkatalog</a>.
				</span>
			</div>
		{/if}

		<form method="GET" class="mt-5 flex flex-wrap items-end gap-2">
			{@render carriedOver(['q'])}
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

		{#if showGaps && gaps.length > 0}
			<!--
				No number, no colouring, no sorting by it — the names of the tracks and nothing
				else. Visible only to the lead of this subject group, who reads the entries on
				them anyway.
			-->
			<div class="border-base-300 bg-base-100 mt-5 max-w-prose rounded-lg border p-4">
				<h2 class="font-medium">Noch ohne Interesse</h2>
				<p class="text-base-content/80 mt-1 text-sm">
					Auf diese Züge hat sich bisher niemand eingetragen — derselbe Stand, der unten in den
					Auswahllisten steht, nur zusammengefasst. Sichtbar ist er Dir, weil Du die Eintragungen
					dieser Fachgruppe ohnehin liest; für alle anderen bleiben sie bis zur Veröffentlichung
					unsichtbar.
				</p>
				<ul class="mt-2 flex flex-col gap-1">
					{#each gaps as instance (instance.id)}
						<li class="text-sm">
							<span class="font-mono font-medium"
								>{withTopic(cohortLabel(instance), instance.topic)}</span
							>
							<span class="text-base-content/90">— {instance.module.name}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if groups.length === 0 && data.selected.degree !== null && tabInstances.length > 0}
			<div class="card bg-base-200 mt-4 max-w-prose">
				<div class="card-body">
					<h2 class="card-title text-base">Nichts zu besetzen</h2>
					<p>
						Im Abschluss <strong>{DEGREE_LABELS[data.selected.degree]}</strong> hat
						<strong>{data.group?.name ?? 'diese Auswahl'}</strong> in diesem Semester keine Instanz. Mit
						„alle“ stehen die übrigen wieder da.
					</p>
				</div>
			</div>
		{:else if groups.length === 0}
			<div class="card bg-base-200 mt-4 max-w-prose">
				<div class="card-body">
					<h2 class="card-title text-base">Nichts zu besetzen</h2>
					<p>
						Für <strong>{data.group?.name ?? 'Module ohne Fachgruppe'}</strong> ist in diesem
						Semester keine Instanz mit Teilen angemeldet. Das ist eine Aussage über den Bedarf,
						nicht über die Zuteilung — auf der
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
				action={actionUrl('save')}
				bind:this={formElement}
				onchange={(event) => {
					if (inRowMenu(event.target)) return;
					harmonise(event.target);
					saveNow();
				}}
				oninput={(event) => {
					if (!inRowMenu(event.target)) dirty = true;
				}}
				onfocusout={(event) => {
					if (!inRowMenu(event.target)) saveIfDirty();
				}}
				use:trackSaves={{
					waiting: () => open && (dirty || queued),
					flush: saveNow,
					submit: ({ action }) => {
						saving = true;
						const fromMenu = !action.search.startsWith('?/save');
						return async ({ update }) => {
							// reset:false — a reset puts every field back to its rendered default, which
							// is the state before the save rather than after it.
							await update({ reset: false });
							if (fromMenu) closeRowMenus();
							saving = false;
							savedOnce = true;
							if (queued) {
								queued = false;
								saveNow();
							}
						};
					}
				}}
			>
				<!-- The action's query string replaces the page's, so the semester has to travel in
				     the body. Reading it from the URL in the action looked right and silently
				     saved nothing. -->
				<input type="hidden" name="semester" value={data.semester.code} />

				<!--
					One table for the whole subject group, not one per cohort.

					The module is written once at the head of its cohorts and the rows underneath carry only
					the cohort — "Softwareentwicklung II" three times over is three chances to read it as
					three different things. The parts are rows too, hidden until somebody asks for them.
				-->
				<div class="mt-6 overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th class="w-64">Modul</th>
								<th class="w-24">Zug</th>
								<th class="w-20 text-right">SWS</th>
								<th class="w-80">Wer</th>
								<th>Notiz</th>
								<th class="w-24 text-right">Teile</th>
							</tr>
						</thead>
						{#each sections as section (section.programme?.code ?? '')}
							{#if section.programme}
								<!-- One heading per programme when grouped by it. A tbody of its own, because
								     every track below it needs its own. -->
								<tbody class="border-base-300 border-t-2">
									<tr>
										<th colspan="6" scope="colgroup" class="bg-base-200 pt-4 text-base">
											{programmeLabel(section.programme)} ·
											{section.programme.degree
												? DEGREE_LABELS[section.programme.degree]
												: 'Abschluss nicht eingetragen'}
										</th>
									</tr>
								</tbody>
							{/if}
							{#each section.blocks as block (block.id)}
								{#each block.cohorts as group, position (group.instance.id)}
									{@const wishesHere = data.wishes.filter(
										(w) => w.instance.id === group.instance.id
									)}
									{@const pooled = pooledInstances(group.instance)}
									{@const held = group.rows
										.map((row) => row.assignment)
										.filter((a): a is AssignmentLike => a !== null)}
									<!-- One candidate list for the whole cohort, so that a name offered for the
								     lecture is offered for its laboratories too. The cohort is filled by one
								     dropdown; a list that differed between the rows could not be written down
								     onto them. -->
									{@const candidates = candidatesFor(
										pooled.ids,
										wishesHere,
										members,
										data.found,
										held,
										pooled.programmes,
										data.competences.filter((c) => c.module.id === group.instance.module.id)
									)}
									<!-- What the cohort's own dropdown stands for: our share of it. A part
								     another faculty teaches is arranged, not staffed. -->
									{@const own = ownRows(group.rows)}
									{@const elsewhere = facultiesElsewhere(group.instance.parts)}
									{@const shared = commonValue(own)}
									{@const sharedNote = commonNote(own)}
									{@const refusals = group.rows
										.map((row) => refusalFor.get(row.part.id))
										.filter((message) => message !== undefined)}
									{@const divisible = group.rows.length > 1}
									{@const split = expandedFor(
										group.instance.id,
										shared === null || refusals.length > 0 || isArranged(group.rows)
									)}
									<!--
									A tbody per cohort, which is what scopes the disclosure below: the part rows
									are shown by `tbody:has(.split-toggle:checked)`, so the checkbox reaches its own
									parts and no others. A checkbox rather than a <details> because <details> cannot
									hold table rows — and rather than a button, because this way the fold works with
									no JavaScript, exactly like the rest of the screen.
								-->
									<tbody
										data-cohort={group.instance.id}
										class="border-base-300 {position === 0 ? 'border-t-2' : 'border-t'}"
									>
										<tr>
											<td class="align-top font-medium">
												{position === 0 ? block.name : ''}
												{#if position === 0 && block.projectBased}
													<span
														class="badge badge-secondary badge-sm ml-1 align-middle"
														title="Projektbasierte Lehrveranstaltung — wird zuletzt vergeben"
														>PBLV</span
													>
												{/if}
												<!-- Which parts the cohort's dropdown stands for. The server writes one
											     choice onto all of them, and reading them out of the form is what lets
											     it do that without any JavaScript on this page. -->
												<input
													type="hidden"
													name="parts:{group.instance.id}"
													value={own.map((row) => row.part.id).join(',')}
												/>
											</td>
											<td class="align-top font-medium whitespace-nowrap">
												{group.label}
												<!-- Only for the lead of this group, who reads every entry on it anyway —
											     the same three conditions as the list above. A badge rather than a
											     tint: semantic colours are background colours here. -->
												{#if showGaps && isWideOpen(wishesHere, held, own.length > 0)}
													<span
														class="badge badge-warning badge-sm mt-1 block w-fit"
														title="Noch kein Wunsch und noch niemand eingeteilt">ganz offen</span
													>
												{/if}
											</td>
											<td class="align-top text-right whitespace-nowrap">
												{hoursLabel(group.instance.teachingHours)}
											</td>
											<td>
												{#if own.length === 0}
													<!-- Nothing here is ours to fill. Said rather than left blank, or the
												     cohort reads as one nobody has staffed yet. -->
													<span class="badge badge-ghost whitespace-normal">
														hält {elsewhere.join(', ')}
													</span>
												{:else}
													<select
														name="all:{group.instance.id}"
														class="select select-bordered select-sm w-full"
														aria-label="Wer hält alle Teile von {block.name} in {group.label}"
														disabled={!open}
														value={shared ?? MIXED_CHOICE}
													>
														<option value="">— nicht besetzt —</option>
														<!-- "Lass jeden Teil bei dem, der ihn hat." Always offered, because the
												     dropdown has to be able to *show* it: a cohort whose parts are held
												     by different people has no one name to put here. -->
														<option value={MIXED_CHOICE}>— je Teil verschieden —</option>
														{#each candidates as candidate (candidateValue(candidate))}
															<option value={candidateValue(candidate)}>
																{candidateLabel(candidate, desired, load)}
															</option>
														{/each}
													</select>
													{#if elsewhere.length > 0}
														<p class="text-base-content/80 mt-1 text-xs">
															Ein Teil hält {elsewhere.join(', ')}.
														</p>
													{/if}
												{/if}
												{#if wishesHere.length > 0}
													<p class="text-base-content/80 mt-1 text-xs">
														Eingetragen: {wishesHere.map((w) => w.person.name).join(', ')}
													</p>
												{/if}
												<!-- A refusal belongs to a part, and the parts may be folded away. Where
											     they are, it is said here instead of nowhere. -->
												{#if !split}
													{#each [...new Set(refusals)] as message (message)}
														<span class="badge badge-error mt-1 whitespace-normal">{message}</span>
													{/each}
												{/if}
											</td>
											<td>
												<!-- Only where the parts carry the same note: where they do not, there is
											     no one note to edit, and a field showing an empty one would claim
											     otherwise. -->
												{#if own.length === 0}
													<!-- No note to give: nobody here holds anything. -->
												{:else if sharedNote !== null}
													<input
														type="text"
														name="allnote:{group.instance.id}"
														value={sharedNote}
														maxlength="500"
														placeholder="z. B. vertretungsweise"
														class="input input-bordered input-sm w-full"
														aria-label="Notiz zu allen Teilen von {block.name} in {group.label}"
														disabled={!open}
													/>
												{:else}
													<span class="text-base-content/80 text-xs">Notizen stehen je Teil.</span>
												{/if}
												<!-- How the cohort is taught, for all of its parts. The originals travel
											     beside the controls: an unticked box sends nothing, and the save only
											     writes a cohort whose controls differ from what was drawn. -->
												{#if group.instance.delivery}
													{@const formatRefusal = refusalFor.get(`format:${group.instance.id}`)}
													<input
														type="hidden"
														name="fmt0:{group.instance.id}"
														value={group.instance.delivery}
													/>
													<input
														type="hidden"
														name="en0:{group.instance.id}"
														value={String(group.instance.taughtInEnglish ?? false)}
													/>
													<div class="mt-1 flex flex-wrap items-center gap-3">
														<select
															name="fmt:{group.instance.id}"
															class="select select-bordered select-xs"
															aria-label="Durchführung von {block.name} in {group.label}"
															disabled={!open}
															value={group.instance.delivery}
														>
															{#each Object.entries(DELIVERY_LABELS) as [value, label] (value)}
																<option {value}>{label}</option>
															{/each}
														</select>
														<label
															class="flex items-center gap-1 text-xs"
															title={group.instance.taughtInEnglishOverridden
																? 'Für diesen Zug festgelegt.'
																: 'Wie im Modulkatalog des ZPA angegeben, sonst Deutsch.'}
														>
															<input
																type="checkbox"
																name="en:{group.instance.id}"
																value="true"
																class="checkbox checkbox-xs"
																aria-label="{block.name} in {group.label} auf Englisch"
																disabled={!open}
																checked={group.instance.taughtInEnglish}
															/>
															Englisch
															{#if !group.instance.taughtInEnglishOverridden}
																<span class="text-base-content/70">(Standard)</span>
															{/if}
														</label>
													</div>
													{#if formatRefusal}
														<span class="badge badge-error mt-1 whitespace-normal"
															>{formatRefusal}</span
														>
													{/if}
												{/if}
												<!-- Which seminar the cohort is, for an umbrella module planned as one cohort
											     per seminar: the title is often settled with the lecturer at the
											     staffing. Only where the module has several cohorts here or a topic is
											     already set, like on the demand page. -->
												{#if (cohortsOfModule.get(block.id) ?? 0) > 1 || group.instance.topic}
													{@const topicRefusal = refusalFor.get(`topic:${group.instance.id}`)}
													<input
														type="hidden"
														name="topic0:{group.instance.id}"
														value={group.instance.topic ?? ''}
													/>
													<input
														type="text"
														name="topic:{group.instance.id}"
														value={group.instance.topic ?? ''}
														maxlength={MAX_TOPIC_LENGTH}
														placeholder="Thema"
														title="Welches Seminar dieser Zug ist, etwa bei einem Sammelmodul."
														class="input input-bordered input-xs mt-1 w-full"
														aria-label="Thema von {block.name} in {group.label}"
														disabled={!open}
													/>
													{#if topicRefusal}
														<span class="badge badge-error mt-1 whitespace-normal"
															>{topicRefusal}</span
														>
													{/if}
												{/if}
											</td>
											<td class="align-top text-right">
												<div class="flex items-center justify-end gap-2">
													{#if divisible}
														<label
															class="flex items-center justify-end gap-1 text-xs whitespace-nowrap"
															title={partsSummary(group.rows)}
														>
															<input
																type="checkbox"
																class="split-toggle checkbox checkbox-xs"
																aria-label="Die {group.rows
																	.length} Teile von {group.label} einzeln besetzen"
																checked={split}
																onchange={(event) =>
																	(expanded[group.instance.id] = event.currentTarget.checked)}
															/>
															{group.rows.length} Teile
														</label>
													{/if}
													{#if open}
														{@render rowMenu(group, block.name)}
													{/if}
												</div>
											</td>
										</tr>

										{#if divisible}
											{#each group.rows as row (row.part.id)}
												{@const refusal = refusalFor.get(row.part.id)}
												<!-- Rendered whether or not they are shown: the save carries every field,
											     and it is that which lets the cohort's dropdown and the parts be
											     ranked by what they say. -->
												<tr class="hidden [tbody:has(.split-toggle:checked)_&]:table-row">
													<td class="text-base-content/80 pl-8 align-top text-sm">
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
													<td></td>
													<td class="align-top text-right text-sm whitespace-nowrap">
														{partHours(row.part)}
													</td>
													<td>
														{#if row.part.taughtBy}
															<!-- Another faculty's: no dropdown, because there is nobody here to
														     put on it, and the backend would refuse a name. -->
															<span class="badge badge-ghost whitespace-normal">
																hält {row.part.taughtBy}
															</span>
														{:else}
															<!-- The value is `p:<id>` or `t:<id>`; the backend takes exactly one
													     of the two and canonicalises a teacher who has an account. -->
															<select
																name="who:{row.part.id}"
																class="select select-bordered select-sm w-full"
																aria-label="Wer hält {row.heading} in {group.label}, {block.name}"
																disabled={!open}
																value={currentValue(row.assignment)}
															>
																<option value="">— nicht besetzt —</option>
																{#each candidates as candidate (candidateValue(candidate))}
																	<option value={candidateValue(candidate)}>
																		{candidateLabel(candidate, desired, load)}
																	</option>
																{/each}
															</select>
														{/if}
														{#if refusal}
															<span class="badge badge-error mt-1 whitespace-normal">{refusal}</span
															>
														{/if}
													</td>
													<td>
														{#if !row.part.taughtBy}
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
														{/if}
													</td>
													<td></td>
												</tr>
											{/each}
										{/if}
									</tbody>
								{/each}
							{/each}
						{/each}
					</table>
				</div>

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

<!--
	The exception to the exception, behind a cog: splitting a part — the lecture half with
	us, half with another faculty — and leaving a part to another faculty.

	A popover and not a dropdown list, for the same reason as in the demand planning: the
	table sits in `overflow-x-auto`, and a dropdown would be cut off at the edge. Without
	JavaScript: the browser does the opening via `popovertarget`, and the buttons belong to
	the table's form, with their own `formaction`. The fields inside carry the part in their
	name, because they travel along with every submission of the table and only those
	belonging to the pressed button are read.

	Deliberately without the words of the table row in the buttons: the content is hidden
	but is in the document, and a second „3 Teile“ would make every locator on it ambiguous.
	-->
{#snippet carriedOver(own: readonly string[])}
	{#each filterFields as field (field.name)}
		{#if !own.includes(field.name) && field.value !== ''}
			<input type="hidden" name={field.name} value={field.value} />
		{/if}
	{/each}
{/snippet}

{#snippet rowMenu(group: CohortGroup, moduleName: string)}
	{@const menuId = `part-menu-${group.instance.id}`}
	<button
		type="button"
		class="btn btn-xs"
		popovertarget={menuId}
		aria-label="Teile von {moduleName} in {group.label} aufteilen oder abgeben"
		title="Aufteilen oder an eine andere Fakultät abgeben"
	>
		<GearIcon class="size-4" />
	</button>
	<div
		id={menuId}
		popover="auto"
		class="border-base-300 bg-base-100 text-base-content m-auto w-[min(32rem,92vw)] rounded-lg border p-4 text-left shadow-lg backdrop:bg-neutral/30"
	>
		<div class="flex flex-col gap-3 text-sm">
			<div class="flex items-start justify-between gap-2">
				<h3 class="font-medium">{moduleName} · {group.label}</h3>
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					popovertarget={menuId}
					popovertargetaction="hide"
					aria-label="Menü schließen"
				>
					✕
				</button>
			</div>
			<p class="text-base-content/80">
				Für den Ausnahmefall: einen Teil zwischen zwei Personen aufteilen, oder einen Teil einer
				anderen Fakultät überlassen. Die SWS der Instanz bleiben dabei gleich; was eine andere
				Fakultät hält, wird hier nicht besetzt und zählt nicht zum SWS-Controlling.
			</p>

			{#each group.rows as row (row.part.id)}
				{@const half = divisionDefault(row.part)}
				<section class="border-base-300 flex flex-col gap-2 border-t pt-2">
					<h4 class="font-medium">
						{row.heading}
						<span class="text-base-content/80 font-normal">· {partHours(row.part)}</span>
					</h4>

					{#if row.part.taughtBy}
						<div class="flex flex-wrap items-center gap-2">
							<span>Hält {row.part.taughtBy}.</span>
							<button
								type="submit"
								formaction={actionUrl('taughtBy')}
								name="clearPart"
								value={row.part.id}
								class="btn btn-xs"
							>
								Wieder selbst halten
							</button>
						</div>
					{:else}
						{#if half !== null && row.part.teachingHours != null && row.part.teachingHours > 0.25}
							<div class="flex flex-wrap items-center gap-2">
								<label class="flex items-center gap-1">
									<input
										type="number"
										name="divide:{row.part.id}"
										value={half}
										min="0.25"
										max={row.part.teachingHours - 0.25}
										step="0.25"
										class="input input-bordered input-xs w-20"
										aria-label="SWS, die von {row.heading} abgetrennt werden"
									/>
									SWS
								</label>
								<button
									type="submit"
									formaction={actionUrl('divide')}
									name="partId"
									value={row.part.id}
									class="btn btn-xs"
								>
									abtrennen
								</button>
							</div>
							{#if row.assignment}
								<p class="text-base-content/80 text-xs">
									{row.assignment.assignee.name} behält dann den Rest.
								</p>
							{/if}
						{/if}

						<div class="flex flex-wrap items-center gap-2">
							<input
								type="text"
								name="taughtBy:{row.part.id}"
								maxlength="80"
								placeholder="z. B. FK 04"
								class="input input-bordered input-xs w-32"
								aria-label="Fakultät, die {row.heading} hält"
							/>
							<button
								type="submit"
								formaction={actionUrl('taughtBy')}
								name="partId"
								value={row.part.id}
								class="btn btn-xs"
								disabled={row.assignment !== null}
								title={row.assignment !== null
									? 'Erst die Zuteilung lösen — besetzte Teile werden nicht abgegeben.'
									: undefined}
							>
								an andere Fakultät
							</button>
						</div>
					{/if}

					{#if row.part.dividedFrom}
						<div>
							<button
								type="submit"
								formaction={actionUrl('rejoin')}
								name="partId"
								value={row.part.id}
								class="btn btn-xs"
								disabled={row.assignment !== null}
							>
								wieder zusammenführen
							</button>
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</div>
{/snippet}
