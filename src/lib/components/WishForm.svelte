<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import {
		WISH_PRIORITIES,
		WISH_PRIORITY_HINTS,
		WISH_PRIORITY_LABELS,
		type WishPriorityValue
	} from '$lib/wishes';

	/**
	 * One part's wish form: the priority, the note, and the two buttons.
	 *
	 * A component rather than markup in the page, and the reason is a defect the end-to-end run
	 * found rather than tidiness. Written inline as `<option selected={…}>`, Svelte *controls* the
	 * field: the expression is re-applied whenever it re-evaluates, so choosing a different
	 * priority snapped straight back to the stored one and the value could not be changed at all.
	 * Nothing about that is visible in a unit test — the markup is correct, the data is correct,
	 * and the form simply does not work.
	 *
	 * So the fields are bound to local state, initialised once at mount. The page remounts this
	 * component when the stored wish changes — see the `{#key}` around it — so "show what is
	 * stored" and "let somebody change it" stop fighting: the first happens on mount, the second
	 * between mounts.
	 *
	 * Re-seeding from an $effect was the first attempt and is the wrong shape. An effect that
	 * writes the field it is meant to leave alone is a race with the person typing into it, and
	 * it loses in a way that looks like the form ignoring them.
	 */
	type Wish = { id: string; priority: WishPriorityValue; note: string };

	let {
		partId,
		label,
		wish,
		open
	}: {
		partId: string;
		/** What this part is called, for the labels a screen reader reads. */
		label: string;
		wish: Wish | undefined;
		open: boolean;
	} = $props();

	// Initialised once, and `untrack` says so rather than leaving svelte-check to warn that the
	// initial value is all this captures. That is the intent: the stored value seeds the field at
	// mount, and the page remounts this component when the stored value changes.
	//
	// "gerne" for a part nobody has asked for yet, because it is the honest answer to a form being
	// filled in for the first time.
	let priority = $state<WishPriorityValue>(untrack(() => wish?.priority) ?? 'HAPPY_TO');
	let note = $state(untrack(() => wish?.note) ?? '');
</script>

<div class="flex flex-col gap-1">
	<form method="POST" action="?/set" use:enhance class="flex flex-wrap items-end gap-2">
		<input type="hidden" name="part" value={partId} />
		<label class="form-control">
			<span class="sr-only">Priorität für {label}</span>
			<select
				name="priority"
				bind:value={priority}
				class="select select-bordered select-sm"
				disabled={!open}
			>
				{#each WISH_PRIORITIES as level (level)}
					<option value={level} title={WISH_PRIORITY_HINTS[level]}>
						{WISH_PRIORITY_LABELS[level]}
					</option>
				{/each}
			</select>
		</label>
		<label class="form-control grow">
			<span class="sr-only">Notiz zu {label}</span>
			<input
				name="note"
				bind:value={note}
				maxlength="500"
				placeholder="Notiz (optional)"
				class="input input-bordered input-sm w-full"
				disabled={!open}
			/>
		</label>
		<button type="submit" class="btn btn-sm" disabled={!open}>
			{wish ? 'Ändern' : 'Eintragen'}
		</button>
	</form>

	{#if wish}
		<form method="POST" action="?/withdraw" use:enhance>
			<input type="hidden" name="id" value={wish.id} />
			<button type="submit" class="btn btn-sm btn-ghost" disabled={!open}>Zurückziehen</button>
		</form>
	{/if}
</div>
