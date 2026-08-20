<script lang="ts">
	import { enhance } from '$app/forms';
	import { hasAnyRole } from '$lib/roles';
	import {
		PHASE_HINTS,
		PHASE_LABELS,
		mayStillPublish,
		phaseButtonLabel,
		semesterName,
		wishesAreVisible
	} from '$lib/semester';
	import { formatMoment } from '$lib/tokens';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Cosmetic, not a lock — the same rules are enforced in internal/policy and apply to the
	// token door too. Worth doing anyway: a lecturer who sees a "Weiter zu Wunschphase" button
	// and gets a refusal on every click learns to ignore refusals.
	const mayAdminister = $derived(hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE']));

	const refusal = $derived(form && 'message' in form ? form : null);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Semester und Phasen</h1>
		<p class="text-base-content/80 text-sm">
			Woran jedes Semester gerade ist. Die Phase wird umgeschaltet, nicht ausgerechnet — sie hängt
			an einer Entscheidung und nicht am Kalender.
		</p>
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	{#if mayAdminister}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 flex items-center gap-2 font-medium">
				<span aria-hidden="true">➕</span> Semester anlegen
			</h2>
			<p class="text-base-content/80 mb-3 text-sm">
				Vier Ziffern, Bindestrich, <code>SS</code> oder <code>WS</code> — das Jahr ist das, in dem
				das Semester <em>beginnt</em>. Das Wintersemester 2026/27 heißt also <code>2026-WS</code>.
				Ein neues Semester startet in der Bedarfsplanung.
			</p>

			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="form-control">
					<span class="label-text text-sm">Semester</span>
					<input
						name="code"
						type="text"
						required
						autocomplete="off"
						placeholder="2026-WS"
						class="input input-bordered input-sm w-32 font-mono"
					/>
				</label>
				<button type="submit" class="btn btn-sm btn-primary">Anlegen</button>
			</form>
		</div>
	{/if}

	{#if data.semesters.length === 0}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/80 text-sm">
				Noch kein Semester angelegt.{#if !mayAdminister}
					Das Dekanat legt sie an.{/if}
			</p>
		</div>
	{/if}

	{#each data.semesters as semester (semester.id)}
		<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
			<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<h2 class="text-lg font-medium">{semesterName(semester.code)}</h2>
				<code class="text-base-content/80 text-sm">{semester.code}</code>
				<span class="badge badge-neutral badge-sm">{PHASE_LABELS[semester.phase]}</span>
			</div>

			<p class="text-base-content/80 text-sm">{PHASE_HINTS[semester.phase]}</p>

			<div class="text-base-content/90 text-sm">
				{#if wishesAreVisible(semester)}
					<span class="badge badge-success badge-sm align-middle">Wünsche veröffentlicht</span>
					seit {formatMoment(semester.wishesPublishedAt)}
				{:else}
					<!--
						Deliberately nothing but the state itself: no count, no "hat Wünsche" hint, not
						even for the dean's office. Before publication an aggregate gives the
						confidential information away completely without naming anybody — see
						CLAUDE.md, "Things the UI must not do".
					-->
					<span class="badge badge-ghost badge-sm align-middle">Wünsche vertraulich</span>
					bis zur Veröffentlichung
				{/if}
			</div>

			{#if mayAdminister}
				<div class="border-base-300 flex flex-wrap items-center gap-2 border-t pt-3">
					<!--
						The buttons come from reachablePhases, which the backend computes from the same
						rule the mutation enforces. No adjacency logic here: a second opinion about
						what is allowed is the one that goes stale.
					-->
					{#each semester.reachablePhases as target (target)}
						<form method="POST" action="?/advance" use:enhance>
							<input type="hidden" name="id" value={semester.id} />
							<input type="hidden" name="to" value={target} />
							<button type="submit" class="btn btn-sm">
								{phaseButtonLabel(semester.phase, target)}
							</button>
						</form>
					{/each}

					{#if mayStillPublish(semester)}
						<!--
							Behind a disclosure rather than behind a JavaScript confirm(): the page works
							without a bundle, and this is the one action on it that cannot be undone.
							Two clicks, and the second one is next to the sentence that says so.
						-->
						<details class="ml-auto">
							<summary class="btn btn-sm btn-outline">Wünsche veröffentlichen …</summary>
							<div class="border-base-300 bg-base-100 mt-2 max-w-md rounded-lg border p-3">
								<p class="text-base-content/90 mb-3 text-sm">
									Danach sehen alle Kolleg:innen die Eintragungen der anderen.
									<strong>Das lässt sich nicht zurücknehmen.</strong>
								</p>
								<form method="POST" action="?/publish" use:enhance>
									<input type="hidden" name="id" value={semester.id} />
									<button type="submit" class="btn btn-sm btn-primary">
										Ja, {semesterName(semester.code)} veröffentlichen
									</button>
								</form>
							</div>
						</details>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
