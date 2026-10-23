<script lang="ts">
	import { resolve } from '$app/paths';
	import DueNow from '$lib/components/DueNow.svelte';
	import SetupChecklist from '$lib/components/SetupChecklist.svelte';
	import WhoLeadsWhat from '$lib/components/WhoLeadsWhat.svelte';
	import { setupCard } from '$lib/setup';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);
	const setup = $derived(data.setup ? setupCard({ ...data.setup, roles }) : null);
</script>

<svelte:head><title>Einsatzplanung · Tallox</title></svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Einsatzplanung</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Lehr-Einsatzplanung der Fakultät 07 — Bedarf, Wünsche und Zuteilung an einem Ort. Es löst die
			Excel-Tabellen und die Confluence-Seite ab: <strong>geplant werden Instanzen</strong>, also
			ein Modul in einem Semester für einen Studiengang und einen Zug, und zugeteilt wird, wer die
			Vorlesung und wer das Praktikum hält.
		</p>
		<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
			Neu hier? Die <a class="link" href={resolve('/einfuehrung')}>Einführung</a> erklärt die Grundideen,
			die Phasen eines Semesters und was Du dabei tust.
		</p>
	</div>

	<DueNow planning={data.planning} {roles} />

	{#if setup}
		<SetupChecklist card={setup} {roles} />
	{/if}

	{#if data.overview}
		<WhoLeadsWhat
			programmes={data.overview.programmes}
			subjectGroups={data.overview.subjectGroups}
		/>
	{/if}

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">📖</span> Auch ohne diese Oberfläche
		</h2>
		<p class="text-base-content/90 max-w-3xl text-sm">
			Fast alles, was hier zu sehen ist, steht auch über die GraphQL-API zur Verfügung — mit einem <a
				class="link"
				href={resolve('/konto/tokens')}>Personal Access Token</a
			> lassen sich eigene Auswertungen schreiben, in Python, R oder was sonst gerade zur Hand ist. Die
			API ist kein Nebenprodukt der Oberfläche, sondern derselbe Server mit denselben Regeln.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Wie das geht, mit Beispielen zum Kopieren und einer Konsole zum Ausprobieren:
			<a class="link" href={resolve('/api-doku')}>API-Dokumentation</a>. Zwei Dinge sind dort
			bewusst anders als hier: unveröffentlichte Wünsche anderer Personen und alles rund um Deputat
			bleiben der angemeldeten Sitzung im Browser vorbehalten, und den Bedarf ändert man ebenfalls
			nur hier.
		</p>
	</div>
</div>
