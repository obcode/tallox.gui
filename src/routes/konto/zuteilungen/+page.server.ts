import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { berlinToday } from '$lib/confirmation';
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
			assignmentConfirmationDue
		}
	}
`);

/** Where my confirmation of one semester stands — own data, every door. */
const MyConfirmationDocument = graphql(`
	query MyAssignmentConfirmation($semester: String!) {
		myAssignmentConfirmation(semester: $semester) {
			semester
			state
			confirmedAt
		}
	}
`);

const ConfirmDocument = graphql(`
	mutation ConfirmMyAssignments($semester: String!) {
		confirmMyAssignments(semester: $semester) {
			semester
			state
			confirmedAt
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
	// One request per semester I hold something in — a handful per person, and only those, since a
	// semester without assignments has nothing to confirm.
	const held = [...new Set(data.myAssignments.map((a) => a.instance.semester))];
	const confirmations = await Promise.all(
		held.map(async (semester) => {
			try {
				return (await backendRequest(MyConfirmationDocument, { semester }))
					.myAssignmentConfirmation;
			} catch {
				// The list stays useful without its confirmation line.
				return null;
			}
		})
	);
	return {
		assignments: data.myAssignments,
		confirmations: confirmations.filter((c) => c !== null),
		due: Object.fromEntries(
			data.semesters
				.filter((s) => s.assignmentConfirmationDue)
				.map((s) => [s.code, s.assignmentConfirmationDue as string])
		),
		today: berlinToday(),
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
	 * „Passt so“: confirm all my assignments of a semester at once. A one-click action; the
	 * backend decides whether there is anything to confirm and whether the semester is still open.
	 */
	confirm: async ({ request }) => {
		const form = await request.formData();
		const semester = String(form.get('semester') ?? '');
		try {
			await backendRequest(ConfirmDocument, { semester });
		} catch (err) {
			return fail(400, { confirmRefusal: { semester, message: toRefusal(err).message } });
		}
		return { confirmed: semester };
	},

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
