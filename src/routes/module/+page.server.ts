import { error } from '@sveltejs/kit';
import { frequenciesForTerm } from '$lib/catalogue';
import { graphql } from '$lib/gql/__generated__';
import type { DutyStatus } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { PageServerLoad } from './$types';

const CatalogueDocument = graphql(`
	query Catalogue($filter: ModuleFilter, $programme: String!) {
		programmes {
			code
			title
			active
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
				withoutComponents
			}
		});

		return {
			programmes: data.programmes,
			modules: data.modules,
			filter: { programme, spo, term, duty, search, includeInactive, withoutComponents }
		};
	} catch (err) {
		// A refusal here means no account at all — the catalogue itself needs no role. The root
		// layout already turns that into its own page; passing it on as a 403 keeps the two from
		// being confused.
		error(403, toRefusal(err).message);
	}
};
