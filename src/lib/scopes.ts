import type { ScopeArea, ScopeVerb } from '$lib/gql/__generated__/graphql';

/**
 * Scopes in the language the faculty speaks them, and the choice a token dialogue offers.
 *
 * The same translation `$lib/roles.ts` and `$lib/semester.ts` do. Free of Svelte so the two
 * things that are easy to get wrong here can be checked in vitest: which areas are worth
 * offering, and what an empty selection means.
 */

/** How much of one area a token may reach. `none` is the absence of a scope, not a scope. */
export type AreaChoice = 'none' | ScopeVerb;

/**
 * The areas a token can actually reach, so the only ones worth a control.
 *
 * `PUBLIC` is left out because a scope list cannot narrow it away — a checkbox for it would do
 * nothing whichever way it is set. `TOKENS` and `ADMIN` are left out because their fields are
 * `@interactiveOnly` and unreachable through a token at all; ticking one would produce a token
 * that is narrowed *away* from everything else in exchange for an area it still cannot use.
 *
 * "It is harmless" is not a reason to show a control — see CLAUDE.md. UNREACHABLE_AREAS below
 * keeps this list honest as areas are added.
 */
export const SELECTABLE_AREAS: readonly ScopeArea[] = ['PROFILE', 'PLANNING', 'WISHES'];

/**
 * The areas deliberately not offered, and why.
 *
 * Written down rather than implied, so that `scopes.test.ts` can assert the two lists together
 * cover every area the schema knows. A new area then fails the test until somebody decides
 * which side it belongs on — which is the moment to think about it, rather than six months
 * later when a colleague asks why it is missing from the dialogue.
 */
export const UNREACHABLE_AREAS: Partial<Record<ScopeArea, string>> = {
	PUBLIC: 'Lässt sich nicht einschränken — die Version beantwortet der Server immer.',
	TOKENS: 'Über ein Token grundsätzlich nicht erreichbar.',
	ADMIN: 'Über ein Token grundsätzlich nicht erreichbar.'
};

export const AREA_LABELS: Record<ScopeArea, string> = {
	PUBLIC: 'Serverversion',
	PROFILE: 'Eigenes Profil',
	PLANNING: 'Planung',
	WISHES: 'Eigene Wünsche',
	TOKENS: 'Tokenverwaltung',
	ADMIN: 'Verwaltung'
};

export const AREA_HINTS: Record<ScopeArea, string> = {
	PUBLIC: 'Welche Version des Servers antwortet.',
	PROFILE: 'Wer Du bist und welche Rollen Du hast.',
	PLANNING: 'Semester, Fachgruppen und Bedarf — und später Zuteilung und Statistik.',
	// Named for what a token actually reaches here: über ein Token sieht auch eine Leitung nur
	// die eigenen Wünsche, egal welche Rolle sie hat. Der Bereich begrenzt die Fläche, die
	// Sichtbarkeitsregel die Zeilen.
	WISHES: 'Eigene Interessensbekundungen lesen und eintragen.',
	TOKENS: 'Eigene Tokens anlegen und widerrufen.',
	ADMIN: 'Personen und Rollen.'
};

export const CHOICE_LABELS: Record<AreaChoice, string> = {
	none: 'kein Zugriff',
	READ: 'lesen',
	WRITE: 'lesen und ändern'
};

/** The name of the radio group for one area, in the create form. */
export function areaFieldName(area: ScopeArea): string {
	return `scope:${area}`;
}

/**
 * Turns the form's per-area choices into the list the mutation takes.
 *
 * `none` contributes nothing, which is the whole point of it — but see the caller: an empty
 * result while the user asked to restrict is a mistake, not an unrestricted token.
 */
export function selectedScopes(
	choices: Partial<Record<ScopeArea, AreaChoice>>
): { area: ScopeArea; verb: ScopeVerb }[] {
	const out: { area: ScopeArea; verb: ScopeVerb }[] = [];
	for (const area of SELECTABLE_AREAS) {
		const choice = choices[area];
		if (choice && choice !== 'none') out.push({ area, verb: choice });
	}
	return out;
}

/** What a token's stored scope list says, for the list of existing tokens. */
export function describeScopes(scopes: readonly string[]): string {
	if (scopes.length === 0) return 'unbeschränkt';

	return scopes
		.map((scope) => {
			const [area, verb] = scope.split(':');
			const label = AREA_LABELS[area as ScopeArea] ?? area;
			const how = CHOICE_LABELS[verb as AreaChoice] ?? verb;
			return `${label} (${how})`;
		})
		.join(', ');
}
