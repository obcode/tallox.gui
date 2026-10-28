<script lang="ts">
	import { secureCookieAttribute } from '$lib/cookies';
	import { invalidateAll } from '$app/navigation';
	import { ASSUME_COOKIE } from '$lib/assumedRoles';
	import { roleLabels } from '$lib/roles';

	let { effectiveRoles }: { effectiveRoles: readonly string[] } = $props();

	async function reset() {
		document.cookie = `${ASSUME_COOKIE}=; path=/; max-age=0; samesite=lax${secureCookieAttribute(location.protocol)}`;
		await invalidateAll();
	}
</script>

<!--
	Not dismissible, and above everything.

	Somebody who forgets they are narrowed eventually reports a missing feature as a bug — and in
	the worse case makes a decision based on a list that is deliberately incomplete. The strip
	costs 40 pixels and saves both.

	Colour as a background, not as a text colour: `text-warning` on base-100 sits between 1.35:1
	and 3.5:1 on the light themes and is therefore below the 4.5:1 of WCAG 1.4.3. daisyUI pairs
	`bg-warning` with `warning-content`, and that pair is built for contrast.
-->
<div
	class="bg-warning text-warning-content sticky top-0 z-30 px-3 py-1.5 text-sm sm:px-4 lg:px-8"
	role="status"
>
	<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
		<span aria-hidden="true">🎭</span>
		<span>
			Vorschau: Du siehst Tallox gerade
			{#if effectiveRoles.length === 0}
				als jemand <strong>ohne jede Rolle</strong>.
			{:else}
				als <strong>{roleLabels(effectiveRoles)}</strong>.
			{/if}
		</span>
		<button class="btn btn-xs ml-auto" onclick={reset}>Zurück zu meinen Rollen</button>
	</div>
</div>
