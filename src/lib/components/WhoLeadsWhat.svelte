<script lang="ts">
	import { resolve } from '$app/paths';
	import { leadLine, moduleCountLabel, programmeTitle } from '$lib/startOverview';

	type Lead = { id: string; name: string; mail: string };

	let {
		programmes,
		subjectGroups
	}: {
		programmes: { code: string; title: string; leads: Lead[] }[];
		subjectGroups: {
			id: string;
			code: string;
			name: string;
			moduleCount: number;
			leads: Lead[];
			modules: { id: string; name: string; homeProgrammeCode: string }[];
		}[];
	} = $props();
</script>

<section class="flex flex-col gap-2" aria-labelledby="who-leads-what">
	<div>
		<h2 id="who-leads-what" class="flex items-center gap-2 font-medium">
			<span aria-hidden="true">🧑‍🏫</span> Wer leitet was
		</h2>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Die Studiengangsleitungen legen den Bedarf fest, die Fachgruppenleitungen teilen zu. Bei
			Fragen zu einem Modul hilft die Leitung seiner Fachgruppe weiter.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h3 class="mb-2 font-medium">Studiengänge</h3>
			{#if programmes.length === 0}
				<p class="text-base-content/80 text-sm">Es sind noch keine Studiengänge eingetragen.</p>
			{:else}
				<ul class="flex flex-col gap-2 text-sm" aria-label="Studiengänge und ihre Leitung">
					{#each programmes as programme (programme.code)}
						<li>
							<span class="font-medium">
								<span class="font-mono">{programme.code}</span>
								{#if programmeTitle(programme) !== programme.code}
									— {programmeTitle(programme)}
								{/if}
							</span>
							<span class="text-base-content/80 block">Leitung: {leadLine(programme.leads)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h3 class="mb-2 font-medium">Fachgruppen</h3>
			{#if subjectGroups.length === 0}
				<p class="text-base-content/80 text-sm">
					Es gibt noch keine Fachgruppen. Angelegt werden sie in der Verwaltung.
				</p>
			{:else}
				<ul class="flex flex-col gap-2 text-sm" aria-label="Fachgruppen und ihre Leitung">
					{#each subjectGroups as group (group.id)}
						<li>
							<span class="font-medium">
								<span class="font-mono">{group.code}</span> — {group.name}
							</span>
							<span class="text-base-content/80 block">Leitung: {leadLine(group.leads)}</span>
							{#if group.modules.length > 0}
								<details class="mt-0.5">
									<summary class="text-base-content/80 cursor-pointer">
										{moduleCountLabel(group.moduleCount)}
									</summary>
									<ul class="text-base-content/90 mt-1 flex flex-col gap-0.5 pl-4">
										{#each group.modules as module (module.id)}
											<li>
												<a class="link" href={resolve(`/module/${module.id}`)}>{module.name}</a>
												<span class="text-base-content/80">({module.homeProgrammeCode})</span>
											</li>
										{/each}
									</ul>
								</details>
							{:else}
								<span class="text-base-content/80 block">Noch kein Modul zugeordnet.</span>
							{/if}
						</li>
					{/each}
				</ul>
				<p class="text-base-content/80 mt-3 text-sm">
					In welchen Fachgruppen Du selbst mitarbeitest, legst Du unter
					<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a> fest.
				</p>
			{/if}
		</div>
	</div>
</section>
