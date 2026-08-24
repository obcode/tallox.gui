<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		PROGRAMME_STATUS_HINTS,
		PROGRAMME_STATUS_LABELS,
		programmeStatusBadge
	} from '$lib/catalogue';
	import { hasAnyRole } from '$lib/roles';
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

	const groups = $derived(
		ORDER.map((status) => ({
			status,
			rows: data.programmes.filter((p) => p.planningStatus === status)
		})).filter((g) => g.rows.length > 0)
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Studiengänge</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Welche Studiengänge die Fakultät plant. Der Modulkatalog des Prüfungsamts enthält jeden
			Studiengang, den irgendeine SPO erwähnt — auch solche, die jemand anderes betreibt, und
			solche, die ausgelaufen sind. <strong>Aus den ZPA-Daten geht das nicht hervor:</strong> die neuesten
			SPOs zweier geplanter Studiengänge sind von 2010 und damit älter als die jedes nicht geplanten.
			Also wird es hier entschieden.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Ein nicht geplanter Studiengang steht in keiner Auswahl und lässt sich keiner
			Studiengangsleitung zuordnen. Sein Bedarf bleibt lesbar — das ist die Aufzeichnung dessen, was
			die Fakultät getan hat — und seine Module bleiben im Katalog.
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

	{#each groups as group (group.status)}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-medium">
				{PROGRAMME_STATUS_LABELS[group.status]}
				<span class="text-base-content/80 text-sm font-normal">({group.rows.length})</span>
			</h2>
			<p class="text-base-content/80 text-sm">{PROGRAMME_STATUS_HINTS[group.status]}</p>

			<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
				<table class="table table-sm w-full min-w-[640px]">
					<thead>
						<tr>
							<th>Kürzel</th>
							<th>Name</th>
							<th>SPO</th>
							<th>Wird geplant?</th>
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
									<!--
										Der jetzige Zustand als Abzeichen, die beiden anderen als Knöpfe
										daneben: „es ist X, mach es zu Y oder Z". Ein Auswahlmenü mit
										„Speichern" wären zwei Schritte für eine Entscheidung aus drei
										Möglichkeiten — und der aktuelle Zustand als dritter Knopf wäre
										einer, der nichts tut außer den Zeitstempel zu bewegen.
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
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
</div>
