<script lang="ts">
	import { resolve } from '$app/paths';
	import DueNow from '$lib/components/DueNow.svelte';
	import SetupChecklist from '$lib/components/SetupChecklist.svelte';
	import WhoLeadsWhat from '$lib/components/WhoLeadsWhat.svelte';
	import { setupCard } from '$lib/setup';
	import { notOfferedNotice } from '$lib/advanceWishes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);
	const setup = $derived(data.setup ? setupCard({ ...data.setup, roles }) : null);
	const notOffered = $derived(notOfferedNotice(data.advance));
</script>

<svelte:head><title>Einsatzplanung · Tallox</title></svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Einsatzplanung</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Lehr-Einsatzplanung der Fakultät 07: Bedarf, Wünsche und Zuteilung an einem Ort. Neu hier? Die
			<a class="link" href={resolve('/einfuehrung')}>Einführung</a> erklärt die Grundideen, die Phasen
			eines Semesters und was Du dabei tust.
		</p>
	</div>

	<DueNow planning={data.planning} {roles} />

	{#if notOffered}
		<section
			class="border-base-300 bg-base-100 rounded-lg border p-4"
			aria-labelledby="not-offered"
		>
			<h2 id="not-offered" class="text-lg font-semibold">📌 Vormerkungen</h2>
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-warning badge-sm align-middle">nicht angeboten</span>
				{notOffered}
			</p>
			<p class="text-base-content/80 mt-1 text-sm">
				Wird das Modul doch noch angeboten, wird die Vormerkung zum Wunsch. Erledigtes ziehst Du
				unter <a class="link" href={resolve('/wuensche/vormerkungen')}>Vormerkungen</a> zurück.
			</p>
		</section>
	{/if}

	{#if setup}
		<SetupChecklist card={setup} {roles} />
	{/if}

	{#if data.overview}
		<WhoLeadsWhat
			programmes={data.overview.programmes}
			subjectGroups={data.overview.subjectGroups}
		/>
	{/if}

	<p class="text-base-content/80 max-w-3xl text-sm">
		Eigene Auswertungen gehen auch ohne diese Oberfläche, über die API mit einem
		<a class="link" href={resolve('/konto/tokens')}>Personal Access Token</a>:
		<a class="link" href={resolve('/api-doku')}>API-Dokumentation</a>.
	</p>
</div>
