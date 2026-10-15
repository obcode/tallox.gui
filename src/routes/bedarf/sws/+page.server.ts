import { error, redirect } from '@sveltejs/kit';
import { previousComparableSemester } from '$lib/demand';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { PageServerLoad } from './$types';

/**
 * The SWS controlling: what a semester's demand costs, by the home programme of each module.
 *
 * Readable by everybody, like the demand it sums. The semester travels in the URL for the reason
 * it does on the demand page — a view is a thing somebody sends to a colleague.
 */
const SemestersDocument = graphql(`
	query ControllingSemesters {
		semesters {
			code
			isPlanningSemester
		}
		planningSemester {
			code
		}
	}
`);

const LoadDocument = graphql(`
	query ControllingLoad($semester: String!) {
		teachingLoad(semester: $semester) {
			homeProgramme {
				code
				title
				planningStatus
			}
			teachingHours
			ownHours
			instanceCount
			fwpInstanceCount
			fwpHours
			partsWithoutHours
			shares {
				programme {
					code
					title
				}
				teachingHours
				instanceCount
			}
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	const semester = url.searchParams.get('semester') ?? '';

	let semesters, current;
	try {
		[semesters, current] = await Promise.all([
			backendRequest(SemestersDocument, {}),
			semester === '' ? null : backendRequest(LoadDocument, { semester })
		]);
	} catch (err) {
		// A refusal here is "no account", or a semester code a hand-edited URL invented. Both are
		// worth a sentence rather than an empty table that looks like a semester with no teaching.
		error(403, toRefusal(err).message);
	}

	// Arriving without a semester lands on the one the faculty is planning — a redirect rather
	// than a quiet default, as on the demand page, so that the address says what is shown.
	if (semester === '' && semesters.planningSemester) {
		redirect(303, `/bedarf/sws?semester=${semesters.planningSemester.code}`);
	}

	// The same semester a year earlier, beside each row. A request of its own, because it may fail
	// on its own: a year the backend will not plan is refused, and that must cost the comparison
	// rather than the page.
	const previousCode = previousComparableSemester(semester);
	let previous = null;
	if (current && previousCode !== '') {
		try {
			previous = (await backendRequest(LoadDocument, { semester: previousCode })).teachingLoad;
		} catch {
			previous = null;
		}
	}

	return {
		semesters: semesters.semesters,
		selected: semester,
		previousCode,
		load: current?.teachingLoad ?? null,
		previous
	};
};
