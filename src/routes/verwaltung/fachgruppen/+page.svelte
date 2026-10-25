<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import PeoplePicker from '$lib/components/PeoplePicker.svelte';
	import { askBeforeLeave, autosave } from '$lib/saveOnLeave';
	import {
		isPlausibleCode,
		leadNames,
		mayLead,
		openWorkSentence,
		splitByActivity
	} from '$lib/subjectGroups';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// `people` answers null for anybody who may not administer — the field is @interactiveOnly and
	// ADMIN-scoped. Cosmetic, like every role check here: the backend refuses the mutations anyway.
	const mayAdminister = $derived(data.people !== null);
	const people = $derived(data.people ?? []);

	const refusal = $derived(form && 'message' in form ? form : null);

	const groups = $derived(splitByActivity(data.groups));

	// Sorted the way a person reads a list of colleagues: surname first where the examination
	// office publishes one, by name where it does not.
	const sortedPeople = $derived(
		[...people].sort((a, b) => (a.sortName || a.name).localeCompare(b.sortName || b.name, 'de'))
	);

	// Only somebody holding the role can lead a group. The backend refuses the rest, and the
	// composite foreign key refuses it even if the backend forgot — this is so the picker does not
	// offer a choice that always fails.
	const possibleLeads = $derived(sortedPeople.filter((p) => mayLead(p.roles)));

	let newCode = $state('');
	let newName = $state('');
	const codeIsPlausible = $derived(isPlausibleCode(newCode));
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Fachgruppen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Die fachliche Gruppierung von Modulen und Personen — Mathematik, Softwarefächer, Technische
			Informatik. Eine Fachgruppe hat <strong>kein Semester</strong>: sie wird nicht kopiert und
			überlebt jede SPO-Fassung.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			<strong>Mitgliedschaft und Leitung sind zweierlei.</strong> Die Mitgliedschaft sagt, in
			welchen Fächern jemand arbeitet, und gibt keine Leserechte. Sie bestimmt, was die Wunschseite
			zuerst anbietet, für welche Module jemand Kompetenzen angeben kann und welche Leitung die
			gewünschten SWS der Person sieht. Die Leitung ist eine Berechtigung: sie entscheidet, wer die
			Instanzen der Fachgruppe besetzt und wer vor der Veröffentlichung die Wünsche darauf sieht.
			Welche Module zu einer Gruppe gehören — jedes zu genau einer —, wird im
			<a class="link" href={resolve('/module')}>Modulkatalog</a> zugeordnet.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Module werden im <a class="link" href={resolve('/module')}>Modulkatalog</a> zugeordnet — dort steht
			die Liste, aus der ausgewählt wird.
		</p>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<p class="text-base-content/90 text-sm">
			{openWorkSentence(data.groupsWithoutLead, data.modulesWithoutSubjectGroup)}
		</p>
		<p class="text-base-content/80 mt-1 text-sm">
			„Keine Fachgruppe ohne Person, die sich ihrer annimmt“ steht hier als Zahl und nicht als
			Pflichtfeld: eine Fachgruppe muss anlegbar sein, bevor die Leitung feststeht, und eine Leitung
			muss entziehbar sein, ohne die Fachgruppe zu zerstören.
		</p>
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	{#if mayAdminister}
		<section class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
			<h2 class="text-lg font-medium">Neue Fachgruppe</h2>
			<form
				method="POST"
				action="?/create"
				use:askBeforeLeave={{ label: 'Neue Fachgruppe' }}
				class="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_auto]"
			>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Kürzel</span>
					<input
						name="code"
						bind:value={newCode}
						required
						placeholder="MATHE"
						class="input input-bordered input-sm w-full"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Name</span>
					<input
						name="name"
						bind:value={newName}
						required
						placeholder="Mathematik (klassisch)"
						class="input input-bordered input-sm w-full"
					/>
				</label>
				<div class="flex items-end">
					<button
						type="submit"
						class="btn btn-sm btn-primary w-full sm:w-auto"
						disabled={!codeIsPlausible || newName.trim() === ''}>Anlegen</button
					>
				</div>
			</form>
			<p class="text-base-content/80 text-sm">
				Überall in Tallox steht der Name. Das Kürzel ist die feste Kennung für Auswertungsskripte
				über die Programmierschnittstelle und lässt sich später nicht ändern — bis zu 16 Zeichen,
				Großbuchstaben, Ziffern, Punkt, Unterstrich oder Bindestrich. Eine geteilte Fachgruppe
				bekommt ein eigenes Kürzel (<code>MATHE-ML</code>) und einen Namen, der sie unterscheidet.
			</p>
		</section>
	{/if}

	{#each [{ title: 'Fachgruppen', rows: groups.active, retired: false }, { title: 'Stillgelegt', rows: groups.retired, retired: true }] as section (section.title)}
		{#if section.rows.length > 0}
			<section class="flex flex-col gap-2">
				<h2 class="text-lg font-medium">
					{section.title}
					<span class="text-base-content/80 text-sm font-normal">({section.rows.length})</span>
				</h2>
				{#if section.retired}
					<p class="text-base-content/80 max-w-3xl text-sm">
						Stillgelegt statt gelöscht. Eine geteilte Fachgruppe muss in der Planung, an der sie
						beteiligt war, weiterhin darstellbar bleiben, und ihre Modulzuordnung ist Wochen an
						Handarbeit.
					</p>
				{/if}

				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{#each section.rows as group (group.id)}
						<article class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<h3 class="text-base font-medium">
									{group.name}
									<!-- The short name is the group's key in the API and in scripts, so the
									     administration still shows it; nowhere else does. -->
									<span class="text-base-content/80 text-sm font-normal">
										Kürzel <span class="font-mono">{group.code}</span>
									</span>
								</h3>
								<span class="text-base-content/80 text-sm">
									{group.moduleCount}
									{group.moduleCount === 1 ? 'Modul' : 'Module'}
								</span>
							</div>

							<p class="text-base-content/90 text-sm">
								<span class="text-base-content/80">Leitung:</span>
								{leadNames(group.leads)}
							</p>
							<p class="text-base-content/90 text-sm">
								<span class="text-base-content/80">Mitglieder:</span>
								{group.members.length}
							</p>

							{#if mayAdminister}
								<!-- Saved when the field is left or Enter is pressed, like every other field here. -->
								<form
									method="POST"
									action="?/rename"
									use:autosave={{ label: `Name von ${group.code}` }}
									class="flex flex-wrap items-end gap-2"
								>
									<input type="hidden" name="id" value={group.id} />
									<label class="flex min-w-[12rem] grow flex-col gap-1">
										<span class="text-base-content/90 text-sm">Name</span>
										<input
											name="name"
											value={group.name}
											required
											class="input input-bordered input-sm w-full"
										/>
									</label>
									<noscript><button type="submit" class="btn btn-sm">Umbenennen</button></noscript>
								</form>

								{#if possibleLeads.length === 0}
									<div class="flex flex-col gap-1">
										<span class="text-base-content/90 text-sm">Leitung</span>
										<p class="text-base-content/80 text-sm">
											Niemand hat die Rolle Fachgruppenleitung. Sie wird in der
											<a class="link" href={resolve('/verwaltung/personen')}>Personenverwaltung</a>
											vergeben.
										</p>
									</div>
								{:else}
									<!--
										No {#key} on the saved set any more: the picker saves every tick itself and
										re-reads the set itself afterwards — a rebuild in the middle of clicking wiped
										out the next tick.
									-->
									<PeoplePicker
										groupId={group.id}
										action="?/setLeads"
										legend="Leitung"
										people={possibleLeads}
										selected={group.leads.map((l) => l.id)}
									/>
								{/if}

								<PeoplePicker
									groupId={group.id}
									action="?/setMembers"
									legend="Mitglieder"
									people={sortedPeople}
									selected={group.members.map((m) => m.id)}
									scrollable
								/>
								<form method="POST" action="?/setActive" use:enhance>
									<input type="hidden" name="id" value={group.id} />
									<input type="hidden" name="active" value={group.active ? 'false' : 'true'} />
									<button type="submit" class="btn btn-sm btn-ghost">
										{group.active ? 'Stilllegen' : 'Wieder aufnehmen'}
									</button>
								</form>
							{/if}
						</article>
					{/each}
				</div>
			</section>
		{/if}
	{/each}

	{#if data.groups.length === 0}
		<p class="text-base-content/80 text-sm">Noch keine Fachgruppe angelegt.</p>
	{/if}
</div>
