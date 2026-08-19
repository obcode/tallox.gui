<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import {
		CHANGE_LABELS,
		KIND_LABELS,
		STATUS_LABELS,
		TRIGGER_LABELS,
		describeCounts,
		freshness,
		lastSuccessful,
		statusBadge
	} from '$lib/zpa';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const newest = $derived(lastSuccessful(data.runs));
	const state = $derived(freshness(newest?.finishedAt));
	const running = $derived(data.runs.some((run) => run.status === 'RUNNING'));
	const refusal = $derived(form && 'message' in form ? form : null);

	const dateFormat = new Intl.DateTimeFormat('de-DE', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const when = (value: string | null | undefined) =>
		value ? dateFormat.format(new Date(value)) : '—';
</script>

<svelte:head><title>ZPA-Import — Tallox</title></svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">ZPA-Import</h1>
		<p class="text-base-content/80 text-sm">
			Die Modul-Stammdaten kommen aus dem ZPA. Tallox holt sie nächtlich und merkt sich, was sich
			geändert hat — die SPOs selbst werden weiterhin dort gepflegt.
		</p>
	</div>

	<!--
		Das Wichtigste zuerst und als ganzer Satz. Der Fehler, den dieser Import wirklich haben
		wird, ist nicht ein falscher Diff, sondern ein Job, der vor drei Wochen leise aufgehört
		hat — währenddessen sieht jede Seite gesund aus und geplant wird mit alten Daten.
	-->
	<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<div class="flex flex-wrap items-center gap-3">
			<span
				class="badge badge-sm {state.level === 'ok'
					? 'badge-success'
					: state.level === 'warn'
						? 'badge-warning'
						: 'badge-error'}"
			>
				{state.level === 'ok'
					? 'aktuell'
					: state.level === 'warn'
						? 'eine Nacht fehlt'
						: 'veraltet'}
			</span>
			<p class="text-base-content/90">{state.message}</p>
		</div>

		{#if newest}
			<p class="text-base-content/80 text-sm">
				{when(newest.finishedAt)} · {TRIGGER_LABELS[newest.trigger]}{#if newest.startedBy},
					angestoßen von {newest.startedBy}{/if} · {describeCounts(newest)}
			</p>
		{/if}

		<form method="POST" action="?/sync" use:enhance class="flex items-center gap-3">
			<!--
				Kosmetisch, kein Schloss: dieselbe Regel steht in internal/policy und gilt auch
				über die Token-Tür. Der Knopf wird nur gesperrt, während wirklich etwas läuft —
				die Zehn-Minuten-Grenze durchzusetzen ist Sache des Backends, sonst gäbe es zwei
				Meinungen über dieselbe Zahl.
			-->
			<button class="btn btn-sm btn-primary" disabled={running}>Jetzt abgleichen</button>
			{#if running}
				<span class="text-base-content/80 text-sm">Ein Abgleich läuft gerade.</span>
			{:else}
				<span class="text-base-content/80 text-sm">Dauert etwa eine Viertelminute.</span>
			{/if}
		</form>

		{#if refusal}
			<p class="text-base-content/80 text-sm">
				<span class="badge badge-error badge-sm">nicht ausgeführt</span>
				{refusal.message}
			</p>
		{:else if form?.started}
			<p class="text-base-content/80 text-sm">
				<span class="badge badge-success badge-sm">fertig</span>
				Der Abgleich ist durchgelaufen. Seite neu laden für das Ergebnis.
			</p>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- Die Läufe. Eine Lücke in dieser Liste ist das Symptom, das man sehen soll. -->
		<div class="border-base-300 bg-base-100 rounded-lg border p-4 lg:col-span-1">
			<h2 class="mb-2 font-semibold">Läufe</h2>
			{#if data.runs.length === 0}
				<p class="text-base-content/80 text-sm">
					Noch kein Lauf. Ist <code>zpa.baseurl</code> und <code>zpa.token</code> gesetzt und der Host
					im eduVPN freigeschaltet?
				</p>
			{:else}
				<!--
					Ein GET-Formular statt Links, wie auf der Diagnose-Seite: die Auswahl ist eine
					Abfrage, kein Vorgang, und die Adresse eines bestimmten Berichts ist genau das, was
					man in eine Mail kopiert. Ohne JavaScript funktioniert es genauso.
				-->
				<form method="GET" class="flex flex-col gap-1">
					{#each data.runs as run (run.id)}
						<button
							name="lauf"
							value={run.id}
							class="hover:bg-base-200 flex flex-col rounded px-2 py-1 text-left {run.id ===
							data.selected?.id
								? 'bg-base-200'
								: ''}"
						>
							<span class="flex items-center gap-2 text-sm">
								<span class="badge badge-sm {statusBadge(run.status)}"
									>{STATUS_LABELS[run.status]}</span
								>
								{when(run.startedAt)}
							</span>
							<span class="text-base-content/80 text-xs">
								{TRIGGER_LABELS[run.trigger]} · {describeCounts(run)}
							</span>
						</button>
					{/each}
				</form>
			{/if}
		</div>

		<div class="border-base-300 bg-base-100 rounded-lg border p-4 lg:col-span-2">
			{#if data.selected}
				<h2 class="mb-2 font-semibold">
					Lauf vom {when(data.selected.startedAt)}
				</h2>

				{#if data.selected.error}
					<p class="text-base-content/80 mb-3 text-sm">
						<span class="badge badge-error badge-sm">Fehler</span>
						{data.selected.error}
					</p>
				{/if}

				<div class="mb-4 overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr><th>Endpunkt</th><th>Status</th><th class="text-right">Objekte</th></tr>
						</thead>
						<tbody>
							{#each data.selected.kinds as kind (kind.kind)}
								<tr>
									<td>{KIND_LABELS[kind.kind]}</td>
									<td>
										<span class="badge badge-sm {statusBadge(kind.status)}"
											>{STATUS_LABELS[kind.status]}</span
										>
										{#if kind.error}
											<span class="text-base-content/80 text-xs">{kind.error}</span>
										{/if}
									</td>
									<td class="text-right tabular-nums">{kind.fetched}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<h3 class="mb-2 font-semibold">Änderungen</h3>
				{#if data.changes.length === 0}
					<p class="text-base-content/80 text-sm">
						Nichts. Das ist der Normalfall — die Stammdaten ändern sich selten.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr><th>Art</th><th>Objekt</th><th>Was</th><th>Felder</th></tr>
							</thead>
							<tbody>
								{#each data.changes as change (change.id)}
									<tr>
										<td>{KIND_LABELS[change.kind]}</td>
										<td>
											{change.label ?? `${KIND_LABELS[change.kind]} #${change.zpaId}`}
											<span class="text-base-content/80 text-xs">#{change.zpaId}</span>
										</td>
										<td
											><span class="badge badge-ghost badge-sm">{CHANGE_LABELS[change.change]}</span
											></td
										>
										<td class="text-base-content/80 text-xs">
											{change.changedKeys.join(', ') || '—'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{:else}
				<p class="text-base-content/80 text-sm">Kein Lauf ausgewählt.</p>
			{/if}
		</div>
	</div>
</div>
