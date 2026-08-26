<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { personLabel } from '$lib/subjectGroups';

	/**
	 * A set of people, ticked or not, saved as a whole.
	 *
	 * Used for both halves of a subject group — who leads it, and who is in it — which are the
	 * same widget over different lists and must not drift apart.
	 *
	 * # Why this is a component and not markup in the page
	 *
	 * Written inline, this form did the thing that was reported from the running installation:
	 * after saving members the ticks were wrong. Two mechanisms fought each other, and both are
	 * dealt with here rather than in the page.
	 *
	 * `use:enhance` resets the form after a successful save, and a reset restores every checkbox
	 * to its **default** — the state at the moment the page was rendered, not the state that was
	 * just written. Saving once looked right because the two agreed; saving twice showed the
	 * first render again. So this form does not reset: a reset means "empty the fields for the
	 * next entry", and this form is not an entry. It is a *state* of the group, and the honest
	 * thing for it to show after a save is that state.
	 *
	 * The other half: `checked={…}` lets Svelte control the box, and a box somebody has clicked is
	 * one the browser owns. The ticks are local state here, bound rather than assigned, and the
	 * page remounts this component when the stored set changes — see the `{#key}` around it. So
	 * "show what is stored" happens on mount and "let somebody change it" happens between mounts,
	 * instead of the two overwriting each other.
	 */
	type Person = { id: string; mail: string; name: string; sortName?: string | null };

	let {
		groupId,
		action,
		legend,
		people,
		selected,
		submitLabel,
		scrollable = false
	}: {
		groupId: string;
		/** The form action, `?/setLeads` or `?/setMembers`. */
		action: string;
		legend: string;
		people: readonly Person[];
		/** The ids that are ticked when this mounts. */
		selected: readonly string[];
		submitLabel: string;
		/** Long lists scroll inside the card rather than pushing everything else off the screen. */
		scrollable?: boolean;
	} = $props();

	// Initialised once, and `untrack` says so. The page remounts this component when the stored
	// set changes, which is what keeps it in step without an effect that fights the person
	// clicking.
	let ticked = $state<Record<string, boolean>>(
		Object.fromEntries(untrack(() => selected).map((id) => [id, true]))
	);
</script>

<form
	method="POST"
	{action}
	use:enhance={() =>
		// reset: false — see the note above. Resetting would restore the ticks to the state at the
		// last render, which after a save is the state before it.
		async ({ update }) => {
			await update({ reset: false });
		}}
	class="flex flex-col gap-1"
>
	<input type="hidden" name="id" value={groupId} />
	<span class="text-base-content/90 text-sm">{legend}</span>

	<div class={scrollable ? 'max-h-56 overflow-y-auto pr-1' : 'flex flex-col gap-1'}>
		{#each people as person (person.id)}
			<label class="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					name="personId"
					value={person.id}
					bind:checked={ticked[person.id]}
					class="checkbox checkbox-sm"
				/>
				<span>{personLabel(person)}</span>
			</label>
		{/each}
	</div>

	<button type="submit" class="btn btn-sm self-start">{submitLabel}</button>
</form>
