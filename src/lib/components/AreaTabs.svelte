<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { areaFor, isActive } from '$lib/navigation';

	/**
	 * The pages of the area the reader is in, as tabs above the page — "Meine Lehre" is wishes,
	 * competences and subject groups, and switching between them is one click.
	 *
	 * Rendered once in the layout rather than on each page, so that no page can forget it, and
	 * computed from the same list as the bar, so the two cannot disagree about what an area holds.
	 *
	 * Links in a `<nav>` with `aria-current`, not `role="tablist"`: each one loads a page of its
	 * own, and a tablist promises a screen reader panels on this page that the arrow keys switch.
	 * `tabs-box` because that is the variant whose contrast is measured (see `app.css`).
	 */
	let { effectiveRoles }: { effectiveRoles: readonly string[] } = $props();

	const pathname = $derived(page.url.pathname);
	const area = $derived(areaFor(pathname, effectiveRoles));
</script>

{#if area}
	<nav aria-label={area.label} class="mb-4">
		<div class="tabs tabs-box w-fit max-w-full flex-nowrap overflow-x-auto">
			{#each area.children ?? [] as tab (tab.href)}
				<a
					href={resolve(tab.href!)}
					title={tab.hint}
					class="tab whitespace-nowrap"
					class:tab-active={isActive(tab, pathname)}
					aria-current={isActive(tab, pathname) ? 'page' : undefined}
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</nav>
{/if}
