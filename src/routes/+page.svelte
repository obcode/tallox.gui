<script lang="ts">
	import { resolve } from '$app/paths';
	import { NAV_ITEMS, visibleNavItems } from '$lib/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Through the same filter as the area bar. Otherwise this list announces an area that the
	// navigation directly above it hides — which does not look like a role rule but like a
	// defect.
	const planned = $derived(
		visibleNavItems(NAV_ITEMS, data.session?.effectiveRoles ?? []).filter((item) => !item.href)
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Einsatzplanung</h1>
		<p class="text-base-content/80 text-sm">
			Lehr-Einsatzplanung der Fakultät 07 — Bedarf, Wünsche und Zuteilung an einem Ort.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 flex items-center gap-2 font-medium">
				<span aria-hidden="true">🔑</span> Anmeldung
			</h2>
			{#if data.remoteUser}
				<p class="text-sm">
					Angemeldet als <span class="font-mono">{data.remoteUser}</span>
					{#if data.remoteDisplayname}
						<span class="text-base-content/80">({data.remoteDisplayname})</span>
					{/if}
				</p>
			{:else}
				<p class="text-base-content/80 text-sm">
					Kein <span class="font-mono">X-Remote-User</span> gesetzt — lokale Entwicklung ohne Auth-Proxy.
				</p>
			{/if}
		</div>

		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 flex items-center gap-2 font-medium">
				<span aria-hidden="true">🔌</span> Backend
			</h2>
			{#if data.serverBuild}
				<p class="text-sm">
					Erreichbar, Version <span class="font-mono">{data.serverBuild.version}</span>.
				</p>
			{:else}
				<!-- The state sits in the badge, the sentence stays ordinary running text.
				     `text-error` as a text colour on base-100 falls below 4.5:1 on the light
				     themes. -->
				<p class="text-base-content/80 text-sm">
					<span class="badge badge-error badge-sm align-middle">Nicht erreichbar</span>
					Die Seite rendert trotzdem — Daten fehlen aber überall.
				</p>
			{/if}
		</div>
	</div>

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

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🚧</span> Was noch entsteht
		</h2>
		<ul class="text-base-content/90 flex flex-col gap-1 text-sm">
			{#each planned as item (item.label)}
				<li>
					<span aria-hidden="true">{item.emoji}</span>
					{item.label}
					<span class="text-base-content/80">— {item.hint}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>
