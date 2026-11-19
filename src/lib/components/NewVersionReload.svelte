<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { updated } from '$app/state';
	import { fieldsOf, pendingChanges } from '$lib/saveOnLeave';

	/**
	 * Once a newer build is deployed, the next click loads the page in full.
	 *
	 * The tab's own router only knows the chunks of the build it was opened with, and after a
	 * deploy those are gone (see $lib/staleBuild). `updated` learns of the new build from SvelteKit's
	 * polling, from returning to the tab, or from handleError after a failed import. From then on a
	 * link or a filter form is followed by the browser itself, which fetches the new build on the way.
	 *
	 * Only clicks and GET forms. A `goto` is code in the middle of something — LeaveGuard among
	 * others, after it has saved — and a back button cannot be turned into a forward load without
	 * breaking the history. Neither while LeaveGuard holds the navigation: it asks first, and
	 * after its answer the navigation comes back here as a `goto`. SvelteKit itself still reloads
	 * on a failed load in those cases.
	 */

	beforeNavigate((navigation) => {
		if (!updated.current || navigation.willUnload || !navigation.to) return;
		if (navigation.type !== 'link' && navigation.type !== 'form') return;
		if (pendingChanges.autoPending().length > 0) return;
		if (pendingChanges.askDirty(fieldsOf).length > 0) return;

		navigation.cancel();
		location.assign(navigation.to.url);
	});

	onMount(() => {
		// A tab left open overnight: the poll timer may have slept with the laptop, so ask as soon
		// as somebody looks at it again rather than on the first click.
		const onVisible = () => {
			if (document.visibilityState === 'visible' && !updated.current) void updated.check();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});
</script>
