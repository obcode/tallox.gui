import { error, fail } from '@sveltejs/kit';
import { frequenciesForTerm } from '$lib/catalogue';
import { graphql } from '$lib/gql/__generated__';
import type { DutyStatus } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

const CatalogueDocument = graphql(`
	query Catalogue($filter: ModuleFilter, $programme: String!) {
		# Every programme, including the ones the faculty does not plan: this is the catalogue,
		# and the catalogue holds them. Their modules are still taught and still findable, and a
		# picker that left them out would make "the modules of IC" unaskable. What is filtered to
		# the planned ones is the demand page, where the question is what to plan.
		programmes(includeUnplanned: true) {
			code
			title
			active
			planningStatus
			spos {
				id
				version
				primussId
			}
		}
		modules(filter: $filter) {
			id
			name
			zpaId
			active
			courseType
			frequency
			contactHoursPerWeek
			credits
			componentHours
			homeProgramme {
				code
			}
			subjectGroup {
				id
				code
				name
				active
			}
			responsible {
				id
				sortName
			}
			components {
				id
				kind
				teachingHours
			}
			dutyStatus(programme: $programme)
			inCatalogue(programme: $programme)
		}
		# The groups to assign into, and the number still waiting. Both are readable by anybody
		# with an account: it is catalogue data, and the count is what makes the work list a
		# bounded task rather than an open form.
		subjectGroups {
			id
			code
			name
			active
		}
		modulesWithoutSubjectGroup
	}
`);

const AssignSubjectGroupDocument = graphql(`
	mutation SetModulesSubjectGroup($moduleIds: [ID!]!, $subjectGroup: ID) {
		setModulesSubjectGroup(moduleIds: $moduleIds, subjectGroup: $subjectGroup) {
			modulesAssigned
			modulesWithoutSubjectGroup
			subjectGroup {
				code
			}
		}
	}
`);

const DUTY_VALUES: DutyStatus[] = ['COMPULSORY', 'ELECTIVE', 'MIXED'];

/**
 * The module catalogue.
 *
 * Every filter travels in the URL rather than in component state, and every one of them is
 * applied by the backend. Two reasons and the second is the one that decides it: a filtered
 * list is a thing somebody sends to a colleague, and the rules about which modules belong to a
 * programme are rules — a version of them here would be a second implementation in the layer
 * that is supposed to have none.
 *
 * `dutyStatus` and `inCatalogue` take the programme as an argument, so the query needs one even
 * when nobody filtered by it. An empty string matches no programme and both fields answer
 * accordingly, which is the honest rendering of "you have not said which programme you mean".
 */
export const load: PageServerLoad = async ({ url }) => {
	const programme = url.searchParams.get('studiengang') ?? '';
	const spo = url.searchParams.get('spo') ?? '';
	const term = url.searchParams.get('turnus') ?? '';
	const duty = url.searchParams.get('art') ?? '';
	const search = url.searchParams.get('q') ?? '';
	const includeInactive = url.searchParams.get('inaktiv') === '1';
	const withoutComponents = url.searchParams.get('ohne-aufteilung') === '1';
	const withoutSubjectGroup = url.searchParams.get('ohne-fachgruppe') === '1';
	const subjectGroup = url.searchParams.get('fachgruppe') ?? '';

	const frequency = frequenciesForTerm(term);
	const dutyFilter = DUTY_VALUES.includes(duty as DutyStatus) ? (duty as DutyStatus) : null;

	try {
		const data = await backendRequest(CatalogueDocument, {
			programme,
			filter: {
				programme: programme === '' ? null : programme,
				spo: spo === '' ? null : spo,
				frequency,
				// The backend ignores it without a programme, and so does the form: the answer is
				// a property of a module *in a programme*, not of a module.
				duty: programme === '' ? null : dutyFilter,
				search: search === '' ? null : search,
				includeInactive,
				withoutComponents,
				withoutSubjectGroup,
				subjectGroup: subjectGroup === '' ? null : subjectGroup
			}
		});

		return {
			programmes: data.programmes,
			modules: data.modules,
			subjectGroups: data.subjectGroups,
			modulesWithoutSubjectGroup: data.modulesWithoutSubjectGroup,
			filter: {
				programme,
				spo,
				term,
				duty,
				search,
				includeInactive,
				withoutComponents,
				withoutSubjectGroup,
				subjectGroup
			}
		};
	} catch (err) {
		// A refusal here means no account at all — the catalogue itself needs no role. The root
		// layout already turns that into its own page; passing it on as a 403 keeps the two from
		// being confused.
		error(403, toRefusal(err).message);
	}
};

/**
 * Assign a batch of modules to a subject group, or take them out of every group.
 *
 * A form action rather than a proxy: it belongs to this page, and as a form it works without
 * JavaScript. A batch because the task is 506 modules and a screen that saves one row per click
 * is a task nobody finishes — which is why the checkbox column exists at all.
 *
 * Refusals surface through toRefusal like every other write path here: the code is the stable
 * half of the contract, the German sentence is the half somebody rewords.
 */
export const actions: Actions = {
	assignSubjectGroup: async ({ request }) => {
		const form = await request.formData();
		const moduleIds = form.getAll('moduleId').map(String).filter(Boolean);
		const chosen = String(form.get('subjectGroup') ?? '');

		if (moduleIds.length === 0) {
			return fail(400, { message: 'Es war kein Modul ausgewählt.' });
		}

		try {
			const data = await backendRequest(AssignSubjectGroupDocument, {
				moduleIds,
				// The empty option is "take them out of every group" — the same form's other
				// answer, not a missing one.
				subjectGroup: chosen === '' ? null : chosen
			});
			return { assigned: data.setModulesSubjectGroup };
		} catch (err) {
			return fail(400, toRefusal(err));
		}
	}
};
