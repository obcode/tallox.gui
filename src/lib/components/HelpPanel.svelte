<script lang="ts">
	import { tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { helpFor, type HelpEntry } from '$lib/help';
	import type { PlanningState } from '$lib/planning';
	import DueNow from './DueNow.svelte';
	import GuidePlaces from './GuidePlaces.svelte';

	let {
		planning,
		roles
	}: {
		planning: PlanningState;
		/** The effective roles — what the server judges this request by. */
		roles: readonly string[];
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	// The content exists only while the panel is open. Closed, it would sit hidden in the markup
	// of every page — and every `getByText` in a test, every find-in-page in the browser, would
	// meet the help's sentences next to the page's own. The first full test run found exactly
	// that: "geändert" on the demand page matched a question in here.
	let open = $state(false);

	async function show() {
		open = true;
		await tick();
		dialog?.showModal();
	}

	const entries = $derived(helpFor(roles, page.url.pathname));

	// The panel lives in the layout and survives a navigation. A link inside it leads somewhere
	// else, and the panel should not still be lying over the page that link opened.
	afterNavigate(() => dialog?.close());
</script>

{#snippet answers(list: HelpEntry[])}
	<ul class="flex flex-col gap-1">
		{#each list as entry (entry.question)}
			<li>
				<details class="group">
					<summary class="hover:bg-base-200 cursor-pointer rounded-md px-2 py-1.5 text-sm">
						{entry.question}
					</summary>
					<div class="flex flex-col gap-1 px-2 pt-1 pb-2">
						<p class="text-base-content/90 text-sm">{entry.answer}</p>
						<p class="text-base-content/80 text-sm">
							Wo: <GuidePlaces links={entry.where} {roles} />
						</p>
					</div>
				</details>
			</li>
		{/each}
	</ul>
{/snippet}

<!--
	Next to „Feedback“ and visible at every width. The name only appears beside it from 2xl:
	the row is tight at xl (see NavBar), and `aria-label` and `title` carry it anyway.
	-->
<button
	type="button"
	class="btn btn-ghost btn-sm gap-1.5 font-normal"
	aria-label="Hilfe"
	aria-haspopup="dialog"
	title="Hilfe: was jetzt dran ist, und Antworten auf häufige Fragen"
	onclick={show}
>
	<span aria-hidden="true">❓</span><span class="hidden 2xl:inline" aria-hidden="true">Hilfe</span>
</button>

<!--
	A native <dialog>: the browser brings focus trap, Escape and jumping back to the button,
	and to a screen reader it is a dialog and not a layer that happens to be on top. Docked
	on the right so that the page beside it, which the questions are about, stays
	visible.
	-->
<dialog
	bind:this={dialog}
	class="modal modal-end"
	aria-labelledby="help-panel-title"
	onclose={() => (open = false)}
>
	{#if open}
		<div class="modal-box flex w-full max-w-md flex-col gap-4">
			<div class="flex items-center justify-between gap-2">
				<h2 id="help-panel-title" class="text-lg font-semibold">Hilfe</h2>
				<form method="dialog">
					<button class="btn btn-ghost btn-sm" aria-label="Hilfe schließen">✕</button>
				</form>
			</div>

			<DueNow {planning} {roles} headingLevel={3} />

			{#if entries.here.length > 0}
				<section aria-labelledby="help-here-title" class="flex flex-col gap-1">
					<h3 id="help-here-title" class="font-medium">Zu dieser Seite</h3>
					{@render answers(entries.here)}
				</section>
			{/if}

			{#if entries.more.length > 0}
				<section aria-labelledby="help-more-title" class="flex flex-col gap-1">
					<h3 id="help-more-title" class="font-medium">
						{entries.here.length > 0 ? 'Weitere Fragen' : 'Häufige Fragen'}
					</h3>
					{@render answers(entries.more)}
				</section>
			{/if}

			<!-- Reference that used to sit in the account menu, between the tokens and the
			     administration. It is help, so it is here. -->
			<section aria-labelledby="help-reference-title" class="flex flex-col gap-1">
				<h3 id="help-reference-title" class="font-medium">Nachschlagen</h3>
				<ul class="flex flex-col gap-1 text-sm">
					<li>
						<a class="link" href={resolve('/einfuehrung')}>
							<span aria-hidden="true">🧭</span> Einführung in Tallox
						</a>
						— Grundideen, Phasen und was Du tust
					</li>
					<li>
						<a class="link" href={resolve('/ablauf')}>
							<span aria-hidden="true">📜</span> Ablauf der Einsatzplanung
						</a>
						— wer macht was, wo und wann
					</li>
					<li>
						<a class="link" href={resolve('/api-doku')}>
							<span aria-hidden="true">📖</span> API-Doku
						</a>
						— eigene Auswertungen mit einem Token
					</li>
				</ul>
			</section>
		</div>
	{/if}
	<form method="dialog" class="modal-backdrop">
		<button tabindex="-1" aria-hidden="true">schließen</button>
	</form>
</dialog>
