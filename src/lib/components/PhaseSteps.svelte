<script lang="ts">
	import type { Phase } from '$lib/gql/__generated__/graphql';
	import { phaseProgress } from '$lib/semester';

	let { phase, label = 'Phasen des Semesters' }: { phase: Phase; label?: string } = $props();

	const steps = $derived(phaseProgress(phase));
	const at = $derived(steps.findIndex((s) => s.state === 'CURRENT'));
</script>

<!--
	Where a semester stands, as five segments. The state is in the text as well as in the colour
	— `aria-current` for the phase, and a word for screen readers on the others — because a bar
	alone says nothing to somebody who cannot tell its shades apart.

	Below sm a fifth of a phone is too narrow for "Studiengangs-Review": the names move into the
	list for screen readers only, and one line under the bar names the current phase instead.
-->
<ol class="grid grid-cols-5 gap-1" aria-label={label}>
	{#each steps as step (step.phase)}
		<li
			class="flex min-w-0 flex-col gap-1"
			aria-current={step.state === 'CURRENT' ? 'step' : undefined}
		>
			<span
				class="h-1.5 rounded-full {step.state === 'CURRENT'
					? 'bg-primary'
					: step.state === 'DONE'
						? 'bg-neutral'
						: 'bg-base-300'}"
				aria-hidden="true"
			></span>
			<span
				class="text-xs leading-tight hyphens-auto max-sm:sr-only {step.state === 'CURRENT'
					? 'font-semibold'
					: 'text-base-content/80'}"
			>
				{step.label}
				{#if step.state === 'DONE'}<span class="sr-only">(vorbei)</span>{/if}
				{#if step.state === 'CURRENT'}<span class="sr-only">(aktuell)</span>{/if}
			</span>
		</li>
	{/each}
</ol>
<p class="mt-1 text-xs sm:hidden" aria-hidden="true">
	Phase {at + 1} von {steps.length}: <span class="font-semibold">{steps[at].label}</span>
</p>
