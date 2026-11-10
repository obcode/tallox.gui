<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { NotificationKind } from '$lib/gql/__generated__/graphql';
	import {
		deliveryLabel,
		kindLabel,
		NOTIFICATION_KINDS,
		semesterScopeLabel,
		targetLabel,
		targetSetLabel,
		targetSetsFor,
		targetsFor
	} from '$lib/notifications';
	import { askBeforeLeave, autosave } from '$lib/saveOnLeave';
	import { stackedTable } from '$lib/stackedTable';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form : null);

	// The form's own state, so that the target list follows the chosen kind.
	let kind = $state<NotificationKind>('MODULE_OFFERED');
	const sets = $derived(targetSetsFor(kind));
	const targets = $derived(targetsFor(kind));

	const paused = $derived(
		data.pausedUntil !== null && data.pausedUntil >= new Date().toISOString().slice(0, 10)
	);
	const semesterChoices = $derived(
		[
			...new Set([...(data.planningSemester ? [data.planningSemester] : []), ...data.semesters])
		].sort()
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Benachrichtigungen</h1>
		<p class="mb-2 text-sm">
			<a class="link" href={resolve('/mitteilungen')}>📣 Rundmails lesen und schreiben →</a>
		</p>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Tallox schreibt Dir eine Mail, wenn etwas <strong>offiziell</strong> wird, das Du hier abonniert
			hast: ein Studiengang gibt seinen Bedarf frei, eine Fachgruppe öffnet oder schließt ihre Wunschrunde,
			Wünsche oder Zuteilungen werden veröffentlicht. Ein Modul, das jemand nur probeweise anklickt, löst
			nichts aus — gemeldet wird erst, was zehn Minuten Bestand hat.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			<strong>Ohne Abo kommt nichts.</strong> Wer sich wofür interessiert, steht in keiner Mail,
			auch nicht als Anzahl. Die Mails gehen an <strong>{data.mail}</strong>, die Adresse Deiner
			HM-Anmeldung. Rundmails der Leitungen kommen unabhängig davon; sie stehen unter
			<a class="link" href={resolve('/mitteilungen')}>Rundmails</a>.
		</p>
	</div>

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4" role="alert">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<h2 class="text-lg font-semibold">Empfohlene Abos</h2>
		<p class="text-base-content/80 text-sm">
			Alles rund um Deine eigenen Vormerkungen, Wünsche, Zuteilungen, Kompetenzen und Fachgruppen —
			etwa wenn eine Vormerkung zum Wunsch wird, eine Wunschrunde Deiner Fachgruppe schließt oder
			die Frist zum Bestätigen Deiner Zuteilungen näher rückt. Mit einem Klick übernommen, einzeln
			wieder abbestellbar.
		</p>
		<form method="POST" action="?/recommended" use:enhance>
			<button type="submit" class="btn btn-sm btn-primary">Empfohlene Abos übernehmen</button>
		</form>
	</section>

	<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<h2 class="text-lg font-semibold">Meine Abos</h2>
		{#if data.subscriptions.length === 0}
			<p class="text-base-content/80 text-sm">
				Noch keine. Ein einzelnes Modul abonnierst Du auf seiner
				<a class="link" href={resolve('/module')}>Modulseite</a> mit 🔔, alles andere unten.
			</p>
		{:else}
			<table class="table-stack table min-w-[40rem]" use:stackedTable>
				<thead>
					<tr>
						<th>Ereignis</th>
						<th>Wofür</th>
						<th>Semester</th>
						<th>Zustellung</th>
						<th><span class="sr-only">Entfernen</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.subscriptions as s (s.id)}
						<tr>
							<td>{kindLabel(s.kind)}</td>
							<td>
								{#if s.module}
									<a class="link" href={resolve(`/module/${s.module.id}`)}>{targetLabel(s)}</a>
								{:else}
									{targetLabel(s)}
								{/if}
							</td>
							<td>{semesterScopeLabel(s.semester)}</td>
							<td>
								<form method="POST" action="?/delivery" use:autosave={{ label: 'Zustellung' }}>
									<input type="hidden" name="id" value={s.id} />
									<select
										name="delivery"
										class="select select-bordered select-sm"
										aria-label="Zustellung für {kindLabel(s.kind)}, {targetLabel(s)}"
										value={s.delivery}
									>
										<option value="IMMEDIATE">{deliveryLabel('IMMEDIATE')}</option>
										<option value="DAILY">{deliveryLabel('DAILY')}</option>
									</select>
									<noscript><button type="submit" class="btn btn-xs">Speichern</button></noscript>
								</form>
							</td>
							<td data-label="">
								<form method="POST" action="?/unsubscribe" use:enhance>
									<input type="hidden" name="id" value={s.id} />
									<button
										type="submit"
										class="btn btn-ghost btn-xs"
										aria-label="Abo {kindLabel(s.kind)}, {targetLabel(s)} entfernen"
										>Entfernen</button
									>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<h2 class="text-lg font-semibold">Neues Abo</h2>
		<form
			method="POST"
			action="?/subscribe"
			use:askBeforeLeave={{ label: 'Neues Abo' }}
			class="grid grid-cols-1 gap-3 sm:grid-cols-2"
		>
			<label class="flex flex-col gap-1">
				<span class="text-base-content/90 text-sm">Wenn …</span>
				<select name="kind" class="select select-bordered w-full" bind:value={kind}>
					{#each NOTIFICATION_KINDS as k (k)}
						<option value={k}>{kindLabel(k)}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-base-content/90 text-sm">… und zwar für</span>
				<select name="target" class="select select-bordered w-full">
					<option value="ALL:">alle</option>
					{#if sets.length > 0}
						<optgroup label="Meins">
							{#each sets as set (set)}
								<option value="SET:{set}">{targetSetLabel(set)}</option>
							{/each}
						</optgroup>
					{/if}
					{#if targets.programme}
						<optgroup label="Studiengang">
							{#each data.programmes as p (p.code)}
								<option value="PROGRAMME:{p.code}">{p.code} — {p.title}</option>
							{/each}
						</optgroup>
					{/if}
					{#if targets.subjectGroup}
						<optgroup label="Fachgruppe">
							{#each data.subjectGroups as g (g.id)}
								<option value="SUBJECT_GROUP:{g.id}">{g.name}</option>
							{/each}
						</optgroup>
					{/if}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-base-content/90 text-sm">Semester</span>
				<select name="semester" class="select select-bordered w-full">
					<option value="">jedes Semester</option>
					{#each semesterChoices as code (code)}
						<option value={code}>{code}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-base-content/90 text-sm">Zustellung</span>
				<select name="delivery" class="select select-bordered w-full">
					<option value="IMMEDIATE">sofort (gebündelt, wenige Minuten danach)</option>
					<option value="DAILY">täglich gesammelt, morgens</option>
				</select>
			</label>
			<div class="sm:col-span-2">
				<button type="submit" class="btn btn-sm btn-primary">Abonnieren</button>
			</div>
		</form>
	</section>

	<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
		<h2 class="text-lg font-semibold">Pause</h2>
		<p class="text-base-content/80 text-sm">
			{#if paused}
				Pausiert bis einschließlich <strong>{data.pausedUntil}</strong>. Was in dieser Zeit
				offiziell wird, kommt auch danach nicht nach.
			{:else}
				Für eine Weile keine Abo-Mails, etwa im Urlaub. Was in dieser Zeit offiziell wird, kommt
				danach nicht nach; Rundmails kommen weiter.
			{/if}
		</p>
		<form
			method="POST"
			action="?/pause"
			use:askBeforeLeave={{ label: 'Pause' }}
			class="flex flex-wrap items-end gap-2"
		>
			<label class="flex flex-col gap-1">
				<span class="text-base-content/90 text-sm">Bis einschließlich</span>
				<input type="date" name="until" class="input input-bordered input-sm" required={!paused} />
			</label>
			<button type="submit" class="btn btn-sm">Pausieren</button>
			{#if paused}
				<button type="submit" name="resume" value="1" formnovalidate class="btn btn-sm btn-ghost"
					>Fortsetzen</button
				>
			{/if}
		</form>
	</section>
</div>
