import type { Role } from '$lib/gql/__generated__/graphql';

/**
 * The roles in German.
 *
 * This is the translation the backend deliberately does not do: everything is English there
 * because everything is English there, and the mapping to the faculty's own vocabulary lives
 * in exactly two places — the doc comment on `policy.Role` and here. Two, never a third.
 */
export const ROLE_LABELS: Record<Role, string> = {
	LECTURER: 'Dozierende',
	SUBJECT_GROUP_LEAD: 'Fachgruppenleitung',
	PROGRAMME_LEAD: 'Studiengangsleitung',
	DEANS_OFFICE: 'Dekanat',
	PARTNER_READER: 'Partnerfakultät',
	ADMIN: 'Administration'
};

/**
 * A short note on what a role may do. Appears next to the checkbox in the administration, so
 * that "what am I actually giving this person" does not have to be guessed from the name.
 */
export const ROLE_HINTS: Record<Role, string> = {
	LECTURER: 'Eigenes Profil, eigene Kompetenzen, eigene Wünsche. Haben fast alle.',
	SUBJECT_GROUP_LEAD: 'Besetzt die Instanzen einer Fachgruppe.',
	PROGRAMME_LEAD: 'Meldet den Bedarf eines Studiengangs an.',
	DEANS_OFFICE: 'Liest studiengangsübergreifend, pflegt die Deputats-Ampel.',
	PARTNER_READER:
		'Liest Bedarf, Statistik und veröffentlichte Zuteilung der zugeordneten Studiengänge — allein vergeben weniger als ein normales Konto, keine Wünsche, keine Eintragungen.',
	ADMIN: 'Verwaltet Personen, Rollen und Tokens. Liest bewusst keine Wünsche.'
};

/**
 * The order roles are displayed in: "how much of the process the role touches". The same order
 * as `policy.AllRoles()`, so that a list here and a list there look alike.
 */
export const ALL_ROLES: readonly Role[] = [
	'LECTURER',
	'SUBJECT_GROUP_LEAD',
	'PROGRAMME_LEAD',
	'DEANS_OFFICE',
	'PARTNER_READER',
	'ADMIN'
] as const;

/** Label for a role, falling back to the raw value. */
export function roleLabel(role: string): string {
	return ROLE_LABELS[role as Role] ?? role;
}

/** Several roles as a readable list, in the order of ALL_ROLES. */
export function roleLabels(roles: readonly string[]): string {
	return sortRoles(roles).map(roleLabel).join(', ');
}

/** Sorts roles into display order. Unknown ones go to the end. */
export function sortRoles(roles: readonly string[]): string[] {
	return [...roles].sort((a, b) => {
		const ia = ALL_ROLES.indexOf(a as Role);
		const ib = ALL_ROLES.indexOf(b as Role);
		return (ia < 0 ? ALL_ROLES.length : ia) - (ib < 0 ? ALL_ROLES.length : ib);
	});
}

/**
 * Who is offered the role preview.
 *
 * Administrators only. Not for security reasons — narrowing cannot add anything by
 * construction, and somebody setting the cookie by hand takes privileges away from themselves.
 * It is a question of interface: a study-programme lead holds two roles and therefore has no
 * reason to see a button that makes her demand area disappear. She does not have the question
 * it answers.
 *
 * Takes the **granted** roles rather than the effective ones. That is the point: an
 * administrator currently narrowed to LECTURER still holds ADMIN but no longer acts as one —
 * with the effective roles the menu would be gone exactly when it is needed to get back.
 */
export function mayPreviewRoles(grantedRoles: readonly string[]): boolean {
	return grantedRoles.includes('ADMIN');
}

/** Does this set of roles hold at least one of the named ones? */
export function hasAnyRole(held: readonly string[], wanted: readonly Role[]): boolean {
	return wanted.some((role) => held.includes(role));
}

/**
 * Whether these roles are a partner faculty's alone. The backend's policy.PartnerOnly: held
 * beside any other role, the partner role changes nothing, because whoever also teaches here is a
 * colleague.
 */
export function isPartnerOnly(roles: readonly string[]): boolean {
	return roles.length === 1 && roles[0] === 'PARTNER_READER';
}

/**
 * A person's name as it is displayed.
 *
 * An empty name is the normal case and not an error: people are created with their mail
 * address alone, because that is the only thing that has to be right. The name comes later —
 * from the person themselves or from the ZPA. Until then the address is the most honest thing
 * to show; deriving a name from it guesses at how people write themselves, and gets it wrong
 * for every title, every double-barrelled name and every umlaut.
 */
export function displayName(person: { name?: string | null; mail: string }): string {
	const name = person.name?.trim();
	return name && name.length > 0 ? name : person.mail;
}
