<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		DOOR_LABELS,
		OUTCOME_HINTS,
		OUTCOME_LABELS,
		WINDOWS,
		asked,
		duration,
		outcomeBadge,
		when,
		who,
		withParam
	} from '$lib/access';
	import { roleLabel } from '$lib/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const counts = $derived(data.summary?.counts ?? null);

	/** The filters, as the link builder wants them. */
	const filters = $derived({
		days: data.days,
		mail: data.mail,
		door: data.door,
		only: data.only
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Zugriffe</h1>
		<p class="text-base-content/80 text-sm">
			Wer hat wann worauf zugegriffen — und wer wurde abgewiesen. Festgehalten wird die Operation
			und welche Felder sie angefragt hat, <strong
				>nie die Argumente, Variablen oder Antworten</strong
			>. „Prof. Eins hat <span class="font-mono">myWishes</span> aufgerufen“ steht hier; was darin stand,
			nicht. Einträge werden nach 90 Tagen gelöscht.
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-3">
		<label class="form-control">
			<span class="label-text text-sm">Zeitraum</span>
			<select name="zeitraum" class="select select-bordered select-sm">
				{#each WINDOWS as w (w.days)}
					<option value={w.days} selected={w.days === data.days}>{w.label}</option>
				{/each}
			</select>
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Person</span>
			<input
				name="person"
				type="search"
				value={data.mail}
				placeholder="Teil der Mailadresse"
				class="input input-bordered input-sm w-64 max-w-full"
			/>
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Tür</span>
			<select name="tuer" class="select select-bordered select-sm">
				<option value="" selected={data.door === ''}>beide</option>
				{#each Object.entries(DOOR_LABELS) as [value, label] (value)}
					<option {value} selected={data.door === value}>{label}</option>
				{/each}
			</select>
		</label>

		<label class="form-control">
			<span class="label-text text-sm">Zeigen</span>
			<select name="nur" class="select select-bordered select-sm">
				<option value="" selected={data.only === ''}>alles</option>
				<option value="auffaellig" selected={data.only === 'auffaellig'}>nur Auffälliges</option>
				<option value="aenderungen" selected={data.only === 'aenderungen'}>nur Änderungen</option>
			</select>
		</label>

		<button type="submit" class="btn btn-sm btn-primary">Anzeigen</button>
	</form>

	{#if counts}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-3 font-medium">
				{WINDOWS.find((w) => w.days === data.days)?.label}, über den ganzen Zeitraum
			</h2>
			<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div>
					<dt class="text-base-content/80 text-xs">Operationen</dt>
					<dd class="text-lg font-semibold">{counts.total}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Personen</dt>
					<dd class="text-lg font-semibold">{counts.people}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Browser / Token</dt>
					<dd class="text-lg font-semibold">{counts.interactive} / {counts.token}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Änderungen</dt>
					<dd class="text-lg font-semibold">{counts.mutations}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Abgewiesene Anmeldungen</dt>
					<dd class="text-lg font-semibold">{counts.refusedAuth}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Scope fehlte</dt>
					<dd class="text-lg font-semibold">{counts.refusedScope}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Nur interaktiv</dt>
					<dd class="text-lg font-semibold">{counts.refusedInteractive}</dd>
				</div>
				<div>
					<dt class="text-base-content/80 text-xs">Fehler</dt>
					<dd class="text-lg font-semibold">{counts.errors}</dd>
				</div>
			</dl>

			{#if data.summary && data.summary.roles.length > 0}
				<p class="text-base-content/80 mt-3 text-sm">
					Nach wirksamer Rolle:
					{#each data.summary.roles as r, i (r.role)}
						{i > 0 ? ' · ' : ''}{roleLabel(r.role)} {r.operations}
					{/each}
				</p>
			{/if}
		</div>
	{/if}

	{#if data.summary && data.summary.refused.length > 0}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border"
			tabindex="0"
			role="region"
			aria-label="Abgewiesene Anmeldungen"
		>
			<table class="table table-sm">
				<caption class="text-base-content/80 px-4 py-2 text-left text-sm">
					Abgewiesene Anmeldungen. Wer hier steht, hat eine HM-Kennung und in Tallox kein Konto —
					oder ein Token, das nicht mehr gilt. Das eine wird unter
					<a class="link" href={resolve('/verwaltung/personen')}>Personen und Rollen</a>
					behoben, das andere von der Person selbst.
				</caption>
				<thead>
					<tr>
						<th>Wer</th>
						<th>Grund</th>
						<th>Tür</th>
						<th>Versuche</th>
						<th>Zuletzt</th>
					</tr>
				</thead>
				<tbody>
					{#each data.summary.refused as r (r.mail + r.tokenId + r.reason + r.door)}
						<tr>
							<td class="font-mono text-xs">{who(r.mail, r.tokenId)}</td>
							<td class="font-mono text-xs">{r.reason || '—'}</td>
							<td class="text-base-content/90">{DOOR_LABELS[r.door]}</td>
							<td class="text-base-content/90">{r.attempts}</td>
							<td class="text-base-content/90">{when(r.lastAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!--
		Fokussierbar, weil scrollbar. Sobald das Protokoll Zeilen hat, ist die Tabelle breiter als
		der Bildschirm, und ein Bereich, der scrollt, muss von der Tastatur erreichbar sein
		(WCAG 2.1.1; axe meldet es als „serious"). Leer läuft nichts über — deshalb war der
		Befund allein nicht zu sehen und erst im vollen Lauf da, wo die anderen Tests Einträge
		erzeugen.

		Die Lint-Regel unten meint dekorative Elemente; ein Scroll-Container ist die dokumentierte
		Ausnahme, und die beiden Prüfer sind sich genau hier uneins. Dieselbe Stelle gab es schon
		auf /api-doku/schema.
	-->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border"
		tabindex="0"
		role="region"
		aria-label="Zugriffsprotokoll"
	>
		<table class="table table-sm">
			<caption class="text-base-content/80 px-4 py-2 text-left text-sm">
				Die Einträge selbst, neueste zuerst.
			</caption>
			<thead>
				<tr>
					<th>Wann</th>
					<th>Wer</th>
					<th>Tür</th>
					<th>Was</th>
					<th>Rollen</th>
					<th>Ergebnis</th>
					<th>Dauer</th>
					<th>Von</th>
				</tr>
			</thead>
			<tbody>
				{#each data.entries as entry (entry.id)}
					<tr>
						<td class="whitespace-nowrap">{when(entry.at)}</td>
						<td>
							<span class="font-mono text-xs">{who(entry.mail, entry.tokenId)}</span>
							{#if entry.personName}
								<div class="text-base-content/80 text-xs">{entry.personName}</div>
							{/if}
						</td>
						<td class="text-base-content/90">{DOOR_LABELS[entry.door]}</td>
						<td>
							<span class="font-mono text-xs">{asked(entry.operation, entry.fields)}</span>
							{#if entry.mutation}
								<span class="badge badge-sm badge-info ml-1">Änderung</span>
							{/if}
						</td>
						<td class="text-base-content/90 text-xs">
							{entry.roles.map(roleLabel).join(', ') || '—'}
							{#if entry.narrowedFrom}
								<div
									class="text-base-content/80"
									title="Die Person hält mehr, hat sich aber verengt"
								>
									verengt aus {entry.narrowedFrom.map(roleLabel).join(', ')}
								</div>
							{/if}
						</td>
						<td>
							<span
								class="badge badge-sm {outcomeBadge(entry.outcome)}"
								title={OUTCOME_HINTS[entry.outcome]}
							>
								{OUTCOME_LABELS[entry.outcome]}
							</span>
							{#if entry.errorCode}
								<div class="text-base-content/80 font-mono text-xs">{entry.errorCode}</div>
							{/if}
						</td>
						<td class="text-base-content/90 whitespace-nowrap">{duration(entry.durationMs)}</td>
						<td class="text-base-content/90 font-mono text-xs">{entry.sourceIp ?? '—'}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="text-base-content/80 text-sm">
							In diesem Zeitraum ist mit diesen Filtern nichts protokolliert.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.next}
		<div>
			<a
				class="btn btn-sm"
				href="{resolve('/verwaltung/zugriffe')}{withParam(filters, 'weiter', data.next)}"
			>
				Ältere anzeigen
			</a>
		</div>
	{/if}
</div>
