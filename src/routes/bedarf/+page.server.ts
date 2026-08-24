import { error, fail, redirect } from '@sveltejs/kit';
import { ALL_PART_KINDS, frequenciesForTerm } from '$lib/catalogue';
import { previousComparableSemester } from '$lib/demand';
import { graphql } from '$lib/gql/__generated__';
import type {
	DemandEntryInput,
	DutyStatus,
	InstancePartKind
} from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { semesterTerm } from '$lib/semester';
import type { Actions, PageServerLoad } from './$types';

/**
 * The demand of one study programme in one semester, as one table.
 *
 * The faculty has always planned a semester this way: one row per module, a tick, the cohorts,
 * the groups in each — their spreadsheet for the winter of 2026/27 has 346 such rows. So this
 * page is that table, and the three steps that used to be three screens (pick a module, declare
 * it, add its groups) are three fields in a row.
 *
 * Semester and study programme travel in the URL, like every filter on the catalogue page: a
 * view somebody is looking at is a thing they send to a colleague.
 */
const DemandDocument = graphql(`
	query DemandTable(
		$semester: String!
		$programme: String!
		$programmeFilter: String
		$previous: String!
		$filter: ModuleFilter
		$withTable: Boolean!
		$withOverview: Boolean!
		$withPrevious: Boolean!
	) {
		semesters {
			code
			phase
			isPlanningSemester
		}
		planningSemester {
			code
		}
		me {
			programmes {
				code
				title
			}
		}
		programmes {
			code
			title
			active
		}
		semester(code: $semester) @include(if: $withOverview) {
			code
			phase
			wishesPublishedAt
		}
		modules(filter: $filter) @include(if: $withTable) {
			id
			name
			zpaId
			active
			contactHoursPerWeek
			splitIsEstimated
			plannable
			practicalKind
			components {
				kind
				teachingHours
			}
			proposedComponents {
				kind
				teachingHours
			}
			dutyStatus(programme: $programme)
			programmeSemester(programme: $programme)
		}
		courseInstances(semester: $semester, programme: $programmeFilter) @include(if: $withOverview) {
			id
			track
			programmeSemester
			teachingHours
			programme {
				code
				title
			}
			# The same fields the catalogue query asks for, on purpose and not by accident.
			#
			# The overview reads the module off the instance rather than off the catalogue list,
			# because the two are not the same set: an instance may point at a module the filter
			# does not return — one of another programme, one the term filter excludes — and a row
			# that only exists in the list would be invisible on the very screen that could take
			# it back. It costs nothing: the backend loads the module for the instance either way.
			module {
				id
				name
				zpaId
				splitIsEstimated
				plannable
				practicalKind
				components {
					kind
					teachingHours
				}
				proposedComponents {
					kind
					teachingHours
				}
				dutyStatus(programme: $programme)
				programmeSemester(programme: $programme)
			}
			parts {
				id
				kind
				teachingHours
				sharedAcrossTracks
			}
			borrowedParts {
				fromTrack
				part {
					id
					kind
					teachingHours
				}
			}
		}
		previous: courseInstances(semester: $previous, programme: $programmeFilter)
			@include(if: $withPrevious) {
			id
			track
			programmeSemester
			teachingHours
			module {
				id
			}
			parts {
				id
				kind
				teachingHours
				sharedAcrossTracks
			}
			borrowedParts {
				fromTrack
				part {
					id
					kind
					teachingHours
				}
			}
		}
	}
`);

const PlanDocument = graphql(`
	mutation PlanDemand(
		$semester: String!
		$programme: String!
		$entries: [DemandEntryInput!]!
		$dryRun: Boolean!
	) {
		planDemand(semester: $semester, programme: $programme, entries: $entries, dryRun: $dryRun) {
			dryRun
			teachingHours
			created {
				moduleName
				track
			}
			withdrawn {
				moduleName
				track
			}
			changed {
				moduleName
				track
				trackBefore
				groupsBefore
				groupsAfter
			}
			refused {
				moduleName
				track
				code
				message
			}
		}
	}
`);

const SharePartDocument = graphql(`
	mutation SharePartFromTable($id: ID!) {
		shareInstancePartAcrossTracks(id: $id) {
			id
		}
	}
`);

const SplitPartDocument = graphql(`
	mutation SplitPartFromTable($id: ID!) {
		splitInstancePartAcrossTracks(id: $id) {
			id
		}
	}
`);

const ConfirmSplitDocument = graphql(`
	mutation ConfirmSplit($moduleId: ID!, $components: [ModuleComponentInput!]!) {
		setModuleComponents(moduleId: $moduleId, components: $components) {
			id
			splitIsEstimated
		}
	}
`);

const DUTY_VALUES: DutyStatus[] = ['COMPULSORY', 'ELECTIVE', 'MIXED'];

