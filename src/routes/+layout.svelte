<script lang="ts">
	import type { Snippet } from 'svelte';
	import Footer from '$lib/components/Footer.svelte';
	import NarrowingBanner from '$lib/components/NarrowingBanner.svelte';
	import NavBar from '$lib/components/NavBar.svelte';
	import type { LayoutData } from './$types';
	import '../app.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// No backend, no roles. That is not the same as "no permissions": the page keeps rendering
	// during a deploy, it then shows only the areas reserved for nobody, and the footer says
	// why. An access problem looks different — it ends in +error.svelte.
	const effectiveRoles = $derived(data.session?.effectiveRoles ?? []);
	const grantedRoles = $derived(data.session?.grantedRoles ?? []);
	const narrowed = $derived(data.session?.narrowed ?? false);
</script>

<div class="flex min-h-screen flex-col">
	{#if narrowed}
		<NarrowingBanner {effectiveRoles} />
	{/if}

	<NavBar
		remoteUser={data.remoteUser}
		remoteDisplayname={data.remoteDisplayname}
		{effectiveRoles}
	/>

	<!-- Horizontal padding comes from the layout. New pages do not set a p-8 of their own. -->
	<main class="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4 lg:px-8">
		{@render children()}
	</main>

	<Footer server={data.serverBuild} theme={data.theme} {effectiveRoles} {grantedRoles} {narrowed} />
</div>
