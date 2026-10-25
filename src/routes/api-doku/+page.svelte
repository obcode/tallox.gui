<script lang="ts">
	import { resolve } from '$app/paths';
	import ApiConsole from '$lib/components/ApiConsole.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selected = $state('curl');
	const example = $derived(data.examples.find((e) => e.id === selected) ?? data.examples[0]);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Die Tallox-API</h1>
		<p class="text-base-content/80 text-sm">
			Alles, was diese Oberfläche anzeigt, steht auch über die API zur Verfügung — für eigene
			Auswertungen aus einem Skript, einem Notebook oder R.
		</p>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🚪</span> Zwei Türen, ein Regelwerk
		</h2>
		<div class="text-base-content/90 flex flex-col gap-2 text-sm">
			<p>
				Diese Oberfläche spricht mit dem Server über <span class="font-mono">/query</span>, mit der
				Anmeldung der Hochschule. Skripte sprechen über
				<span class="font-mono">/api/graphql</span> mit einem Personal Access Token. Dahinter liegt
				<strong>dasselbe Schema und dasselbe Regelwerk</strong>: ein Token kann nie mehr als die
				Person, der es gehört, und wer eine Rolle verliert, verliert sie in jedem seiner Tokens
				sofort mit.
			</p>
			<p>
				Ein Unterschied bleibt, und er ist Absicht: <strong
					>einige Felder antworten über ein Token nicht</strong
				>. Personalbezogenes wie fremde noch unveröffentlichte Wünsche, die gewünschten und
				eingeplanten SWS anderer, Notizen zu Personen, das Protokoll — und die Tokenverwaltung
				selbst. Ein langlebiges Token in einem Skript ist eine andere Risikoklasse als eine
				angemeldete Sitzung: es ermöglicht stillen Massenabruf und trennt „wer hat das gesehen" von
				einem Anmeldevorgang.
			</p>
			<p>
				Solche Felder liefern <span class="font-mono">null</span>, statt die ganze Abfrage scheitern
				zu lassen — die übrigen Felder der Abfrage kommen also normal zurück. Wo das nicht geht,
				weil das Feld nicht leer sein darf, kommt eine Fehlermeldung mit dem Code
				<span class="font-mono">INTERACTIVE_ONLY</span>.
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 flex items-center gap-2 font-medium">
				<span aria-hidden="true">🔑</span> 1. Token anlegen
			</h2>
			<p class="text-base-content/90 text-sm">
				Unter <a class="link" href={resolve('/konto/tokens')}>Konto → Tokens</a>. Das Token wird
				genau einmal angezeigt; Tallox speichert davon nur eine Prüfsumme. Gültigkeit standardmäßig
				90 Tage, höchstens 365 — es gibt bewusst kein Token ohne Ablauf.
			</p>
		</div>

		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 flex items-center gap-2 font-medium">
				<span aria-hidden="true">🔗</span> 2. Endpunkt
			</h2>
			<p class="text-base-content/90 text-sm">
				<code class="bg-base-200 rounded px-1 py-0.5 font-mono text-xs">{data.endpoint}</code>
			</p>
			<p class="text-base-content/80 mt-2 text-sm">
				Nur im eduVPN erreichbar, wie die Oberfläche auch. Immer <span class="font-mono">POST</span
				>, immer <span class="font-mono">Content-Type: application/json</span>.
			</p>
		</div>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">📋</span> 3. Beispiel zum Kopieren
		</h2>

		<div role="tablist" class="tabs tabs-box mb-3 w-fit">
			{#each data.examples as candidate (candidate.id)}
				<button
					role="tab"
					class="tab"
					class:tab-active={selected === candidate.id}
					aria-selected={selected === candidate.id}
					onclick={() => (selected = candidate.id)}
				>
					{candidate.label}
				</button>
			{/each}
		</div>

		{#if example}
			<div class="overflow-x-auto">
				<pre class="bg-base-200 rounded-lg p-3 text-xs"><code>{example.code}</code></pre>
			</div>
		{/if}

		<p class="text-base-content/80 mt-2 text-sm">
			Das Token gehört in eine Umgebungsvariable, nicht in den Quelltext — ein Skript mit einem
			Token darin ist der wahrscheinlichste Weg, auf dem eines abhandenkommt.
		</p>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">🧪</span> Ausprobieren
		</h2>
		<p class="text-base-content/80 mb-3 text-sm">
			Läuft mit dem eingegebenen Token gegen dieselbe Tür wie ein Skript — man sieht hier also genau
			das, was das Skript sehen wird.
		</p>
		<ApiConsole endpoint={data.endpoint} />
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">📖</span> Was es gibt
		</h2>
		<p class="text-base-content/90 text-sm">
			Die vollständige <a class="link" href={resolve('/api-doku/schema')}>Schema-Referenz</a> — alle Typen
			und Felder, direkt aus dem Schema erzeugt, also nie veraltet.
		</p>
		<p class="text-base-content/80 mt-2 text-sm">
			Das Schema ist außerdem per Introspection abfragbar. Editoren und Codegeneratoren finden damit
			alles selbst; für GraphQL-Werkzeuge genügt die Endpunkt-URL und das Token.
		</p>
	</div>
</div>
