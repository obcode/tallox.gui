/**
 * Themes and how they persist.
 *
 * Why a cookie and not localStorage (so: not `theme-change`): the app renders on the server.
 * With localStorage the server does not know the theme, ships the default markup, and only
 * after the first script does the page flip to the chosen theme — a visible flash on *every*
 * full load. A cookie travels with the SSR request, so the right `data-theme` is in the first
 * byte.
 *
 * Deliberately free of Svelte and browser APIs, so the selection logic can be checked in
 * vitest.
 */

/** Not `theme`: a generic cookie name collides with something else on the same domain. */
export const THEME_COOKIE = 'tallox_theme';

/** One year. Choosing a theme is a preference, not a session. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * "System" is not a daisyUI theme but the absence of a choice: without `data-theme` the themes
 * marked `--default` and `--prefersdark` in app.css take effect, and the page follows the
 * operating system's setting.
 */
export const SYSTEM_THEME = 'system';

/**
 * A curated selection. daisyUI ships more than 30 themes; offering all of them is a list to
 * scroll rather than a decision.
 *
 * MUST match the `themes:` list in app.css — that is where the CSS is generated, here it is
 * only selected. An entry app.css does not know about visibly switches to nothing.
 */
export const THEMES = [
	{ value: 'corporate', label: 'Corporate', dark: false },
	{ value: 'nord', label: 'Nord', dark: false },
	{ value: 'emerald', label: 'Emerald', dark: false },
	{ value: 'winter', label: 'Winter', dark: false },
	{ value: 'lofi', label: 'Lo-Fi', dark: false },
	{ value: 'retro', label: 'Retro', dark: false },
	{ value: 'cyberpunk', label: 'Cyberpunk', dark: false },
	{ value: 'dim', label: 'Dim', dark: true },
	{ value: 'business', label: 'Business', dark: true },
	{ value: 'night', label: 'Night', dark: true },
	{ value: 'dracula', label: 'Dracula', dark: true },
	{ value: 'sunset', label: 'Sunset', dark: true }
] as const;

export type ThemeName = (typeof THEMES)[number]['value'];
export type ThemeChoice = ThemeName | typeof SYSTEM_THEME;

/**
 * Turns a cookie value into a valid choice.
 *
 * The return value ends up unescaped in the `<html>` tag. That is why this is an allowlist and
 * not escaping: anything not in THEMES becomes `system`, so an attacker who sets the cookie
 * cannot write anything into the markup with it.
 */
export function resolveTheme(value: string | undefined | null): ThemeChoice {
	if (!value) return SYSTEM_THEME;
	return THEMES.some((t) => t.value === value) ? (value as ThemeName) : SYSTEM_THEME;
}

/**
 * The attribute for the `<html>` tag — for `system` deliberately the empty string, because
 * `--default` and `--prefersdark` only take effect without a `data-theme`.
 */
export function themeAttribute(choice: ThemeChoice): string {
	return choice === SYSTEM_THEME ? '' : `data-theme="${choice}"`;
}
