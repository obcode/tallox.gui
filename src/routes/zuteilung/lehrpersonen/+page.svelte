<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { namesOf } from '$lib/localTeachers';
	import { askBeforeLeave } from '$lib/saveOnLeave';
	import { stackedTable } from '$lib/stackedTable';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const message = $derived(form && 'message' in form ? form.message : null);
	const refusedId = $derived(form && 'id' in form ? form.id : null);
	const created = $derived(form && 'created' in form ? form.created : null);
	const changed = $derived(form && 'changed' in form ? form.changed : null);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h1 class="text-2xl font-semibold">Lehrpersonen, die noch nicht im ZPA stehen</h1>
		<p class="text-base-content/80 max-w-3xl text-sm">
			Wen das ZPA noch nicht führt, etwa Lehrbeauftragte für das kommende Semester, legst Du hier
			an. Danach steht die Person in der <a class="link" href={resolve('/zuteilung')}>Zuteilung</a>
			unter „Weitere Lehrende“ zur Auswahl, und bei den
			<a class="link" href={resolve('/zuteilung/kompetenzen')}>Kompetenzen der Fachgruppe</a>
			lassen sich Kompetenzen für sie eintragen. Ein Tallox-Konto bekommt sie dadurch nicht.
		</p>
		<p class="text-base-content/80 mt-2 max-w-3xl text-sm">
			Sobald das ZPA jemanden mit derselben Mailadresse führt, übernimmt der nächtliche Abgleich den
			Eintrag: Zuteilungen und Kompetenzen bleiben, Name und Angaben kommen dann aus dem ZPA.
			Anlegen dürfen Fachgruppenleitungen, Studiengangsleitungen und das Dekanat.
		</p>
	</div>

	{#if message && refusedId === null}
		<p class="text-base-content/90 text-sm" role="alert">
			<span class="badge badge-error badge-sm align-middle">Nicht angelegt</span>
			{message}
		</p>
	{/if}
	{#if created}
		<p class="text-base-content/90 text-sm" role="status">
			<span class="badge badge-success badge-sm align-middle">Angelegt</span>
			{created} steht jetzt in der Auswahl.
		</p>
	{/if}
	{#if changed}
		<p class="text-base-content/90 text-sm" role="status">
			<span class="badge badge-success badge-sm align-middle">Gespeichert</span>
			{changed}
		</p>
	{/if}

	<section
		class="border-base-300 bg-base-100 rounded-lg border p-4"
		aria-labelledby="new-teacher-heading"
	>
		<h2 id="new-teacher-heading" class="mb-2 text-lg font-semibold">Lehrperson anlegen</h2>
		<form
			method="POST"
			action="?/create"
			use:askBeforeLeave={{ label: 'Neue Lehrperson' }}
			class="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-5"
		>
			<label class="flex flex-col gap-1 text-sm">
				<span>Nachname</span>
				<input type="text" name="surname" required maxlength="200" class="input input-sm" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span>Vorname</span>
				<input type="text" name="givenName" maxlength="200" class="input input-sm" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span>Mailadresse</span>
				<input type="email" name="mail" required maxlength="320" class="input input-sm" />
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="isLecturerOnContract" checked class="checkbox checkbox-sm" />
				<span>Lehrbeauftragte</span>
			</label>
			<button type="submit" class="btn btn-sm btn-primary">Anlegen</button>
		</form>
	</section>

	<section aria-labelledby="local-teachers-heading" class="flex flex-col gap-2">
		<h2 id="local-teachers-heading" class="text-lg font-semibold">Von Hand angelegt</h2>
		{#if data.teachers.length === 0}
			<p class="text-base-content/80 text-sm">
				Noch niemand. Alle, die lehren, kommen bisher aus dem ZPA.
			</p>
		{:else}
			<table class="table-stack table min-w-[40rem]" use:stackedTable>
				<thead>
					<tr>
						<th>Name</th>
						<th>Mailadresse</th>
						<th>Angaben</th>
						<th>Korrigieren</th>
					</tr>
				</thead>
				<tbody>
					{#each data.teachers as t (t.id)}
						{@const names = namesOf(t.sortName)}
						<tr>
							<td>
								{t.name}
								<span class="badge badge-ghost badge-sm">nicht im ZPA</span>
							</td>
							<td>{t.mail ?? ''}</td>
							<td>
								{#if t.isLecturerOnContract}<span class="badge badge-sm">LB</span>{/if}
								{#if !t.active}<span class="badge badge-sm">aus den Listen genommen</span>{/if}
							</td>
							<td>
								<details open={refusedId === t.id}>
									<summary class="cursor-pointer text-sm">Bearbeiten</summary>
									{#if message && refusedId === t.id}
										<p class="text-base-content/90 mt-2 text-sm" role="alert">
											<span class="badge badge-error badge-sm align-middle">Nicht gespeichert</span>
											{message}
										</p>
									{/if}
									<form
										method="POST"
										action="?/change"
										use:askBeforeLeave={{ label: `Angaben zu ${t.name}` }}
										class="mt-2 flex flex-col gap-2"
									>
										<input type="hidden" name="id" value={t.id} />
										<label class="flex flex-col gap-1 text-sm">
											<span>Nachname</span>
											<input
												type="text"
												name="surname"
												required
												maxlength="200"
												value={names.surname}
												class="input input-sm"
											/>
										</label>
										<label class="flex flex-col gap-1 text-sm">
											<span>Vorname</span>
											<input
												type="text"
												name="givenName"
												maxlength="200"
												value={names.givenName}
												class="input input-sm"
											/>
										</label>
										<label class="flex flex-col gap-1 text-sm">
											<span>Mailadresse</span>
											<input
												type="email"
												name="mail"
												required
												maxlength="320"
												value={t.mail ?? ''}
												class="input input-sm"
											/>
										</label>
										<label class="flex items-center gap-2 text-sm">
											<input
												type="checkbox"
												name="isLecturerOnContract"
												checked={t.isLecturerOnContract}
												class="checkbox checkbox-sm"
											/>
											<span>Lehrbeauftragte</span>
										</label>
										<input type="hidden" name="active" value={t.active ? 'on' : 'off'} />
										<button type="submit" class="btn btn-sm">Speichern</button>
									</form>
									<form method="POST" action="?/change" use:enhance class="mt-2">
										<input type="hidden" name="id" value={t.id} />
										<input type="hidden" name="surname" value={names.surname} />
										<input type="hidden" name="givenName" value={names.givenName} />
										<input type="hidden" name="mail" value={t.mail ?? ''} />
										{#if t.isLecturerOnContract}
											<input type="hidden" name="isLecturerOnContract" value="on" />
										{/if}
										<input type="hidden" name="active" value={t.active ? 'off' : 'on'} />
										<button type="submit" class="btn btn-sm btn-ghost">
											{t.active ? 'Aus den Listen nehmen' : 'Wieder aufnehmen'}
										</button>
									</form>
								</details>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</div>