export const load: PageServerLoad = async ({ url }) => {
	const semester = url.searchParams.get('semester') ?? '';
	const programme = url.searchParams.get('studiengang') ?? '';
	const search = url.searchParams.get('q') ?? '';
	const duty = url.searchParams.get('art') ?? '';
	// The term of the semester being planned, unless somebody widened it: the demand of a winter
	// has no business proposing the modules that run only in summer.
	const term = url.searchParams.get('turnus') ?? semesterTerm(semester);
	const onlyEstimated = url.searchParams.get('offen') === '1';
	const onlyPlanned = url.searchParams.get('geplant') === '1';
	// The edit mode, as a parameter rather than as browser state: two views under one address
	// cannot be sent to a colleague, and the back button would leave the wrong one showing.
	const editing = url.searchParams.get('bearbeiten') === '1';

	// The overview needs a semester and nothing else — "what does the faculty offer next term" is
	// a question somebody asks before they know which programme a module belongs to. The planning
	// table needs a programme too, because planDemand writes exactly one.
	const withOverview = semester !== '';
	const withTable = editing && withOverview && programme !== '';
	const previous = previousComparableSemester(semester);

	let data;
	try {
		data = await backendRequest(DemandDocument, {
			semester,
			programme,
			// Null rather than the empty string: no programme means every programme here, and the
			// empty string would be a programme code nothing matches.
			programmeFilter: programme === '' ? null : programme,
			previous,
			withTable,
			withOverview,
			// A previous semester is only asked for when there is one to ask about — and only
			// when it could hold anything, which a code the backend would refuse cannot.
			withPrevious: withOverview && previous !== '',
			filter: {
				programme: programme === '' ? null : programme,
				search: search === '' ? null : search,
				duty: DUTY_VALUES.includes(duty as DutyStatus) ? (duty as DutyStatus) : null,
				frequency: frequenciesForTerm(term)
			}
		});
	} catch (err) {
		// A refusal here is "no account", which the root layout already shows as its own page, or
		// a semester code a hand-edited URL invented. Both are worth a sentence rather than an
		// empty table that looks like a programme with nothing to plan.
		error(403, toRefusal(err).message);
	}

	// Arriving without a semester lands on the one the faculty is planning.
	//
	// A redirect rather than a quiet default, because the choice belongs in the address: this
	// page's whole arrangement is that a view somebody is looking at is a thing they send to a
	// colleague, and a default that lives only in the load would make two people with the same
	// link see different screens once the mark moves. It also keeps the back button, a reload
	// and the path without JavaScript all saying the same thing.
	//
	// Outside the try above on purpose — SvelteKit's redirect is thrown, and a catch that turned
	// it into a 403 would be a very confusing bug.
	if (semester === '' && data.planningSemester) {
		const to = new URLSearchParams(url.searchParams);
		to.set('semester', data.planningSemester.code);
		// Only when there is exactly one. Two is a question this page cannot answer for
		// somebody, and none — the dean's office, a lecturer — means "all of them", which is a
		// view in its own right.
		const mine = data.me?.programmes ?? [];
		if (programme === '' && mine.length === 1) {
			to.set('studiengang', mine[0].code);
		}
		redirect(303, `/bedarf?${to}`);
	}

	return {
		semesters: data.semesters,
		planningSemester: data.planningSemester?.code ?? '',
		myProgrammes: data.me?.programmes ?? [],
		programmes: data.programmes,
		current: data.semester ?? null,
		modules: data.modules ?? [],
		instances: data.courseInstances ?? [],
		previousInstances: data.previous ?? [],
		selected: {
			semester,
			programme,
			previous,
			search,
			duty,
			term,
			onlyEstimated,
			onlyPlanned,
			editing
		}
	};
};

/**
 * The entries of a plan, read out of the table's fields.
 *
 * Every row of the screen sends its module id, ticked or not — that is what tells the backend
 * "this row was on the screen and its tick is off" rather than "I did not mention it". Silence
 * means untouched, which is what makes a filtered table safe to save.
 *
 * The cohort letters travel as fields of their own rather than being derived here, because the
 * page renders them and what is saved has to be what was shown.
 */
function entriesFrom(form: FormData): DemandEntryInput[] {
	const offered = new Set(form.getAll('offer').map(String));

	return form
		.getAll('module')
		.map(String)
		.map((moduleId) => {
			if (!offered.has(moduleId)) {
				return { moduleId, tracks: [] };
			}

			const tracks = [];
			for (let i = 0; form.has(`track:${moduleId}:${i}`); i++) {
				tracks.push({
					track: String(form.get(`track:${moduleId}:${i}`) ?? ''),
					groups: Math.max(0, Number(form.get(`groups:${moduleId}:${i}`) ?? 0))
				});
			}

			const year = String(form.get(`semester:${moduleId}`) ?? '').trim();
			return {
				moduleId,
				tracks,
				programmeSemester: year === '' ? null : Number(year)
			};
		});
}

