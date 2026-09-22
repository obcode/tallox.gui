import { error } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { PageServerLoad } from './$types';

/**
 * What am I, as far as this server is concerned?
 *
 * A beta tester asked it in so many words, and there was nowhere to look. The navigation only
 * ever *implies* the roles — an area appears or it does not — the role preview in the footer is
 * for administrators, and the banner that names roles shows up only while a preview is running.
 * So the one person who cannot find out what they hold is the person who holds it.
 *
 * It is deliberately the whole answer rather than a list of five words: a role here is almost
 * never the whole grant. A study-programme leadership applies to study programmes and a subject
 * group leadership to subject groups, and a grant with nothing assigned to it is the state that
 * makes somebody write "the tool is broken" — they hold the role, every screen agrees, and they
 * may do nothing with it.
 *
 * `me` and not `session`: this page is about what somebody **holds**, which is the question
 * they asked. What the server is judging *this request* by is the narrowing, and that is a
 * different statement — it comes from the layout's session and is rendered as a caveat beside
 * the answer rather than in place of it.
 */
const MyRolesDocument = graphql(`
	query MyRoles {
		me {
			id
			mail
			name
			roles
			programmes {
				code
				title
			}
			subjectGroupsLed {
				id
				code
				name
				active
			}
		}
		mySubjectGroups {
			id
			code
			name
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(MyRolesDocument);
		return {
			me: data.me,
			// Membership, which is a different thing from leadership and is on the page so that
			// the two are not confused — the page that sets it says the same in the other
			// direction.
			memberships: data.mySubjectGroups
		};
	} catch (err) {
		// A refusal here is "no account": this page needs no role at all. The root layout
		// renders that as its own page.
		error(403, toRefusal(err).message);
	}
};
