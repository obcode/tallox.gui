import { error, fail, redirect } from '@sveltejs/kit';
import { parseDesiredRange, parseOverviewFilter } from '$lib/desiredHours';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * The colleagues of the faculty, their subject groups, the hours they would like to teach and what
 * they already hold — the table the dean asked for on 2026-10-22, "für alle sichtbar".
 *
 * Every figure arrives filtered. Before the dean's office publishes the desired hours a lecturer
 * reads their own, a subject group lead the members of their groups, the dean's office everybody;
 * a figure the reader may not see comes back as "not stated", and the page shows it as an empty
 * cell, the same as one nobody entered. The load beside it has its own rule (the leads read their
 * members' while the planning runs) and its own publication, the assignments'.
 */
const OverviewDocument = graphql(`
	query DesiredHoursOverview($semester: String!, $withSemester: Boolean!) {
		planningSemester {
			code
		}
		semesters {
			code
			isPlanningSemester
		}
		semester(code: $semester) @include(if: $withSemester) {
			code
			phase
			assignmentsPublishedAt
			desiredHoursFrozenAt
			desiredHoursPublishedAt
		}
		subjectGroups {
			id
			code
			name
		}
		desiredHoursOverview(semester: $semester) @include(if: $withSemester) {
			person {
				id
				name
				sortName
			}
			subjectGroups {
				id
				code
				name
			}
			stated
			minHours
			maxHours
			assignedLoad {
				total
				bySubjectGroup {
					hours
					subjectGroup {
						name
					}
				}
			}
		}
		me {
			id
		}
	}
`);

const CorrectDocument = graphql(`
	mutation CorrectDesiredHours(
		$semester: String!
		$person: ID!
		$minHours: Float
		$maxHours: Float
	) {
		correctDesiredTeachingHours(
			semester: $semester
			person: $person
			minHours: $minHours
			maxHours: $maxHours
		) {
			minHours
			maxHours
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	const semester = url.searchParams.get('semester') ?? '';
	let data;
	try {
		data = await backendRequest(OverviewDocument, { semester, withSemester: semester !== '' });
	} catch (err) {
		error(403, toRefusal(err).message);
	}
	// Arriving without a semester lands on the one being planned, and the address says so.
	if (semester === '' && data.planningSemester) {
		redirect(303, `/wuensche/kollegium?semester=${data.planningSemester.code}`);
	}

	return {
		selected: semester,
		filter: parseOverviewFilter(url.searchParams),
		semesters: data.semesters,
		semester: data.semester ?? null,
		subjectGroups: data.subjectGroups,
		rows: data.desiredHoursOverview ?? [],
		me: data.me
	};
};

export const actions: Actions = {
	/**
	 * The dean's office corrects somebody's figure after the freeze. The note stays the person's —
	 * the mutation keeps it when none is sent. Who may do this is the backend's to say.
	 */
	correct: async ({ request }) => {
		const form = await request.formData();
		const semester = String(form.get('semester') ?? '');
		const person = String(form.get('person') ?? '');
		const range = parseDesiredRange(
			String(form.get('minHours') ?? ''),
			String(form.get('maxHours') ?? '')
		);
		if (range !== null && 'error' in range) {
			return fail(400, { person, message: range.error });
		}
		try {
			await backendRequest(CorrectDocument, {
				semester,
				person,
				minHours: range?.min ?? null,
				maxHours: range?.max ?? null
			});
		} catch (err) {
			return fail(400, { person, message: toRefusal(err).message });
		}
		return { corrected: person };
	}
};
