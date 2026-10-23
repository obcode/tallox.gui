<script lang="ts">
	import { resolve } from '$app/paths';
	import GuidePlaces from '$lib/components/GuidePlaces.svelte';
	import ProcessChart from '$lib/components/ProcessChart.svelte';
	import { GUIDE, isDue, type GuideStep } from '$lib/guide';
	import { ROLE_LABELS } from '$lib/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);

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

<svelte:head><title>Ablauf · Tallox</title></svelte:head>

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

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Ablauf der Einsatzplanung</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Der ganze Prozess Schritt für Schritt: wer etwas macht, wo, und was man dabei wissen muss. Was
			davon für Dich gerade dran ist, steht kürzer auf der <a class="link" href={resolve('/')}
				>Startseite</a
			>; die Schritte der aktuellen Phase sind hier markiert. Kürzer und aus Sicht der Dozierenden
			erklärt es die <a class="link" href={resolve('/einfuehrung')}>Einführung</a>. Welche Rollen Du
			hast und wofür sie gelten, denn eine Rolle ohne Zuordnung darf nichts:
			<a class="link" href={resolve('/konto/rollen')}>Meine Rollen</a>.
		</p>
	</div>

	<section class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="font-medium">Das Semester im Überblick</h2>
		<p class="text-base-content/80 mt-1 mb-3 max-w-3xl text-sm">
			Die Phasen eines Semesters der Reihe nach, und in jeder, wer was tut. Jeder Kasten führt zu
			seinem Schritt weiter unten. Das Einrichten fehlt im Bild, weil es an keinem Semester hängt.
			Die Phasen sind der Takt der Fakultät und keine Sperre: Bis einschließlich Studiengangs-Review
			lässt sich alles ändern oder zurückschalten, außer den markierten Schritten des Dekanats.
		</p>
		<ProcessChart planning={data.planning} />
	</section>

	<!--
		The process as numbered steps, in the order of the process. For each: who does it,
		where, and what one needs to know while doing it. The data lives in $lib/guide.ts so that
		the table below and the „Jetzt dran“ card on the start page are built from the same
		steps and nothing is written twice.
	-->
	{#each sections as { section, start } (section.title)}
		<section class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="font-medium">{section.title}</h2>
			<p class="text-base-content/80 mt-1 max-w-3xl text-sm">{section.intro}</p>
			<ol class="mt-3 flex flex-col gap-3" start={start + 1}>
				{#each section.steps as step, i (step.title)}
					<li id="schritt-{start + i + 1}" class="flex scroll-mt-24 gap-3">
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
								{#if isDue(step, data.planning)}
									<span class="badge badge-primary badge-sm">jetzt dran</span>
								{/if}
							</h3>
							<p class="text-base-content/90 max-w-3xl text-sm">{step.text}</p>
							<p class="text-base-content/80 text-sm">
								Wo: <GuidePlaces links={step.where} {roles} />
							</p>
							{#if step.when}
								<p class="text-base-content/80 text-sm">Wann: {step.when}</p>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</div>
