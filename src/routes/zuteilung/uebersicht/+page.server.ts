import { error, redirect } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { parseBasketChoice, type CohortOrder } from '$lib/basket';
import { withoutEmptyParams } from '$lib/demand';
import type { PageServerLoad } from './$types';

/**
 * Who holds what — read-only, for everybody.
 *
 * What a reader gets is the backend's to decide: after publication every assignment for an
 * ordinary account, only its programmes' for a partner faculty; before publication one's own and
 * nothing else. So the table is drawn only once the semester is published, and the page asks for
 * the assignments only then — before, the demand is public and the assignments are not, and
 * drawing the one against the other would show every other part as unfilled.
 */
const OverviewDocument = graphql(`
	query AssignmentOverview(
		$semester: String!
		$withSemester: Boolean!
		$programme: String
		$withAssignments: Boolean!
	) {
		planningSemester {
			code
		}
		semesters {
			code
			isPlanningSemester
		}
		semester(code: $semester) @include(if: $withSemester) {
			code
			assignmentsPublishedAt
		}
		programmes {
			code
			title
		}
		courseInstances(semester: $semester, programme: $programme) @include(if: $withAssignments) {
			id
			track
			programmeSemester
			baskets
			programme {
				code
				title
			}
			module {
				id
				name
				projectBased
			}
			parts {
				id
				kind
				teachingHours
				taughtBy
			}
			coveredBy {
				acceptedAt
				instance {
					track
					programmeSemester
					programme {
						code
					}
				}
			}
		}
		assignments(semester: $semester, programme: $programme) @include(if: $withAssignments) {
			part {
				id
			}
			assignee {
				name
			}
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	// The same clean-up of „alle“ and „nach Name“ as on `/zuteilung` and `/bedarf`.
	const clean = withoutEmptyParams(url.searchParams, ['korb', 'sortierung']);
	if (clean !== null) {
		const query = clean.toString();
		redirect(303, query === '' ? url.pathname : `${url.pathname}?${query}`);
	}
	const semester = url.searchParams.get('semester') ?? '';
	const programme = (url.searchParams.get('studiengang') ?? '').toUpperCase();
	// Cuts of what is loaded: a basket of one programme, and the order inside each programme.
	const basket = parseBasketChoice(url.searchParams.get('korb'));
	const order: CohortOrder = url.searchParams.get('sortierung') === 'korb' ? 'basket' : 'name';

	const ask = (withAssignments: boolean) =>
		backendRequest(OverviewDocument, {
			semester,
			withSemester: semester !== '',
			programme: programme === '' ? null : programme,
			withAssignments
		});

	let data;
	try {
		data = await ask(false);
	} catch (err) {
		error(403, toRefusal(err).message);
	}
	// Arriving without a semester lands on the one being planned, and the address says so.
	if (semester === '' && data.planningSemester) {
		redirect(303, `/zuteilung/uebersicht?semester=${data.planningSemester.code}`);
	}
	if (data.semester?.assignmentsPublishedAt) {
		try {
			data = await ask(true);
		} catch (err) {
			error(403, toRefusal(err).message);
		}
	}

	return {
		selected: { semester, programme, basket, order },
		semesters: data.semesters,
		programmes: data.programmes,
		published: Boolean(data.semester?.assignmentsPublishedAt),
		instances: data.courseInstances ?? [],
		assignments: data.assignments ?? []
	};
};
