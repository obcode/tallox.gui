import { fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { ScopeArea } from '$lib/gql/__generated__/graphql';
import { SELECTABLE_AREAS, areaFieldName, selectedScopes, type AreaChoice } from '$lib/scopes';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

const MyTokens = graphql(`
	query MyTokens {
		myTokens {
			id
			description
			createdAt
			expiresAt
			lastUsedAt
			revokedAt
			scopes
			fullReach
		}
	}
`);

const CreateToken = graphql(`
	mutation CreatePersonalAccessToken(
		$description: String!
		$expiresInDays: Int
		$scopes: [ScopeGrantInput!]
		$fullReach: Boolean!
	) {
		createPersonalAccessToken(
			description: $description
			expiresInDays: $expiresInDays
			scopes: $scopes
			fullReach: $fullReach
		) {
			secret
			token {
				id
				description
				createdAt
				expiresAt
				lastUsedAt
				revokedAt
				scopes
				fullReach
			}
		}
	}
`);

const RevokeToken = graphql(`
	mutation RevokePersonalAccessToken($id: ID!) {
		revokePersonalAccessToken(id: $id) {
			id
		}
	}
`);

/**
 * `myTokens` is nullable in the schema, and that is not sloppiness: through a Personal Access
 * Token the field answers `null` instead of failing the whole request. This page runs through
 * the browser door and therefore always sees a list — the distinction is written out anyway,
 * because `null` and "no tokens" are two different facts and the page must not present the
 * first as the second.
 */
export const load: PageServerLoad = async () => {
	const data = await backendRequest(MyTokens);
	return { tokens: data.myTokens ?? [] };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const description = String(form.get('description') ?? '');
		const rawDays = String(form.get('expiresInDays') ?? '').trim();

		// The lifetime is checked in the backend, not here — here only what a form field delivers
		// is translated. A second limit in the GUI would be a second truth.
		const expiresInDays = rawDays === '' ? null : Number(rawDays);
		if (expiresInDays !== null && !Number.isInteger(expiresInDays)) {
			return fail(400, {
				code: 'TOKEN_LIFETIME_OUT_OF_RANGE',
				message: 'Bitte eine ganze Zahl von Tagen angeben.',
				description
			});
		}

		// "Nothing ticked" and "unrestricted" are the same value to the backend — an empty list
		// means the token may do everything its owner's roles allow. In a form that is a trap:
		// a page showing "kein Zugriff" beside every area would mint a token with no limits at
		// all. So the choice is explicit, and asking to restrict without naming an area is a
		// mistake rather than the most permissive outcome.
		const scopes =
			String(form.get('restrict') ?? 'no') === 'yes' ? selectedScopes(readAreaChoices(form)) : [];

		if (String(form.get('restrict') ?? 'no') === 'yes' && scopes.length === 0) {
			return fail(400, {
				code: 'SCOPE_NONE_SELECTED',
				message: 'Bitte mindestens einen Bereich auswählen — oder das Token unbeschränkt lassen.',
				description
			});
		}

		// Full reach is a checkbox, and an unticked checkbox sends nothing — so absent means no.
		// The 90-day ceiling is the backend's; the page only says so.
		const fullReach = form.get('fullReach') === 'yes';

		try {
			const data = await backendRequest(CreateToken, {
				description,
				expiresInDays,
				scopes,
				fullReach
			});
			// The plaintext token comes back here exactly once and is stored nowhere — not in the
			// session, not in a cookie, not in the log. Anybody who loses it creates a new one
			// and revokes this one.
			return { created: data.createPersonalAccessToken };
		} catch (error) {
			const refusal = toRefusal(error);
			return fail(400, { ...refusal, description });
		}
	},

	revoke: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		try {
			await backendRequest(RevokeToken, { id });
			return { revoked: id };
		} catch (error) {
			return fail(400, toRefusal(error));
		}
	}
};

/**
 * Reads one radio group per area out of the form.
 *
 * Only the areas the dialogue offers. A value arriving for any other one is ignored rather
 * than refused: it can only come from a hand-written POST, and the backend would refuse
 * anything it does not know anyway — this is a form parser, not a second gate.
 */
function readAreaChoices(form: FormData): Partial<Record<ScopeArea, AreaChoice>> {
	const choices: Partial<Record<ScopeArea, AreaChoice>> = {};
	for (const area of SELECTABLE_AREAS) {
		const value = String(form.get(areaFieldName(area)) ?? 'none');
		if (value === 'READ' || value === 'WRITE') choices[area] = value;
	}
	return choices;
}
