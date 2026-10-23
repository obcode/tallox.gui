<script lang="ts">
	import type { SetupCard } from '$lib/setup';
	import GuidePlaces from './GuidePlaces.svelte';

	let { card, roles }: { card: SetupCard; roles: readonly string[] } = $props();
</script>

<!--
	What this person has not stated yet. Derived from their own rows, so it disappears by itself
	once everything is there — no dismissing, which would be a state to store.
	-->
<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby="setup-title">
	<h2 id="setup-title" class="flex flex-wrap items-center gap-2 font-medium">
		<span aria-hidden="true">🧭</span> Dein Stand
		<span class="badge badge-ghost badge-sm">{card.done} von {card.total} erledigt</span>
	</h2>

	{#each card.groups as group (group.title)}
		<h3 class="mt-3 text-sm font-medium">{group.title}</h3>
		<ul class="mt-1 flex flex-col gap-2">
			{#each group.items as item (item.key)}
				<li class="flex items-start gap-2">
					{#if item.done}
						<span class="badge badge-success badge-sm mt-0.5 shrink-0">erledigt</span>
					{:else}
						<span class="badge badge-outline badge-sm mt-0.5 shrink-0">offen</span>
					{/if}
					<span class="flex flex-col gap-0.5">
						<span class="font-medium">{item.title}</span>
						<span class="text-base-content/80 text-sm">{item.text}</span>
						<span class="text-base-content/80 text-sm">
							Wo: <GuidePlaces links={item.where} {roles} />
						</span>
					</span>
				</li>
			{/each}
		</ul>
	{/each}
</section>
