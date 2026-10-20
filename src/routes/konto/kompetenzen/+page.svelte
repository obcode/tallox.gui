<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CompetenceRow from '$lib/components/CompetenceRow.svelte';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import { nextSort, sortRows, type SortState } from '$lib/sorting';
	import {
		COMPETENCE_LEVEL_HINTS,
		COMPETENCE_LEVEL_LABELS,
		belowMinimum,
		competenceByModule,
		minimumHint,
		outsideStatements,
		savedHint,
		sortModules
	} from '$lib/competences';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form : null);
	const rowRefusals = $derived(
		new Map((form && 'refusals' in form ? form.refusals : []).map((r) => [r.moduleId, r.message]))
	);
	const savedCount = $derived(form && 'saved' in form ? (form.saved ?? 0) : null);

	const mineByModule = $derived(competenceByModule(data.mine));
	const statusByGroup = $derived(new Map(data.status.map((s) => [s.subjectGroup.id, s])));
	// By module name only: the level is edited in place, and a row sorted by it would move away
	// from under the cursor the moment it saved. One state for every group's table.
	let moduleSort = $state<SortState<'module'>>(null);
	const groups = $derived(
		[...data.groups]
			.sort((a, b) => a.code.localeCompare(b.code, 'de'))
			.map((g) => ({
				...g,
				modules: sortRows(sortModules(g.modules), moduleSort, { module: (m) => m.name })
			}))
	);
	const inMyGroups = $derived(new Set(groups.flatMap((g) => g.modules.map((m) => m.id))));
	const outside = $derived(outsideStatements(data.mine, inMyGroups));

	/**
	 * The profile saves itself, the way the wish table does — see `/wuensche` for the long version.
	 *
	 * `change` triggers (a level chosen, a note finished), `input` only remembers that something is
	 * open, and `focusout` catches a note that was set without the browser seeing it as typing. One
	 * submission at a time: each carries the whole form, and an older one arriving second would put
	 * an older level back.
	 */
	let formElement = $state<HTMLFormElement | null>(null);
	let saving = $state(false);
	/** Something was typed and not yet submitted. Not `$state`: nothing renders it. */
	let dirty = false;
	/** A change that came in while a save was running. */
	let queued = false;

	function saveNow() {
		if (saving) {
			queued = true;
			return;
		}
		// Reset synchronously, or the focusout right after a change would submit a second time.
		dirty = false;
		formElement?.requestSubmit();
	}

	function saveIfDirty() {
		if (dirty) saveNow();
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Meine Kompetenzen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Welche Module Du halten <strong>kannst</strong> — auch, wenn es kurzfristig brennt — und für
			welche Du Dich <strong>interessierst</strong>, auch wenn Du Dich dafür erst einarbeiten
			müsstest. Daraus entsteht für jedes Modul ein Pool, auf den die Fachgruppenleitung bei der
			Zuteilung schaut.
		</p>
		<dl
			class="text-base-content/80 mt-2 grid max-w-3xl grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]"
		>
			<dt class="font-semibold">„{COMPETENCE_LEVEL_LABELS.CAN_TEACH}“</dt>
			<dd>{COMPETENCE_LEVEL_HINTS.CAN_TEACH}</dd>
			<dt class="font-semibold">„{COMPETENCE_LEVEL_LABELS.WOULD_LIKE}“</dt>
			<dd>{COMPETENCE_LEVEL_HINTS.WOULD_LIKE}</dd>
		</dl>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Angeboten werden die Module Deiner Fachgruppen, die Pflichtfächer zuerst. Die Fakultät bittet
			um mindestens drei Pflichtfächer je Fachgruppe — nicht nur die Rosinen. Wer sich ein neues
			Gebiet erschließt, tritt unter
			<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a> der Fachgruppe bei.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Wer das sieht: Du selbst, die Leitung der Fachgruppe des Moduls, die Leitung seines
			Studiengangs und das Dekanat. Das übrige Kollegium sieht es nicht — auch nicht später.
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

	{#if groups.length === 0}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				Du bist noch keiner Fachgruppe zugeordnet. Kompetenzen gibst Du für die Module Deiner
				Fachgruppen an — tritt zuerst unter
				<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a> einer bei.
			</p>
		</div>
	{:else}
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
					// reset: false — the fields show a state, not an input to be cleared.
					await update({ reset: false });
					saving = false;
					if (queued) {
						queued = false;
						saveNow();
					}
				};
			}}
			class="flex flex-col gap-4"
		>
			{#each groups as group (group.id)}
				{@const status = statusByGroup.get(group.id)}
				<section
					class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
					aria-labelledby="group-{group.id}"
				>
					<h2 id="group-{group.id}" class="text-lg font-semibold">
						<span class="font-mono">{group.code}</span> — {group.name}
					</h2>
					{#if status}
						<p class="text-base-content/80 text-sm">
							{#if belowMinimum(status)}
								<span class="badge badge-warning badge-sm align-middle">Noch zu wenige</span>
							{/if}
							{minimumHint(status)}
						</p>
					{/if}

					{#if group.modules.length === 0}
						<p class="text-base-content/80 text-sm">
							Dieser Fachgruppe ist noch kein Modul zugeordnet.
						</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="table-sm table">
								<thead>
									<tr>
										<SortHeader
											label="Modul"
											key="module"
											sort={moduleSort}
											onsort={(key) => (moduleSort = nextSort(moduleSort, key))}
										/>
										<th>Stufe</th>
										<th>Notiz</th>
									</tr>
								</thead>
								<tbody>
									{#each group.modules as module (module.id)}
										{@const mine = mineByModule.get(module.id)}
										<!-- Keyed on the stored statement: the row remounts after a save
										     changed it, and not while somebody is typing. -->
										{#key `${mine?.id ?? ''}:${mine?.level ?? ''}:${mine?.note ?? ''}`}
											<CompetenceRow {module} {mine} refusal={rowRefusals.get(module.id)} />
										{/key}
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			{/each}

			<div
				class="border-base-300 bg-base-100 sticky bottom-0 flex flex-wrap items-center gap-3 rounded-lg border p-3"
			>
				<p class="text-base-content/90 grow text-sm" aria-live="polite">
					{#if saving}
						<span class="loading loading-spinner loading-xs align-middle"></span>
						wird gespeichert …
					{:else if savedCount !== null}
						<span class="badge badge-ghost badge-sm align-middle">gespeichert</span>
						{savedHint(savedCount)}
						{#if rowRefusals.size > 0}
							<span class="badge badge-error badge-sm align-middle">
								{rowRefusals.size === 1 ? 'Eine Zeile' : `${rowRefusals.size} Zeilen`} nicht gespeichert
							</span>
						{/if}
					{:else}
						Änderungen werden beim Auswählen gespeichert — bei der Notiz, sobald Du das Feld
						verlässt. Eine Zeile auf „—“ zu stellen zieht die Angabe zurück.
					{/if}
				</p>
				<!-- Stays although it normally does nothing: without JavaScript it is the only way to
				     submit a select. It sends the whole profile, so pressing it is harmless. -->
				<button type="submit" class="btn btn-ghost btn-sm" disabled={saving}>
					Alles speichern
				</button>
			</div>
		</form>
	{/if}

	{#if outside.length > 0}
		<section
			class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4"
			aria-labelledby="outside"
		>
			<h2 id="outside" class="text-lg font-semibold">Außerhalb Deiner Fachgruppen</h2>
			<p class="text-base-content/80 text-sm">
				Diese Angaben stammen aus einer Fachgruppe, der Du nicht mehr angehörst, oder das Modul ist
				inzwischen woanders einsortiert. Sie bleiben stehen, bis Du sie entfernst.
			</p>
			<ul class="flex flex-col gap-1">
				{#each outside as c (c.id)}
					<li class="flex flex-wrap items-center gap-2 text-sm">
						<span>{c.module.name || 'Modul ohne Namen'}</span>
						<span class="text-base-content/80">— {COMPETENCE_LEVEL_LABELS[c.level]}</span>
						<form method="POST" action="?/withdraw" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button type="submit" class="btn btn-xs">Entfernen</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
