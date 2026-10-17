<script lang="ts">
	import { handbookHref } from '$lib/catalogue';

	/**
	 * A link to the module's page in the public module handbook, or nothing.
	 *
	 * The backend decides which modules have one — imported ones the examination office still
	 * offers — so a missing link is an answer, not a gap to explain here. `compact` is the
	 * catalogue table, where a word per row would be several hundred of them.
	 */
	let {
		module,
		compact = false
	}: { module: { name: string; handbookUrl?: string | null }; compact?: boolean } = $props();

	const href = $derived(handbookHref(module));
</script>

{#if href}
	<!-- `resolve()` is wrong here: the target is outside this app. The lint rule cannot see that
	     on a dynamic href, so it is off for this spot, as for the release link in the footer.
	     The address comes from the backend and is checked by handbookHref(). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	{#if compact}
		<a
			{href}
			target="_blank"
			rel="noopener noreferrer"
			class="link ml-1 no-underline"
			title="Im Modulhandbuch ansehen — öffnet einen neuen Tab"
			aria-label="{module.name || 'Modul'} im Modulhandbuch ansehen"
		>
			<span aria-hidden="true">📖</span>
		</a>
	{:else}
		<a
			{href}
			target="_blank"
			rel="noopener noreferrer"
			class="link"
			title="Öffnet das Modulhandbuch der Fakultät in einem neuen Tab"
		>
			Modulbeschreibung im Modulhandbuch ↗
		</a>
	{/if}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/if}
