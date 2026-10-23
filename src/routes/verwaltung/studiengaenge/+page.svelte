<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { enhance } from '$app/forms';
	import {
		ALL_DEGREES,
		DEGREE_LABELS,
		PROGRAMME_STATUS_HINTS,
		PROGRAMME_STATUS_LABELS,
		degreeParam,
		programmeStatusBadge
	} from '$lib/catalogue';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import { formatHours } from '$lib/catalogue';
	import { studyYearLabel } from '$lib/controlling';
	import { hasAnyRole } from '$lib/roles';
	import { autosave } from '$lib/saveOnLeave';
	import { nextSort, sortRows, type SortState } from '$lib/sorting';
	import type { ProgrammeStatus } from '$lib/gql/__generated__/graphql';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Cosmetic, not a lock — policy.MayAdministerSemesters decides, and it applies to the token
	// door too. Worth doing: somebody who sees three buttons per row and gets a refusal on every
	// one of them learns to ignore refusals.
	const mayDecide = $derived(hasAnyRole(data.session?.effectiveRoles ?? [], ['DEANS_OFFICE']));

	const refusal = $derived(form && 'message' in form ? form : null);

	/** The order the list is read in: what is planned first, then why the rest is not. */
	const ORDER: ProgrammeStatus[] = ['PLANNED', 'DISCONTINUED', 'NOT_OURS'];

	// Sorted inside each status group, never across them: the groups are the answer to "is it
	// planned", and that stays the first thing the page says.
	type ProgrammeSortKey = 'code' | 'title' | 'spo' | 'degree';
	let programmeSort = $state<SortState<ProgrammeSortKey>>(null);
	const onProgrammeSort = (key: ProgrammeSortKey) => (programmeSort = nextSort(programmeSort, key));
	type Programme = PageData['programmes'][number];
	const programmeKeys = {
		code: (p: Programme) => p.code,
		title: (p: Programme) => p.title,
		spo: (p: Programme) =>
			p.spos.length === 0 ? undefined : Math.max(...p.spos.map((s) => s.version)),
		degree: (p: Programme) => (p.degree ? DEGREE_LABELS[p.degree] : undefined)
	};

	const groups = $derived(
		ORDER.map((status) => ({
			status,
			rows: sortRows(
				data.programmes.filter((p) => p.planningStatus === status),
				programmeSort,
				programmeKeys
			)
		})).filter((g) => g.rows.length > 0)
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Studiengänge</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Welche Studiengänge die Fakultät plant. Der Modulkatalog aus dem ZPA enthält jeden
			Studiengang, den irgendeine SPO erwähnt — auch solche, die jemand anderes betreibt, und
			solche, die ausgelaufen sind. <strong>Aus den ZPA-Daten geht das nicht hervor:</strong> die neuesten
			SPOs zweier geplanter Studiengänge sind von 2010 und damit älter als die jedes nicht geplanten.
			Also wird es hier entschieden.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Auch der <strong>Abschluss</strong> — Bachelor oder Master — steht nicht in den ZPA-Daten und wird
			hier einmal je Studiengang eingetragen. Zuteilung und Modulkatalog filtern danach; ein Studiengang
			ohne Eintrag fällt aus beiden Filtern heraus.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Ein nicht geplanter Studiengang steht in keiner Auswahl und lässt sich keiner
			Studiengangsleitung zuordnen. Sein Bedarf bleibt lesbar — das ist die Aufzeichnung dessen, was
			die Fakultät getan hat — und seine Module bleiben im Katalog.
		</p>
		{#if data.studyYear !== null}
			<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
				Das <strong>Kontingent</strong> ist die verfügbare Lehrleistung eines Studiengangs für das
				Studienjahr {studyYearLabel(data.studyYear)} aus der Kapazitätsrechnung, in Lehr-SWS mit allen
				Praktikums- und Übungsgruppen. Jedes Semester wird im SWS-Controlling gegen die Hälfte gelesen.
				Ein leeres Feld nimmt das Kontingent zurück.
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

	{#each groups as group (group.status)}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-medium">
				{PROGRAMME_STATUS_LABELS[group.status]}
				<span class="text-base-content/80 text-sm font-normal">({group.rows.length})</span>
			</h2>
			<p class="text-base-content/80 text-sm">{PROGRAMME_STATUS_HINTS[group.status]}</p>

			<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
				<table class="table table-sm w-full min-w-[640px] table-stack" use:stackedTable>
					<thead>
						<tr>
							<SortHeader label="Kürzel" key="code" sort={programmeSort} onsort={onProgrammeSort} />
							<SortHeader label="Name" key="title" sort={programmeSort} onsort={onProgrammeSort} />
							<SortHeader label="SPO" key="spo" sort={programmeSort} onsort={onProgrammeSort} />
							<SortHeader
								label="Abschluss"
								key="degree"
								sort={programmeSort}
								onsort={onProgrammeSort}
							/>
							<th>Wird geplant?</th>
							{#if group.status === 'PLANNED' && data.studyYear !== null}
								<th>
									Kontingent {studyYearLabel(data.studyYear)}
									<span class="block text-xs font-normal">SWS im Studienjahr</span>
								</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each group.rows as programme (programme.code)}
							<tr>
								<td class="font-medium">{programme.code}</td>
								<td class="text-base-content/90">{programme.title}</td>
								<td class="text-base-content/80 whitespace-nowrap">
									{#if programme.spos.length === 0}
										keine
									{:else}
										{Math.max(...programme.spos.map((s) => s.version))}
									{/if}
								</td>
								<td>
									{#if mayDecide}
										<form
											method="POST"
											action="?/setDegree"
											use:autosave={{ label: `Abschluss ${programme.code}` }}
										>
											<input type="hidden" name="code" value={programme.code} />
											<select
												name="degree"
												aria-label="Abschluss {programme.code}"
												class="select select-bordered select-xs"
											>
												<option value="" selected={!programme.degree}>nicht eingetragen</option>
												{#each ALL_DEGREES as degree (degree)}
													<option
														value={degreeParam(degree)}
														selected={programme.degree === degree}
													>
														{DEGREE_LABELS[degree]}
													</option>
												{/each}
											</select>
											<noscript
												><button type="submit" class="btn btn-xs">Speichern</button></noscript
											>
										</form>
									{:else if programme.degree}
										{DEGREE_LABELS[programme.degree]}
									{:else}
										<span class="badge badge-ghost badge-sm">nicht eingetragen</span>
									{/if}
								</td>
								<td>
									<!--
										The current state as a badge, the other two as buttons beside it: "it is X, make
										it Y or Z". A dropdown with „Speichern“ would be two steps for a decision
										between three options — and the current state as a third button would be one
										that does nothing except move the timestamp.
									-->
									<div class="flex flex-wrap items-center gap-1">
										<span class="badge {programmeStatusBadge(programme.planningStatus)} badge-sm">
											{PROGRAMME_STATUS_LABELS[programme.planningStatus]}
										</span>
										{#if mayDecide}
											{#each ORDER.filter((s) => s !== programme.planningStatus) as status (status)}
												<form method="POST" action="?/setStatus" use:enhance>
													<input type="hidden" name="code" value={programme.code} />
													<input type="hidden" name="status" value={status} />
													<button
														type="submit"
														class="btn btn-xs"
														title={PROGRAMME_STATUS_HINTS[status]}
													>
														{PROGRAMME_STATUS_LABELS[status]}
													</button>
												</form>
											{/each}
										{/if}
									</div>
								</td>
								{#if group.status === 'PLANNED' && data.studyYear !== null}
									{@const quota = data.quotas[programme.code]}
									<td>
										{#if mayDecide}
											<form
												method="POST"
												action="?/setQuota"
												use:autosave={{ label: `Kontingent ${programme.code}` }}
												class="flex items-center gap-1"
											>
												<input type="hidden" name="programme" value={programme.code} />
												<input type="hidden" name="studyYear" value={data.studyYear} />
												<input
													type="text"
													inputmode="decimal"
													name="hours"
													value={quota === undefined ? '' : formatHours(quota)}
													aria-label="Kontingent {programme.code} {studyYearLabel(data.studyYear)}"
													placeholder="–"
													class="input input-xs w-20 text-right tabular-nums"
												/>
												<!-- Saved on leaving the field or Enter; the button is for no JavaScript. -->
												<noscript
													><button type="submit" class="btn btn-xs">Speichern</button></noscript
												>
											</form>
										{:else}
											<span class="tabular-nums">
												{quota === undefined ? '–' : formatHours(quota)}
											</span>
										{/if}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
</div>
