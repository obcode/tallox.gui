<script lang="ts">
	import { desiredRangeLabel, LOAD_VERDICT_LABELS, loadGauge } from '$lib/desiredHours';
	import { desiredHoursLabel } from '$lib/wishes';

	let {
		planned,
		min = null,
		max = null,
		scale,
		showVerdict = true
	}: {
		planned: number;
		/** The wished range; both null when nothing was stated, or it is not visible here. */
		min?: number | null;
		max?: number | null;
		/** The hours the full track stands for. A table passes one for every row. */
		scale: number;
		showVerdict?: boolean;
	} = $props();

	const range = $derived(min != null && max != null ? { min, max } : null);
	const gauge = $derived(loadGauge(planned, range, scale));
	const description = $derived(
		`eingeplant ${desiredHoursLabel(planned)} SWS` +
			(range ? `, gewünscht ${desiredRangeLabel(range.min, range.max)} SWS` : '')
	);
</script>

<!--
	Planned against wished: the fill is what is planned, the outlined band is the range asked for.
	Inside the band is where it should end. The verdict is a word in a badge, so the bar is never
	the only carrier of "too much" — and the numbers stay in the text next to it.
-->
<span class="inline-flex w-full max-w-56 items-center gap-2">
	<span
		class="bg-base-300 relative h-2 min-w-16 flex-1 rounded-full"
		role="img"
		aria-label={description}
		title={description}
	>
		<span class="bg-primary absolute inset-y-0 left-0 rounded-full" style:width="{gauge.planned}%"
		></span>
		{#if gauge.range}
			<span
				class="border-base-content bg-base-content/15 absolute -inset-y-0.5 rounded-sm border"
				style:left="{gauge.range.start}%"
				style:width="max({gauge.range.width}%, 2px)"
			></span>
		{/if}
	</span>
	{#if showVerdict && gauge.verdict !== 'UNSTATED'}
		<span
			class="badge badge-xs whitespace-nowrap {gauge.verdict === 'WITHIN'
				? 'badge-success'
				: 'badge-warning'}"
		>
			{LOAD_VERDICT_LABELS[gauge.verdict]}
		</span>
	{/if}
</span>
