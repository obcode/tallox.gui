<script lang="ts">
	import { resolve } from '$app/paths';
	import { GUIDE, mayOpen, type GuideStep } from '$lib/guide';
	import { NAV_ITEMS, visibleNavItems } from '$lib/navigation';
	import { ALL_ROLES, ROLE_LABELS } from '$lib/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);

	// Through the same filter as the area bar. Otherwise this list announces an area that the
	// navigation directly above it hides — which does not look like a role rule but like a
	// defect.
	const planned = $derived(visibleNavItems(NAV_ITEMS, roles).filter((item) => !item.href));

	/**
	 * The steps, seen from the role: what does a subject group lead actually do here?
	 *
	 * Derived from the guide rather than written a second time, so the two answers to "who does
	 * what" — the walk-through and the table — cannot drift apart. A step nobody in particular
	 * does is everybody's, and everybody holds LECTURER.
	 */
	const stepsByRole = $derived(
		ALL_ROLES.map((role) => ({
			role,
			steps: GUIDE.flatMap((section) => section.steps).filter(
				(step) => step.who.includes(role) || (role === 'LECTURER' && step.who.length === 0)
			)
		}))
	);

	/** Continuous numbering across both sections: the process is one sequence. */
	const sections = (() => {
		let start = 0;
		return GUIDE.map((section) => {
			const numbered = { section, start };
			start += section.steps.length;
			return numbered;
		});
	})();
</script>

<svelte:head><title>Einsatzplanung · Tallox</title></svelte:head>

{#snippet who(step: GuideStep)}
	<span class="flex flex-wrap items-center gap-1">
		{#if step.who.length === 0}
			<span class="badge badge-neutral badge-sm">alle</span>
		{:else}
			{#each step.who as role (role)}
				<span class="badge badge-neutral badge-sm">{ROLE_LABELS[role]}</span>
			{/each}
		{/if}
	</span>
{/snippet}

{#snippet where(step: GuideStep)}
	<!--
		Verlinkt wird nur, was das Menü dieser Person auch zeigt. Ein Schritt, der eine Dozentin in
		die Verwaltung schickt, ist ein Klick in eine Ablehnung — und wer es macht, steht ohnehin
		daneben.
	-->
	{#each step.where as link, i (link.href)}
		{#if i > 0},{/if}
		{#if link.href && mayOpen(link.href, roles)}
			<a class="link" href={resolve(link.href)}>{link.label}</a>
		{:else}
			<span>{link.label}</span>
		{/if}
	{/each}
{/snippet}

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Einsatzplanung</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Lehr-Einsatzplanung der Fakultät 07 — Bedarf, Wünsche und Zuteilung an einem Ort. Es löst die
			Excel-Tabellen und die Confluence-Seite ab: <strong>geplant werden Instanzen</strong>, also
			ein Modul in einem Semester für einen Studiengang und einen Zug, und zugeteilt wird, wer die
			Vorlesung und wer das Praktikum hält.
		</p>
	</div>

	<!--
		Der Ablauf als durchnummerierte Schritte, in der Reihenfolge des Prozesses. Für jeden: wer
		es macht, wo, und was man dabei wissen muss. Die Daten stehen in $lib/guide.ts, damit die
		Tabelle darunter aus denselben Schritten entsteht und nichts zweimal geschrieben wird.
	-->
	{#each sections as { section, start } (section.title)}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="font-medium">{section.title}</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">{section.intro}</p>
			<ol class="mt-3 flex flex-col gap-3" start={start + 1}>
				{#each section.steps as step, i (step.title)}
					<li class="flex gap-3">
						<span
							class="bg-neutral text-neutral-content mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
							aria-hidden="true"
						>
							{start + i + 1}
						</span>
						<div class="flex flex-col gap-1">
							<h3 class="flex flex-wrap items-center gap-2 font-medium">
								{step.title}
								{@render who(step)}
							</h3>
							<p class="text-base-content/90 max-w-3xl text-sm">{step.text}</p>
							<p class="text-base-content/80 text-sm">
								Wo: {@render where(step)}
							</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}

	<section class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="font-medium">Wer macht was</h2>
		<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
			Die fünf Rollen, und welche Schritte sie betreffen. Eine Person kann mehrere haben; die
			Studiengangsleitung gilt für bestimmte Studiengänge, die Fachgruppenleitung für bestimmte
			Fachgruppen. Es gibt keine Rolle, die alles sieht: vor der Veröffentlichung liest die
			Administration keine Wünsche.
		</p>
		<div class="mt-3 overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Rolle</th>
						<th>Schritte</th>
					</tr>
				</thead>
				<tbody>
					{#each stepsByRole as entry (entry.role)}
						<tr>
							<td class="align-top whitespace-nowrap">
								<span class="badge badge-neutral badge-sm">{ROLE_LABELS[entry.role]}</span>
							</td>
							<td class="text-base-content/90 text-sm">
								{#if entry.role === 'ADMIN'}
									{entry.steps.map((s) => s.title).join(' · ')} · Zugriffsprotokoll und Diagnose. Liest
									bewusst keine Wünsche.
								{:else}
									{entry.steps.map((s) => s.title).join(' · ')}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

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
			<li>
				<span aria-hidden="true">🧭</span>
				Kompetenzprofil
				<span class="text-base-content/80">— welche Module jemand halten kann und möchte</span>
			</li>
			<li>
				<span aria-hidden="true">🚦</span>
				Deputat
				<span class="text-base-content/80"
					>— Lehrverpflichtung und die Überstunden-Ampel, nur im Browser</span
				>
			</li>
		</ul>
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
</div>
