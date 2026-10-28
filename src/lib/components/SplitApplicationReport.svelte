<script lang="ts">
	import {
		changedLines,
		refusedLines,
		splitSummary,
		type SplitApplicationLike
	} from '$lib/splitApplication';

	/**
	 * What carrying a split over would do, or did — the backend's report as lines.
	 *
	 * Shared by the module page and the demand page, so the two say the same thing about the same
	 * answer. After a preview the badge says „Vorschau“ and the sentences are in the conditional;
	 * otherwise it would be read as a save.
	 */
	let { report }: { report: SplitApplicationLike } = $props();

	const changed = $derived(changedLines(report));
	const refused = $derived(refusedLines(report));
</script>

<p class="text-base-content/90 text-sm">
	{#if report.dryRun}
		<span class="badge badge-info badge-sm align-middle">Vorschau</span>
	{:else}
		<span class="badge badge-ghost badge-sm align-middle">Übertragen</span>
	{/if}
	{splitSummary(report)}
</p>
{#if changed.length > 0}
	<ul class="text-base-content/90 mt-2 flex flex-col gap-1 text-sm">
		{#each changed as line, i (i)}
			<li><span class="font-medium">{line.label}:</span> {line.text}</li>
		{/each}
	</ul>
{/if}
{#if refused.length > 0}
	<p class="text-base-content/90 mt-3 text-sm">
		<span class="badge badge-warning badge-sm align-middle">Bleibt, wie es ist</span>
	</p>
	<ul class="text-base-content/90 mt-1 flex flex-col gap-1 text-sm">
		{#each refused as line, i (i)}
			<li><span class="font-medium">{line.label}:</span> {line.text}</li>
		{/each}
	</ul>
{/if}
