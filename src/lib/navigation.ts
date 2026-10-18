import type { RouteId } from '$app/types';
import type { Role } from '$lib/gql/__generated__/graphql';
import { hasAnyRole, isPartnerOnly } from '$lib/roles';

/**
 * A route that can be linked to without arguments.
 *
 * `RouteId` grew a parameterised member with the module detail page, and `resolve()` refuses one
 * of those without its parameters — rightly, since a menu entry has none to give. Excluding them
 * here means a future `/bedarf/[semester]` cannot be put in the menu by accident instead of
 * being discovered as a type error in this file's four call sites.
 *
 * Endpoints are excluded as well: `/gui-api/…` and `/healthz/…` answer with data, not pages, so
 * they are never a menu entry. It is also what keeps the union small enough for `resolve()` —
 * TypeScript matches a union argument against overloads only up to 25 members, and past that
 * every call site fails with an error that names none of this.
 */
type StaticRoute = Exclude<
	RouteId,
	| `${string}[${string}`
	| '/gui-api'
	| `/gui-api/${string}`
	| '/healthz'
	| `/healthz/${string}`
	// Never a menu entry either, and out for the 25-member limit above: the schema is a sub-page
	// of the API documentation, `/bedarf/sws` an old address that redirects, and `/konto` is a
	// layout with no page of its own. Reached the limit with `/zuteilung/uebersicht`.
	| `/api-doku/${string}`
	| '/bedarf/sws'
	| '/konto'
>;

/**
 * The areas of the application, in the order of the planning process.
 *
 * Areas without an `href` are not built yet. They are listed anyway, damped and without a
 * link — a deliberate decision against two alternatives: a navigation with a single entry does
 * not show the structure of the process, and placeholder pages that only say "coming soon" are
 * click paths into nothing. This way what the tool is heading towards is visible at a glance,
 * without pretending anything is there.
 *
 * **No entry for the start page.** The wordmark in the bar links there, which is where every
 * site puts it and where people look for it — a second way to the same place costs a slot in a
 * row that is already full at 1280px, and makes one of the two look wrong the moment the other
 * is marked active.
 *
 * **The semester comes last**, after the process it frames. It is not a step of the planning:
 * it is where somebody says which semester is being planned and moves the phases along, which
 * is done once and then left alone. Between "Module" and "Bedarf" it interrupted the sequence
 * the row exists to show.
 *
 * When an area comes into being: add the route, add the `href` here — nothing else. An area with
 * `children` has no `href` of its own; `visibleNavItems` gives it the first visible child's.
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
	 *
	 * On a child these are its own, and they are what decides whether a link to that page is
	 * offered anywhere (`mayOpen` in `guide.ts`). The area's roles only decide whether the area is
	 * in the bar — "Fachgruppen" under "Verwaltung" is readable by everybody, the bar entry is not.
	 */
	roles?: readonly Role[];
	/**
	 * Only for members of the faculty: hidden from an account that is a partner faculty and
	 * nothing else. For the pages where somebody states something about themselves — a partner
	 * reads the planning and states nothing, and the backend refuses it (PARTNER_READS_ONLY).
	 */
	colleaguesOnly?: boolean;
	/**
	 * The pages of an area, shown as tabs above them (`AreaTabs`) and indented in the narrow menu.
	 *
	 * Grouped here and not in the route tree: `/wuensche` and `/konto/kompetenzen` keep their
	 * addresses, so bookmarks, the guide and the help keep working. An area with children is
	 * active on any of them, and its `href` is the first child the reader may see.
	 */
	children?: readonly NavItem[];
	/** Active on exactly this path only — for a child whose sibling lives below it. */
	exact?: boolean;
};

/**
 * What every lecturer does for themselves, in one place. They were spread over the bar (wishes)
 * and the account menu (competences, subject groups), and the account menu is about the account.
 */
