import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

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
				cie
				programme {
					code
				}
				module {
					id
					name
					englishPossible
				}
			}
		}
		semesters {
			code
			phase
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
		published: data.semesters.filter((s) => s.assignmentsPublishedAt).map((s) => s.code),
		// Where the CiE box is still open: until the semester is finished, the backend's rule.
		finished: data.semesters.filter((s) => s.phase === 'FINAL').map((s) => s.code)
	};
};

const SetCieDocument = graphql(`
	mutation SetMyCohortCiE($id: ID!, $cie: Boolean!) {
		setCourseInstanceCiE(id: $id, cie: $cie) {
			id
			cie
		}
	}
`);

export const actions: Actions = {
	/**
	 * List a cohort I teach as a course in English (CiE), or take it off the list. The backend lets
	 * whoever teaches a part of the cohort do this; the box here is only where to do it.
	 */
	cie: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const cie = form.get('cie') === 'true';
		try {
			await backendRequest(SetCieDocument, { id, cie });
		} catch (err) {
			return fail(400, { cieRefusal: { id, message: toRefusal(err).message } });
		}
		return { saved: id };
	}
};
