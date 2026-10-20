<script lang="ts">
	import { untrack } from 'svelte';
	import { autosave } from '$lib/saveOnLeave';
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
	 * one the browser owns. The ticks are local state here, bound rather than assigned, and they
	 * are re-read from `selected` at exactly one moment: when a save has come back and no newer
	 * tick is waiting behind it. After a refusal that shows what is stored rather than what was
	 * refused.
	 *
	 * Every tick saves itself (since 2026-10-20 — it had a button, and a tick that only lives in
	 * the browser looks exactly like a saved one). Until then the page remounted this component
	 * under a `{#key}` on the stored set; with saving on every click that remount would wipe a
	 * second tick made while the first was on the wire.
	 */
	type Person = { id: string; mail: string; name: string; sortName?: string | null };

	let {
		groupId,
		action,
		legend,
		people,
		selected,
		scrollable = false
	}: {
		groupId: string;
		/** The form action, `?/setLeads` or `?/setMembers`. */
		action: string;
		legend: string;
		people: readonly Person[];
		/** The stored ids. Read on mount and again after every save. */
		selected: readonly string[];
		/** Long lists scroll inside the card rather than pushing everything else off the screen. */
		scrollable?: boolean;
	} = $props();

	// Initialised once, and `untrack` says so — an effect following `selected` would fight the
	// person clicking. The save callback below is what keeps it in step.
	const fromIds = (ids: readonly string[]) => Object.fromEntries(ids.map((id) => [id, true]));
	let ticked = $state<Record<string, boolean>>(fromIds(untrack(() => selected)));
	let saving = $state(false);
	let saved = $state(false);
	/** Changes made while a save was running; the ticks are theirs until they are sent too. */
	let changedSince = 0;
</script>

<form
	method="POST"
	{action}
	onchange={() => {
		if (saving) changedSince++;
	}}
	use:autosave={{
		label: legend,
		submit: () => {
			saving = true;
			changedSince = 0;
			return async ({ update, result }) => {
				await update({ reset: false });
				saving = false;
				saved = result.type === 'success';
				if (changedSince === 0) ticked = fromIds(selected);
			};
		}
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

	<p class="text-base-content/80 text-xs" aria-live="polite">
		{#if saving}
			<span class="loading loading-spinner loading-xs align-middle"></span> wird gespeichert …
		{:else if saved}
			<span class="badge badge-ghost badge-sm align-middle">gespeichert</span>
		{/if}
	</p>
	<noscript
		><button type="submit" class="btn btn-sm self-start">{legend} speichern</button></noscript
	>
</form>
