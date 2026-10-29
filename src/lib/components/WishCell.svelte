<script lang="ts">
	import { untrack } from 'svelte';
	import { ENGLISH_NOT_OFFERED, englishClosed } from '$lib/demand';
	import {
		WISH_NONE,
		WISH_NONE_LABEL,
		WISH_PRIORITIES,
		WISH_PRIORITY_HINTS,
		WISH_PRIORITY_LABELS,
		wisherLabel,
		type WishChoice,
		type WishLike
	} from '$lib/wishes';

	/**
	 * One cell of the wish table: how much this person wants this cohort, and why.
	 *
	 * **Not a form.** The whole table is one form with one save, so a cell is a `<select>` and, when
	 * something is chosen, a note beside it. That is what keeps the table the size of the table
	 * people are used to: a save button per cell is two controls in every one of several hundred.
	 *
	 * The fields are bound to local state seeded once at mount, and the page remounts this
	 * component when the *stored* wish changes — see the `{#key}` around it. Written inline as
	 * `<option selected={…}>`, Svelte controls the field: the expression is re-applied whenever it
	 * re-evaluates, so choosing a different priority snaps straight back to the stored one and the
	 * value cannot be changed at all. Nothing about that is visible in a unit test — the markup is
	 * correct, the data is correct, and the form simply does not work.
	 *
	 * Re-seeding from an `$effect` is the wrong shape for the same reason: an effect that writes
	 * the field it is meant to leave alone is a race with the person typing into it.
	 */
	let {
		instanceId,
		label,
		wish,
		others,
		open,
		englishPossible
	}: {
		instanceId: string;
		/** `IF2A · Softwareentwicklung II` — the accessible name of both fields in this cell. */
		label: string;
		/** The caller's own entry, if there is one. Never anybody else's. */
		wish: WishLike | undefined;
		/**
		 * Who else has registered — names, never a number.
		 *
		 * Empty before the publication date for everybody, the leads included, and that emptiness is deliberately not rendered as anything. "Noch niemand" is a
		 * statement about other people's wishes, which is the one thing this screen may not make.
		 */
		others: readonly WishLike[];
		open: boolean;
		/** Whether the module description names English, which a CiE offer needs. */
		englishPossible?: boolean;
	} = $props();

	let choice = $state<WishChoice>(untrack(() => wish?.priority) ?? WISH_NONE);
	let note = $state(untrack(() => wish?.note) ?? '');
	let cie = $state(untrack(() => wish?.cie) ?? false);
	const cieClosed = $derived(englishClosed(englishPossible, cie));
</script>

<div class="flex flex-col gap-1">
	<select
		name="wish:{instanceId}"
		bind:value={choice}
		aria-label="Wunsch für {label}"
		class="select select-bordered select-xs w-full min-w-28"
		disabled={!open}
	>
		<option value={WISH_NONE}>{WISH_NONE_LABEL}</option>
		{#each WISH_PRIORITIES as level (level)}
			<option value={level} title={WISH_PRIORITY_HINTS[level]}>
				{WISH_PRIORITY_LABELS[level]}
			</option>
		{/each}
	</select>

	<!--
		The note only appears once something is chosen. It is the place for the special cases
		the instance part used to be meant for — „nur die Vorlesung“, „lieber die
		Dienstagsgruppe“. An empty field in every cell would be the same table, only twice as
		tall.
	-->
	{#if choice !== WISH_NONE}
		<input
			name="note:{instanceId}"
			bind:value={note}
			maxlength="500"
			placeholder="Notiz, z. B. „nur die Vorlesung“"
			aria-label="Notiz zu {label}"
			class="input input-bordered input-xs w-full min-w-40"
			disabled={!open}
		/>
		<!-- An offer to give it in English. It decides nothing in the assignment; the lead reads it
		     beside the name. -->
		<label
			class="flex items-center gap-1 text-xs"
			title={cieClosed
				? ENGLISH_NOT_OFFERED
				: 'Ich würde diesen Zug als Course in English (CiE) anbieten. Das ist ein Angebot, kein Vorrang bei der Zuteilung.'}
		>
			<input
				type="checkbox"
				name="cie:{instanceId}"
				value="true"
				bind:checked={cie}
				class="checkbox checkbox-xs"
				aria-label="{label} als CiE anbieten"
				disabled={!open || cieClosed}
			/>
			als CiE anbieten
		</label>
	{/if}

	{#if others.length > 0}
		<!--
			Only non-empty after publication: before that the load does not pass on other people's rows,
			not even to the leads. Names, not a number — a number would be exactly the aggregate that must
			never appear here.
		-->
		<p class="text-base-content/80 text-xs">
			Außerdem: {others.map(wisherLabel).join(', ')}
		</p>
	{/if}
</div>
