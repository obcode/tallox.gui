<script lang="ts">
	/**
	 * The two fields of a desired range, "von" and "bis", inside a form that saves itself.
	 *
	 * Such a form saves when a field is left, and the page reloads after every save. A field bound
	 * straight to the loaded figure would be rewritten by that reload while somebody is typing into
	 * the other one — "von" alone saves as "von = bis", and "bis" would jump under the cursor. Nor
	 * may a save that was sent earlier overwrite what has been typed since. So the fields keep their
	 * own text and take a new stored figure over only when they are neither focused nor edited
	 * since the last one.
	 */
	import { untrack } from 'svelte';
	import { desiredHoursLabel } from '$lib/wishes';

	let {
		min,
		max,
		disabled = false,
		minLabel = 'SWS von',
		maxLabel = 'bis',
		visibleLabels = true,
		size = 'sm'
	}: {
		/** The stored ends, or null while nothing is stated (or visible). */
		min: number | null | undefined;
		max: number | null | undefined;
		disabled?: boolean;
		minLabel?: string;
		maxLabel?: string;
		/** False in a table row, where the labels are for screen readers only. */
		visibleLabels?: boolean;
		size?: 'sm' | 'xs';
	} = $props();

	const stored = () => ({
		min: min == null ? '' : desiredHoursLabel(min),
		max: max == null ? '' : desiredHoursLabel(max)
	});
	let text = $state(untrack(stored));
	// What the fields last took over: a field whose text differs from it holds an edit.
	let synced = untrack(stored);
	const fields: Record<'min' | 'max', HTMLInputElement | undefined> = $state({
		min: undefined,
		max: undefined
	});
	$effect(() => {
		const next = stored();
		untrack(() => {
			for (const key of ['min', 'max'] as const) {
				const untouched = text[key] === synced[key];
				if (untouched && document.activeElement !== fields[key]) text[key] = next[key];
			}
			synced = next;
		});
	});

	const inputClass = $derived(
		size === 'xs' ? 'input input-xs w-14 text-right' : 'input input-sm w-20'
	);
</script>

{#if visibleLabels}
	<label class="flex flex-col gap-1">
		<span class="label-text text-sm">{minLabel}</span>
		<input
			name="minHours"
			class={inputClass}
			inputmode="decimal"
			bind:value={text.min}
			bind:this={fields.min}
			{disabled}
		/>
	</label>
	<label class="flex flex-col gap-1">
		<span class="label-text text-sm">{maxLabel}</span>
		<input
			name="maxHours"
			class={inputClass}
			inputmode="decimal"
			bind:value={text.max}
			bind:this={fields.max}
			{disabled}
		/>
	</label>
{:else}
	<input
		name="minHours"
		aria-label={minLabel}
		class={inputClass}
		inputmode="decimal"
		bind:value={text.min}
		bind:this={fields.min}
		{disabled}
	/>
	<span aria-hidden="true">–</span>
	<input
		name="maxHours"
		aria-label={maxLabel}
		class={inputClass}
		inputmode="decimal"
		bind:value={text.max}
		bind:this={fields.max}
		{disabled}
	/>
{/if}
