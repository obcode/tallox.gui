/**
 * The competence profile: who can teach which module, and who would like to.
 *
 * Pure functions for the two competence pages and for the candidate list on the assignment page,
 * pulled out of the `.svelte` files so they can be tested. Nothing here decides who may see what —
 * the backend filters the rows before they arrive, and `competenceMemberStatus` refuses anybody
 * who may not count over a group.
 */

/** The two statements, the stronger one first. Mirrors the backend's `CompetenceLevel`. */
export const COMPETENCE_LEVELS = ['CAN_TEACH', 'WOULD_LIKE'] as const;

export type CompetenceLevelValue = (typeof COMPETENCE_LEVELS)[number];

/** The empty choice in a picker: no statement about this module. */
export const COMPETENCE_NONE = '';

export type CompetenceChoice = CompetenceLevelValue | typeof COMPETENCE_NONE;

/** How a level reads in a picker and in a list. */
export const COMPETENCE_LEVEL_LABELS: Record<CompetenceLevelValue, string> = {
	CAN_TEACH: 'kann ich halten',
	WOULD_LIKE: 'würde ich gern'
};

/** How a level reads about somebody else, in the lead's pool and the candidate list. */
export const COMPETENCE_LEVEL_OTHERS: Record<CompetenceLevelValue, string> = {
	CAN_TEACH: 'kann halten',
	WOULD_LIKE: 'würde gern'
};

export function isCompetenceLevel(value: string): value is CompetenceLevelValue {
	return (COMPETENCE_LEVELS as readonly string[]).includes(value);
}

export function isCompetenceChoice(value: string): value is CompetenceChoice {
	return value === COMPETENCE_NONE || isCompetenceLevel(value);
}

/** The minimum of one group, as the backend reports it. */
export type GroupStatusLike = { canTeachCompulsory: number; minimum: number };

/** Whether somebody is below the faculty's minimum in a group. */
export function belowMinimum(status: GroupStatusLike): boolean {
	return status.canTeachCompulsory < status.minimum;
}

/**
 * The sentence under a group heading. A hint, never a refusal — the backend refuses nothing for
 * being below the minimum, and the page must not look as if it did.
 */
export function minimumHint(status: GroupStatusLike): string {
	const { canTeachCompulsory: have, minimum } = status;
	const subjects = (n: number) => (n === 1 ? 'Pflichtfach' : 'Pflichtfächer');
	if (have >= minimum) {
		return `${have} ${subjects(have)} als „kann ich halten“ — die erbetenen ${minimum} sind erreicht.`;
	}
	return `${have} von mindestens ${minimum} Pflichtfächern als „kann ich halten“ angegeben.`;
}

/** A module of one of my groups, as the page lists it. */
export type GroupModuleLike = { id: string; name: string; compulsory: boolean };

/** Compulsory modules first — they are what the minimum asks for — then by name. */
export function sortModules<T extends GroupModuleLike>(modules: readonly T[]): T[] {
	return [...modules].sort((a, b) => {
		if (a.compulsory !== b.compulsory) return a.compulsory ? -1 : 1;
		// A module without a name goes last rather than first, where '' would sort it.
		if ((a.name === '') !== (b.name === '')) return a.name === '' ? 1 : -1;
		return a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id);
	});
}

/** One of my own statements, as the pages need it. */
export type OwnCompetenceLike = {
	id: string;
	level: CompetenceLevelValue;
	note: string;
	outsideSubjectGroups: boolean;
	module: { id: string; name: string };
};

/** My statements by module id, for the cells of the table. */
export function competenceByModule<T extends { module: { id: string } }>(
	competences: readonly T[]
): Map<string, T> {
	return new Map(competences.map((c) => [c.module.id, c]));
}

/**
 * My statements that no longer sit in any of my groups — I have left the group, or the module has
 * moved. The backend keeps them rather than deleting what somebody typed; the page lists them on
 * their own so they can be removed, because no group table would show them.
 */
