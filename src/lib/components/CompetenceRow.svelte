<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import {
		COMPETENCE_LEVELS,
		COMPETENCE_LEVEL_HINTS,
		COMPETENCE_LEVEL_LABELS,
		COMPETENCE_NONE,
		type CompetenceChoice,
		type GroupModuleLike,
		type OwnCompetenceLike
	} from '$lib/competences';

	/**
	 * One module of the competence profile: the level and a note.
	 *
	 * **Not a form**, for the reason `WishCell` gives: the page is one form that saves itself. The
	 * fields are bound to local state seeded once at mount, and the page remounts the row when the
	 * *stored* statement changes — see the `{#key}` around it. Keying the whole form on the stored
	 * data instead, as this page did while it had a save button, would rebuild every row after each
	 * automatic save and take the focus out of the note somebody is typing.
	 */
	let {
		module,
		mine,
		refusal
	}: {
		module: GroupModuleLike & { homeProgrammeCode: string };
		/** The caller's own statement on this module, if there is one. */
		mine: OwnCompetenceLike | undefined;
		/** Why the last save of this row was refused, if it was. */
		refusal: string | undefined;
	} = $props();

	const name = $derived(module.name || 'Modul ohne Namen');
	let level = $state<CompetenceChoice>(untrack(() => mine?.level) ?? COMPETENCE_NONE);
	let note = $state(untrack(() => mine?.note) ?? '');
</script>

<tr>
	<td>
		<a class="link" href={resolve(`/module/${module.id}`)}>{name}</a>
		<span class="text-base-content/80">({module.homeProgrammeCode})</span>
		{#if module.compulsory}
			<span class="badge badge-neutral badge-sm">Pflicht</span>
		{/if}
		{#if refusal}
			<span class="text-base-content/90 block text-sm">
				<span class="badge badge-error badge-sm">Nicht gespeichert</span>
				{refusal}
			</span>
		{/if}
	</td>
	<td>
		<select
			name="level:{module.id}"
			bind:value={level}
			class="select select-sm"
			aria-label="Stufe für {name}"
		>
			<option value={COMPETENCE_NONE}>—</option>
			{#each COMPETENCE_LEVELS as l (l)}
				<option value={l} title={COMPETENCE_LEVEL_HINTS[l]}>{COMPETENCE_LEVEL_LABELS[l]}</option>
			{/each}
		</select>
	</td>
	<td>
		<input
			type="text"
			name="note:{module.id}"
			bind:value={note}
			maxlength="500"
			class="input input-sm w-full min-w-40"
			aria-label="Notiz zu {name}"
		/>
	</td>
</tr>
