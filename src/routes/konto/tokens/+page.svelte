<script lang="ts">
	import { stackedTable } from '$lib/stackedTable';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		AREA_HINTS,
		AREA_LABELS,
		CHOICE_LABELS,
		SELECTABLE_AREAS,
		UNREACHABLE_AREAS,
		areaFieldName,
		describeScopes
	} from '$lib/scopes';
	import SortHeader from '$lib/components/SortHeader.svelte';
	import { askBeforeLeave } from '$lib/saveOnLeave';
	import { nextSort, sortRows, type SortState } from '$lib/sorting';
	import { expiresIn, formatMoment, STATUS_BADGE, STATUS_LABEL, tokenStatus } from '$lib/tokens';
	import type { ActionData, PageData } from './$types';

	type TokenSortKey = 'description' | 'status' | 'created' | 'expires' | 'used';
	let tokenSort = $state<SortState<TokenSortKey>>(null);
	const onTokenSort = (key: TokenSortKey) => (tokenSort = nextSort(tokenSort, key));

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tokens = $derived(
		sortRows(data.tokens, tokenSort, {
			description: (token) => token.description,
			status: (token) => STATUS_LABEL[tokenStatus(token)],
			created: (token) => token.createdAt,
			expires: (token) => token.expiresAt,
			used: (token) => token.lastUsedAt
		})
	);

	// The freshly created token lives in this variable alone until the page is reloaded. It is
	// not put into localStorage and not written into the URL: both would outlive the moment it
	// is meant for.
	const created = $derived(form && 'created' in form ? form.created : null);
	const refusal = $derived(form && 'message' in form ? form : null);

	let copied = $state(false);

	// Only for the hint beside the lifetime field: the 90-day ceiling of a full-reach token is
	// the backend's rule, and a longer value is refused there with a sentence that says so.
	let fullReach = $state(false);

	// The description is bound to a writable derived rather than written as value={…}. Svelte 5
	// re-applies every expression of a template block when any of them changes, so a plain
	// value attribute was rewritten to '' the moment the full-reach box was ticked — and the
	// typed description was gone. It follows the server only when a refusal hands one back.
	let description = $derived(refusal?.description ?? '');

	async function copySecret(secret: string) {
		await navigator.clipboard.writeText(secret);
		copied = true;
		setTimeout(() => (copied = false), 3000);
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Personal Access Tokens</h1>
		<p class="text-base-content/80 text-sm">
			Für eigene Auswertungen gegen die Tallox-API — aus einem Skript, einem Notebook oder einem
			Cronjob — und, mit einem Planungs-Token, auch zum Planen, etwa mit einem KI-Assistenten. Wie
			man sie benutzt, steht in der <a class="link" href={resolve('/api-doku')}>API-Dokumentation</a
			>.
		</p>
	</div>

	{#if created}
		<!-- The only moment the secret exists. That is why it sits at the top, in a box of its
		     own, and the page says explicitly that it will not come back. -->
		<div class="border-success bg-base-100 flex flex-col gap-3 rounded-lg border-2 p-4">
			<div>
				<h2 class="flex items-center gap-2 font-medium">
					<span aria-hidden="true">🔑</span> Token angelegt: {created.token.description}
				</h2>
				<p class="text-base-content/90 text-sm">
					Jetzt kopieren — das Token wird <strong>nicht wieder angezeigt</strong>. Tallox speichert
					davon nur eine Prüfsumme. Verloren? Dann hier widerrufen und ein neues anlegen.
				</p>
			</div>

			<div class="flex flex-col gap-2 sm:flex-row">
				<!-- readonly rather than disabled: the value stays selectable and reachable for
				     screen readers, but cannot be changed by accident. -->
				<input
					class="input input-bordered w-full font-mono text-sm"
					value={created.secret}
					readonly
					aria-label="Neues Token"
					onfocus={(event) => event.currentTarget.select()}
				/>
				<button class="btn btn-primary" onclick={() => copySecret(created.secret)}>
					{copied ? 'Kopiert' : 'Kopieren'}
				</button>
			</div>
		</div>
	{/if}

	{#if refusal}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-error badge-sm align-middle">Fehlgeschlagen</span>
				{refusal.message}
			</p>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">➕</span> Neues Token
		</h2>

		<!--
			The scope controls sit in a fieldset outside the form element, so the description and
			the lifetime keep their one-line layout. `form="create-token"` is what puts them back
			into the same submission — an HTML attribute, so it works without JavaScript too.
		-->
		<form
			id="create-token"
			method="POST"
			action="?/create"
			use:askBeforeLeave={{
				label: 'Neues Token',
				// Not from the leave dialog: the secret is shown once, on this page, right after it
				// is created. Creating it on the way out mints a token nobody ever sees.
				canSave: false
			}}
			class="flex flex-col gap-3 sm:flex-row"
		>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-base-content/90 text-sm">Wofür?</span>
				<input
					class="input input-bordered w-full"
					name="description"
					required
					maxlength="200"
					placeholder="z. B. SWS-Controlling im Notebook"
					bind:value={description}
				/>
			</label>

			<label class="flex flex-col gap-1 sm:w-48">
				<span class="text-base-content/90 text-sm">Gültig für (Tage)</span>
				<input
					class="input input-bordered w-full"
					name="expiresInDays"
					type="number"
					min="1"
					max={fullReach ? 90 : 365}
					placeholder="90"
					aria-describedby="token-lifetime-hint"
				/>
				<span id="token-lifetime-hint" class="text-base-content/80 text-xs">
					{fullReach ? 'Planungs-Token: höchstens 90 Tage.' : 'Höchstens 365 Tage.'}
				</span>
			</label>

			<button class="btn btn-primary self-end">Anlegen</button>
		</form>

		<fieldset class="border-base-300 mt-4 rounded-lg border p-3">
			<legend class="text-base-content/90 px-1 text-sm font-medium">Planungs-Token</legend>

			<label class="flex items-start gap-2 py-1 text-sm">
				<input
					form="create-token"
					type="checkbox"
					name="fullReach"
					value="yes"
					bind:checked={fullReach}
					class="checkbox checkbox-sm mt-0.5"
				/>
				<span>
					<span class="font-medium">Volle Reichweite — zum Planen über die API</span>
					<span class="text-base-content/80">
						— das Token kann alles, was Du im Browser kannst: Bedarf erklären, Teile zuteilen,
						veröffentlichen, und es liest dabei auch, was Du im Browser liest, also auch
						unveröffentlichte Wünsche und Zuteilungen in Deinem Bereich. Nicht dabei sind Tokens,
						Personen und Rollen und das Zugriffsprotokoll; die gibt es nur im Browser.
					</span>
				</span>
			</label>

			{#if fullReach}
				<p class="text-base-content/80 mt-2 text-sm">
					<span class="badge badge-warning badge-sm align-middle">Vertraulich</span>
					Höchstens 90 Tage gültig und im nächtlichen Zugriffsbericht aufgeführt, solange es gilt. Wer
					oder was die Antworten dieses Tokens liest — auch ein KI-Assistent —, liest vertrauliche Daten
					mit. Ohne Häkchen bleibt ein Token bei dem, was eine Auswertung braucht: fremde Wünsche nur
					nach der Veröffentlichung, und geplant wird im Browser.
				</p>
			{/if}
		</fieldset>

		<fieldset class="border-base-300 mt-4 rounded-lg border p-3">
			<legend class="text-base-content/90 px-1 text-sm font-medium">Reichweite</legend>

			<!--
				The explicit choice exists because "nothing ticked" and "unrestricted" are the same
				value to the backend. Without this radio the form would show "kein Zugriff" beside
				every area and mint a token with no limits at all.
			-->
			<label class="flex items-start gap-2 py-1 text-sm">
				<input
					form="create-token"
					type="radio"
					name="restrict"
					value="no"
					checked
					class="radio radio-sm mt-0.5"
				/>
				<span>
					<span class="font-medium">Unbeschränkt</span>
					<span class="text-base-content/80">
						— alles, was Deine Rollen erlauben. Ein Token kann nie mehr als Du.
					</span>
				</span>
			</label>

			<label class="flex items-start gap-2 py-1 text-sm">
				<input
					form="create-token"
					type="radio"
					name="restrict"
					value="yes"
					class="radio radio-sm mt-0.5"
				/>
				<span>
					<span class="font-medium">Auf einzelne Bereiche einschränken</span>
					<span class="text-base-content/80">— dann unten auswählen.</span>
				</span>
			</label>

			<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each SELECTABLE_AREAS as area (area)}
					<div class="border-base-300 rounded-lg border p-3">
						<p class="text-sm font-medium">{AREA_LABELS[area]}</p>
						<p class="text-base-content/80 mb-2 text-xs">{AREA_HINTS[area]}</p>

						<div class="flex flex-wrap gap-x-4 gap-y-1">
							{#each ['none', 'READ', 'WRITE'] as const as choice (choice)}
								<label class="flex items-center gap-1.5 text-sm">
									<input
										form="create-token"
										type="radio"
										name={areaFieldName(area)}
										value={choice}
										checked={choice === 'none'}
										class="radio radio-xs"
									/>
									{CHOICE_LABELS[choice]}
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<p class="text-base-content/80 mt-3 text-xs">
				Nicht einschränkbar:
				{#each Object.entries(UNREACHABLE_AREAS) as [area, reason], index (area)}{index > 0
						? ' · '
						: ''}{AREA_LABELS[area as keyof typeof AREA_LABELS]} ({reason}){/each}
			</p>
		</fieldset>
	</div>

	<div class="border-base-300 bg-base-100 rounded-lg border p-4">
		<h2 class="mb-2 flex items-center gap-2 font-medium">
			<span aria-hidden="true">📋</span> Meine Tokens
		</h2>

		{#if data.tokens.length === 0}
			<p class="text-base-content/80 text-sm">Noch keine Tokens angelegt.</p>
		{:else}
			<!-- Wide tables live in overflow-x-auto so the page does not drift sideways at
			     375px. -->
			<div class="overflow-x-auto">
				<table class="table-zebra table text-sm table-stack" use:stackedTable>
					<thead>
						<tr>
							<SortHeader
								label="Beschreibung"
								key="description"
								sort={tokenSort}
								onsort={onTokenSort}
							/>
							<th>Reichweite</th>
							<SortHeader label="Status" key="status" sort={tokenSort} onsort={onTokenSort} />
							<SortHeader label="Angelegt" key="created" sort={tokenSort} onsort={onTokenSort} />
							<SortHeader label="Läuft ab" key="expires" sort={tokenSort} onsort={onTokenSort} />
							<SortHeader
								label="Zuletzt benutzt"
								key="used"
								sort={tokenSort}
								onsort={onTokenSort}
							/>
							<th><span class="sr-only">Aktion</span></th>
						</tr>
					</thead>
					<tbody>
						{#each tokens as token (token.id)}
							{@const status = tokenStatus(token)}
							<tr>
								<td>
									<div>{token.description}</div>
									<div class="text-base-content/80 font-mono text-xs">{token.id}</div>
								</td>
								<td class="text-base-content/90">
									{describeScopes(token.scopes)}
									{#if token.fullReach}
										<div><span class="badge badge-warning badge-sm">volle Reichweite</span></div>
									{/if}
								</td>
								<td>
									<span class="badge badge-sm {STATUS_BADGE[status]}">{STATUS_LABEL[status]}</span>
								</td>
								<td class="whitespace-nowrap">{formatMoment(token.createdAt)}</td>
								<td class="whitespace-nowrap">
									{formatMoment(token.expiresAt)}
									{#if status === 'active'}
										<div class="text-base-content/80 text-xs">{expiresIn(token.expiresAt)}</div>
									{/if}
								</td>
								<td class="whitespace-nowrap">{formatMoment(token.lastUsedAt)}</td>
								<td>
									{#if status !== 'revoked'}
										<form method="POST" action="?/revoke" use:enhance>
											<input type="hidden" name="id" value={token.id} />
											<button class="btn btn-ghost btn-xs">Widerrufen</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<p class="text-base-content/80 mt-3 text-sm">
			Ein Token kann nie mehr als die Person, der es gehört. Wer eine Rolle verliert, verliert sie
			damit auch in jedem seiner Tokens — sofort und ohne dass ein Token angefasst werden muss. Ein
			Planungs-Token mit voller Reichweite kann so viel wie Du im Browser, nicht mehr.
		</p>
	</div>
</div>