export function outsideStatements<T extends OwnCompetenceLike>(
	competences: readonly T[],
	moduleIdsInMyGroups: ReadonlySet<string>
): T[] {
	return competences
		.filter((c) => c.outsideSubjectGroups || !moduleIdsInMyGroups.has(c.module.id))
		.sort((a, b) => a.module.name.localeCompare(b.module.name, 'de'));
}

/** One cell as it comes back out of the form. */
export type CompetenceEntry = { moduleId: string; level: CompetenceChoice; note: string };

/** What is stored for one module. */
export type StoredCompetence = {
	id: string;
	moduleId: string;
	level: CompetenceLevelValue;
	note: string;
};

export type CompetenceChange =
	| { kind: 'set'; moduleId: string; level: CompetenceLevelValue; note: string }
	| { kind: 'withdraw'; moduleId: string; competenceId: string };

/**
 * What changed between what is stored and what came back from the form — the same arrangement as
 * the wish table: the form carries every cell, the server works out the difference against what is
 * actually stored, and unchanged cells produce nothing.
 */
export function competenceChanges(
	entries: readonly CompetenceEntry[],
	stored: readonly StoredCompetence[]
): CompetenceChange[] {
	const byModule = new Map(stored.map((c) => [c.moduleId, c]));
	const changes: CompetenceChange[] = [];

	for (const entry of entries) {
		const current = byModule.get(entry.moduleId);
		if (entry.level === COMPETENCE_NONE) {
			if (current) {
				changes.push({ kind: 'withdraw', moduleId: entry.moduleId, competenceId: current.id });
			}
			continue;
		}
		if (current && current.level === entry.level && current.note === entry.note) continue;
		changes.push({ kind: 'set', moduleId: entry.moduleId, level: entry.level, note: entry.note });
	}
	return changes;
}

/** What to say after a save. About the caller's own clicks and nothing else. */
export function savedHint(changes: number): string {
	if (changes === 0) return 'Es gab nichts zu speichern.';
	if (changes === 1) return 'Eine Änderung gespeichert.';
	return `${changes} Änderungen gespeichert.`;
}

/** Somebody else's statement, as the lead's page and the assignment page receive it. */
export type CompetenceLike = {
	id: string;
	level: CompetenceLevelValue;
	note: string;
	module: { id: string };
	holder: { personId?: string | null; teacherId?: string | null; name: string };
};

/** One module's pool: who can teach it, and who would like to, each sorted by name. */
export type Pool<T extends CompetenceLike> = { canTeach: T[]; wouldLike: T[] };

/**
 * The pool of every module that has one. Only what the backend let through: for a lead that is
 * their own group's modules, and there is no publication that widens it.
 */
export function poolsByModule<T extends CompetenceLike>(
	competences: readonly T[]
): Map<string, Pool<T>> {
	const pools = new Map<string, Pool<T>>();
	for (const c of competences) {
		const pool = pools.get(c.module.id) ?? { canTeach: [], wouldLike: [] };
		(c.level === 'CAN_TEACH' ? pool.canTeach : pool.wouldLike).push(c);
		pools.set(c.module.id, pool);
	}
	for (const pool of pools.values()) {
		pool.canTeach.sort((a, b) => a.holder.name.localeCompare(b.holder.name, 'de'));
		pool.wouldLike.sort((a, b) => a.holder.name.localeCompare(b.holder.name, 'de'));
	}
	return pools;
}

/** How a holder reads in a pool: the name, and the note in brackets where there is one. */
export function holderLabel(c: Pick<CompetenceLike, 'note' | 'holder'>): string {
	return c.note ? `${c.holder.name} (${c.note})` : c.holder.name;
}

/** Whether a statement is about a teacher without an account — the ones the lead maintains. */
export function isTeacherRow(c: Pick<CompetenceLike, 'holder'>): boolean {
	return !c.holder.personId && !!c.holder.teacherId;
}
