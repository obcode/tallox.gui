<script lang="ts">
	import { formatHours, programmeLabel } from '$lib/catalogue';
	import { quotaUsage, type StudyYearRow } from '$lib/controlling';

	let {
		rows,
		winterLabel,
		summerLabel
	}: { rows: readonly StudyYearRow[]; winterLabel: string; summerLabel: string } = $props();

	const bars = $derived(rows.map((row) => ({ row, usage: quotaUsage(row) })));

	function percent(n: number): string {
		return `${Math.round(n)} %`;
	}
</script>

<!--
	The study year at a glance: one bar per programme, the track is its quota, the two segments
	are what winter and summer spend of it. The table below carries the same figures; this is
	the picture of them, so every bar also says its numbers in words for screen readers, and the
	share in text beside it. Two series, so a legend; the state "over the quota" is a badge with
	a word, never the colour of the bar alone.
-->
<div class="flex flex-col gap-2">
	<div class="text-base-content/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
		<span class="flex items-center gap-1.5">
			<span class="bg-neutral inline-block size-3 rounded-sm" aria-hidden="true"></span>
			{winterLabel}
		</span>
		<span class="flex items-center gap-1.5">
			<span class="bg-primary inline-block size-3 rounded-sm" aria-hidden="true"></span>
			{summerLabel}
		</span>
		<span class="flex items-center gap-1.5">
			<span class="bg-base-300 inline-block size-3 rounded-sm" aria-hidden="true"></span>
			noch frei
		</span>
	</div>

	<ul class="flex flex-col gap-1.5">
		{#each bars as { row, usage } (row.programme.code)}
			<li class="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm">
				<span class="font-medium" title={programmeLabel(row.programme)}>{row.programme.code}</span>
				{#if usage}
					<span
						class="bg-base-300 flex h-3 gap-0.5 overflow-hidden rounded"
						role="img"
						aria-label="{row.programme.code}: {winterLabel} {formatHours(
							row.winterHours
						)}, {summerLabel} {formatHours(row.summerHours)} von {formatHours(
							row.yearlyQuota ?? 0
						)} SWS Kontingent"
						title="{winterLabel} {formatHours(row.winterHours)} · {summerLabel} {formatHours(
							row.summerHours
						)} · Kontingent {formatHours(row.yearlyQuota ?? 0)}"
					>
						{#if usage.winter > 0}
							<span class="bg-neutral h-full" style:width="{usage.winter}%"></span>
						{/if}
						{#if usage.summer > 0}
							<span class="bg-primary h-full" style:width="{usage.summer}%"></span>
						{/if}
					</span>
					<span class="flex items-center justify-end gap-1 text-xs tabular-nums">
						{percent(usage.used)}
						{#if usage.over}
							<span class="badge badge-error badge-xs">über Kontingent</span>
						{/if}
					</span>
				{:else}
					<span class="text-base-content/80 col-span-2 text-xs">kein Kontingent</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>
