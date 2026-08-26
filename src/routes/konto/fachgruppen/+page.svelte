<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { leadNames } from '$lib/subjectGroups';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form : null);
	const saved = $derived(form !== null && refusal === null);

	// Local, initialised once — the same arrangement the membership picker in the administration
	// uses, and for the same reason: a checkbox somebody has clicked is one the browser owns, and
	// `checked={…}` would let Svelte overwrite it on the next render.
	let ticked = $state<Record<string, boolean>>(
		Object.fromEntries(untrack(() => data.mine).map((id) => [id, true]))
	);

	const groups = $derived([...data.groups].sort((a, b) => a.code.localeCompare(b.code, 'de')));
	const chosen = $derived(groups.filter((g) => ticked[g.id]).length);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Meine Fachgruppen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			In welchen Fächern Du arbeitest. Das trägst Du selbst ein — es ist keine Berechtigung, sondern
			eine Aussage über Dich, und niemand muss sie Dir erteilen.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Wozu es dient: die <a class="link" href={resolve('/wuensche')}>Wunschseite</a> zeigt Deine Fachgruppen
			zuerst. Es ist eine Vorauswahl und keine Schranke — eintragen kannst Du Dich überall. Wer sich ein
			Gebiet erschließt, tritt der Fachgruppe bei; das ist der Weg, nicht eine Ablehnung.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Die <strong>Leitung</strong> einer Fachgruppe ist etwas anderes: sie besetzt deren Instanzen und
			sieht vor dem Stichtag die Wünsche darauf. Die wird in der Verwaltung vergeben und nicht hier.
		</p>
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{:else if saved}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">Gespeichert.</p>
		</div>
	{/if}

	{#if groups.length === 0}
		<p class="text-base-content/80 text-sm">
			Es gibt noch keine Fachgruppen. Angelegt werden sie in der Verwaltung.
		</p>
	{:else}
		<form
			method="POST"
			action="?/setMine"
			use:enhance={() =>
				// reset: false — ein Reset stellt die Kästchen auf den Stand des letzten Renderns
				// zurück, und das ist nach dem Speichern der Stand davor. Dieses Formular ist kein
				// Eingabefeld, das man leert, sondern ein Zustand, den es zeigt.
				async ({ update }) => {
					await update({ reset: false });
				}}
			class="flex flex-col gap-3"
		>
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each groups as group (group.id)}
					<article class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
						<label class="flex items-start gap-2">
							<input
								type="checkbox"
								name="subjectGroupId"
								value={group.id}
								bind:checked={ticked[group.id]}
								class="checkbox checkbox-sm mt-1"
							/>
							<span>
								<span class="font-medium">
									<span class="font-mono">{group.code}</span> — {group.name}
								</span>
								<span class="text-base-content/80 block text-sm">
									Leitung: {leadNames(group.leads)}
								</span>
							</span>
						</label>

						{#if group.modules.length > 0}
							<details class="text-sm">
								<summary class="text-base-content/80 cursor-pointer">
									{group.moduleCount}
									{group.moduleCount === 1 ? 'Modul' : 'Module'}
								</summary>
								<ul class="text-base-content/90 mt-1 flex flex-col gap-0.5">
									{#each group.modules as module (module.id)}
										<li>
											<a class="link" href={resolve(`/module/${module.id}`)}>{module.name}</a>
											<span class="text-base-content/80">({module.homeProgrammeCode})</span>
										</li>
									{/each}
								</ul>
							</details>
						{:else}
							<p class="text-base-content/80 text-sm">
								Dieser Fachgruppe ist noch kein Modul zugeordnet.
							</p>
						{/if}
					</article>
				{/each}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<button type="submit" class="btn btn-sm btn-primary">Speichern</button>
				<span class="text-base-content/80 text-sm">
					{chosen}
					{chosen === 1 ? 'Fachgruppe' : 'Fachgruppen'} ausgewählt
				</span>
			</div>
		</form>
	{/if}
</div>