const TEACHING: NavItem = {
	// No roles: everybody who teaches registers interest, and LECTURER is the baseline everybody
	// in the planning holds. What is scoped is reading other people's, and that is a rule in the
	// backend rather than a menu entry.
	emoji: '✋',
	label: 'Meine Lehre',
	hint: 'Wünsche, Kompetenzen und Fachgruppen — was Du selbst angibst',
	colleaguesOnly: true,
	children: [
		{
			emoji: '✋',
			label: 'Wünsche',
			href: '/wuensche',
			hint: 'Interesse an Instanzen bekunden',
			colleaguesOnly: true
		},
		{
			emoji: '📅',
			label: 'Zuteilungen',
			href: '/konto/zuteilungen',
			hint: 'Wo Du tatsächlich eingeplant bist, je Semester',
			colleaguesOnly: true
		},
		{
			emoji: '🧠',
			label: 'Kompetenzen',
			href: '/konto/kompetenzen',
			hint: 'Welche Module Du halten kannst, und für welche Du Dich interessierst',
			colleaguesOnly: true
		},
		{
			// Membership is not a permission, so this is the one thing about a subject group that
			// belongs to the person rather than to the administration.
			emoji: '🗂️',
			label: 'Fachgruppen',
			href: '/konto/fachgruppen',
			hint: 'In welchen Fächern Du arbeitest — Vorauswahl für Wünsche und Kompetenzen',
			colleaguesOnly: true
		}
	]
};

/** Who finds the assignment — the area and each of its pages. */
const ASSIGNING: readonly Role[] = ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'];

export const NAV_ITEMS: readonly NavItem[] = [
	{ emoji: '📚', label: 'Module', href: '/module', hint: 'Modulkatalog mit Heimatstudiengang' },
	{
		// No roles: the demand is what the wish phase is about, so a lecturer who cannot see
		// which instances exist has nothing to register interest in. The page opens read-only for
		// everybody and offers the planning table to whoever may write it.
		emoji: '🎯',
		label: 'Bedarf',
		href: '/bedarf',
		hint: 'Was wird angeboten? Studiengangsleitungen legen es fest'
	},
	TEACHING,
	{
		// No roles on the area since the read-only overview: everybody reads who holds what once a
		// semester is published. Its first visible tab is where the bar entry leads, so the leads
		// still land on "Besetzen" and everybody else on the overview.
		emoji: '🧩',
		label: 'Zuteilung',
		hint: 'Wer hält was — und Instanzen besetzen',
		children: [
			// Exact: the competence pool lives below it and is a tab of its own.
			{
				emoji: '🧩',
				label: 'Besetzen',
				href: '/zuteilung',
				hint: 'Instanzen besetzen',
				roles: ASSIGNING,
				exact: true
			},
			{
				emoji: '🧠',
				label: 'Kompetenzen der Fachgruppe',
				href: '/zuteilung/kompetenzen',
				hint: 'Wer was halten kann, welche Module niemand abdeckt',
				roles: ASSIGNING
			},
			{
				emoji: '👀',
				label: 'Übersicht',
				href: '/zuteilung/uebersicht',
				hint: 'Die veröffentlichte Zuteilung, nur zum Lesen'
			}
		]
	},
	{
		// The SWS controlling: what each programme's modules cost against its quota. The programme
		// leads are the ones who plan against it — how many electives a programme can afford is
		// their question — so the area is theirs as much as the dean's office's. Readable through
		// the API by everybody; the roles here only decide who finds it in the bar.
		emoji: '📊',
		label: 'Statistik',
		href: '/statistik',
		hint: 'SWS-Controlling: Lehre je Studiengang gegen das Kontingent',
		// And the partner faculties: the controlling of their programmes is what they follow.
		roles: ['PROGRAMME_LEAD', 'DEANS_OFFICE', 'PARTNER_READER']
	},
	{
		// Running the faculty's side of the installation: not a step of the planning, so it comes
		// last. Its own roles say who finds it in the bar; each tab keeps the roles it had in the
		// account menu, so the dean's office lands on "Semester" and never sees "Zugriffe".
		emoji: '🛠️',
		label: 'Verwaltung',
		hint: 'Semester und Phasen, Personen, Studiengänge, Fachgruppen und Stammdaten',
		roles: ['ADMIN', 'DEANS_OFFICE'],
		children: [
			{
				// The dean's office's tool: the planning semester, the phase, the two publications.
				// It was in the bar for everybody, because the phase answers "may I enter my wishes
				// yet" — but the wish page and "Jetzt dran" say that where it is asked, and for a
				// lecturer this page was a list of switches they cannot use. Still readable by
				// everybody at its address; it is only no longer offered.
				emoji: '🗓️',
				label: 'Semester',
				href: '/semester',
				hint: 'Planungssemester, Phasen und Veröffentlichungen',
				roles: ['DEANS_OFFICE']
			},
			{
				emoji: '🛠️',
				label: 'Personen',
				href: '/verwaltung/personen',
				hint: 'Wer Tallox benutzen darf, und mit welchen Rollen',
				roles: ['ADMIN']
			},
			{
				// The dean's office's, like the phases: which programmes the faculty plans is a
				// statement about its process rather than about running the installation.
				emoji: '🎓',
				label: 'Studiengänge',
				href: '/verwaltung/studiengaenge',
				hint: 'Welche Studiengänge die Fakultät plant — und welche nicht mehr',
				roles: ['DEANS_OFFICE']
			},
			{
				// No roles: who leads which group is what the faculty's organisation looks like. A
				// lecturer reaches it from "Meine Lehre → Fachgruppen"; the page renders its forms
				// only for whoever `people` answers for.
				emoji: '🗂️',
				label: 'Fachgruppen',
				href: '/verwaltung/fachgruppen',
				hint: 'Wer arbeitet in welchen Fächern, und wer leitet sie'
			},
			{
				emoji: '📥',
				label: 'ZPA-Import',
				href: '/verwaltung/zpa',
				hint: 'Wann kamen die Modul-Stammdaten zuletzt, und was hat sich geändert',
				roles: ['ADMIN', 'DEANS_OFFICE']
			},
			{
				emoji: '📋',
				label: 'Zugriffe',
				href: '/verwaltung/zugriffe',
				hint: 'Wer hat wann worauf zugegriffen — und wer wurde abgewiesen',
				roles: ['ADMIN']
			},
			{
				emoji: '🔍',
				label: 'Diagnose',
				href: '/verwaltung/diagnose',
				hint: 'Warum sieht jemand etwas nicht? Entscheidungen, keine Inhalte',
				roles: ['ADMIN']
			}
		]
	}
];

