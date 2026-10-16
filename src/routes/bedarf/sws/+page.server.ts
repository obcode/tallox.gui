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
			yearlyQuota
			semesterQuota
			balance
		}
	}
`);

/**
 * What one programme takes from elsewhere: the instances of modules another programme is home
 * to. The filter is the backend's (`foreignHome`), so a script asking the same question gets the
 * same list.
 */
const ImportsDocument = graphql(`
	query ControllingImports($semester: String!, $programme: String!) {
		courseInstances(semester: $semester, programme: $programme, foreignHome: true) {
			id
			track
			programmeSemester
			teachingHours
			coveredBy {
				acceptedAt
			}
			module {
				name
				zpaId
				kind
				homeProgramme {
					code
					title
				}
				dutyStatus(programme: $programme)
			}
		}
	}
`);

/** The programmes to choose from, and the caller's own, which the choice starts at. */
const ProgrammesDocument = graphql(`
	query ControllingProgrammes {
		programmes {
			code
			title
		}
		me {
			programmes {
				code
			}
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	const semester = url.searchParams.get('semester') ?? '';

	let semesters, current, programmes;
	try {
		[semesters, current, programmes] = await Promise.all([
			backendRequest(SemestersDocument, {}),
			semester === '' ? null : backendRequest(LoadDocument, { semester }),
			backendRequest(ProgrammesDocument, {})
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

	// Whose imports are shown: the one in the URL, else the caller's own first programme, else
	// none until somebody picks one. Unlike the semester this is not redirected to — a lecturer
	// without a programme has no default, and the page is still the page.
	const own = programmes.me?.programmes.map((p) => p.code) ?? [];
	const importsFor = (url.searchParams.get('studiengang') ?? own[0] ?? '').toUpperCase();
	let imports = null;
	if (current && importsFor !== '') {
		try {
			imports = (await backendRequest(ImportsDocument, { semester, programme: importsFor }))
				.courseInstances;
		} catch (err) {
			error(403, toRefusal(err).message);
		}
	}

	return {
		semesters: semesters.semesters,
		programmes: programmes.programmes,
		importsFor,
		imports,
		selected: semester,
		previousCode,
		load: current?.teachingLoad ?? null,
		previous
	};
};
