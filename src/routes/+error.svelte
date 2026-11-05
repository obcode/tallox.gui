<script lang="ts">
	import { page } from '$app/state';

	// The error page *inside* the frame: a page failed to load, the application itself did not.
	// The other case — somebody is not registered in Tallox at all — fails one level up, in the
	// layout itself, and therefore ends in src/error.html. SvelteKit renders no +error.svelte
	// for an error in the root layout, because that layout is the thing that failed.
	const forbidden = $derived(page.status === 403);
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

		{#if forbidden}
			<p class="text-base-content/80 mt-3 text-sm">
				Falls Du gerade eine Rolle zur Ansicht ausprobierst: der Streifen oben bringt Dich zu Deinen
				eigenen Rollen zurück.
			</p>
		{/if}
	</div>
</div>
