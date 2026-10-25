<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
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
	import { desiredHoursStage, STAGE_LABELS } from '$lib/desiredHours';
	import PhaseSteps from '$lib/components/PhaseSteps.svelte';
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
			an einer Entscheidung und nicht am Kalender. Die Semester selbst sind einfach da: angelegt
			werden muss keines, und für jedes hier gelistete lässt sich planen — auch für die in ein paar
			Jahren. Die Liste beginnt beim <strong>Planungssemester</strong>: dem einen, das die Fakultät
			gerade plant und das überall vorausgewählt ist.
		</p>
		<p class="text-base-content/80 mt-2 text-sm">
			Geschaltet wird hier vom <strong>Dekanat</strong>: das Planungssemester, die Phase, und die
			beiden Veröffentlichungen — der Wünsche und der Zuteilung —, die sich nicht zurücknehmen
			lassen. Wann ein Studiengang seinen Bedarf fertig meldet und wann eine Fachgruppe ihre
			Wunschrunde schließt, steht nicht hier, sondern beim
			<a class="link" href={resolve('/bedarf')}>Bedarf</a> und bei der
			<a class="link" href={resolve('/zuteilung')}>Zuteilung</a>.
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

	{#each data.semesters as semester (semester.code)}
		<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
			<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<h2 class="text-lg font-medium">{semesterName(semester.code)}</h2>
				<code class="text-base-content/80 text-sm">{semester.code}</code>
				<span class="badge badge-neutral badge-sm">{PHASE_LABELS[semester.phase]}</span>
				{#if semester.isPlanningSemester}
					<span class="badge badge-primary badge-sm">Planungssemester</span>
				{/if}
			</div>

			<div class="max-w-xl">
				<PhaseSteps phase={semester.phase} label="Phasen von {semesterName(semester.code)}" />
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

			<div class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">
					Wunsch-SWS {STAGE_LABELS[desiredHoursStage(semester)]}
				</span>
				{#if semester.desiredHoursPublishedAt}
					seit {formatMoment(semester.desiredHoursPublishedAt)} — alle sehen die Bereiche, die Notizen
					nicht
				{:else if semester.desiredHoursFrozenAt}
					seit {formatMoment(semester.desiredHoursFrozenAt)} — Korrekturen unter
					<a class="link" href="{resolve('/wuensche/kollegium')}?semester={semester.code}"
						>SWS im Kollegium</a
					>
				{:else}
					— alle können ihre Angabe noch ändern
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
							<input type="hidden" name="code" value={semester.code} />
							<input type="hidden" name="to" value={target} />
							<button type="submit" class="btn btn-sm">
								{phaseButtonLabel(semester.phase, target)}
							</button>
						</form>
					{/each}

					{#if !semester.isPlanningSemester}
						<!--
							Reversible, so a plain button — no disclosure and no second sentence, unlike
							publishing below. The mark moves off whichever semester carried it in the
							same act, so there is nothing to clear first.
						-->
						<form method="POST" action="?/setPlanning" use:enhance>
							<input type="hidden" name="code" value={semester.code} />
							<button type="submit" class="btn btn-sm btn-outline">
								Als Planungssemester setzen
							</button>
						</form>
					{/if}

					{#if desiredHoursStage(semester) === 'OPEN'}
						<!-- Irreversible like publishing, so behind the same disclosure. -->
						<details>
							<summary class="btn btn-sm btn-outline">Wunsch-SWS einfrieren …</summary>
							<div class="border-base-300 bg-base-100 mt-2 max-w-md rounded-lg border p-3">
								<p class="text-base-content/90 mb-3 text-sm">
									Der Stichtag: Danach kann niemand die eigene Angabe mehr ändern, nur noch das
									Dekanat. <strong>Das lässt sich nicht zurücknehmen.</strong>
								</p>
								<form method="POST" action="?/freezeDesiredHours" use:enhance>
									<input type="hidden" name="code" value={semester.code} />
									<button type="submit" class="btn btn-sm btn-primary">
										Ja, Wunsch-SWS für {semesterName(semester.code)} einfrieren
									</button>
								</form>
							</div>
						</details>
					{:else if desiredHoursStage(semester) === 'FROZEN'}
						<details>
							<summary class="btn btn-sm btn-outline">Wunsch-SWS veröffentlichen …</summary>
							<div class="border-base-300 bg-base-100 mt-2 max-w-md rounded-lg border p-3">
								<p class="text-base-content/90 mb-3 text-sm">
									Danach sieht das ganze Kollegium die Bereiche aller — die Notizen nicht.
									<strong>Das lässt sich nicht zurücknehmen.</strong>
								</p>
								<form method="POST" action="?/publishDesiredHours" use:enhance>
									<input type="hidden" name="code" value={semester.code} />
									<button type="submit" class="btn btn-sm btn-primary">
										Ja, Wunsch-SWS für {semesterName(semester.code)} veröffentlichen
									</button>
								</form>
							</div>
						</details>
					{/if}

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
									Danach sieht das ganze Kollegium, wer sich wo eingetragen hat; über die
									Schnittstelle auch mit Stufe. Notizen und Zeitpunkte bleiben bei den Zuständigen.
									<strong>Das lässt sich nicht zurücknehmen.</strong>
								</p>
								<p class="text-base-content/80 mb-3 text-sm">
									Das geht erst, wenn jede Fachgruppe mit Instanzen in diesem Semester ihre
									Wunschrunde geschlossen hat. Sonst wäre jede spätere Eintragung sofort für alle
									sichtbar. Ist noch eine offen, nennt die Meldung sie.
								</p>
								<form method="POST" action="?/publish" use:enhance>
									<input type="hidden" name="code" value={semester.code} />
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
