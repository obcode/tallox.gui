/**
 * Subject groups — the faculty's own grouping of modules and people.
 *
 * Pure logic only, so that it can be tested without a browser: the page imports it back. What
 * lives here is labelling, splitting and the two sentences the work lists are made of.
 *
 * One thing deliberately absent: anything that counts or hints at wishes. A subject group is
 * where somebody will eventually want to write "3 Interessent:innen" next to a module, and
 * before the publication date that number may not exist anywhere — not in the backend, not as a
 * client-side count over a filtered list. See the note in `demand.ts`.
 */

/** The shape the pages hand in. Structural, so the generated query types satisfy it. */
export type SubjectGroupLike = {
	code: string;
	name: string;
	active: boolean;
	moduleCount: number;
	leads: readonly { mail: string; name: string }[];
	members: readonly { mail: string; name: string }[];
};

/**
 * Upper-case and trim, the way the backend does before it stores.
 *
 * Cosmetic: the backend normalises and validates whatever arrives, and this is here so that the
 * field a person types into shows them what will be saved. It is not a second opinion about what
 * is allowed — `subject_group_code_is_short` decides that, and the refusal says so.
 */
export function normaliseCode(raw: string): string {
	return raw.trim().toUpperCase();
}

/**
 * Whether a code looks like one the schema will accept.
 *
 * Only for turning the button off before a round trip that would refuse. A code that passes here
 * can still be refused — the code may be taken — so the refusal path stays the real one.
 */
export function isPlausibleCode(raw: string): boolean {
	return /^[A-Z][A-Z0-9._-]{0,15}$/.test(normaliseCode(raw));
}

/**
 * Active groups first, retired ones after, each in code order.
 *
 * Retired groups stay visible rather than being filtered away: a group is retired when it has
 * been split, and the person doing the splitting needs to see both halves at once.
 */
export function splitByActivity<T extends { code: string; active: boolean }>(
	groups: readonly T[]
): { active: T[]; retired: T[] } {
	const byCode = (a: T, b: T) => a.code.localeCompare(b.code, 'de');
	return {
		active: groups.filter((g) => g.active).sort(byCode),
		retired: groups.filter((g) => !g.active).sort(byCode)
	};
}

/** "Prof. Eins und Prof. Zwei", or the sentence for a group nobody has taken on. */
export function leadNames(leads: readonly { name: string }[]): string {
	if (leads.length === 0) return 'noch niemand';
	if (leads.length === 1) return leads[0].name;
	return `${leads
		.slice(0, -1)
		.map((l) => l.name)
		.join(', ')} und ${leads[leads.length - 1].name}`;
}

/**
 * The two work lists, as the sentence a screen shows.
 *
 * A number rather than a constraint, deliberately — a group has to be creatable before its lead
 * is decided, and a lead has to be revocable without destroying the group. Saying so as a
 * bounded, finishable task is what makes it something somebody works through in October rather
 * than a rule they fight.
 */
export function openWorkSentence(groupsWithoutLead: number, modulesWithoutGroup: number): string {
	const parts: string[] = [];
	if (groupsWithoutLead > 0) {
		parts.push(
			groupsWithoutLead === 1
				? 'eine Fachgruppe ohne Leitung'
				: `${groupsWithoutLead} Fachgruppen ohne Leitung`
		);
	}
	if (modulesWithoutGroup > 0) {
		parts.push(
			modulesWithoutGroup === 1
				? 'ein Modul ohne Fachgruppe'
				: `${modulesWithoutGroup} Module ohne Fachgruppe`
		);
	}
	if (parts.length === 0) return 'Alles zugeordnet.';
	return `Offen: ${parts.join(', ')}.`;
}

/**
 * Whether a person may be made a lead — they have to hold the role.
 *
 * Cosmetic, like every role check in this application: the backend refuses it anyway, and the
 * composite foreign key refuses it even if the backend forgot. Worth doing so that the picker
 * does not offer a choice that always fails, which is how people learn to ignore refusals.
 */
export function mayLead(roles: readonly string[]): boolean {
	return roles.includes('SUBJECT_GROUP_LEAD');
}

/**
 * How a person is written in a picker: surname first where the examination office publishes one,
 * the full name otherwise, and the address for anybody who has neither.
 *
 * The last fallback is not decoration. A person may exist with no name at all — the development
 * user is one, and so is anybody created by address before somebody typed one — and a checkbox
 * whose label renders to an empty string is a form control with no accessible name. axe reports
 * it as a critical violation, and it is: a screen reader announces "checkbox" and nothing else.
 * The address is the natural key, so there is always something to say.
 */
export function personLabel(person: {
	sortName?: string | null;
	name?: string | null;
	mail: string;
}): string {
	return person.sortName?.trim() || person.name?.trim() || person.mail;
}
