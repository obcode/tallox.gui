<script lang="ts">
	import { resolve } from '$app/paths';
	import { mayOpen, type GuideLink } from '$lib/guide';

	let { links, roles }: { links: readonly GuideLink[]; roles: readonly string[] } = $props();
</script>

<!--
	Verlinkt wird nur, was das Menü dieser Person auch zeigt. Ein Schritt, der eine Dozentin in
	die Verwaltung schickt, ist ein Klick in eine Ablehnung — und wer es macht, steht ohnehin
	daneben.
-->
{#each links as link, i (link.href)}
	{#if i > 0},{/if}
	{#if link.href && mayOpen(link.href, roles)}
		<a class="link" href={resolve(link.href)}>{link.label}</a>
	{:else}
		<span>{link.label}</span>
	{/if}
{/each}
