import type { Role } from '$lib/gql/__generated__/graphql';

/**
 * What a scoped grant actually reaches, and what an empty list means.
 *
 * The one thing this page exists to get right. `me.programmes` and `me.subjectGroupsLed` are
 * both empty for three different reasons, and two of them are opposites:
 *
 * - the person does not hold the role at all — the field has nothing to say about them;
 * - they hold it and nobody has assigned them anything — they may do **nothing**, which is the
 *   reading that is wrong everywhere else in this system and right here;
 * - they are the dean's office, which reaches **everything**, including study programmes and
 *   subject groups that do not exist yet — so there is no list to give and the backend
 *   deliberately answers `null`.
 *
 * Rendering the same empty list three ways is the whole feature: a page that said
 * "Studiengänge: keine" would tell the dean's office the opposite of the truth, and would tell
 * an unassigned lead nothing about the reason her screens are empty.
 */
export type ScopeReach =
	/** Reaches everything of this kind, present and future. */
	| { kind: 'all' }
	/** Reaches exactly these. */
	| { kind: 'some' }
	/** Holds the role and has been assigned nothing: may do nothing of this kind. */
	| { kind: 'none' }
	/** Does not hold a role with this dimension. */
	| { kind: 'not-held' };

/** Does this set of roles contain the one named? */
function holds(roles: readonly Role[], role: Role): boolean {
	return roles.includes(role);
}

/**
 * How far a scoped grant reaches, from the roles and the list the server gave.
 *
 * `scoped` is the role the list belongs to; the dean's office is checked first because it is
 * the role that means "all of them" on both axes, and somebody can hold it *and* a scoped role
 * at the same time — in which case the wider one is the truth.
 */
export function reachOf(
	roles: readonly Role[],
	scoped: Role,
	assigned: readonly unknown[]
): ScopeReach {
	if (holds(roles, 'DEANS_OFFICE')) return { kind: 'all' };
	if (!holds(roles, scoped)) return { kind: 'not-held' };
	return assigned.length > 0 ? { kind: 'some' } : { kind: 'none' };
}

/** How far this person's study-programme leadership reaches. */
export function programmeReach(roles: readonly Role[], programmes: readonly unknown[]): ScopeReach {
	return reachOf(roles, 'PROGRAMME_LEAD', programmes);
}

/** How far this person's subject-group leadership reaches. */
export function subjectGroupReach(roles: readonly Role[], led: readonly unknown[]): ScopeReach {
	return reachOf(roles, 'SUBJECT_GROUP_LEAD', led);
}

/**
 * The sentence for a reach that names no list — "all of them" or "none yet".
 *
 * `null` where there is a list to render instead, and where the role is not held at all: an
 * explanation of a role somebody does not have is noise on a page whose whole job is to say
 * what they do have.
 */
export function reachHint(reach: ScopeReach, axis: 'programme' | 'subjectGroup'): string | null {
	if (reach.kind === 'all') {
		return axis === 'programme'
			? 'Alle Studiengänge — auch solche, die es heute noch nicht gibt. Das ist die Rolle, die „alle“ bedeutet.'
			: 'Alle Fachgruppen — auch solche, die es heute noch nicht gibt.';
	}
	if (reach.kind === 'none') {
		return axis === 'programme'
			? 'Noch keinem Studiengang zugeordnet. Die Rolle allein erlaubt nichts: ohne Zuordnung lässt sich für keinen Studiengang Bedarf festlegen. Die Administration trägt das ein.'
			: 'Noch keiner Fachgruppe zugeordnet. Die Rolle allein erlaubt nichts: ohne Zuordnung lässt sich keine Instanz besetzen, kein Wunsch vorab lesen und kein Modul einsortieren. Die Administration trägt das ein.';
	}
	return null;
}

/**
 * Whether a reach is the state somebody should be warned about.
 *
 * Only `none`. It is the one that looks exactly like a working setup from every other screen —
 * the role is there, the menu shows the area, and every list inside it is empty.
 */
export function needsAttention(reach: ScopeReach): boolean {
	return reach.kind === 'none';
}
