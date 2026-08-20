import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * The demand of one study programme in one semester.
 *
 * Both choices travel in the URL — `?semester=2027-SS&studiengang=IF` — rather than in component
 * state, for the reason the module catalogue does it: a screen somebody is looking at is a thing
 * they send to a colleague, and "look at IF in the summer" has to survive being pasted into a
 * mail. It also means a form with two selects and no JavaScript is the whole picker.
 *
 * Nothing is preselected for somebody who leads several programmes. The one thing worse than an
 * extra click here is planning the wrong programme for a while without noticing.
 */
const DemandDocument = graphql(`
	query Demand($semester: String!, $programme: String!, $withDemand: Boolean!) {
		semesters {
			code
			phase
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
		semester(code: $semester) @include(if: $withDemand) {
			code
			phase
			wishesPublishedAt
		}
		courseInstances(semester: $semester, programme: $programme) @include(if: $withDemand) {
			id
			track
			programmeSemester
			teachingHours
			module {
				id
				name
				zpaId
				contactHoursPerWeek
				componentHours
				dutyStatus(programme: $programme)
				components {
					id
					kind
					teachingHours
				}
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

/**
 * The modules an instance could be declared for.
 *
 * Filtered by the backend to the programme's own catalogue *and* its own modules, and to the
 * ones whose hours have been split — a module without a split cannot be declared, and offering
 * it in the picker would be a click path into a refusal.
 *
 * The work list is the other half of the same fact and is linked rather than solved here: the
 * count of modules without a split points at the catalogue page, where they are entered.
 */
const DeclarableModulesDocument = graphql(`
	query DeclarableModules($programme: String!) {
		declarable: modules(filter: { programme: $programme }) {
			id
			name
			zpaId
			components {
				id
			}
			dutyStatus(programme: $programme)
		}
	}
`);

const DeclareDocument = graphql(`
	mutation DeclareCourseInstance($input: DeclareCourseInstanceInput!) {
		declareCourseInstance(input: $input) {
			id
		}
	}
`);

const DuplicateDocument = graphql(`
	mutation DuplicateCourseInstance($id: ID!, $track: String!, $sourceTrack: String) {
		duplicateCourseInstance(id: $id, track: $track, sourceTrack: $sourceTrack) {
			id
		}
	}
`);

const ChangeInstanceDocument = graphql(`
	mutation ChangeCourseInstance($id: ID!, $track: String!, $programmeSemester: Int) {
		changeCourseInstance(id: $id, track: $track, programmeSemester: $programmeSemester) {
			id
		}
	}
`);

const WithdrawDocument = graphql(`
	mutation WithdrawCourseInstance($id: ID!) {
		withdrawCourseInstance(id: $id)
	}
`);

const AddPartDocument = graphql(`
	mutation AddInstancePart($instanceId: ID!, $kind: InstancePartKind!, $teachingHours: Float) {
		addInstancePart(instanceId: $instanceId, kind: $kind, teachingHours: $teachingHours) {
			id
		}
	}
`);

const ChangePartDocument = graphql(`
	mutation ChangeInstancePart($id: ID!, $kind: InstancePartKind!, $teachingHours: Float) {
		changeInstancePart(id: $id, kind: $kind, teachingHours: $teachingHours) {
			id
		}
	}
`);

const RemovePartDocument = graphql(`
	mutation RemoveInstancePart($id: ID!) {
		removeInstancePart(id: $id) {
			id
		}
	}
`);

const SharePartDocument = graphql(`
	mutation ShareInstancePartAcrossTracks($id: ID!) {
		shareInstancePartAcrossTracks(id: $id) {
			id
		}
	}
`);

const SplitPartDocument = graphql(`
	mutation SplitInstancePartAcrossTracks($id: ID!) {
		splitInstancePartAcrossTracks(id: $id) {
			id
		}
	}
`);

const CopyDocument = graphql(`
	mutation CopyDemandFromSemester($from: String!, $to: String!, $programme: String!) {
		copyDemandFromSemester(from: $from, to: $to, programme: $programme) {
			created
			skipped
			partsCreated
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	const semester = url.searchParams.get('semester') ?? '';
	const programme = url.searchParams.get('studiengang') ?? '';
	// Both, or neither. A semester without a programme is every programme's demand, which is a
	// screen for the dean's office and not this one — and a programme without a semester is not
	// a question at all.
	const withDemand = semester !== '' && programme !== '';

	try {
		const data = await backendRequest(DemandDocument, {
			semester,
			programme,
			withDemand
		});

		const modules = withDemand
			? (await backendRequest(DeclarableModulesDocument, { programme })).declarable
			: [];

		return {
			semesters: data.semesters,
			// `me` is null for a caller with no identity, which the root layout has already turned
			// into its own page by the time this renders. Empty rather than a crash, so that the
			// picker still shows every programme.
			myProgrammes: data.me?.programmes ?? [],
			programmes: data.programmes,
			selected: { semester, programme },
			current: data.semester ?? null,
			instances: data.courseInstances ?? [],
			modules
		};
	} catch (err) {
		// A refusal here is either "no account" — which the root layout already handles — or a
		// semester code that is not one, which a hand-edited URL produces. Both are worth a
		// sentence rather than an empty page that looks like a programme with no demand.
		error(403, toRefusal(err).message);
	}
};

/** What every action answers with when the backend refuses. */
function refuse(err: unknown) {
	return fail(400, { error: toRefusal(err).message });
}

/** Reads an optional number out of a form field. Empty means "not stated", which is a value. */
function optionalNumber(value: FormDataEntryValue | null): number | null {
	const text = String(value ?? '').trim();
	if (text === '') return null;
	const parsed = Number(text.replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The writes as form actions rather than /gui-api proxies.
 *
 * They belong to this page and nothing else needs them, and as forms they keep working without
 * JavaScript. Every one of them is a thin pass-through: the rules — who may write, in which
 * phase, for which programme, whether the module has a split — are all in the backend, and a
 * version of any of them here would be a second opinion.
 */
export const actions: Actions = {
	declare: async ({ request }) => {
		const form = await request.formData();
		const moduleId = String(form.get('moduleId') ?? '');
		if (moduleId === '') return fail(400, { error: 'Bitte ein Modul auswählen.' });

		try {
			await backendRequest(DeclareDocument, {
				input: {
					semester: String(form.get('semester') ?? ''),
					programme: String(form.get('programme') ?? ''),
					moduleId,
					track: String(form.get('track') ?? ''),
					programmeSemester: optionalNumber(form.get('programmeSemester'))
				}
			});
		} catch (err) {
			return refuse(err);
		}
		return { declared: true };
	},

	duplicate: async ({ request }) => {
		const form = await request.formData();
		const sourceTrack = String(form.get('sourceTrack') ?? '').trim();

		try {
			await backendRequest(DuplicateDocument, {
				id: String(form.get('id') ?? ''),
				track: String(form.get('track') ?? ''),
				// Empty means "leave the source as it is". Sent as null rather than as an empty
				// string, which the backend would read as a request to clear the letter.
				sourceTrack: sourceTrack === '' ? null : sourceTrack
			});
		} catch (err) {
			return refuse(err);
		}
		return { duplicated: true };
	},

	change: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(ChangeInstanceDocument, {
				id: String(form.get('id') ?? ''),
				track: String(form.get('track') ?? ''),
				programmeSemester: optionalNumber(form.get('programmeSemester'))
			});
		} catch (err) {
			return refuse(err);
		}
		return { changed: true };
	},

	withdraw: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(WithdrawDocument, { id: String(form.get('id') ?? '') });
		} catch (err) {
			return refuse(err);
		}
		return { withdrawn: true };
	},

	addPart: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(AddPartDocument, {
				instanceId: String(form.get('instanceId') ?? ''),
				kind: String(form.get('kind') ?? 'LAB') as InstancePartKind,
				teachingHours: optionalNumber(form.get('teachingHours'))
			});
		} catch (err) {
			return refuse(err);
		}
		return { partAdded: true };
	},

	changePart: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(ChangePartDocument, {
				id: String(form.get('id') ?? ''),
				kind: String(form.get('kind') ?? 'LAB') as InstancePartKind,
				teachingHours: optionalNumber(form.get('teachingHours'))
			});
		} catch (err) {
			return refuse(err);
		}
		return { partChanged: true };
	},

	removePart: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(RemovePartDocument, { id: String(form.get('id') ?? '') });
		} catch (err) {
			return refuse(err);
		}
		return { partRemoved: true };
	},

	sharePart: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(SharePartDocument, { id: String(form.get('id') ?? '') });
		} catch (err) {
			return refuse(err);
		}
		return { partShared: true };
	},

	splitPart: async ({ request }) => {
		const form = await request.formData();

		try {
			await backendRequest(SplitPartDocument, { id: String(form.get('id') ?? '') });
		} catch (err) {
			return refuse(err);
		}
		return { partSplit: true };
	},

	copy: async ({ request }) => {
		const form = await request.formData();
		const from = String(form.get('from') ?? '');
		if (from === '') return fail(400, { error: 'Bitte ein Semester auswählen.' });

		try {
			const data = await backendRequest(CopyDocument, {
				from,
				to: String(form.get('to') ?? ''),
				programme: String(form.get('programme') ?? '')
			});
			// The numbers, always — a copy into a semester that already holds the same instances
			// writes nothing, and "nothing happened" has to be distinguishable from "it failed"
			// by the person who pressed the button.
			return { copied: data.copyDemandFromSemester };
		} catch (err) {
			return refuse(err);
		}
	}
};
