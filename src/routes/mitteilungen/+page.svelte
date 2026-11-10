<script lang="ts">
	import { audienceKey, audienceLabel } from '$lib/notifications';
	import { askBeforeLeave } from '$lib/saveOnLeave';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const refusal = $derived(form && 'message' in form ? form : null);
	const preview = $derived(form && 'preview' in form ? form.preview : null);
	const sent = $derived(form && 'sent' in form ? form.sent : null);
	const draft = $derived(form && 'subject' in form ? form : null);

	const formatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Rundmails</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Mails, die Fachgruppen- und Studiengangsleitungen, das Dekanat oder die Administration aus
			Tallox verschickt haben — die, die Dich erreicht haben, und die, die Du selbst geschrieben
			hast. Jede geht einzeln an jede Person; niemand sieht, an wen sonst. Antworten gehen an die
			Person, die sie geschrieben hat. Abbestellen lassen sie sich nicht, abonnieren musst Du sie
			auch nicht.
		</p>
	</div>

	{#if sent !== null}
		<div class="border-base-300 bg-base-100 rounded-lg border p-4" role="status">
			<p class="text-base-content/90 text-sm">
				<span class="badge badge-success badge-sm align-middle">Verschickt</span>
				an {sent}
				{sent === 1 ? 'Person' : 'Personen'}. Die Mails gehen in den nächsten Minuten raus.
			</p>
		</div>
	{/if}

	{#if data.audiences.length > 0}
		<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-lg border p-4">
			<h2 class="text-lg font-semibold">Neue Rundmail</h2>
			{#if refusal}
				<p class="text-base-content/90 text-sm" role="alert">
					<span class="badge badge-error badge-sm align-middle">Nicht verschickt</span>
					{refusal.message}
				</p>
			{/if}
			<form
				method="POST"
				action="?/preview"
				use:askBeforeLeave={{ label: 'Neue Rundmail', canSave: false }}
				class="flex flex-col gap-3"
			>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">An</span>
					<select name="audience" class="select select-bordered w-full" required>
						{#each data.audiences as a (audienceKey(a))}
							<option value={audienceKey(a)} selected={draft?.audienceKey === audienceKey(a)}
								>{audienceLabel(a)}</option
							>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Betreff</span>
					<input
						name="subject"
						class="input input-bordered w-full"
						required
						maxlength="200"
						value={draft?.subject ?? ''}
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-base-content/90 text-sm">Text</span>
					<textarea
						name="body"
						class="textarea textarea-bordered min-h-48 w-full"
						required
						maxlength="20000">{draft?.body ?? ''}</textarea
					>
					<span class="text-base-content/80 text-xs">
						Leerzeile für einen neuen Absatz, „- “ für eine Liste, **fett**, [Text](https://…) für
						einen Link. Kein HTML.
					</span>
				</label>
				<div class="flex flex-wrap gap-2">
					<button type="submit" class="btn btn-sm">Vorschau</button>
					{#if preview}
						<button
							type="submit"
							formaction="?/send"
							class="btn btn-sm btn-primary"
							onclick={(e) => {
								if (
									!confirm(`Diese Rundmail jetzt an ${preview.recipientCount} Personen schicken?`)
								) {
									e.preventDefault();
								}
							}}
							>An {preview.recipientCount}
							{preview.recipientCount === 1 ? 'Person' : 'Personen'} schicken</button
						>
					{/if}
				</div>
			</form>

			{#if preview}
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold">So kommt sie an</h3>
					<p class="text-base-content/80 text-sm">
						Betreff: {preview.subject} · erreicht derzeit {preview.recipientCount}
						{preview.recipientCount === 1 ? 'Person' : 'Personen'}. Ändert sich der Text, bitte
						erneut „Vorschau“.
					</p>
					<!-- The mail's own HTML, in a frame that runs nothing: it is a document of its own. -->
					<iframe
						title="Vorschau der Rundmail"
						sandbox=""
						srcdoc={preview.html}
						class="border-base-300 h-[32rem] w-full rounded-lg border bg-white"
					></iframe>
				</div>
			{/if}
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<h2 class="text-lg font-semibold">Archiv</h2>
		{#if data.announcements.length === 0}
			<p class="text-base-content/80 text-sm">Noch keine Rundmails.</p>
		{:else}
			{#each data.announcements as a (a.id)}
				<article class="border-base-300 bg-base-100 flex flex-col gap-2 rounded-lg border p-4">
					<header>
						<h3 class="font-semibold">{a.subject}</h3>
						<p class="text-base-content/80 text-sm">
							{formatter.format(new Date(a.sentAt))} · von {a.sender.name}
							{audienceLabel(a.audience)}
							{#if a.recipientCount !== null && a.recipientCount !== undefined}
								· an {a.recipientCount} {a.recipientCount === 1 ? 'Person' : 'Personen'}
							{/if}
						</p>
					</header>
					<p class="text-base-content/90 text-sm whitespace-pre-line">{a.body}</p>
				</article>
			{/each}
		{/if}
	</section>
</div>
