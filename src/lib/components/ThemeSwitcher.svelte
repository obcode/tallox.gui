<script lang="ts">
	import {
		SYSTEM_THEME,
		THEME_COOKIE,
		THEME_COOKIE_MAX_AGE,
		THEMES,
		type ThemeChoice
	} from '$lib/themes';

	let { current }: { current: ThemeChoice } = $props();

	// Two sources, deliberately kept apart: `current` comes from the cookie and is already right
	// during SSR, `chosen` only comes into being through a click. A $state initialised from
	// `current` would capture the prop once and stop following it afterwards.
	let chosen = $state<ThemeChoice | null>(null);
	const selected = $derived(chosen ?? current);

	// No reload and no invalidate(): the theme lives in a CSS attribute, and a round trip to the
	// server would be out of proportion for changing one. The cookie only makes sure the NEXT
	// SSR request already renders correctly.
	function choose(theme: ThemeChoice) {
		chosen = theme;

		if (theme === SYSTEM_THEME) {
			delete document.documentElement.dataset.theme;
		} else {
			document.documentElement.dataset.theme = theme;
		}

		// SameSite=Lax, no Secure: the value is a preference, not a secret, and in local
		// development the app runs over http.
		document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
	}

	const light = THEMES.filter((t) => !t.dark);
	const dark = THEMES.filter((t) => t.dark);
</script>

<div class="dropdown dropdown-top dropdown-end">
	<div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-1" title="Darstellung wählen">
		<span aria-hidden="true">🎨</span>
		<span class="hidden sm:inline">Design</span>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<ul
		tabindex="0"
		class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-10 mb-2 max-h-[70vh] w-52 flex-nowrap overflow-y-auto border p-2 shadow-lg"
	>
		<li>
			<button class:menu-active={selected === SYSTEM_THEME} onclick={() => choose(SYSTEM_THEME)}>
				<span aria-hidden="true">🖥️</span> System
			</button>
		</li>

		<li class="menu-title">Hell</li>
		{#each light as theme (theme.value)}
			<li>
				<button class:menu-active={selected === theme.value} onclick={() => choose(theme.value)}>
					{theme.label}
				</button>
			</li>
		{/each}

		<li class="menu-title">Dunkel</li>
		{#each dark as theme (theme.value)}
			<li>
				<button class:menu-active={selected === theme.value} onclick={() => choose(theme.value)}>
					{theme.label}
				</button>
			</li>
		{/each}
	</ul>
</div>
