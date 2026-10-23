<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import {
		CHANGE_LABELS,
		KIND_LABELS,
		POLL_INTERVAL_MS,
		STATUS_LABELS,
		TRIGGER_LABELS,
		ZPA_DEPENDENCY,
		describeCounts,
		describeProgress,
		freshness,
		lastSuccessful,
		runProgress,
		runningRun,
		statusBadge
	} from '$lib/zpa';
	import { FINDING_LABELS, findingIsAlarming } from '$lib/catalogue';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const newest = $derived(lastSuccessful(data.runs));
	const fresh = $derived(freshness(newest?.finishedAt));
	const current = $derived(runningRun(data.runs));
	const running = $derived(current !== undefined);

	// The clock the elapsed seconds are measured against. Ticks with the polling, so the number
	// moves while the run does even when no endpoint has finished in between.
	let now = $state(new Date());
	const progress = $derived(current ? runProgress(current, now) : null);

	// While a run is going, read the page again once a second. It also follows a run the
	// nightly job started while the page happened to be open. The interval ends with the run:
	// the effect re-runs when `running` turns false and the cleanup clears it.
	$effect(() => {
		if (!running) return;
		const timer = setInterval(() => {
			now = new Date();
			void invalidate(ZPA_DEPENDENCY);
		}, POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	});
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
		The most important thing first, and as a whole sentence. The failure this import will
		really have is not a wrong diff but a job that quietly stopped three weeks ago — in the
		meantime every page looks healthy and planning happens with old data.
	-->
	<div class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<div class="flex flex-wrap items-center gap-3">
			<span
				class="badge badge-sm {fresh.level === 'ok'
					? 'badge-success'
					: fresh.level === 'warn'
						? 'badge-warning'
						: 'badge-error'}"
			>
				{fresh.level === 'ok'
					? 'aktuell'
					: fresh.level === 'warn'
						? 'eine Nacht fehlt'
						: 'veraltet'}
			</span>
			<p class="text-base-content/90">{fresh.message}</p>
		</div>

		{#if newest}
			<p class="text-base-content/80 text-sm">
				{when(newest.finishedAt)} · {TRIGGER_LABELS[newest.trigger]}{#if newest.startedBy},
					angestoßen von {newest.startedBy}{/if} · {describeCounts(newest)}
			</p>
		{/if}

		<form method="POST" action="?/sync" use:enhance class="flex items-center gap-3">
			<!--
				Cosmetic, not a lock: the same rule lives in internal/policy and also applies through
				the token door. The button is only disabled while something is actually running —
				enforcing the ten-minute limit is the backend's business, otherwise there would be two
				opinions about the same number.
			-->
			<button class="btn btn-sm btn-primary" disabled={running}>Jetzt abgleichen</button>
			{#if progress}
				<span class="text-base-content/80 text-sm">
					Ein Abgleich läuft seit {progress.seconds} s.
				</span>
			{:else}
				<span class="text-base-content/80 text-sm">Dauert etwa eine Viertelminute.</span>
			{/if}
		</form>

		{#if progress}
			<!--
				Endpoint by endpoint, the finest step there is: the database work of a whole run takes
				about a second, and most of the wait is a single request to the ZPA, so the bar can
				stand still for several seconds and that is the true state. The live region carries
				only the sentence that changes when an endpoint is done — the seconds stay outside it,
				or a screen reader would announce every tick.
			-->
			<div class="flex flex-col gap-1">
				<progress
					class="progress progress-primary w-full max-w-md"
					value={progress.done.length}
					max={progress.total}
					aria-label="Fortschritt des Abgleichs"
					aria-valuetext="{progress.done.length} von {progress.total} Quellen"
				></progress>
				<p class="text-base-content/80 text-sm" aria-live="polite">
					{describeProgress(progress)}
				</p>
			</div>
		{/if}

		{#if refusal}
			<p class="text-base-content/80 text-sm">
				<span class="badge badge-error badge-sm">nicht ausgeführt</span>
				{refusal.message}
			</p>
		{:else if form?.started && !running}
			<p class="text-base-content/80 text-sm">
				<span class="badge badge-success badge-sm">fertig</span>
				Der Abgleich ist durchgelaufen. Das Ergebnis steht oben und in der Liste darunter.
			</p>
		{:else if form?.projected}
			<p class="text-base-content/80 text-sm">
				<span class="badge badge-success badge-sm">fertig</span>
				Der Katalog wurde neu aufgebaut. Der Bericht steht unter „Katalog-Projektion“.
			</p>
		{/if}
	</div>

	<!--
		The catalogue is the second thing that can go stale, and therefore sits beside the runs
		rather than behind them: a successful sync with a failed projection is fresh raw data
		behind a weeks-old module list.
	-->
	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-semibold">
			<span aria-hidden="true">📚</span> Katalog-Projektion
		</h2>
		<p class="text-base-content/80 mb-3 text-sm">
			Was aus den abgeglichenen Rohdaten geworden ist: Studiengänge, Prüfungsordnungen und Module,
			wie Tallox mit ihnen plant. Läuft nach jedem vollständigen Abgleich automatisch.
		</p>

		{#if data.projection}
			<p class="text-base-content/90 text-sm">
				<span
					class="badge badge-sm {data.projection.status === 'SUCCEEDED'
						? 'badge-success'
						: data.projection.status === 'FAILED'
							? 'badge-error'
							: 'badge-ghost'}"
				>
					{data.projection.status === 'SUCCEEDED'
						? 'erfolgreich'
						: data.projection.status === 'FAILED'
							? 'gescheitert'
							: 'läuft'}
				</span>
				{when(data.projection.finishedAt ?? data.projection.startedAt)} ·
				{data.projection.programmesWritten} Studiengänge ·
				{data.projection.modulesWritten} Module ·
				{data.projection.offeringsWritten} Zuordnungen{#if data.projection.offeringsRemoved > 0},
					{data.projection.offeringsRemoved} entfallen{/if}
				{#if data.projection.runId === null}
					· von Hand angestoßen
				{/if}
			</p>

			{#if data.projection.error}
				<p class="text-base-content/90 mt-1 text-sm">{data.projection.error}</p>
			{/if}

			{#if data.projection.notes.length > 0}
				<div class="mt-3 overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Befund</th>
								<th class="text-right">Anzahl</th>
								<th>Beispiele</th>
							</tr>
						</thead>
						<tbody>
							{#each data.projection.notes as note (note.finding)}
								<tr>
									<td>
										{FINDING_LABELS[note.finding]}
										{#if findingIsAlarming(note.finding)}
											<!--
												Exactly one finding is a warning, and that is the point of the
												distinction: the rest are decisions the projection makes deliberately
												and reports, so that nobody has to puzzle over where the rows went.
											-->
											<span class="badge badge-error badge-sm ml-1">nachsehen</span>
										{/if}
									</td>
									<td class="text-right tabular-nums">{note.count}</td>
									<td class="text-base-content/80 font-mono text-xs">
										{note.sample.slice(0, 8).join(', ')}{note.sample.length > 8 ? ' …' : ''}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-base-content/80 mt-2 text-sm">Nichts zu berichten.</p>
			{/if}
		{:else}
			<p class="text-base-content/80 text-sm">
				Noch keine Projektion. Sie läuft nach dem nächsten vollständigen Abgleich, oder jetzt.
			</p>
		{/if}

		<form method="POST" action="?/project" use:enhance class="mt-3 flex items-center gap-3">
			<button class="btn btn-sm">Katalog neu aufbauen</button>
			<span class="text-base-content/80 text-sm">
				Nur aus dem, was schon zwischengespeichert ist — holt nichts vom ZPA.
			</span>
		</form>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- The runs. A gap in this list is the symptom one is meant to see. -->
		<div class="border-base-300 bg-base-100 rounded-lg border p-4 lg:col-span-1">
			<h2 class="mb-2 font-semibold">Läufe</h2>
			{#if data.runs.length === 0}
				<p class="text-base-content/80 text-sm">
					Noch kein Lauf. Ist <code>zpa.baseurl</code> und <code>zpa.token</code> gesetzt und der Host
					im eduVPN freigeschaltet?
				</p>
			{:else}
				<!--
					A GET form instead of links, as on the diagnostics page: the selection is a query, not
					an action, and the address of a particular report is exactly what one copies into an
					email. It works the same without JavaScript.
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