/**
 * A refusal, in the shape the page renders it.
 *
 * The code travels with the sentence because the generic sentence — the one for a refusal nobody
 * has thought about yet — says nothing anybody can act on. Beside the code it becomes a thing
 * that can be reported, looked up, and fixed.
 */
function refusalFor(err: unknown) {
	const refusal = toRefusal(err);
	return { error: refusal.message, code: refusal.code, generic: refusal.generic };
}

/** The three things a save needs to know, in the order the page asks them. */
type PlanVariables = {
	semester: string;
	programme: string;
	entries: DemandEntryInput[];
	dryRun: boolean;
};

async function runPlan(variables: PlanVariables) {
	const data = await backendRequest(PlanDocument, variables);
	return data.planDemand;
}

export const actions: Actions = {
	/**
	 * Save the table.
	 *
	 * A dry run first, always. If it would take nothing away, the save follows immediately and
	 * the whole thing is one click — ticking modules and setting groups is the ordinary case and
	 * deserves no ceremony. If it would withdraw something, the preview comes back for
	 * confirmation instead: a tick taken away is a statement, and from the wish phase onwards
	 * somebody's entry may be behind it.
	 */
	plan: async ({ request }) => {
		const form = await request.formData();
		const variables: PlanVariables = {
			semester: String(form.get('semester') ?? ''),
			programme: String(form.get('programme') ?? ''),
			entries: entriesFrom(form),
			dryRun: true
		};

		try {
			const preview = await runPlan(variables);
			if (preview.withdrawn.length > 0) {
				return {
					preview,
					// What the confirmation re-submits. Server-built, so the second call plans
					// exactly what the first one previewed rather than whatever the page looks
					// like by then.
					payload: JSON.stringify(variables.entries)
				};
			}
			return { report: await runPlan({ ...variables, dryRun: false }) };
		} catch (err) {
			return fail(400, refusalFor(err));
		}
	},

	/** Write what the preview showed. */
	apply: async ({ request }) => {
		const form = await request.formData();

		let entries: DemandEntryInput[];
		try {
			entries = JSON.parse(String(form.get('payload') ?? '[]'));
		} catch {
			return fail(400, {
				error: 'Die Vorschau ist nicht mehr lesbar. Bitte erneut speichern.',
				code: '',
				generic: false
			});
		}

		try {
			return {
				report: await runPlan({
					semester: String(form.get('semester') ?? ''),
					programme: String(form.get('programme') ?? ''),
					entries,
					dryRun: false
				})
			};
		} catch (err) {
			return fail(400, refusalFor(err));
		}
	},

	/**
	 * Hold one lecture for all the cohorts of its module — or stop.
	 *
	 * The case the cohort model exists for: one person gives the lecture for IF3A and IF3B, it
	 * happens once, and its hours count once. Never the default, so this is where somebody says
	 * otherwise; and the way back is the same button, because a sabbatical revises the judgement.
	 */
	sharePart: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('partId') ?? '');

		try {
			// Two documents rather than one with a flag: they are two mutations, and the
			// generated types are two types — a variable holding either would be neither.
			if (form.has('split')) {
				await backendRequest(SplitPartDocument, { id });
			} else {
				await backendRequest(SharePartDocument, { id });
			}
		} catch (err) {
			return fail(400, refusalFor(err));
		}
		return { shared: id };
	},

	/**
	 * Confirm one proposed split, from the row it is shown in.
	 *
	 * The estimate is good enough to plan with, so this is not a gate — it is the moment the
	 * faculty takes the number over from the software. One row at a time and deliberately no
	 * "confirm everything": a proposal is looked at and then confirmed, or the tick means
	 * nothing.
	 */
	confirmSplit: async ({ request }) => {
		const form = await request.formData();
		const moduleId = String(form.get('moduleId') ?? '');

		// Named per module, because this button lives inside the big table form — HTML has no
		// nested forms, so `formaction` sends the whole screen and the action picks out the one
		// row it is about.
		const kinds = form.getAll(`kind:${moduleId}`).map(String);
		const hours = form.getAll(`hours:${moduleId}`).map(String);

		const components: { kind: InstancePartKind; teachingHours: number }[] = [];
		for (let i = 0; i < kinds.length; i++) {
			const kind = kinds[i];
			if (!(ALL_PART_KINDS as readonly string[]).includes(kind)) {
				return fail(400, {
					error: 'Unbekannte Art von Lehrveranstaltung.',
					code: '',
					generic: false
				});
			}
			components.push({
				kind: kind as InstancePartKind,
				teachingHours: Number((hours[i] ?? '').replace(',', '.'))
			});
		}

		if (components.length === 0) {
			return fail(400, {
				error: 'Für dieses Modul gibt es nichts zu bestätigen.',
				code: '',
				generic: false
			});
		}

		try {
			await backendRequest(ConfirmSplitDocument, { moduleId, components });
		} catch (err) {
			return fail(400, refusalFor(err));
		}
		return { confirmed: moduleId };
	}
};
