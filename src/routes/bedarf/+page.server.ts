import { error, fail, redirect } from '@sveltejs/kit';
import { ALL_PART_KINDS, frequenciesForTerm } from '$lib/catalogue';
import { previousComparableSemester } from '$lib/demand';
import { graphql } from '$lib/gql/__generated__';
import type {
	CourseType,
	CoverageCandidatesQuery,
	DemandEntryInput,
	DutyStatus,
	Frequency,
	InstancePartKind
} from '$lib/gql/__generated__/graphql';

/** One instance the picker may offer as the holder of somebody else's demand. */
type CoverageCandidate = CoverageCandidatesQuery['courseInstances'][number];
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
		$foreignSearch: String
		$withForeign: Boolean!
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
		# Which programmes have announced their demand as settled. An announcement and not a lock:
		# what it does is tell the colleagues that registering interest here is worth the effort.
		demandCompletions(semester: $semester) @include(if: $withOverview) {
			completedAt
			programme {
				code
			}
		}
		modules(filter: $filter) @include(if: $withTable) {
			id
			name
			zpaId
			source
			kind
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
				source
				kind
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
				fromProgramme {
					code
				}
				part {
					id
					kind
					teachingHours
				}
			}
			# Who holds this cohort's teaching, and whose this one holds. Asked for on the
			# previous semester's block too: the prefill is built from it, and a covered cohort
			# proposed as an ordinary one would silently offer to plan teaching twice.
			coveredBy {
				acceptedAt
				instance {
					id
					track
					programmeSemester
					programme {
						code
					}
				}
			}
			covers {
				acceptedAt
				instance {
					id
					track
					programmeSemester
					programme {
						code
					}
				}
			}
			# The same module, offered by somebody else and held there. The case a coupling was
			# possible and nobody noticed — and the only thing that ever surfaces it.
			alsoPlannedSeparately {
				id
				track
				programmeSemester
				programme {
					code
				}
			}
		}
		# The whole catalogue, searched — deliberately without a programme filter, because the
		# point of this list is the modules the programme's own catalogue does not contain.
		# Only asked for when somebody typed something: it is a second pass over 500 modules.
		foreign: modules(filter: { search: $foreignSearch }) @include(if: $withForeign) {
			id
			name
			zpaId
			source
			kind
			plannable
			homeProgramme {
				code
				title
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
				fromProgramme {
					code
				}
				part {
					id
					kind
					teachingHours
				}
			}
			# Who holds this cohort's teaching, and whose this one holds. Asked for on the
			# previous semester's block too: the prefill is built from it, and a covered cohort
			# proposed as an ordinary one would silently offer to plan teaching twice.
			coveredBy {
				acceptedAt
				instance {
					id
					track
					programmeSemester
					programme {
						code
					}
				}
			}
			covers {
				acceptedAt
				instance {
					id
					track
					programmeSemester
					programme {
						code
					}
				}
			}
			# The same module, offered by somebody else and held there. The case a coupling was
			# possible and nobody noticed — and the only thing that ever surfaces it.
			alsoPlannedSeparately {
				id
				track
				programmeSemester
				programme {
					code
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
			# Cohorts that arrived already held with another programme's event, and cohorts of
			# *other* programmes that took a withdrawn event over. The second is the only thing a
			# save does outside the programme it was called for, so it is the one thing the report
			# cannot leave out.
			coupled {
				moduleName
				track
			}
			promoted {
				moduleName
				track
				programme {
					code
				}
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

const SetDemandCompleteDocument = graphql(`
	mutation SetDemandComplete($semester: String!, $programme: String!, $complete: Boolean!) {
		setDemandComplete(semester: $semester, programme: $programme, complete: $complete) {
			completedAt
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

const RequestCoverageDocument = graphql(`
	mutation RequestCoverageFromTable($id: ID!, $coveredBy: ID!) {
		requestInstanceCoverage(id: $id, coveredBy: $coveredBy) {
			id
		}
	}
`);

const AcceptCoverageDocument = graphql(`
	mutation AcceptCoverageFromTable($id: ID!) {
		acceptInstanceCoverage(id: $id) {
			id
		}
	}
`);

const ReleaseCoverageDocument = graphql(`
	mutation ReleaseCoverageFromTable($id: ID!) {
		releaseInstanceCoverage(id: $id) {
			id
		}
	}
`);

// The instances another programme could hold this one's demand with.
//
// A separate query behind a URL parameter rather than part of the page load: it is only ever
// wanted for the one cohort somebody is pointing at, and asking for every row's candidates would
// be one join per line of a table that is mostly untouched catalogue.
const CoverageCandidatesDocument = graphql(`
	query CoverageCandidates($semester: String!, $module: ID!) {
		courseInstances(semester: $semester, module: $module) {
			id
			track
			programmeSemester
			teachingHours
			programme {
				code
				title
			}
			coveredBy {
				acceptedAt
			}
			covers {
				acceptedAt
			}
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

const CreateLocalDocument = graphql(`
	mutation CreateLocalCourse($in: LocalModuleInput!) {
		createLocalModule(input: $in) {
			id
			name
			kind
		}
	}
`);

const DeclareDocument = graphql(`
	mutation DeclareFromSearch($in: DeclareCourseInstanceInput!) {
		declareCourseInstance(input: $in) {
			id
			module {
				name
			}
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
	// The term follows the semester, and the only choice about it is whether to widen.
	//
	// It used to be a three-way select — winter, summer, all — and two of the three were
	// nonsense: with a winter semester chosen, "Sommersemester" asks for the modules that
	// cannot run in it. What somebody actually wants is the modules of *this* term, and
	// occasionally the ones of the other as well, so that is what it offers.
	const bothTerms = url.searchParams.get('turnus') === 'alle';
	const term = bothTerms ? '' : semesterTerm(semester);
	const onlyEstimated = url.searchParams.get('offen') === '1';
	const onlyPlanned = url.searchParams.get('geplant') === '1';
	// The edit mode, as a parameter rather than as browser state: two views under one address
	// cannot be sent to a colleague, and the back button would leave the wrong one showing.
	const editing = url.searchParams.get('bearbeiten') === '1';
	// The search for a module outside this programme's catalogue. In the address like every
	// other filter, so the list somebody is looking at survives a reload and a save.
	const foreignSearch = (url.searchParams.get('fremd') ?? '').trim();
	// Which cohort is looking for somebody to hold its teaching. In the address like the edit mode
	// and the foreign search, and for the same reason: the picker is a view, and a view somebody
	// is looking at is a thing they can reload, send on, and back out of.
	const coverageFor = (url.searchParams.get('deckung') ?? '').trim();

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
			foreignSearch: foreignSearch === '' ? null : foreignSearch,
			withForeign: withTable && foreignSearch !== '',
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

	// The candidates for the one cohort somebody is pointing at.
	//
	// After the main load rather than beside it: the module is read off the instance the parameter
	// names, so there is nothing to ask until that instance is in hand. One extra round trip on
	// the one screen that opened a picker, and none on every other.
	let coverageCandidates: CoverageCandidate[] = [];
	const coverageSubject = (data.courseInstances ?? []).find((i) => i.id === coverageFor);
	if (coverageSubject) {
		try {
			const found = await backendRequest(CoverageCandidatesDocument, {
				semester,
				module: coverageSubject.module.id
			});
			// The cohort itself and anything already spoken for are dropped here rather than in
			// the query: "not itself covered" is the schema's condition, and "not me" is this
			// screen's. A menu whose entries fail on click is worse than a short menu.
			coverageCandidates = found.courseInstances.filter(
				(c) =>
					c.id !== coverageSubject.id &&
					c.programme.code !== coverageSubject.programme.code &&
					!c.coveredBy
			);
		} catch {
			// A picker that cannot be filled is an empty picker, not a broken page: the demand
			// behind it is still readable and still worth showing.
			coverageCandidates = [];
		}
	}

	return {
		semesters: data.semesters,
		planningSemester: data.planningSemester?.code ?? '',
		myProgrammes: data.me?.programmes ?? [],
		coverageFor,
		coverageCandidates,
		programmes: data.programmes,
		current: data.semester ?? null,
		modules: data.modules ?? [],
		foreignMatches: data.foreign ?? [],
		instances: data.courseInstances ?? [],
		previousInstances: data.previous ?? [],
		completions: data.demandCompletions ?? [],
		selected: {
			semester,
			programme,
			previous,
			search,
			duty,
			onlyEstimated,
			onlyPlanned,
			bothTerms,
			editing,
			foreignSearch,
			coverageFor
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
	/**
	 * Announce this programme's demand as settled for the semester, or withdraw the announcement.
	 *
	 * Blocks nothing either way — declaring another instance afterwards stays possible and is the
	 * ordinary case. What it changes is what the wish screen can say about this programme.
	 */
	complete: async ({ request }) => {
		const form = await request.formData();
		const semester = String(form.get('semester') ?? '');
		const programme = String(form.get('programme') ?? '');
		const complete = String(form.get('complete') ?? '') === 'true';

		if (semester === '' || programme === '') {
			return fail(400, { error: 'Kein Semester oder kein Studiengang gewählt.' });
		}

		try {
			await backendRequest(SetDemandCompleteDocument, { semester, programme, complete });
		} catch (err) {
			return fail(403, refusalFor(err));
		}
		return { announced: complete };
	},

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
	 * Take a module into this programme's demand that its own catalogue does not list.
	 *
	 * `declareCourseInstance` rather than a row in the big table, because there is no row yet:
	 * the table is built from the catalogue query, and this module is precisely the one it does
	 * not return. Once declared, the instance puts it there — every reload after this one shows
	 * it as an ordinary row, marked, and it can be unticked like any other.
	 *
	 * One cohort and no letter, which is the ordinary case and what the stepper starts from.
	 */
	adopt: async ({ request }) => {
		const form = await request.formData();

		try {
			const data = await backendRequest(DeclareDocument, {
				in: {
					semester: String(form.get('semester') ?? ''),
					programme: String(form.get('programme') ?? ''),
					moduleId: String(form.get('moduleId') ?? '')
				}
			});
			return { adopted: data.declareCourseInstance.module.name };
		} catch (err) {
			return fail(400, refusalFor(err));
		}
	},

	/**
	 * Enter a course this faculty offers and the examination office's catalogue does not list.
	 *
	 * Two things at once, deliberately: the course is entered *and* declared for this semester.
	 * Somebody who opens this form has already decided to offer it — a course that appears in
	 * the catalogue and not in the demand would be a second, invisible step to remember.
	 *
	 * The split is stated here rather than left to the proposal, because a placeholder with no
	 * hours in the catalogue is refused with MODULE_NOT_DECOMPOSED when the instance is
	 * declared, and that refusal would arrive at the second of the two calls.
	 */
	createLocal: async ({ request }) => {
		const form = await request.formData();

		const kind =
			String(form.get('kind') ?? '') === 'FWP_PLACEHOLDER' ? 'FWP_PLACEHOLDER' : 'MODULE';
		const hours = Number(String(form.get('hours') ?? '').replace(',', '.'));
		const semester = String(form.get('semester') ?? '');
		const programme = String(form.get('programme') ?? '');

		if (!Number.isFinite(hours) || hours <= 0 || hours > 30) {
			return fail(400, {
				error: 'Die SWS müssen eine Zahl zwischen 0 und 30 sein.',
				code: '',
				generic: false
			});
		}

		// The cohort year, and the one field of this form that belongs to the instance rather than
		// to the course. Empty is a value and means nobody has said — a local course is in no set
		// of regulations, so there is nothing to seed it from either way.
		//
		// Checked here rather than left to the backend, which refuses the same range: the refusal
		// would arrive at the *second* of the two calls, and the course would already exist. A
		// form that is rejected has to leave nothing behind.
		const year = String(form.get('year') ?? '').trim();
		const programmeSemester = year === '' ? null : Number(year);
		if (
			programmeSemester !== null &&
			(!Number.isInteger(programmeSemester) || programmeSemester < 1 || programmeSemester > 12)
		) {
			return fail(400, {
				error: 'Das Fachsemester muss eine ganze Zahl zwischen 1 und 12 sein — oder leer bleiben.',
				code: '',
				generic: false
			});
		}

		const practical = String(form.get('practical') ?? '');
		const components: { kind: InstancePartKind; teachingHours: number }[] =
			practical === '' || hours <= 2
				? [{ kind: 'LECTURE', teachingHours: hours }]
				: [
						{ kind: 'LECTURE', teachingHours: hours - 2 },
						{ kind: practical as InstancePartKind, teachingHours: 2 }
					];

		try {
			const created = await backendRequest(CreateLocalDocument, {
				in: {
					programme,
					name: String(form.get('name') ?? ''),
					kind,
					courseType: String(form.get('courseType') ?? 'SU') as CourseType,
					frequency: 'ON_ANNOUNCEMENT' as Frequency,
					contactHoursPerWeek: Math.round(hours),
					components
				}
			});
			await backendRequest(DeclareDocument, {
				in: { semester, programme, moduleId: created.createLocalModule.id, programmeSemester }
			});
			return { adopted: created.createLocalModule.name };
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
	 * The coverage handshake, from the row it is about.
	 *
	 * Three mutations and one action, because the row shows exactly one of the three at a time —
	 * a cohort with no link offers "ask", a cohort with an unanswered one offers "withdraw", and
	 * the holding cohort offers "agree" or "decline". Which button was pressed is a field.
	 *
	 * The refusal comes back through refusalFor like every other write here, so a
	 * COVERAGE_WOULD_CHAIN reaches the screen as its own sentence rather than as "es hat nicht
	 * geklappt".
	 */
	coverage: async ({ request }) => {
		const form = await request.formData();

		// The button that was pressed carries both which of the three this is and which cohort it
		// is about, because a submit button sends only its own name. A shared hidden field plus a
		// click handler would work with JavaScript and silently do the wrong thing without it.
		const accept = form.get('accept');
		const release = form.get('release');
		const ask = form.get('ask');

		try {
			if (release) {
				await backendRequest(ReleaseCoverageDocument, { id: String(release) });
			} else if (accept) {
				await backendRequest(AcceptCoverageDocument, { id: String(accept) });
			} else {
				await backendRequest(RequestCoverageDocument, {
					id: String(ask ?? ''),
					coveredBy: String(form.get('coveredBy') ?? '')
				});
			}
		} catch (err) {
			return fail(400, refusalFor(err));
		}
		return { coverage: String(accept ?? release ?? ask ?? '') };
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
