<script lang="ts">
	import { resolve } from '$app/paths';
	import GuidePlaces from '$lib/components/GuidePlaces.svelte';
	import { GUIDE, isDue, type GuideStep } from '$lib/guide';
	import { ALL_ROLES, ROLE_LABELS } from '$lib/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const roles = $derived(data.session?.effectiveRoles ?? []);

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
			erklärt es die <a class="link" href={resolve('/einfuehrung')}>Einführung</a>.
		</p>
	</div>

	<!--
		Der Ablauf als durchnummerierte Schritte, in der Reihenfolge des Prozesses. Für jeden: wer
		es macht, wo, und was man dabei wissen muss. Die Daten stehen in $lib/guide.ts, damit die
		Tabelle darunter und die Karte „Jetzt dran“ auf der Startseite aus denselben Schritten
		entstehen und nichts zweimal geschrieben wird.
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

	<section class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="font-medium">Wer macht was</h2>
		<p class="text-base-content/80 mt-1 max-w-3xl text-sm">
			Die fünf Rollen, und welche Schritte sie betreffen. Eine Person kann mehrere haben; die
			Studiengangsleitung gilt für bestimmte Studiengänge, die Fachgruppenleitung für bestimmte
			Fachgruppen. Es gibt keine Rolle, die alles sieht: vor der Veröffentlichung liest die
			Administration keine Wünsche.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Welche Du selbst hast — und wofür sie gelten, denn eine Rolle ohne Zuordnung darf nichts:
			<a class="link" href={resolve('/konto/rollen')}>Meine Rollen</a>.
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
</div>
