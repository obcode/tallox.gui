<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ASSUME_COOKIE, ASSUME_COOKIE_MAX_AGE, serializeAssumedRoles } from '$lib/assumedRoles';
	import { mayPreviewRoles, ROLE_LABELS, sortRoles } from '$lib/roles';

	let {
		grantedRoles,
		effectiveRoles,
		narrowed
	}: {
		grantedRoles: readonly string[];
		effectiveRoles: readonly string[];
		narrowed: boolean;
	} = $props();

	const held = $derived(sortRoles(grantedRoles));
	const active = $derived(new Set(effectiveRoles));

	// A selection from the HELD roles only. That is not the interface being modest but the rule
	// itself: the backend intersects the selection with the roles held, so offering a role
	// somebody does not have would be a button with no effect.
	//
	// Anybody who wants to see what the dean's office sees grants themselves DEANS_OFFICE —
	// visibly, dated and with an expiry. That this is a detour is intentional: ADMIN
	// deliberately reads no unpublished wishes, and a preview that got around that would not be
	// a preview.
	async function assume(roles: string[]) {
		document.cookie = `${ASSUME_COOKIE}=${serializeAssumedRoles(roles)}; path=/; max-age=${ASSUME_COOKIE_MAX_AGE}; samesite=lax`;
		await invalidateAll();
	}

	async function reset() {
		// max-age=0 rather than a sentinel value: "not narrowed" is the absence of the cookie,
		// and one state should have only one representation.
		document.cookie = `${ASSUME_COOKIE}=; path=/; max-age=0; samesite=lax`;
		await invalidateAll();
	}
</script>

{#if mayPreviewRoles(grantedRoles)}
	<div class="dropdown dropdown-top dropdown-end">
		<div
			tabindex="0"
			role="button"
			class="btn btn-ghost btn-sm gap-1 font-normal"
			title="Ansicht einer einzelnen Rolle ausprobieren"
		>
			<span aria-hidden="true">🎭</span>
			<span class="hidden sm:inline">Rolle</span>
		</div>

		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<ul
			tabindex="0"
			class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-10 mb-2 w-72 border p-2 shadow-lg"
		>
			<li class="menu-title">Ansehen als</li>

			{#each held as role (role)}
				<li>
					<button class:menu-active={narrowed && active.has(role)} onclick={() => assume([role])}>
						{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
					</button>
				</li>
			{/each}

			<li>
				<button class:menu-active={narrowed && active.size === 0} onclick={() => assume([])}>
					<span class="text-base-content/90">Ohne jede Rolle</span>
				</button>
			</li>

			<li></li>
			<li>
				<!-- The way back. Deliberately here and not in the administration area: a narrowing
				     you can only end where the narrowing is currently taking the access away is a
				     trap. -->
				<button onclick={reset} disabled={!narrowed}>
					<span aria-hidden="true">↩️</span> Zurück zu meinen Rollen
				</button>
			</li>
		</ul>
	</div>
{/if}
