<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { fieldsOf, pendingChanges } from '$lib/saveOnLeave';

	/**
	 * Nothing typed into Tallox is lost by clicking somewhere else.
	 *
	 * Mounted once, in the root layout, and asks `pendingChanges` before every navigation:
	 *
	 * - A self-saving form with something still to send or still on the wire: the navigation
	 *   waits for it, silently. Without that the next page's load can overtake the save — reported
	 *   on 2026-10-20 as "I ticked a subject group, and on the competences page it was not ticked".
	 * - A form sent by a button, with something typed into it: a dialog — save, discard, or stay.
	 * - A save that was refused: the same dialog, because leaving loses what was refused.
	 *
	 * Closing the tab or reloading cannot show a dialog of ours; there the browser asks with its
	 * own words, which `cancel()` on a `leave` navigation triggers.
	 */

	type Stage = 'idle' | 'saving' | 'ask' | 'failed';

	let dialog = $state<HTMLDialogElement | null>(null);
	let stage = $state<Stage>('idle');
	let labels = $state<string[]>([]);
	let canSave = $state(true);

	let target: { url: URL; unload: boolean } | null = null;
	/** Set while we navigate ourselves, so the guard lets its own navigation through. */
	let leaving = false;

	beforeNavigate((navigation) => {
		if (leaving) return;
		const auto = pendingChanges.autoPending();
		const ask = pendingChanges.askDirty(fieldsOf);
		if (auto.length === 0 && ask.length === 0) return;

		navigation.cancel();
		if (navigation.type === 'leave' || !navigation.to) {
			// The browser's own question is up now; send what can be sent while it is.
			pendingChanges.flushAuto();
			return;
		}
		target = { url: navigation.to.url, unload: navigation.willUnload };

		if (ask.length > 0) {
			labels = ask.map((e) => e.label).filter(Boolean);
			canSave = ask.every((e) => e.canSave);
			open('ask');
		} else {
			void settleAndGo();
		}
	});

	function open(next: Stage) {
		stage = next;
		if (!dialog?.open) dialog?.showModal();
	}

	function close() {
		if (dialog?.open) dialog.close();
	}

	async function go() {
		const to = target;
		target = null;
		stage = 'idle';
		if (!to) return;
		leaving = true;
		try {
			if (to.unload) {
				location.assign(to.url);
			} else {
				// The address came out of a navigation SvelteKit had already resolved; `resolve()`
				// builds routes, and this is a URL.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				await goto(to.url);
			}
		} finally {
			leaving = false;
		}
	}

	/** Waits for every save, then goes — or says why it cannot. */
	async function settleAndGo() {
		close();
		stage = 'saving';
		if (await pendingChanges.settle()) {
			await go();
		} else {
			labels = [];
			open('failed');
		}
	}

	function saveAndLeave() {
		const dirty = pendingChanges.askDirty(fieldsOf);
		const invalid = dirty.find((e) => !e.key.checkValidity());
		if (invalid) {
			// The browser points at the field itself; the dialog would only be in the way.
			close();
			stage = 'idle';
			target = null;
			invalid.key.reportValidity();
			return;
		}
		for (const entry of dirty) entry.key.requestSubmit();
		void settleAndGo();
	}

	function discard() {
		// Reset, not only forget: a navigation inside the same page keeps its forms, and they
		// must not go on showing what was just thrown away.
		for (const entry of pendingChanges.askDirty(fieldsOf)) {
			entry.key.reset();
			entry.touched = false;
		}
		if (stage === 'failed') {
			// What was refused stays refused; the rest has already arrived.
			close();
			void go();
			return;
		}
		void settleAndGo();
	}

	function stay() {
		close();
		stage = 'idle';
		target = null;
	}
</script>

{#if stage === 'saving'}
	<div class="toast toast-end z-50">
		<div class="alert" role="status">
			<span class="loading loading-spinner loading-sm"></span>
			<span>Wird gespeichert …</span>
		</div>
	</div>
{/if}

<!--
	Native <dialog>, like the help panel: focus trap, Escape and the return of focus come with it.
	Escape is "stay" — the one answer that loses nothing. On `cancel`, not `close`: the dialog also
	closes on its way to saving, and that must not forget where it was going.
-->
<dialog
	bind:this={dialog}
	class="modal"
	aria-labelledby="leave-guard-title"
	oncancel={(e) => {
		e.preventDefault();
		stay();
	}}
>
	<div class="modal-box flex flex-col gap-3">
		{#if stage === 'failed'}
			<h2 id="leave-guard-title" class="text-lg font-semibold">Nicht gespeichert</h2>
			<p class="text-base-content/90 text-sm">
				Eine Änderung auf dieser Seite wurde nicht gespeichert — warum, steht auf der Seite. Wenn Du
				jetzt gehst, ist sie verloren.
			</p>
		{:else}
			<h2 id="leave-guard-title" class="text-lg font-semibold">Noch nicht gespeichert</h2>
			<p class="text-base-content/90 text-sm">
				Hier ist etwas eingetragen, das noch nicht gespeichert ist{labels.length > 0 ? ':' : '.'}
			</p>
			{#if labels.length > 0}
				<ul class="text-base-content/90 list-inside list-disc text-sm">
					{#each labels as label, i (i)}
						<li>{label}</li>
					{/each}
				</ul>
			{/if}
			{#if !canSave}
				<p class="text-base-content/80 text-sm">
					Das lässt sich nur mit dem Knopf auf der Seite abschicken.
				</p>
			{/if}
		{/if}
		<div class="modal-action mt-1 flex-wrap">
			<button type="button" class="btn btn-ghost btn-sm" onclick={stay}>Hier bleiben</button>
			<button type="button" class="btn btn-sm" onclick={discard}>
				{stage === 'failed' ? 'Trotzdem verlassen' : 'Verwerfen'}
			</button>
			{#if stage === 'ask' && canSave}
				<button type="button" class="btn btn-primary btn-sm" onclick={saveAndLeave}>
					Speichern
				</button>
			{/if}
		</div>
	</div>
</dialog>
