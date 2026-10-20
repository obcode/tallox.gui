import { error } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { PageServerLoad } from './$types';

/**
 * Where I am actually down to teach: my own assignments, in every semester.
 *
 * Own rows are visible to their owner in every phase — the backend's rule, and the reason this
 * needs no semester argument. Before a semester's assignment is published they are a draft, and
 * the page says so: the subject group lead may still be moving things, and a draft read as final
 * is the question the publication mark exists to prevent.
 */
const MyAssignmentsDocument = graphql(`
	query MyAssignments {
		myAssignments {
			id
			note
			part {
				id
				kind
				teachingHours
			}
			instance {
				id
				semester
				track
				topic
				programmeSemester
				delivery
				taughtInEnglish
				programme {
					code
				}
				module {
					id
					name
				}
			}
		}
		semesters {
			code
			assignmentsPublishedAt
		}
	}
`);

export const load: PageServerLoad = async () => {
	let data;
	try {
		data = await backendRequest(MyAssignmentsDocument, {});
	} catch (err) {
		error(403, toRefusal(err).message);
	}
	return {
		assignments: data.myAssignments,
		published: data.semesters.filter((s) => s.assignmentsPublishedAt).map((s) => s.code)
	};
};
