<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteSet, SvelteURL, SvelteURLSearchParams } from 'svelte/reactivity';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import { askBeforeLeave, autosave } from '$lib/saveOnLeave';
	import { ALL_ROLES, ROLE_HINTS, ROLE_LABELS, displayName, sortRoles } from '$lib/roles';
	import { nextSort, sortRows, type SortState } from '$lib/sorting';
	import {
		ACCOUNT_STATES,
		ACCOUNT_STATE_LABELS,
		EMPLOYMENTS,
		EMPLOYMENT_LABELS,
		FACULTY_UNKNOWN,
		FACULTY_UNKNOWN_LABEL,
		TEACHING_LABELS,
		TEACHING_STATES,
		accountState,
		canBeAdmitted,
		employmentsOf,
		facetCounts,
		facultiesIn,
		facultyOf,
		filterTeacherAccounts,
		hiddenBy,
		parseTeacherFilter,
		programmesAfterToggle,
		rolesAfterToggle,
		rolesOf,
		teacherFilterParams,
		type TeacherAccountRow,
		type TeacherFilter
	} from '$lib/teacherAccounts';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Which row is currently expanded, on the accounts tab. An expandable row rather than a
	// detail page: setting roles means comparing them with everybody else's, and for that the
	// list has to stay put.
	let editing = $state<string | null>(null);

	// The filter comes from the address until somebody touches a checkbox, and from the
	// checkboxes afterwards.
	//
	// That is what makes the two paths one: without JavaScript the same checkboxes submit
	// themselves as a GET and the server renders the narrowed list. With it, a click narrows the
	// rows already here and rewrites the address to match, so that a reload — or a link somebody
	// pastes into a mail — shows what the screen shows. The two never disagree, because the one
	// function that sets `selected` is the one that writes the address.
	//
	// Shallow routing does not update `page.url`, which is why the selection cannot simply be
	// derived from it: the address would be right and the table would not move.
	let filterForm = $state<HTMLFormElement | undefined>(undefined);
	let selected = $state<TeacherFilter | null>(null);
	const filter = $derived(selected ?? parseTeacherFilter(page.url.searchParams));

	// Which switches are in flight, by the row they belong to. Only for the spinner: the answer
	// is the reload, not this.
	const saving = new SvelteSet<string>();

	const accounts = $derived(data.accounts as TeacherAccountRow[]);
	// Only by name: the other columns change with the toggles in them, and a row that jumped away
	// on every click would be a row nobody can finish editing.
	let teacherSort = $state<SortState<'name'>>(null);
	const shown = $derived(
		sortRows(filterTeacherAccounts(accounts, filter), teacherSort, {
			name: (row) => row.teacher.sortName
		})
	);
	let personSort = $state<SortState<'name'>>(null);
	const people = $derived(
		sortRows(data.people, personSort, {
			name: (person) => person.sortName ?? displayName(person)
		})
	);
	const faculties = $derived(facultiesIn(accounts));
	const facultyCounts = $derived(facetCounts(accounts, (row) => [facultyOf(row)]));
	const employmentCounts = $derived(facetCounts(accounts, employmentsOf));
	const teachingCounts = $derived(
		facetCounts(accounts, (row) => [row.teacher.active ? 'ACTIVE' : 'FORMER'])
	);
	const accountCounts = $derived(facetCounts(accounts, (row) => [accountState(row)]));
	const roleCounts = $derived(facetCounts(accounts, rolesOf));
	const activeProgrammes = $derived(data.programmes.filter((programme) => programme.active));

	/** Read the checkboxes back out of the form and put them in the address. */
	function applyFilter() {
		if (!filterForm) return;
		const params = new SvelteURLSearchParams();
		for (const [name, value] of new FormData(filterForm)) {
			params.append(name, String(value));
		}
		// Through parse and back, so that the address carries the same shape the server would
		// write and an unknown value cannot survive a click.
		selected = parseTeacherFilter(params);
		const next = new SvelteURL(page.url);
		next.search = String(teacherFilterParams(selected));
		// `resolve()` is wrong here — it builds a route, and this is the route we are already on
		// with a different query string. The address is taken from page.url, so it carries
		// whatever base path the app is served under; there is nothing for resolve() to add, and
		// replaceState cannot navigate anywhere in the first place.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(next, page.state);
	}

	/** The `enhance` callback every switch shares: save, reload, stop spinning. */
	function save(key: string) {
		return () => {
			saving.add(key);
			return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
				// reset: false, so that nothing in the filter form is cleared under the reader.
				await update({ reset: false });
				saving.delete(key);
			};
		};
	}

	/** Whether the last refusal was about this row. */
	function refusalFor(row: TeacherAccountRow): string | null {
		if (!form || !('error' in form) || !form.error) return null;
		const id = 'id' in form ? form.id : '';
		return id === row.teacher.id || (row.account && id === row.account.id) ? form.error : null;
	}

	const globalRefusal = $derived(
		form && 'error' in form && form.error && (!('id' in form) || form.id === '') ? form.error : null
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Personen und Rollen</h1>
		<p class="text-base-content/80 text-sm">
			Wer sich bei Tallox anmelden darf, und was dann erlaubt ist. Ohne Eintrag hier kommt niemand
			hinein — auch nicht mit gültiger HM-Kennung.
		</p>
	</div>

	<!-- A GET form *around* the bar, and the tabs are its submit buttons: a
	     `<button name="ansicht" value="…">` sends exactly its own pair. As links it would
	     not work — `resolve()` only knows the path, and the selection is in the query string.

	     The form belongs on the outside and not around each button: daisyUI styles the tabs
	     via `.tabs > .tab`, so the button has to be a real child of the bar. With a form in
	     between the selector does not match, the tabs lose their padding and their selected
	     state — and the two labels stick together into one word.
	     `display: contents` does not help against that: it changes the layout, not the tree. -->
	<form method="GET">
		<div role="tablist" class="tabs tabs-box w-fit">
			<button
				type="submit"
				name="ansicht"
				value="zpa"
				role="tab"
				class="tab {data.view === 'zpa' ? 'tab-active' : ''}"
				aria-selected={data.view === 'zpa'}>Aus dem ZPA</button
			>
			<button
				type="submit"
				name="ansicht"
				value="konten"
				role="tab"
				class="tab {data.view === 'konten' ? 'tab-active' : ''}"
				aria-selected={data.view === 'konten'}>Alle Konten</button
			>
		</div>
	</form>

	{#if globalRefusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{globalRefusal}
			</p>
		</div>
	{/if}

	{#if data.view === 'zpa'}
		<p class="text-base-content/80 text-sm">
			Die Lehrenden, wie sie das ZPA veröffentlicht. Ein Klick auf <em>Konto</em> legt den Zugang an
			und vergibt <em>Dozierende</em>; jeder weitere Klick wird sofort gespeichert. Wer hier fehlt,
			aber ein Konto braucht — Dekanat, Sekretariat, Externe — steht unter
			<em>Alle Konten</em>.
		</p>

		<form
			bind:this={filterForm}
			method="GET"
			onchange={applyFilter}
			class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4"
		>
			<input type="hidden" name="filter" value="1" />

			<div class="flex flex-wrap items-end gap-3">
				<label class="form-control">
					<span class="label-text text-sm">Suchen</span>
					<input
						name="q"
						type="search"
						value={filter.search}
						placeholder="Name oder Adresse"
						class="input input-bordered input-sm"
					/>
				</label>
				<button type="submit" class="btn btn-sm">Anwenden</button>
			</div>

			<fieldset class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<legend class="sr-only">Fakultät</legend>
				<span class="text-base-content/80 w-24 text-sm">Fakultät</span>
				{#each faculties as faculty (faculty)}
					<label class="flex items-center gap-1 text-sm">
						<input
							type="checkbox"
							name="fk"
							value={faculty}
							checked={filter.faculty.includes(faculty)}
							class="checkbox checkbox-sm"
						/>
						{faculty === FACULTY_UNKNOWN ? FACULTY_UNKNOWN_LABEL : faculty}
						<span class="text-base-content/80">({facultyCounts.get(faculty) ?? 0})</span>
					</label>
				{/each}
			</fieldset>

			<fieldset class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<legend class="sr-only">Beschäftigung</legend>
				<span class="text-base-content/80 w-24 text-sm">Art</span>
				{#each EMPLOYMENTS as employment (employment)}
					<label class="flex items-center gap-1 text-sm">
						<input
							type="checkbox"
							name="art"
							value={employment}
							checked={filter.employment.includes(employment)}
							class="checkbox checkbox-sm"
						/>
						{EMPLOYMENT_LABELS[employment]}
						<span class="text-base-content/80">({employmentCounts.get(employment) ?? 0})</span>
					</label>
				{/each}
			</fieldset>

			<fieldset class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<legend class="sr-only">Lehrt laut ZPA</legend>
				<span class="text-base-content/80 w-24 text-sm">Status</span>
				{#each TEACHING_STATES as state (state)}
					<label class="flex items-center gap-1 text-sm">
						<input
							type="checkbox"
							name="lehrt"
							value={state}
							checked={filter.teaching.includes(state)}
							class="checkbox checkbox-sm"
						/>
						{TEACHING_LABELS[state]}
						<span class="text-base-content/80">({teachingCounts.get(state) ?? 0})</span>
					</label>
				{/each}
			</fieldset>

			<fieldset class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<legend class="sr-only">Konto</legend>
				<span class="text-base-content/80 w-24 text-sm">Konto</span>
				{#each ACCOUNT_STATES as state (state)}
					<label class="flex items-center gap-1 text-sm">
						<input
							type="checkbox"
							name="konto"
							value={state}
							checked={filter.account.includes(state)}
							class="checkbox checkbox-sm"
						/>
						{ACCOUNT_STATE_LABELS[state]}
						<span class="text-base-content/80">({accountCounts.get(state) ?? 0})</span>
					</label>
				{/each}
			</fieldset>

			<!-- A line of its own, not after the account states: only somebody with an account
			     has a role, and in a shared line it read like eight checkboxes of equal rank. With
			     counts after them, as in every other line — „Administration (2)“ is the answer to
			     the question with which one touches this filter in the first place. -->
			<fieldset class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<legend class="sr-only">Rolle</legend>
				<span class="text-base-content/80 w-24 text-sm">Rolle</span>
				{#each ALL_ROLES as role (role)}
					<label class="flex items-center gap-1 text-sm">
						<input
							type="checkbox"
							name="rolle"
							value={role}
							checked={filter.roles.includes(role)}
							class="checkbox checkbox-sm"
						/>
						{ROLE_LABELS[role]}
						<span class="text-base-content/80">({roleCounts.get(role) ?? 0})</span>
					</label>
				{/each}
			</fieldset>
		</form>

		<!--
			How many rows the pre-filter is currently removing. Without this sentence a list
			pre-filtered to FK07 looks exactly like a complete one — more than half of the
			teachers have no faculty stated at all.
		-->
		<p class="text-base-content/90 text-sm">
			<strong>{shown.length}</strong> von {accounts.length} Lehrenden.
			{#if hiddenBy(accounts, filter, 'faculty') > 0}
				<span class="badge badge-warning badge-sm ml-1">
					{hiddenBy(accounts, filter, 'faculty')} weitere mit anderer oder ohne Fakultätsangabe
				</span>
			{/if}
			{#if hiddenBy(accounts, filter, 'employment') > 0}
				<span class="badge badge-ghost badge-sm ml-1">
					{hiddenBy(accounts, filter, 'employment')} weitere mit anderer Beschäftigung
				</span>
			{/if}
			{#if hiddenBy(accounts, filter, 'teaching') > 0}
				<span class="badge badge-ghost badge-sm ml-1">
					{hiddenBy(accounts, filter, 'teaching')} weitere, die laut ZPA nicht mehr lehren
				</span>
			{/if}
		</p>

		<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
			<table class="table table-sm">
				<thead>
					<tr>
						<SortHeader
							label="Lehrperson"
							key="name"
							sort={teacherSort}
							onsort={(key) => (teacherSort = nextSort(teacherSort, key))}
						/>
						<th>Konto</th>
						<th>Rechte</th>
					</tr>
				</thead>
				<tbody>
					{#each shown as row (row.teacher.id)}
						{@const state = accountState(row)}
						{@const account = row.account}
						{@const refusal = refusalFor(row)}
						<tr>
							<td class="align-top">
								<div class="font-medium">{row.teacher.sortName}</div>
								<div class="text-base-content/80 font-mono text-xs">
									{row.teacher.mail ?? '— keine Adresse im ZPA —'}
								</div>
								<div class="mt-1 flex flex-wrap gap-1">
									<span class="badge badge-ghost badge-sm">
										{facultyOf(row) === FACULTY_UNKNOWN ? FACULTY_UNKNOWN_LABEL : facultyOf(row)}
									</span>
									{#each employmentsOf(row) as employment (employment)}
										<span class="badge badge-ghost badge-sm">{EMPLOYMENT_LABELS[employment]}</span>
									{/each}
									{#if !row.teacher.active}
										<span
											class="badge badge-warning badge-sm"
											title="Das ZPA führt diese Person nicht mehr als lehrend"
										>
											lehrt nicht mehr
										</span>
									{/if}
								</div>
							</td>

							<td class="align-top">
								{#if canBeAdmitted(row)}
									<form method="POST" action="?/admit" use:enhance={save(row.teacher.id)}>
										<input type="hidden" name="teacherId" value={row.teacher.id} />
										<input type="hidden" name="admitted" value={state === 'ACTIVE' ? '0' : '1'} />
										<button
											type="submit"
											role="switch"
											aria-checked={state === 'ACTIVE'}
											disabled={saving.has(row.teacher.id)}
											class="btn btn-xs {state === 'ACTIVE' ? 'btn-primary' : 'btn-outline'}"
										>
											{#if saving.has(row.teacher.id)}
												<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
											{/if}
											Konto
										</button>
									</form>
									{#if state === 'INACTIVE'}
										<div class="mt-1">
											<span class="badge badge-warning badge-sm">deaktiviert</span>
										</div>
									{/if}
								{:else}
									<span class="text-base-content/80 text-xs">
										ohne Adresse kein Konto möglich
									</span>
								{/if}
							</td>

							<td class="align-top">
								{#if account}
									<div class="flex flex-wrap gap-1">
										{#each ALL_ROLES as role (role)}
											{@const held = account.roles.includes(role)}
											<form method="POST" action="?/roles" use:enhance={save(account.id)}>
												<input type="hidden" name="id" value={account.id} />
												<!-- The whole desired set, not the change: that is exactly what
												     setPersonRoles accepts, and exactly why it loses no race against a
												     second administrator. -->
												{#each rolesAfterToggle(account.roles, role, !held) as wanted (wanted)}
													<input type="hidden" name="roles" value={wanted} />
												{/each}
												<button
													type="submit"
													role="switch"
													aria-checked={held}
													disabled={saving.has(account.id)}
													title={ROLE_HINTS[role]}
													class="btn btn-xs {held ? 'btn-primary' : 'btn-outline'}"
												>
													{ROLE_LABELS[role]}
												</button>
											</form>
										{/each}
									</div>

									{#if account.roles.includes('PROGRAMME_LEAD')}
										<div class="mt-2 flex flex-wrap items-center gap-1">
											<span class="text-base-content/80 text-xs">Studiengänge:</span>
											{#each activeProgrammes as programme (programme.code)}
												{@const assigned = account.programmes.some(
													(p) => p.code === programme.code
												)}
												<form method="POST" action="?/programmes" use:enhance={save(account.id)}>
													<input type="hidden" name="id" value={account.id} />
													{#each programmesAfterToggle(account.programmes, programme.code, !assigned) as wanted (wanted)}
														<input type="hidden" name="programmes" value={wanted} />
													{/each}
													<button
														type="submit"
														role="switch"
														aria-checked={assigned}
														disabled={saving.has(account.id)}
														title={programme.title}
														class="btn btn-xs {assigned ? 'btn-secondary' : 'btn-outline'}"
													>
														{programme.code}
													</button>
												</form>
											{/each}
											{#if account.programmes.length === 0}
												<!--
													Without a programme a programme lead may decide nothing at all — not, say,
													everything. That cannot be seen from the role list, and exactly this
													mix-up produces the support question.
												-->
												<span
													class="badge badge-warning badge-sm"
													title="Ohne Zuordnung kann diese Person für keinen Studiengang Bedarf festlegen"
												>
													kein Studiengang
												</span>
											{/if}
										</div>
									{/if}

									{#if account.roles.includes('PARTNER_READER')}
										<!-- Rare here: the list holds the ZPA's teachers, and a partner faculty's
										     colleagues are mostly created under "Konten". Offered all the same, so the
										     two tabs do not disagree about what a partner needs. -->
										<div class="mt-2 flex flex-wrap items-center gap-1">
											<span class="text-base-content/80 text-xs">Partner für:</span>
											{#each data.programmes as programme (programme.code)}
												{@const assigned = account.partnerProgrammes.some(
													(p) => p.code === programme.code
												)}
												<form method="POST" action="?/programmes" use:enhance={save(account.id)}>
													<input type="hidden" name="id" value={account.id} />
													<input type="hidden" name="role" value="PARTNER_READER" />
													{#each programmesAfterToggle(account.partnerProgrammes, programme.code, !assigned) as wanted (wanted)}
														<input type="hidden" name="programmes" value={wanted} />
													{/each}
													<button
														type="submit"
														role="switch"
														aria-checked={assigned}
														aria-label="Partner für {programme.code}"
														disabled={saving.has(account.id)}
														title={programme.title}
														class="btn btn-xs {assigned ? 'btn-secondary' : 'btn-outline'}"
													>
														{programme.code}
													</button>
												</form>
											{/each}
											{#if account.partnerProgrammes.length === 0}
												<span
													class="badge badge-warning badge-sm"
													title="Ohne Zuordnung liest diese Partnerfakultät nichts"
												>
													Partner ohne Studiengang
												</span>
											{/if}
										</div>
									{/if}
								{:else}
									<span class="text-base-content/80 text-sm">— kein Konto —</span>
								{/if}

								{#if refusal}
									<p class="text-base-content/90 mt-2 text-sm">
										<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
										{refusal}
									</p>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="3" class="text-base-content/80 text-sm">
								Niemand gefunden. Der Filter steht auf
								{filter.faculty.length > 0 ? filter.faculty.join(', ') : 'allen Fakultäten'}.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 flex items-center gap-2 font-medium">
				<span aria-hidden="true">➕</span> Person anlegen
			</h2>
			<p class="text-base-content/80 mb-3 text-sm">
				Für alle, die nicht in der ZPA-Lehrendenliste stehen. Die Mailadresse genügt — es muss die
				sein, die die HM-Anmeldung liefert. Name und Rollen kommen danach; eine neu angelegte Person
				hat noch gar keine.
			</p>

			<form
				method="POST"
				action="?/create"
				use:askBeforeLeave={{ label: 'Neues Konto' }}
				class="grid grid-cols-1 gap-3 sm:grid-cols-3"
			>
				<label class="form-control sm:col-span-1">
					<span class="label-text text-sm">Mailadresse</span>
					<input
						name="mail"
						type="email"
						required
						autocomplete="off"
						placeholder="vorname.nachname@hm.edu"
						class="input input-bordered input-sm w-full"
					/>
				</label>
				<label class="form-control sm:col-span-1">
					<span class="label-text text-sm">Name (optional)</span>
					<input
						name="name"
						type="text"
						autocomplete="off"
						class="input input-bordered input-sm w-full"
					/>
				</label>
				<div class="flex items-end">
					<button type="submit" class="btn btn-sm btn-primary">Anlegen</button>
				</div>
			</form>
		</div>

		<form method="GET" class="flex flex-wrap items-end gap-3">
			<input type="hidden" name="ansicht" value="konten" />
			<label class="form-control">
				<span class="label-text text-sm">Suchen</span>
				<input
					name="q"
					type="search"
					value={data.search}
					placeholder="Name oder Adresse"
					class="input input-bordered input-sm"
				/>
			</label>
			<label class="flex items-center gap-2 pb-1 text-sm">
				<input
					name="inaktiv"
					type="checkbox"
					value="1"
					checked={data.includeInactive}
					class="checkbox checkbox-sm"
				/>
				Deaktivierte anzeigen
			</label>
			<button type="submit" class="btn btn-sm">Anwenden</button>
		</form>

		<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
			<table class="table table-sm">
				<thead>
					<tr>
						<SortHeader
							label="Person"
							key="name"
							sort={personSort}
							onsort={(key) => (personSort = nextSort(personSort, key))}
						/>
						<th>Rollen</th>
						<th class="text-right">Ändern</th>
					</tr>
				</thead>
				<tbody>
					{#each people as person (person.id)}
						<tr>
							<td>
								<!-- Surname first where the ZPA knows it: the list is sorted by it, and a list
								     sorted by something it does not show reads like an unsorted one. For everybody
								     else the name as somebody wrote it — which of its words is the surname is not
								     guessed here. -->
								<div class="font-medium">{person.sortName ?? displayName(person)}</div>
								{#if person.sortName}
									<div class="text-base-content/80 text-xs">{person.name}</div>
								{/if}
								{#if person.name || person.sortName}
									<div class="text-base-content/80 font-mono text-xs">{person.mail}</div>
								{/if}
								{#if !person.active}
									<span class="badge badge-warning badge-sm mt-1">deaktiviert</span>
								{/if}
							</td>
							<td>
								{#if person.roles.length === 0}
									<span class="text-base-content/80 text-sm">— noch keine —</span>
								{:else}
									<div class="flex flex-wrap gap-1">
										{#each sortRoles(person.roles) as role (role)}
											<span class="badge badge-ghost badge-sm"
												>{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</span
											>
										{/each}
										{#if person.roles.includes('PROGRAMME_LEAD')}
											{#if person.programmes.length > 0}
												{#each person.programmes as programme (programme.code)}
													<span class="badge badge-primary badge-sm">{programme.code}</span>
												{/each}
											{:else}
												<span
													class="badge badge-warning badge-sm"
													title="Ohne Zuordnung kann diese Person für keinen Studiengang Bedarf festlegen"
												>
													kein Studiengang
												</span>
											{/if}
										{/if}
										{#if person.roles.includes('PARTNER_READER')}
											{#if person.partnerProgrammes.length > 0}
												{#each person.partnerProgrammes as programme (programme.code)}
													<span class="badge badge-ghost badge-sm" title="liest als Partnerfakultät"
														>{programme.code} (Partner)</span
													>
												{/each}
											{:else}
												<span
													class="badge badge-warning badge-sm"
													title="Ohne Zuordnung liest diese Partnerfakultät nichts"
												>
													Partner ohne Studiengang
												</span>
											{/if}
										{/if}
									</div>
								{/if}
							</td>
							<td class="text-right">
								<button
									class="btn btn-ghost btn-xs"
									aria-expanded={editing === person.id}
									onclick={() => (editing = editing === person.id ? null : person.id)}
								>
									{editing === person.id ? 'Schließen' : 'Bearbeiten'}
								</button>
							</td>
						</tr>

						{#if editing === person.id}
							<tr>
								<td colspan="3" class="bg-base-200/40">
									{#if form && 'error' in form && form.error && 'id' in form && form.id === person.id}
										<p class="text-base-content/90 py-2 text-sm">
											<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
											{form.error}
										</p>
									{/if}

									<!--
										Every tick saves itself, like the switches on the ZPA tab. The date does
										not: on its own it changes nothing, it only applies to roles ticked after
										it — so it is set first.
									-->
									<form
										method="POST"
										action="?/roles"
										use:autosave={{
											label: `Rollen von ${displayName(person)}`,
											accepts: (field) =>
												field instanceof HTMLInputElement && field.type === 'checkbox'
										}}
										class="flex flex-col gap-3 py-2"
									>
										<input type="hidden" name="id" value={person.id} />

										<fieldset class="flex flex-col gap-1">
											<legend class="mb-1 text-sm font-medium">Rollen</legend>
											{#each ALL_ROLES as role (role)}
												<label class="flex items-start gap-2 text-sm">
													<input
														type="checkbox"
														name="roles"
														value={role}
														checked={person.roles.includes(role)}
														class="checkbox checkbox-sm mt-0.5"
													/>
													<span>
														<span class="font-medium">{ROLE_LABELS[role]}</span>
														<span class="text-base-content/80"> — {ROLE_HINTS[role]}</span>
													</span>
												</label>
											{/each}
										</fieldset>

										<label class="form-control max-w-sm">
											<span class="label-text text-sm">Befristet bis (optional)</span>
											<input
												name="expiresAt"
												type="datetime-local"
												class="input input-bordered input-sm"
											/>
											<span class="text-base-content/80 mt-1 text-xs">
												Erst das Datum setzen, dann die Rolle ankreuzen: es gilt nur für Rollen, die
												danach dazukommen. Gedacht für „einmal hineinsehen“ — die Rolle läuft dann
												von selbst aus, statt bis Februar stehen zu bleiben.
											</span>
										</label>

										<noscript>
											<button type="submit" class="btn btn-sm btn-primary">Rollen speichern</button>
										</noscript>
									</form>

									<form
										method="POST"
										action="?/programmes"
										use:autosave={{ label: `Studiengänge von ${displayName(person)}` }}
										class="border-base-300 flex flex-col gap-3 border-t py-3"
									>
										<input type="hidden" name="id" value={person.id} />

										<fieldset class="flex flex-col gap-1">
											<legend class="mb-1 text-sm font-medium">Studiengänge dieser Leitung</legend>
											<p class="text-base-content/80 mb-1 text-sm">
												Für welche Studiengänge diese Person Bedarf festlegen darf — es dürfen
												mehrere sein. Ohne Zuordnung darf sie es für keinen; die Rolle allein genügt
												nicht. Erst die Rolle vergeben und speichern, dann hier zuordnen.
											</p>
											<div class="grid grid-cols-2 gap-1 sm:grid-cols-4">
												{#each activeProgrammes as programme (programme.code)}
													<label class="flex items-center gap-2 text-sm">
														<input
															type="checkbox"
															name="programmes"
															value={programme.code}
															checked={person.programmes.some((p) => p.code === programme.code)}
															class="checkbox checkbox-sm"
														/>
														<span title={programme.title}>{programme.code}</span>
													</label>
												{/each}
											</div>
										</fieldset>

										<noscript>
											<button type="submit" class="btn btn-sm">Studiengänge speichern</button>
										</noscript>
									</form>

									{#if person.roles.includes('PARTNER_READER')}
										<form
											method="POST"
											action="?/programmes"
											use:autosave={{
												label: `Partner-Studiengänge von ${displayName(person)}`
											}}
											class="border-base-300 flex flex-col gap-3 border-t py-3"
										>
											<input type="hidden" name="id" value={person.id} />
											<input type="hidden" name="role" value="PARTNER_READER" />

											<fieldset class="flex flex-col gap-1">
												<legend class="mb-1 text-sm font-medium">
													Studiengänge dieser Partnerfakultät
												</legend>
												<p class="text-base-content/80 mb-1 text-sm">
													Welche Studiengänge diese Person lesen darf: Bedarf, Statistik und
													veröffentlichte Zuteilung, keine Wünsche. Ohne Zuordnung liest sie nichts.
													Hat sie daneben eine weitere Rolle, gilt die — dann gehört sie zum
													Kollegium.
												</p>
												<div class="grid grid-cols-2 gap-1 sm:grid-cols-4">
													{#each data.programmes as programme (programme.code)}
														<label class="flex items-center gap-2 text-sm">
															<input
																type="checkbox"
																name="programmes"
																value={programme.code}
																checked={person.partnerProgrammes.some(
																	(p) => p.code === programme.code
																)}
																class="checkbox checkbox-sm"
															/>
															<span title={programme.title}>{programme.code}</span>
														</label>
													{/each}
												</div>
											</fieldset>

											<noscript>
												<button type="submit" class="btn btn-sm"
													>Partner-Studiengänge speichern</button
												>
											</noscript>
										</form>
									{/if}

									<form method="POST" action="?/active" use:enhance class="pb-2">
										<input type="hidden" name="id" value={person.id} />
										<input type="hidden" name="active" value={person.active ? '0' : '1'} />
										<button type="submit" class="btn btn-sm btn-outline">
											{person.active ? 'Konto deaktivieren' : 'Konto wieder aktivieren'}
										</button>
										<span class="text-base-content/80 ml-2 text-xs">
											Nimmt alles auf einmal weg, Tokens eingeschlossen. Gelöscht wird nie — die
											Zuteilungen bleiben in der Historie, und die Rollen kommen beim Aktivieren
											zurück.
										</span>
									</form>
								</td>
							</tr>
						{/if}
					{:else}
						<tr>
							<td colspan="3" class="text-base-content/80 text-sm">
								Niemand gefunden.
								{#if !data.includeInactive}
									Deaktivierte Konten sind ausgeblendet.
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
