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
				Es gibt zwei Arten von Tokens. Ein <strong>normales Token</strong> ist für Auswertungen: es
				liest, was alle lesen dürfen, und Deine eigenen Daten, aber
				<strong>keine fremden unveröffentlichten Wünsche</strong>, keine gewünschten und
				eingeplanten SWS anderer, und es plant nicht. Ein langlebiges Token in einem Skript ist eine
				andere Risikoklasse als eine angemeldete Sitzung: es ermöglicht stillen Massenabruf und
				trennt „wer hat das gesehen" von einem Anmeldevorgang. Solche Felder liefern
				<span class="font-mono">null</span>, Planungsaktionen den Code
				<span class="font-mono">FULL_REACH_REQUIRED</span>.
			</p>
			<p>
				Ein <strong>Planungs-Token mit voller Reichweite</strong> kann alles, was Du im Browser kannst:
				Bedarf erklären und ändern, Teile zuteilen, veröffentlichen — und es liest dabei, was Du im Browser
				liest. Du wählst es beim Anlegen ausdrücklich, es gilt höchstens 90 Tage und steht im nächtlichen
				Zugriffsbericht.
			</p>
			<p>
				Für <strong>kein</strong> Token erreichbar sind die Tokenverwaltung selbst, die Verwaltung
				von Personen und Rollen und das Zugriffsprotokoll — sonst könnte ein abhandengekommenes
				Token sich selbst verlängern oder Rechte vergeben. Dort kommt
				<span class="font-mono">null</span>
				oder der Code <span class="font-mono">INTERACTIVE_ONLY</span>.
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
				90 Tage, höchstens 365, ein Planungs-Token höchstens 90 — es gibt bewusst kein Token ohne
				Ablauf.
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
			<span aria-hidden="true">🤖</span> Mit einem KI-Assistenten planen
		</h2>
		<div class="text-base-content/90 flex flex-col gap-2 text-sm">
			<p>
				Ein Assistent wie Claude kann über diese API planen, wenn Du ihm ein Planungs-Token gibst:
				Endpunkt-URL, das Token als <span class="font-mono">Authorization: Bearer …</span>, und den
				Hinweis, dass das Schema per Introspection abfragbar ist. Er sieht und darf dann genau das,
				was Du im Browser siehst und darfst.
			</p>
			<p class="text-base-content/80">
				Bedenke dabei: was das Token liest, liest der Assistent mit — in Deinem Bereich auch
				unveröffentlichte Wünsche des Kollegiums. Lege für jede Aufgabe ein eigenes Token an, so
				kurz gültig wie möglich, und widerrufe es danach auf der
				<a class="link" href={resolve('/konto/tokens')}>Token-Seite</a>.
			</p>
		</div>
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
