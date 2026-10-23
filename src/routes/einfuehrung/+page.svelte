<script lang="ts">
	import { resolve } from '$app/paths';
	import GuidePlaces from '$lib/components/GuidePlaces.svelte';
	import { GLOSSARY, howtos, isCurrentPhase, PHASES, PROMISES } from '$lib/intro';
	import { PHASE_LABELS, semesterName } from '$lib/semester';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);
	const stages = howtos();
</script>

<svelte:head><title>Einführung · Tallox</title></svelte:head>

<!--
	The introduction for everybody who teaches and plans nothing. The texts live in
	$lib/intro.ts, the instructions come from $lib/help.ts — here things are only laid out,
	not worded.
	-->
<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Einführung in Tallox</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Wozu es Tallox gibt, was es verspricht, wie ein Semester abläuft und was Du dabei tust. Den
			ganzen Prozess für alle Rollen beschreibt der <a class="link" href={resolve('/ablauf')}
				>Ablauf der Einsatzplanung</a
			>.
		</p>
	</div>

	<section aria-labelledby="intro-what" class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 id="intro-what" class="font-medium">Worum es geht</h2>
		<div class="text-base-content/90 mt-1 flex max-w-3xl flex-col gap-2 text-sm">
			<p>
				Tallox ist die Lehr-Einsatzplanung der Fakultät 07. Es löst die Excel-Tabellen und die
				Confluence-Seite ab, auf denen bisher Bedarf, Wünsche und Zuteilung standen, und bildet den
				Prozess so ab, wie ihn die Fakultät beschlossen hat.
			</p>
			<p>
				<strong>Geplant werden Instanzen, nicht Module:</strong> ein Modul in einem Semester für einen
				Studiengang und einen Zug, etwa „IF2A, Softwareentwicklung II“. Daran trägst Du Deine Wünsche
				ein, und die Fachgruppenleitung teilt dann zu, wer die Vorlesung und wer welches Praktikum hält.
			</p>
		</div>
	</section>

	<section aria-labelledby="intro-promises" class="flex flex-col gap-2">
		<h2 id="intro-promises" class="font-medium">Drei Versprechen an das Kollegium</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each PROMISES as promise (promise.title)}
				<div class="border-base-300 bg-base-100 rounded-lg border p-4">
					<h3 class="font-medium">{promise.title}</h3>
					<p class="text-base-content/90 mt-1 text-sm">{promise.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="intro-phases" class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 id="intro-phases" class="font-medium">Ein Semester in fünf Phasen</h2>
		<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
			Geplant wird immer das nächste Semester, während das laufende beginnt. Die Phase schaltet das
			Dekanat von Hand weiter, nie der Kalender.
			{#if data.planning.kind === 'set'}
				Gerade geplant wird das <strong>{semesterName(data.planning.code)}</strong>, es steht in der
				Phase „{PHASE_LABELS[data.planning.phase]}“.
			{:else if data.planning.kind === 'unset'}
				Welches Semester gerade geplant wird, hat das Dekanat noch nicht festgelegt.
			{/if}
		</p>
		<ol class="mt-3 flex flex-col gap-3">
			{#each PHASES as p, i (p.phase)}
				{@const now = isCurrentPhase(p.phase, data.planning)}
				<li class="flex gap-3">
					<span
						class={[
							'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
							now ? 'bg-primary text-primary-content' : 'bg-neutral text-neutral-content'
						]}
						aria-hidden="true"
					>
						{i + 1}
					</span>
					<div class="flex flex-col gap-1">
						<h3 class="flex flex-wrap items-center gap-2 font-medium">
							{PHASE_LABELS[p.phase]}
							{#if now}
								<span class="badge badge-primary badge-sm">hier stehen wir</span>
							{/if}
						</h3>
						<p class="text-base-content/90 max-w-3xl text-sm">{p.happens}</p>
						<p class="text-base-content/90 max-w-3xl text-sm">
							<strong>Für Dich:</strong>
							{p.forYou}
						</p>
						{#if p.where.length > 0}
							<p class="text-base-content/80 text-sm">
								Wo: <GuidePlaces links={p.where} {roles} />
							</p>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="intro-howtos" class="flex flex-col gap-2">
		<h2 id="intro-howtos" class="font-medium">Was Du tust</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each stages as stage (stage.stage)}
				<div class="border-base-300 bg-base-100 rounded-lg border p-4">
					<h3 class="font-medium">{stage.title}</h3>
					<ul class="mt-1 flex flex-col gap-1">
						{#each stage.entries as entry (entry.question)}
							<li>
								<details>
									<summary class="hover:bg-base-200 cursor-pointer rounded-md px-2 py-1.5 text-sm">
										{entry.question}
									</summary>
									<div class="flex flex-col gap-1 px-2 pt-1 pb-2">
										<p class="text-base-content/90 text-sm">{entry.answer}</p>
										<p class="text-base-content/80 text-sm">
											Wo: <GuidePlaces links={entry.where} {roles} />
										</p>
									</div>
								</details>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>

	<section
		aria-labelledby="intro-glossary"
		class="border-base-300 bg-base-100 rounded-lg border p-4"
	>
		<h2 id="intro-glossary" class="font-medium">Begriffe</h2>
		<dl class="mt-2 grid max-w-3xl grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
			{#each GLOSSARY as entry (entry.term)}
				<dt class="font-medium">{entry.term}</dt>
				<dd class="text-base-content/90">{entry.text}</dd>
			{/each}
		</dl>
	</section>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<section
			aria-labelledby="intro-curious"
			class="border-base-300 bg-base-100 rounded-lg border p-4"
		>
			<h2 id="intro-curious" class="font-medium">Für Neugierige: wie Tallox gebaut ist</h2>
			<div class="text-base-content/90 mt-1 flex flex-col gap-2 text-sm">
				<p>
					Ein Server hält alle Daten und alle Regeln. Diese Oberfläche zeigt nur an, was er
					herausgibt, und hat selbst keine Regeln. Die Moduldaten kommen aus dem ZPA.
				</p>
				<p>
					Zum Server führen zwei Türen: die Anmeldung mit der HM-Kennung im Browser und ein
					persönliches Token für eigene Skripte. Hinter beiden gilt dasselbe Regelwerk; ein Token
					kann nie mehr als die Person, der es gehört, und personenbezogene Daten gibt es nur über
					die Anmeldung im Browser.
				</p>
				<p class="text-base-content/80">
					Eigene Auswertungen, in Python, R oder was sonst zur Hand ist:
					<a class="link" href={resolve('/api-doku')}>API-Dokumentation</a> und
					<a class="link" href={resolve('/konto/tokens')}>Tokens</a>.
				</p>
			</div>
		</section>

		<section aria-labelledby="intro-help" class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 id="intro-help" class="font-medium">Wo es Hilfe gibt</h2>
			<ul class="text-base-content/90 mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
				<li>
					Die <strong>Hilfe</strong> (❓ oben rechts) auf jeder Seite: was jetzt dran ist, und Antworten
					auf Fragen zu der Seite, auf der Du gerade bist.
				</li>
				<li>
					Die <a class="link" href={resolve('/')}>Startseite</a> sagt, was in der aktuellen Phase für
					Dich ansteht.
				</li>
				<li>
					Der <a class="link" href={resolve('/ablauf')}>Ablauf der Einsatzplanung</a> beschreibt jeden
					Schritt, mit wer, wo und wann.
				</li>
			</ul>
		</section>
	</div>
</div>
