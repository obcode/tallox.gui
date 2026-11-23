import { error, redirect } from '@sveltejs/kit';
import { parseBigCourseFilter, parseStudyYear, studyYearChoices } from '#lib/bigCourses.ts';
import { studyYearOf } from '#lib/controlling.ts';
import { graphql } from '#lib/gql/__generated__/index.ts';
import { backendRequest } from '#lib/server/backend.ts';
import { toRefusal } from '#lib/server/graphqlError.ts';
import type { PageServerLoad } from './$types';

/**
 * The faculty council's rule on big courses, per professor and study year.
 *
 * Whose rows come back is the backend's decision (`bigCourseOverview`): the dean's office and the
 * leads of a subject group or a programme read every professor's, already during the planning;
 * everybody else, and every plain token, their own. The study year travels in the URL, so a view
 * is a thing somebody sends to a colleague.
 */
const ChoicesDocument = graphql(`
	query BigCourseChoices {
		semesters {
			code
		}
		planningSemester {
			code
		}
		subjectGroups {
			id
			code
			name
		}
	}
`);

const OverviewDocument = graphql(`
	query BigCourseOverview($studyYear: Int!) {
		bigCourseOverview(studyYear: $studyYear) {
			studyYear
			provisional
			rows {
				professor {
					personId
					teacherId
					name
				}
				subjectGroups {
					id
					code
					name
				}
				winterHours
				summerHours
				averageHours
				target
				actual
				status
				courses {
					semester
					moduleId
					moduleName
					programme {
						code
						title
					}
					teachingHours
					reason
				}
			}
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	let choices;
	try {
		choices = await backendRequest(ChoicesDocument, {});
	} catch (err) {
		error(403, toRefusal(err).message);
	}

	const studyYear = parseStudyYear(url.searchParams.get('studienjahr'));
	// Arriving without a year lands on the planning semester's, and the address says so.
	if (studyYear === null) {
		const planning = choices.planningSemester ? studyYearOf(choices.planningSemester.code) : null;
		if (planning !== null) {
			const params = new URLSearchParams(url.searchParams);
			params.set('studienjahr', String(planning));
			redirect(303, `/statistik/grosse-faecher?${params}`);
		}
	}

	const years = studyYearChoices([
		...choices.semesters.map((s) => s.code),
		...(choices.planningSemester ? [choices.planningSemester.code] : [])
	]);
	// A year typed into the URL that no semester names yet is still offered, rather than shown
	// under a selector that claims another one.
	if (studyYear !== null && !years.includes(studyYear)) {
		years.push(studyYear);
		years.sort((a, b) => b - a);
	}

	let overview = null;
	let refusal: string | null = null;
	if (studyYear !== null) {
		try {
			overview = (await backendRequest(OverviewDocument, { studyYear })).bigCourseOverview;
		} catch (err) {
			// A year out of the backend's reach costs the table, not the page with its selector.
			refusal = toRefusal(err).message;
		}
	}

	return {
		studyYear,
		years,
		filter: parseBigCourseFilter(url.searchParams),
		subjectGroups: choices.subjectGroups,
		overview,
		refusal
	};
};
