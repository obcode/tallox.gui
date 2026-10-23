<script lang="ts">
	import { resolve } from '$app/paths';
	import { mayOpen, type GuideLink } from '$lib/guide';

	let { links, roles }: { links: readonly GuideLink[]; roles: readonly string[] } = $props();
</script>

<!--
	Only what this person's menu also shows is linked. A step that sends a lecturer into the
	administration is a click into a refusal — and who does it is stated next to it
	anyway.
	-->
{#each links as link, i (link.href)}
	{#if i > 0},{/if}
	{#if link.href && mayOpen(link.href, roles)}
		<a class="link" href={resolve(link.href)}>{link.label}</a>
	{:else}
		<span>{link.label}</span>
	{/if}
{/each}
