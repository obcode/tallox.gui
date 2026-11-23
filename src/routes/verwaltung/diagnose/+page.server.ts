import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { graphql } from '#lib/gql/__generated__/index.ts';
import { backendRequest } from '#lib/server/backend.ts';
import { toRefusal } from '#lib/server/graphqlError.ts';

const DiagnoseDocument = graphql(`
	query DiagnoseAccess($mail: String!) {
		diagnoseAccess(mail: $mail) {
			active
			person {
				id
				mail
				name
				roles
			}
			grants {
				role
				grantedAt
				expiresAt
				grantedBy {
					mail
					name
				}
			}
			decisions {
				rule
				allowed
				reason
			}
		}
	}
`);

/**
 * The answer to "why does my colleague not see this".
 *
 * The field is `@interactiveOnly` — through a Personal Access Token it answers `null`. The API
 * console under /api-doku deliberately goes through the token door and therefore cannot show
 * it; without this page there would be no way to use it in production at all. That was exactly
 * the situation on the first attempt.
 *
 * The address is in the URL rather than in a POST: this is a query, not an operation, and a
 * link to a specific diagnosis is precisely what one pastes into a support reply.
 */
export const load: PageServerLoad = async ({ url }) => {
	const mail = (url.searchParams.get('mail') ?? '').trim();
	if (mail === '') {
		return { mail: '', diagnosis: null };
	}

	try {
		const data = await backendRequest(DiagnoseDocument, { mail });
		// `null` means "this installation does not know the address" — and for this question that
		// is often the whole answer. Hence a state of the page rather than an error.
		return { mail, diagnosis: data.diagnoseAccess ?? null };
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};