function matches(href: StaticRoute, pathname: string, exact: boolean): boolean {
	if (href === '/' || exact) return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}

/** Exact matches for `/` only: otherwise every entry would be active there. */
export function isActive(item: NavItem, pathname: string): boolean {
	if (item.children) return item.children.some((child) => isActive(child, pathname));
	if (!item.href) return false;
	return matches(item.href, pathname, item.exact ?? false);
}

/**
 * The menu next to the identity: the account and nothing else.
 *
 * It used to carry eleven entries — the account, the help, the API and the faculty's
 * administration. The lecturer's own pages are now "Meine Lehre" in the bar, the process and the
 * API documentation are in the help panel, and the administration is an area of its own.
 */
export const ACCOUNT_ITEMS: readonly NavItem[] = [
	{
		// No roles: everybody has roles, and the answer "which ones do I have" was previously
		// unavailable to anybody who is not an administrator — the role preview in the footer
		// is ADMIN-only, and the menu only ever *implies* the roles by what it shows.
		emoji: '🪪',
		label: 'Meine Rollen',
		href: '/konto/rollen',
		hint: 'Welche Rollen Du hast, und wofür sie gelten'
	},
	{
		emoji: '🔑',
		label: 'Tokens',
		href: '/konto/tokens',
		hint: 'Personal Access Tokens für eigene Auswertungen'
	}
];

/**
 * Filters entries down to the ones these roles should see — the children too.
 *
 * Takes the **effective** roles from `session.effectiveRoles`, not the held ones: somebody who
 * has narrowed themselves should see the narrowed role's menu too — otherwise the preview
 * shows something other than what the server judges the request by, and thereby fails to
 * answer the very question it exists for.
 *
 * An area with children links to the first child left, and disappears when none is.
 */
export function visibleNavItems(
	items: readonly NavItem[],
	roles: readonly string[]
): readonly NavItem[] {
	const out: NavItem[] = [];
	const partner = isPartnerOnly(roles);
	for (const item of items) {
		if (item.roles && !hasAnyRole(roles, item.roles)) continue;
		if (item.colleaguesOnly && partner) continue;
		if (!item.children) {
			out.push(item);
			continue;
		}
		const children = visibleNavItems(item.children, roles);
		if (children.length === 0) continue;
		out.push({ ...item, href: children[0].href, children });
	}
	return out;
}

/**
 * Every page the navigation leads to, areas resolved into their tabs — each with its own roles.
 * For questions about a page rather than about the bar: may this person be sent there?
 */
export function navigationPages(items: readonly NavItem[]): NavItem[] {
	return items.flatMap((item) => (item.children ? navigationPages(item.children) : [item]));
}

/**
 * The area the reader is in, with the tabs they may see — or null outside every area with tabs.
 * Fewer than two tabs is no tab bar either: a single tab is a heading pretending to be a choice.
 */
export function areaFor(pathname: string, roles: readonly string[]): NavItem | null {
	const area = visibleNavItems(NAV_ITEMS, roles).find(
		(item) => item.children && isActive(item, pathname)
	);
	return area && (area.children?.length ?? 0) >= 2 ? area : null;
}
