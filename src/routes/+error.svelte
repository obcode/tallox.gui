<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { claimReload } from '#lib/staleBuild.ts';

	// The error page *inside* the frame: a page failed to load, the application itself did not.
	// The other case — somebody is not registered in Tallox at all — fails one level up, in the
	// layout itself, and therefore ends in src/error.html. SvelteKit renders no +error.svelte
	// for an error in the root layout, because that layout is the thing that failed.
	const forbidden = $derived(page.status === 403);

	// The page's code is gone after a deploy: loading the address in full fetches the new build.
	// Once per address and minute, so a chunk that is missing for good does not reload forever.
	// See #lib/staleBuild.
	let reloading = $state(false);
	onMount(() => {
		if (!page.error?.staleBuild) return;
		let storage: Storage | null = null;
		try {
			storage = sessionStorage;
		} catch {
			// Blocked storage: claimReload then declines, and the button stays.
		}
		if (claimReload(storage, location.href, Date.now())) {
			reloading = true;
			location.reload();
		}
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">
			{#if forbidden}
				Dafür fehlt die Berechtigung
			{:else}
				Das hat nicht geklappt
			{/if}
		</h1>
		<p class="text-base-content/80 text-sm">Fehler {page.status}</p>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<p class="text-base-content/90">{page.error?.message}</p>

		{#if page.error?.errorId}
			<p class="text-base-content/80 mt-3 text-sm">
				Fehlernummer <code class="font-mono" data-testid="error-id">{page.error.errorId}</code> — bitte
				bei einer Meldung mitschicken, zusammen mit dem, was Du gerade getan hast. Damit lässt sich der
				Fehler wiederfinden.
			</p>
		{/if}

		{#if page.error?.staleBuild}
			{#if reloading}
				<p class="text-base-content/80 mt-3 text-sm" role="status">Die Seite wird neu geladen …</p>
			{:else}
				<p class="text-base-content/80 mt-3 text-sm">
					Neu laden holt die aktuelle Fassung. Was Du gespeichert hast, bleibt erhalten.
				</p>
				<button type="button" class="btn btn-primary btn-sm mt-3" onclick={() => location.reload()}>
					Seite neu laden
				</button>
			{/if}
		{/if}

		{#if forbidden}
			<p class="text-base-content/80 mt-3 text-sm">
				Falls Du gerade eine Rolle zur Ansicht ausprobierst: der Streifen oben bringt Dich zu Deinen
				eigenen Rollen zurück.
			</p>
		{/if}
	</div>
</div>
