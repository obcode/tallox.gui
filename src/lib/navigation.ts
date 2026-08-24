import type { RouteId } from '$app/types';
import type { Role } from '$lib/gql/__generated__/graphql';
import { hasAnyRole } from '$lib/roles';

/**
 * A route that can be linked to without arguments.
 *
 * `RouteId` grew a parameterised member with the module detail page, and `resolve()` refuses one
 * of those without its parameters — rightly, since a menu entry has none to give. Excluding them
 * here means a future `/bedarf/[semester]` cannot be put in the menu by accident instead of
 * being discovered as a type error in this file's four call sites.
 */
type StaticRoute = Exclude<RouteId, `${string}[${string}`>;

/**
 * The areas of the application, in the order of the planning process.
 *
 * Areas without an `href` are not built yet. They are listed anyway, damped and without a
 * link — a deliberate decision against two alternatives: a navigation with a single entry does
 * not show the structure of the process, and placeholder pages that only say "coming soon" are
 * click paths into nothing. This way what the tool is heading towards is visible at a glance,
 * without pretending anything is there.
 *
 * When an area comes into being: add the route, add the `href` here — nothing else.
 */
export type NavItem = {
	emoji: string;
	label: string;
	href?: StaticRoute;
	/** A short explanation, rendered as the title attribute. */
	hint: string;
	/**
	 * Who sees the entry. When the field is absent, everybody does.
	 *
	 * **Cosmetic, not a lock.** The same API is reachable directly with a Personal Access
	 * Token, bypassing this application — so what is hidden here is not protected, merely out
	 * of the way. The lock is in `internal/policy`.
	 *
	 * What it is worth anyway: a lecturer who sees "Statistik" and "Bedarf" in the menu and
	 * gets a refusal on every click learns to ignore refusals.
	 */
	roles?: readonly Role[];
};

export const NAV_ITEMS: readonly NavItem[] = [
	{ emoji: '🏠', label: 'Start', href: '/', hint: 'Übersicht' },
	{ emoji: '📚', label: 'Module', href: '/module', hint: 'Modulkatalog mit Heimatstudiengang' },
	{ emoji: '🗓️', label: 'Semester', href: '/semester', hint: 'Semester, Phasen und Meilensteine' },
	{
		// No roles: the demand is what the wish phase is about, so a lecturer who cannot see
		// which instances exist has nothing to register interest in. The page opens read-only for
		// everybody and offers the planning table to whoever may write it.
		emoji: '🎯',
		label: 'Bedarf',
		href: '/bedarf',
		hint: 'Was wird angeboten? Studiengangsleitungen legen es fest'
	},
	{ emoji: '✋', label: 'Wünsche', hint: 'Interesse an Instanz-Teilen bekunden' },
	{
		emoji: '🧩',
		label: 'Zuteilung',
		hint: 'Instanzen besetzen',
		roles: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE']
	},
	{
		emoji: '📊',
		label: 'Statistik',
		hint: 'Auswertungen für das Dekanat',
		roles: ['DEANS_OFFICE']
	}
];

/** Exact matches only: otherwise every entry would be active on `/`. */
export function isActive(item: NavItem, pathname: string): boolean {
	if (!item.href) return false;
	if (item.href === '/') return pathname === '/';
	return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * What does not belong to the planning process but still has to be reachable.
 *
 * Separate from NAV_ITEMS because the area bar shows the *steps of the process* — the account
 * and the API are not steps but tools. Sorted into the bar they would make the order
 * unreadable, and that order is the whole point of it; so they live in the menu next to the
 * identity.
 */
export const ACCOUNT_ITEMS: readonly NavItem[] = [
	{
		emoji: '🔑',
		label: 'Tokens',
		href: '/konto/tokens',
		hint: 'Personal Access Tokens für eigene Auswertungen'
	},
	{
		emoji: '📖',
		label: 'API-Doku',
		href: '/api-doku',
		hint: 'Wie man die API aus einem Skript benutzt'
	},
	{
		emoji: '🛠️',
		label: 'Verwaltung',
		href: '/verwaltung/personen',
		hint: 'Wer Tallox benutzen darf, und mit welchen Rollen',
		roles: ['ADMIN']
	},
	{
		emoji: '📥',
		label: 'ZPA-Import',
		href: '/verwaltung/zpa',
		hint: 'Wann kamen die Modul-Stammdaten zuletzt, und was hat sich geändert',
		roles: ['ADMIN', 'DEANS_OFFICE']
	},
	{
		emoji: '🔍',
		label: 'Diagnose',
		href: '/verwaltung/diagnose',
		hint: 'Warum sieht jemand etwas nicht? Entscheidungen, keine Inhalte',
		roles: ['ADMIN']
	}
];

/**
 * Filters entries down to the ones these roles should see.
 *
 * Takes the **effective** roles from `session.effectiveRoles`, not the held ones: somebody who
 * has narrowed themselves should see the narrowed role's menu too — otherwise the preview
 * shows something other than what the server judges the request by, and thereby fails to
 * answer the very question it exists for.
 */
export function visibleNavItems(
	items: readonly NavItem[],
	roles: readonly string[]
): readonly NavItem[] {
	return items.filter((item) => !item.roles || hasAnyRole(roles, item.roles));
}
