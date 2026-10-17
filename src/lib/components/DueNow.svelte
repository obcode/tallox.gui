<script lang="ts">
	import { resolve } from '$app/paths';
	import { dueCard } from '$lib/guide';
	import type { PlanningState } from '$lib/planning';
	import GuidePlaces from './GuidePlaces.svelte';

	let {
		planning,
		roles,
		headingLevel = 2
	}: {
		planning: PlanningState;
		/** The effective roles — what the server judges this request by. */
		roles: readonly string[];
		/** 2 on the start page, 3 inside the help panel, whose own title is the h2. */
		headingLevel?: 2 | 3;
	} = $props();

	const card = $derived(dueCard(planning, roles));
	// The start page and the help panel can both show the card at once.
	const uid = $props.id();
	const titleId = `due-now-${uid}`;
</script>

<!--
	Was in der aktuellen Phase für diese Rollen dran ist — die Antwort auf „was habe ich seit dem
	letzten Semester vergessen“. Ein Zeiger, keine Regel: die Phase ist der Takt der Fakultät, und
	gesperrt wird dadurch nichts. Die ganze Folge steht unter /ablauf.
-->
<section class="border-base-300 bg-base-100 rounded-lg border p-4" aria-labelledby={titleId}>
	<svelte:element
		this={`h${headingLevel}`}
		id={titleId}
		class="flex flex-wrap items-center gap-2 font-medium"
	>
		<span aria-hidden="true">📌</span> Jetzt dran für Dich
	</svelte:element>
	{#if card.heading}
		<p class="text-base-content/80 mt-1 text-sm">{card.heading}</p>
	{/if}

	{#if card.steps.length > 0}
		<ul class="mt-3 flex flex-col gap-3">
			{#each card.steps as step (step.title)}
				<li class="flex flex-col gap-0.5">
					<span class="font-medium">{step.title}</span>
					<span class="text-base-content/80 text-sm">
						Wo: <GuidePlaces links={step.where} {roles} />
						{#if step.when}· {step.when}{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
	{#if card.note}
		<p class="text-base-content/90 mt-2 max-w-3xl text-sm">{card.note}</p>
	{/if}

	<p class="mt-3 text-sm">
		<a class="link" href={resolve('/ablauf')}>
			{#if card.more > 0}
				und {card.more} weitere — gesamten Ablauf ansehen →
			{:else}
				Gesamten Ablauf ansehen →
			{/if}
		</a>
	</p>
</section>
