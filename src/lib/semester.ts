import type { Phase } from '$lib/gql/__generated__/graphql';

/**
 * Semesters and phases, in the language the faculty speaks them.
 *
 * The same translation `$lib/roles.ts` does, and for the same reason: the backend is English
 * throughout because everything there is, and the mapping to the faculty's own vocabulary
 * lives in exactly two places — the doc comment on `policy.Phase` and here.
 *
 * Free of Svelte and browser APIs, so the display logic can be checked in vitest. This is
 * precisely where `2026-WS` turns into "Wintersemester 2026" by accident, and in markup that
 * could only be shown by a browser test.
 */

/** The phases in process order — the same order as `policy.AllPhases()`. */
export const PHASE_ORDER: readonly Phase[] = ['DEMAND_PLANNING', 'WISHES', 'ASSIGNMENT', 'FINAL'];

export const PHASE_LABELS: Record<Phase, string> = {
	DEMAND_PLANNING: 'Bedarfsplanung',
	WISHES: 'Wunschphase',
	ASSIGNMENT: 'Zuteilung',
	FINAL: 'Abgeschlossen'
};

export const PHASE_HINTS: Record<Phase, string> = {
	DEMAND_PLANNING: 'Die Studiengangsleitungen legen fest, welche Instanzen angeboten werden.',
	WISHES: 'Dozent:innen bekunden Interesse. Die Eintragungen sind vertraulich.',
	ASSIGNMENT: 'Die Fachgruppenleitungen besetzen die Instanzen.',
	FINAL: 'Der Plan steht. Änderungen sind ab hier Korrekturen.'
};

/**
 * The semester name as the faculty says it.
 *
 * `2027-SS` becomes "Sommersemester 2027", `2026-WS` becomes "Wintersemester 2026/27". The
 * year in the code is the year the semester *starts* in, so for a winter semester it is the
 * first of the two — and that is exactly where a naive formatter prints "Wintersemester 2026"
 * and nobody notices until somebody searches for the wrong semester.
 *
 * An unrecognised format is passed through rather than guessed at. The backend enforces the
 * shape with a CHECK constraint, so anything else here means the assumption no longer holds,
 * and the raw code is the more honest thing to show.
 */
export function semesterName(code: string): string {
	const match = /^(\d{4})-(SS|WS)$/.exec(code);
	if (!match) return code;

	const year = Number(match[1]);
	if (match[2] === 'SS') return `Sommersemester ${year}`;

	// Two digits, zero-padded: 2026/27, but 2099/00.
	const next = String((year + 1) % 100).padStart(2, '0');
	return `Wintersemester ${year}/${next}`;
}

/**
 * Short form for narrow columns: "SS 2027" and "WS 2026/27".
 *
 * Close to the code itself now that the code carries the term — deliberately still not the
 * code: the two-year span of a winter semester is the whole point of spelling it out.
 */
export function semesterShortName(code: string): string {
	const full = semesterName(code);
	return full.replace('Sommersemester ', 'SS ').replace('Wintersemester ', 'WS ');
}

/**
 * The term of a semester code: `WS`, `SS`, or empty for a code that is not one.
 *
 * For the demand, which starts from the term it is planning: a winter semester's list has no
 * business offering the modules that run only in summer.
 */
export function semesterTerm(code: string): string {
	const match = /^(\d{4})-(SS|WS)$/.exec(code);
	return match ? match[2] : '';
}

export type PhaseDirection = 'forward' | 'backward';

/**
 * Which way a phase change goes, or `null` when it is not a step at all.
 *
 * For labelling the buttons. Whether a change is *allowed* is deliberately not answered here:
 * that rule lives in the backend, and the page is handed the legal targets as
 * `reachablePhases`. A second adjacency rule in TypeScript would be a second opinion about
 * permissions, and the first one to go stale.
 */
export function phaseDirection(from: Phase, to: Phase): PhaseDirection | null {
	const fromIndex = PHASE_ORDER.indexOf(from);
	const toIndex = PHASE_ORDER.indexOf(to);
	if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
	return toIndex > fromIndex ? 'forward' : 'backward';
}

/** Label for a switch button: "Weiter zu …" or "Zurück zu …". */
export function phaseButtonLabel(from: Phase, to: Phase): string {
	const label = PHASE_LABELS[to] ?? to;
	return phaseDirection(from, to) === 'backward' ? `Zurück zu ${label}` : `Weiter zu ${label}`;
}

export type SemesterLike = {
	code: string;
	phase: Phase;
	wishesPublishedAt?: string | null;
};

/**
 * What may be shown about a semester's wishes.
 *
 * Two states only, and both are statements about the *process* rather than about content:
 * whether the cut-off has passed. Deliberately nothing about how many wishes there are, and no
 * hint as to whether there are any at all. "3 Kolleg:innen haben bereits Interesse" leaks the
 * confidential information completely without naming anybody, and a "has wishes" tick does the
 * same per person. See CLAUDE.md, "Things the UI must not do".
 */
export function wishesAreVisible(semester: SemesterLike): boolean {
	return !!semester.wishesPublishedAt;
}

/**
 * Whether publishing would still change anything for this semester.
 *
 * Cosmetic only — the backend is idempotent and a second click is not an error. The button
 * disappears anyway, because a button that no longer does anything looks broken.
 */
export function mayStillPublish(semester: SemesterLike): boolean {
	return !wishesAreVisible(semester);
}
