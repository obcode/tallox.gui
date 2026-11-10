<script lang="ts">
	import type { Phase } from '$lib/gql/__generated__/graphql';
	import type { DemandRelease } from '$lib/planning';
	import { phaseProgress, phaseSplitLine } from '$lib/semester';

	let {
		phase,
		release = null,
		label = 'Phasen des Semesters'
	}: { phase: Phase; release?: DemandRelease | null; label?: string } = $props();

	const steps = $derived(phaseProgress(phase, release));
	const at = $derived(steps.findIndex((s) => s.phase === phase));
	const split = $derived(phaseSplitLine(phase, release));
</script>

<!--
	Where a semester stands, as five segments. The state is in the text as well as in the colour
	— `aria-current` for the phase, and a word for screen readers on the others — because a bar
	alone says nothing to somebody who cannot tell its shades apart.

	While only some programmes have released their demand, demand planning and wish phase are both
	current, each segment filled by its share of the programmes; the line below says the same in
	words. `aria-current` stays on the stored phase.

	Below sm a fifth of a phone is too narrow for "Studiengangs-Review": the names move into the
	list for screen readers only, and one line under the bar names the current phase instead.
-->
<ol class="grid grid-cols-5 gap-1" aria-label={label}>
	{#each steps as step (step.phase)}
		<li
			class="flex min-w-0 flex-col gap-1"
			aria-current={step.phase === phase ? 'step' : undefined}
		>
			{#if step.share !== undefined}
				<span class="bg-base-300 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
					<span
						class="bg-primary block h-full rounded-full"
						style="width: {Math.round(step.share * 100)}%"
						data-share
					></span>
				</span>
			{:else}
				<span
					class="h-1.5 rounded-full {step.state === 'CURRENT'
						? 'bg-primary'
						: step.state === 'DONE'
							? 'bg-neutral'
							: 'bg-base-300'}"
					aria-hidden="true"
				></span>
			{/if}
			<span
				class="text-xs leading-tight hyphens-auto max-sm:sr-only {step.state === 'CURRENT'
					? 'font-semibold'
					: 'text-base-content/80'}"
			>
				{step.label}
				{#if step.shareText}<span class="sr-only">({step.shareText})</span>
				{:else if step.state === 'DONE'}<span class="sr-only">(vorbei)</span>
				{:else if step.state === 'CURRENT'}<span class="sr-only">(aktuell)</span>{/if}
			</span>
		</li>
	{/each}
</ol>
{#if split}
	<p class="text-base-content/90 mt-1 text-xs">{split}</p>
{:else}
	<p class="mt-1 text-xs sm:hidden" aria-hidden="true">
		Phase {at + 1} von {steps.length}: <span class="font-semibold">{steps[at].label}</span>
	</p>
{/if}
