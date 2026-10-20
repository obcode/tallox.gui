<script lang="ts" generics="K extends string">
	/**
	 * A column head that sorts its table when clicked.
	 *
	 * A real `<button>` inside the `<th>` rather than a click handler on the cell, so it is
	 * reachable by keyboard and announced as something to press. The cell carries `aria-sort`,
	 * which is where screen readers look for it. `type="button"` because the wish table sits
	 * inside a form that saves itself — a submit button in its head would save on every sort.
	 *
	 * The arrow is a drawing, not a character: a glyph would become part of the head's text, and
	 * the head's text is what tests and screen readers find the column by.
	 *
	 * The button inherits colour and font from the cell, so the contrast override for
	 * `.table thead th` in app.css applies to it unchanged.
	 *
	 * The cycle and the rules for sort keys are in $lib/sorting.
	 */
	import { ariaSort, type SortState } from '$lib/sorting';

	let {
		label,
		key,
		sort,
		onsort,
		class: className = '',
		title,
		align = 'left'
	}: {
		label: string;
		key: K;
		sort: SortState<K>;
		onsort: (key: K) => void;
		class?: string;
		title?: string;
		align?: 'left' | 'right';
	} = $props();

	const state = $derived(ariaSort(sort, key));
</script>

<th class={className} aria-sort={state} {title}>
	<button
		type="button"
		class="inline-flex cursor-pointer items-center gap-1 rounded-sm text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 {align ===
		'right'
			? 'flex-row-reverse'
			: ''}"
		style="font: inherit; letter-spacing: inherit;"
		onclick={() => onsort(key)}
	>
		<span>{label}</span>
		<svg
			aria-hidden="true"
			class="size-3 shrink-0 {state === 'none' ? 'opacity-40' : ''}"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="2.5"
			stroke="currentColor"
		>
			{#if state === 'ascending'}
				<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
			{:else if state === 'descending'}
				<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
			{:else}
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
				/>
			{/if}
		</svg>
	</button>
</th>
