<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { displayName, roleLabel } from '$lib/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Date and time as they are read in Europe/Berlin. */
	function when(value: string): string {
		return new Date(value).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function expired(value: string | null | undefined): boolean {
		return !!value && new Date(value).getTime() <= Date.now();
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Warum sieht jemand etwas nicht?</h1>
		<p class="text-base-content/80 text-sm">
			Zeigt, was die Regeln für eine Person beantworten — nie, was sie sehen würde. Der Inhalt
			bleibt vertraulich; hier stehen nur die Entscheidungen und ihre Begründung.
		</p>
	</div>

	<form method="GET" class="flex flex-wrap items-end gap-3">
		<label class="form-control">
			<span class="label-text text-sm">Mailadresse</span>
			<input
				name="mail"
				type="email"
				value={data.mail}
				required
				placeholder="vorname.nachname@hm.edu"
				class="input input-bordered input-sm w-72 max-w-full"
			/>
		</label>
		<button type="submit" class="btn btn-sm btn-primary">Nachsehen</button>
	</form>

	{#if data.mail && !data.diagnosis}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-warning badge-sm align-middle">Unbekannt</span>
				Unter <span class="font-mono">{data.mail}</span> ist in Tallox niemand eingetragen. Damit scheitert
				jede Anmeldung mit 401 — und das ist bei dieser Frage meist schon die ganze Antwort. Die Person
				lässt sich unter „Personen und Rollen“ mit der Adresse allein anlegen.
			</p>
		</div>
	{/if}

	{#if data.diagnosis}
		{@const d = data.diagnosis}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-2 font-medium">{displayName(d.person)}</h2>
			<p class="text-base-content/80 font-mono text-xs">{d.person.mail}</p>
			{#if !d.active}
				<p class="text-base-content/90 mt-3 text-sm">
					<span class="badge badge-error badge-sm align-middle">Deaktiviert</span>
					Die Anmeldung scheitert an beiden Türen, unabhängig von allen Rollen.
				</p>
			{/if}
		</div>

		<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border">
			<table class="table table-sm table-stack" use:stackedTable>
				<caption class="text-base-content/80 px-4 py-2 text-left text-sm">
					Rollen, abgelaufene eingeschlossen — die Frage „wer konnte das im Oktober sehen“ braucht
					sie.
				</caption>
				<thead>
					<tr>
						<th>Rolle</th>
						<th>Seit</th>
						<th>Bis</th>
						<th>Von</th>
					</tr>
				</thead>
				<tbody>
					{#each d.grants as grant (grant.role)}
						<tr>
							<td>
								{roleLabel(grant.role)}
								{#if expired(grant.expiresAt)}
									<span class="badge badge-ghost badge-sm ml-1">abgelaufen</span>
								{/if}
							</td>
							<td class="text-base-content/90">{when(grant.grantedAt)}</td>
							<td class="text-base-content/90">
								{grant.expiresAt ? when(grant.expiresAt) : '—'}
							</td>
							<td class="text-base-content/90">
								{#if grant.grantedBy}
									{displayName(grant.grantedBy)}
								{:else}
									<span class="text-base-content/80" title="Konfigurationsdatei oder Import">
										— maschinell —
									</span>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="4" class="text-base-content/80 text-sm">Keine Rolle vergeben.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<h2 class="mb-3 font-medium">Was die Regeln sagen</h2>
			<ul class="flex flex-col gap-3">
				{#each d.decisions as decision (decision.rule)}
					<li class="text-sm">
						<span class="badge badge-sm {decision.allowed ? 'badge-success' : 'badge-ghost'}">
							{decision.allowed ? 'ja' : 'nein'}
						</span>
						<span class="text-base-content/90 ml-1">{decision.reason}</span>
						<div class="text-base-content/80 mt-0.5 font-mono text-xs">{decision.rule}</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
