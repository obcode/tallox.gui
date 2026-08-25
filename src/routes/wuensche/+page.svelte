<script lang="ts">
	import { resolve } from '$app/paths';
	import WishForm from '$lib/components/WishForm.svelte';
	import { semesterName } from '$lib/semester';
	import {
		closedPhaseHint,
		groupByModule,
		myWishByPart,
		openPhaseHint,
		othersHint,
		splitByMySubjects,
		WISH_PRIORITY_LABELS,
		wishesAreOpen,
		wishRowLabel
	} from '$lib/wishes';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form : null);

	const phase = $derived(data.semester?.phase ?? null);
	const open = $derived(wishesAreOpen(phase));
	const published = $derived(data.semester?.wishesPublishedAt ?? null);

	const groups = $derived(groupByModule(data.instances));
	const myGroupCodes = $derived(data.mySubjectGroups.map((g) => g.code));
	const split = $derived(splitByMySubjects(groups, myGroupCodes));

	const mine = $derived(myWishByPart(data.myWishes));

	/**
	 * Other people's entries, per part.
	 *
	 * Built by dropping the caller's own rows from what the backend returned — never by counting
	 * anything. Before the publication date this map is empty for everybody who is not responsible
	 * for the instance, and that emptiness is the rule working rather than a fact about who is
	 * interested. The page says so in words rather than rendering a zero.
	 */
	const othersByPart = $derived.by(() => {
		// A plain record rather than a Map: this is rebuilt whole on every change, never mutated
		// in place, and svelte/prefer-svelte-reactivity has no way to tell the two apart.
		const byPart: Record<string, typeof data.wishes> = {};
		for (const wish of data.wishes) {
			if (wish.person.mail === data.me?.mail) continue;
			byPart[wish.part.id] = [...(byPart[wish.part.id] ?? []), wish];
		}
		return byPart;
	});

	// Somewhere to jump to. Retired semesters and ones nobody has decided anything about are both
	// in the list, because reading last year's wishes is a legitimate thing to want.
	const semesters = $derived(data.semesters.map((s) => s.code));
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Wünsche</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Interesse an einzelnen Instanz-Teilen bekunden — an einer Vorlesung, einer Praktikumsgruppe,
			einem Seminar. Zugeteilt wird später der Teil, nicht die ganze Instanz.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			<strong>Was Du hier einträgst, sehen andere bis zum Stichtag nicht</strong> — auch nicht als Anzahl.
			Das ist der Zweck der Wunschphase: niemand soll sich fragen müssen, ob ein Fach schon „besetzt“
			ist, bevor er sich einträgt.
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<label class="form-control">
			<span class="label-text text-sm">Semester</span>
			<select name="semester" class="select select-bordered select-sm">
				{#each semesters as code (code)}
					<option value={code} selected={code === data.semester?.code}>
						{semesterName(code)}
					</option>
				{/each}
			</select>
		</label>
		<button type="submit" class="btn btn-sm">Anzeigen</button>
	</form>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		{#if open}
			<p class="text-base-content/90 text-sm">{openPhaseHint(phase)}</p>
			<p class="text-base-content/80 mt-1 text-sm">
				Eintragen und Ändern geht, solange das Semester nicht abgeschlossen ist — die Wunschphase
				ist der Zeitpunkt, zu dem darum gebeten wird, und keine Frist, nach der nichts mehr
				korrigierbar wäre.
			</p>
		{:else}
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-ghost badge-sm align-middle">abgeschlossen</span>
				{closedPhaseHint(phase)}
			</p>
			<p class="text-base-content/80 mt-1 text-sm">
				Bereits eingetragene Wünsche bleiben sichtbar. In welcher Phase ein Semester steht, steht
				unter <a class="link" href={resolve('/semester')}>Semester</a>.
			</p>
		{/if}
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	<p class="text-base-content/80 max-w-3xl text-sm">{othersHint(published)}</p>

	{#each [{ title: 'Meine Fachgruppen', rows: split.mine, own: true }, { title: 'Alle weiteren Module', rows: split.others, own: false }] as section (section.title)}
		{#if section.rows.length > 0}
			<section class="flex flex-col gap-2">
				<h2 class="text-lg font-medium">
					{section.title}
					<span class="text-base-content/80 text-sm font-normal">({section.rows.length})</span>
				</h2>
				{#if section.own && myGroupCodes.length === 0}
					<p class="text-base-content/80 text-sm">
						Du bist noch keiner Fachgruppe zugeordnet — deshalb steht hier nichts. Eintragen lassen
						kannst Du Dich in der
						<a class="link" href={resolve('/verwaltung/fachgruppen')}>Fachgruppenverwaltung</a>.
					</p>
				{:else if !section.own}
					<p class="text-base-content/80 max-w-3xl text-sm">
						Die Fachgruppe ist eine Vorauswahl und keine Schranke: eintragen kannst Du Dich überall.
						Wer sich ein Gebiet erschließen will, tritt der Fachgruppe bei — das ist der Weg, nicht
						eine Ablehnung.
					</p>
				{/if}

				<div class="flex flex-col gap-3">
					{#each section.rows as group (group.moduleId)}
						<article class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<h3 class="text-base font-medium">{group.moduleName}</h3>
								{#if group.subjectGroupCode}
									<span class="text-base-content/80 font-mono text-sm"
										>{group.subjectGroupCode}</span
									>
								{/if}
							</div>

							<div class="overflow-x-auto">
								<table class="table table-sm w-full min-w-[560px]">
									<thead>
										<tr>
											<th>Zug und Teil</th>
											<th>Mein Wunsch</th>
											<th>Notiz</th>
											<th><span class="sr-only">Aktion</span></th>
										</tr>
									</thead>
									<tbody>
										{#each group.instances as instance (instance.id)}
											{#each instance.parts as part (part.id)}
												{@const wish = mine.get(part.id)}
												{@const others = othersByPart[part.id] ?? []}
												<tr>
													<td>
														<span class="font-medium">{wishRowLabel(instance, part)}</span>
														{#if others.length > 0}
															<!--
																Nur nach der Veröffentlichung nicht leer: davor
																liefert das Backend fremde Zeilen gar nicht erst
																aus. Namen, keine Zahl — eine Zahl wäre genau
																das Aggregat, das hier nie stehen darf.
															-->
															<div class="text-base-content/80 mt-1 text-sm">
																Außerdem eingetragen:
																{others.map((o) => o.person.name).join(', ')}
															</div>
														{/if}
													</td>
													<td colspan="3">
														<!--
															Der Schlüssel ist der gespeicherte Zustand, nicht die
															Teil-Kennung: die Komponente hält den Eingabestand lokal,
															und sie soll genau dann neu aufsetzen, wenn sich das
															Gespeicherte geändert hat — nach dem Speichern also, und
															nicht währenddessen.
														-->
														{#key `${wish?.id ?? ''}:${wish?.priority ?? ''}:${wish?.note ?? ''}`}
															<WishForm
																partId={part.id}
																label={wishRowLabel(instance, part)}
																{wish}
																{open}
															/>
														{/key}
													</td>
												</tr>
											{/each}
										{/each}
									</tbody>
								</table>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}
	{/each}

	{#if data.instances.length === 0}
		<p class="text-base-content/80 text-sm">
			Für dieses Semester ist noch kein Bedarf angemeldet — es gibt also nichts, worauf man sich
			eintragen könnte. Was angeboten wird, legen die Studiengangsleitungen unter
			<a class="link" href={resolve('/bedarf')}>Bedarf</a> fest.
		</p>
	{/if}

	{#if data.myWishes.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-medium">
				Meine Eintragungen
				<span class="text-base-content/80 text-sm font-normal">({data.myWishes.length})</span>
			</h2>
			<!--
				Die eigene Zahl ist unbedenklich: sie sagt nichts über andere. Genau deshalb steht
				sie hier und nirgends sonst auf dieser Seite.
			-->
			<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
				<table class="table table-sm w-full min-w-[560px]">
					<thead>
						<tr>
							<th>Modul</th>
							<th>Zug und Teil</th>
							<th>Priorität</th>
							<th>Notiz</th>
						</tr>
					</thead>
					<tbody>
						{#each data.myWishes as wish (wish.id)}
							<tr>
								<td class="font-medium">{wish.instance.module.name}</td>
								<td class="text-base-content/90">{wishRowLabel(wish.instance, wish.part)}</td>
								<td class="text-base-content/90">{WISH_PRIORITY_LABELS[wish.priority]}</td>
								<td class="text-base-content/80">{wish.note}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
