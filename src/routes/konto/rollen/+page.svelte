<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Role } from '$lib/gql/__generated__/graphql';
	import {
		needsAttention,
		programmeReach,
		reachHint,
		subjectGroupReach,
		type ScopeReach
	} from '$lib/myRoles';
	import { ROLE_HINTS, ROLE_LABELS, roleLabels, sortRoles } from '$lib/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived((data.me?.roles ?? []) as Role[]);
	const held = $derived(sortRoles(roles) as Role[]);

	const programmes = $derived(data.me?.programmes ?? []);
	const led = $derived(data.me?.subjectGroupsLed ?? []);

	const programmes_ = $derived(programmeReach(roles, programmes));
	const groups_ = $derived(subjectGroupReach(roles, led));

	// The preview, if one is running. From the layout's session rather than from `me`: the two
	// are the same until somebody narrows, and the difference is exactly what has to be said.
	const narrowed = $derived(data.session?.narrowed ?? false);
	const effective = $derived(data.session?.effectiveRoles ?? []);
</script>

<svelte:head><title>Meine Rollen · Tallox</title></svelte:head>

{#snippet scope(title: string, reach: ScopeReach, axis: 'programme' | 'subjectGroup')}
	{@const hint = reachHint(reach, axis)}
	<!--
		Nur die beiden Fälle ohne Liste. Wo eine Liste steht, rendert der Block darunter
		dieselbe Überschrift — beides zu zeigen hieße sie zweimal zu schreiben, einmal über
		einer leeren Karte.
	-->
	{#if hint}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="font-medium">{title}</h2>
			<p class="text-base-content/90 mt-1 max-w-3xl text-sm">{hint}</p>
			{#if needsAttention(reach)}
				<p class="mt-2">
					<!--
						Ein Badge, keine Textfarbe: `text-warning` auf `base-100` ist auf den
						hellen Themes nicht lesbar, und daisyUI paart die semantischen Farben
						nur als Hintergrund mit ihrem `*-content`.
					-->
					<span class="badge badge-warning badge-sm">Zuordnung fehlt</span>
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Meine Rollen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Was dieser Server über Dich weiß, und was er Dich deshalb tun lässt. Angemeldet als
			<strong>{data.me?.name || data.me?.mail}</strong>.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Eine Rolle allein ist selten die ganze Auskunft: Studiengangsleitung gilt für bestimmte
			Studiengänge, Fachgruppenleitung für bestimmte Fachgruppen. <strong
				>Ohne Zuordnung darf eine solche Rolle nichts</strong
			> — nicht alles. Wenn also eine Seite leer bleibt, die voll sein müsste, steht die Erklärung hier.
		</p>
	</div>

	{#if narrowed}
		<div class="alert alert-info">
			<span>
				Gerade läuft eine <strong>Rollenvorschau</strong>: der Server beurteilt Deine Anfragen
				derzeit als
				{#if effective.length === 0}
					<strong>ganz ohne Rolle</strong>
				{:else}
					<strong>{roleLabels(effective)}</strong>
				{/if}. Unten stehen trotzdem die Rollen, die Du
				<em>hast</em> — die Vorschau nimmt weg, sie gibt nichts dazu.
			</span>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="font-medium">Rollen</h2>
		{#if held.length === 0}
			<p class="text-base-content/90 mt-1 max-w-3xl text-sm">
				Du hast ein Konto, aber keine Rolle. Das ist ungewöhnlich — fast alle haben mindestens
				Dozent:in. Die Administration vergibt Rollen unter „Personen und Rollen".
			</p>
		{:else}
			<ul class="mt-2 flex flex-col gap-2">
				{#each held as role (role)}
					<li class="flex flex-wrap items-baseline gap-2">
						<span class="badge badge-neutral badge-sm">{ROLE_LABELS[role]}</span>
						<span class="text-base-content/90 text-sm">{ROLE_HINTS[role]}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{@render scope('Studiengänge', programmes_, 'programme')}

	{#if programmes_.kind === 'some'}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="font-medium">Studiengänge</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Für diese Studiengänge legst Du den <a class="link" href={resolve('/bedarf')}>Bedarf</a> fest
				— und nur für diese.
			</p>
			<ul class="mt-2 flex flex-col gap-1">
				{#each programmes as programme (programme.code)}
					<li class="text-sm">
						<span class="font-mono font-medium">{programme.code}</span>
						<span class="text-base-content/90">— {programme.title}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{@render scope('Geleitete Fachgruppen', groups_, 'subjectGroup')}

	{#if groups_.kind === 'some'}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="font-medium">Geleitete Fachgruppen</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
				Deren Instanzen besetzt Du auf der <a class="link" href={resolve('/zuteilung')}
					>Zuteilungsseite</a
				>, dort öffnest und schließt Du ihre Wunschrunde, und die Wünsche auf ihren Modulen siehst
				Du schon <strong>vor</strong> der Veröffentlichung. Module dieser Fachgruppen zuordnen
				kannst Du im <a class="link" href={resolve('/module')}>Modulkatalog</a>.
			</p>
			<ul class="mt-2 flex flex-col gap-1">
				{#each led as group (group.id)}
					<li class="text-sm">
						<span class="font-mono font-medium">{group.code}</span>
						<span class="text-base-content/90">— {group.name}</span>
						{#if !group.active}
							<span class="badge badge-ghost badge-sm ml-1">stillgelegt</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="font-medium">Meine Fachgruppen</h2>
		<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
			In welchen Fächern Du arbeitest. <strong>Das ist keine Berechtigung</strong> — es entscheidet,
			was die
			<a class="link" href={resolve('/wuensche')}>Wunschseite</a> Dir zuerst zeigt. Mitglied zu sein
			ist etwas anderes, als die Fachgruppe zu leiten. Ändern unter
			<a class="link" href={resolve('/konto/fachgruppen')}>Meine Fachgruppen</a>.
		</p>
		{#if data.memberships.length === 0}
			<p class="text-base-content/80 mt-2 text-sm">Du bist noch keiner Fachgruppe beigetreten.</p>
		{:else}
			<ul class="mt-2 flex flex-col gap-1">
				{#each data.memberships as group (group.id)}
					<li class="text-sm">
						<span class="font-mono font-medium">{group.code}</span>
						<span class="text-base-content/90">— {group.name}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<p class="text-base-content/80 max-w-3xl text-sm">
		Rollen und Zuordnungen vergibt die Administration. Stimmt hier etwas nicht, ist das die Stelle,
		die es ändert — selbst ändern lässt sich nur, welchen Fachgruppen Du angehörst.
	</p>
</div>
