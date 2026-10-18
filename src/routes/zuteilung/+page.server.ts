import { error, fail, redirect } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import {
	assignmentChanges,
	mergeCombined,
	parseHours,
	type AssignmentEntry,
	type AssignmentLike,
	type CombinedEntry,
	UNFILED
} from '$lib/assignment';
import { formatChanges } from '$lib/demand';
import type { Actions, PageServerLoad } from './$types';

/**
 * The assignment phase: who holds which part of which instance.
 *
 * The third step of the process, and the screen the wishes were collected for. What it must never
 * do is what the wish screen must never do, and it is easier to do here: **show any aggregate over
 * who holds what.** No "2 von 3 besetzt", no progress bar, no colouring or sorting that depends on
 * somebody else's assignment. Before publication that is the confidential fact with the names
 * taken out, and on a planning screen such a number looks like an ordinary convenience. See
 * `no-wish-aggregates` in the memory directory; it applies here word for word.
 *
 * # Why this page is filtered by subject group
 *
 * A faculty's semester is a few hundred instance parts, and everybody who teaches here is 257
 * people. Rendering the product of those two is not a screen. The subject group is the natural cut
 * because it is also the unit of responsibility: filling the instances of one group is what a
 * subject group lead does, and a study programme lead who fills across groups takes them one at a
 * time.
 *
 * The candidate list per part follows from the same thought: whoever registered interest in this
 * cohort first, then the members of the group, then whoever a search turned up. The search is a
 * query parameter and reloads the page, so it works without JavaScript and needs no second
 * endpoint.
 */
const AssignmentDocument = graphql(`
	query AssignmentScreen(
		$semester: String!
		$withSemester: Boolean!
		$group: ID!
		$withGroup: Boolean!
		$search: String!
		$withSearch: Boolean!
	) {
		planningSemester {
			code
		}
		semesters {
			code
			phase
			isPlanningSemester
		}
		semester(code: $semester) @include(if: $withSemester) {
			code
			phase
			wishesPublishedAt
			assignmentsPublishedAt
		}
		subjectGroups {
			id
			code
			name
		}
		mySubjectGroups {
			id
			code
		}
		courseInstances(semester: $semester) @include(if: $withSemester) {
			id
			track
			programmeSemester
			teachingHours
			delivery
			taughtInEnglish
			taughtInEnglishOverridden
			programme {
				code
				title
			}
			module {
				id
				name
				projectBased
				subjectGroup {
					id
					code
				}
			}
			parts {
				id
				kind
				teachingHours
				sharedAcrossTracks
				dividedFrom
				taughtBy
			}
			# The demands this cohort meets for other study programmes. The event is held once, so
			# the interest registered for those cohorts is interest in this teaching — and this is
			# the screen where who holds it is decided.
			covers {
				acceptedAt
				instance {
					id
					programme {
						code
					}
				}
			}
		}
		assignments(semester: $semester) @include(if: $withSemester) {
			id
			note
			assignee {
				personId
				teacherId
				name
				mail
			}
			part {
				id
			}
			instance {
				id
			}
		}
		# How many hours a week people would like to teach — the members of the subject groups this
		# person leads, or everybody for the dean's office. Already filtered by the backend.
		desiredTeachingHours(semester: $semester) @include(if: $withSemester) {
			hours
			person {
				id
			}
		}
		wishes(semester: $semester) @include(if: $withSemester) {
			id
			priority
			note
			person {
				id
				name
			}
			instance {
				id
			}
		}
		subjectGroup(id: $group) @include(if: $withGroup) {
			id
			code
			name
			members {
				id
				name
			}
		}
		# The wish round of the group being filled. The lead switches it here because this is where
		# they are when they decide the round is over — and because filling and shutting are the
		# same person's two acts, in that order more often than not.
		#
		# The exceptions, not the state of every group: absent means open.
		wishWindows(semester: $semester) @include(if: $withSemester) {
			open
			subjectGroup {
				id
			}
		}
		# The competence pool of the group's modules. Through the same filter as every read of it,
		# so a programme lead gets the modules of their programme and a subject group lead their
		# group's; it never refuses, it answers with less.
		competences(subjectGroup: $group) @include(if: $withGroup) {
			id
			level
			note
			module {
				id
			}
			holder {
				personId
				teacherId
				name
			}
		}
		teachers(search: $search) @include(if: $withSearch) {
			id
			name
			mail
		}
		me {
			mail
			# Which subject groups this person leads. The gap list below is shown only for a
			# group she leads, because there she may already read every entry on its modules —
			# it is a rearrangement of rows she has, not a new disclosure. Membership would be
			# the wrong field: it grants nothing and the backend does not read it.
			subjectGroupsLed {
				id
			}
		}
	}
`);

/**
 * What is stored, read again on the way in to a save.
 *
 * The form carries the state of every cell rather than what changed, so the difference is worked
 * out here — against the database rather than against a hidden field the page rendered minutes
 * ago. Here that is more than tidiness: `replacing` is what the backend compares against, so a
 * stale id is refused rather than silently overwriting somebody's decision.
 */
const StoredDocument = graphql(`
	query AssignmentsForSaving($semester: String!) {
		assignments(semester: $semester) {
			id
			note
			assignee {
				personId
				teacherId
				name
			}
			part {
				id
			}
		}
	}
`);

const SetDocument = graphql(`
	mutation SetAssignment($part: ID!, $person: ID, $teacher: ID, $note: String, $replacing: ID) {
		setAssignment(
			instancePartId: $part
			personId: $person
			teacherId: $teacher
			note: $note
			replacing: $replacing
		) {
			id
		}
	}
`);

const SetFormatDocument = graphql(`
	mutation SetCourseInstanceFormat($id: ID!, $delivery: DeliveryFormat!, $english: Boolean) {
		setCourseInstanceFormat(id: $id, delivery: $delivery, taughtInEnglish: $english) {
			id
		}
	}
`);

const ClearDocument = graphql(`
	mutation ClearAssignment($id: ID!) {
		clearAssignment(id: $id)
	}
`);

/**
 * Cutting a part in two, putting a piece back, and handing a part to another faculty.
 *
 * The exception of an exception — a module whose lecture is given half here and half by another
 * faculty — so they live behind the row menu and not in the table. All three are judged by the
 * assignment's rule in the backend, which is why they are on this page: the subject group lead
 * arranges it with the other faculty and is the one who records it.
 */
const DivideDocument = graphql(`
	mutation DivideInstancePart($id: ID!, $hours: Float!) {
		divideInstancePart(id: $id, teachingHours: $hours) {
			id
		}
	}
`);

const RejoinDocument = graphql(`
	mutation RejoinInstancePart($id: ID!) {
		rejoinInstancePart(id: $id) {
			id
		}
	}
`);

const TaughtByDocument = graphql(`
	mutation SetInstancePartTaughtBy($id: ID!, $faculty: String) {
		setInstancePartTaughtBy(id: $id, faculty: $faculty) {
			id
		}
	}
`);

const SetWindowDocument = graphql(`
	mutation SetWishWindow($semester: String!, $group: ID!, $open: Boolean!) {
		setWishWindow(semester: $semester, subjectGroupId: $group, open: $open) {
			open
		}
	}
`);

/**
 * Whether this tab names a subject group the backend can look up.
 *
 * `UNFILED` is a tab and not a group: it stands for the instances whose module is in no group at
 * all, and asking the backend for a group by that name would be a refusal rather than an answer.
 */
function isGroupID(tab: string): boolean {
	return tab !== '' && tab !== UNFILED;
}

export const load: PageServerLoad = async ({ url }) => {
	const wanted = url.searchParams.get('semester') ?? '';
	const group = url.searchParams.get('fachgruppe') ?? '';
	const search = (url.searchParams.get('q') ?? '').trim();

	const ask = (semester: string) =>
		backendRequest(AssignmentDocument, {
			semester,
			withSemester: semester !== '',
			// A required ID argument needs something even when the field is excluded, and an
			// excluded field never reads it. The same arrangement `@include` makes for the
			// semester, and the reason both are here: a placeholder the backend would judge cost
			// the wish screen a 403 before it reached its own redirect.
			group: isGroupID(group) ? group : '00000000-0000-0000-0000-000000000000',
			withGroup: isGroupID(group),
			search,
			withSearch: search !== ''
		});

	let data;
	let unusable: string | null = null;
	try {
		data = await ask(wanted);
	} catch (err) {
		const refusal = toRefusal(err);
		if (refusal.code === 'SEMESTER_OUT_OF_RANGE' || refusal.code === 'SEMESTER_CODE_INVALID') {
			unusable = refusal.message;
			data = await ask('');
		} else {
			error(403, refusal.message);
		}
	}

	// The choice belongs in the address: a view somebody is looking at should be a thing they can
	// send to a colleague. Outside the try, because SvelteKit's redirect is thrown and a catch
	// that turned it into a 403 would be a very confusing bug.
	if (unusable === null && wanted === '' && data.planningSemester) {
		const to = new URLSearchParams(url.searchParams);
		to.set('semester', data.planningSemester.code);
		redirect(303, `${url.pathname}?${to}`);
	}

	return {
		semester: data.semester ?? null,
		semesters: data.semesters,
		planningSemester: data.planningSemester,
		subjectGroups: data.subjectGroups,
		myGroups: data.mySubjectGroups.map((g) => g.id),
		group: data.subjectGroup ?? null,
		instances: data.courseInstances ?? [],
		assignments: data.assignments ?? [],
		wishes: data.wishes ?? [],
		desired: data.desiredTeachingHours ?? [],
		found: data.teachers ?? [],
		competences: data.competences ?? [],
		windows: data.wishWindows ?? [],
		me: data.me,
		led: data.me?.subjectGroupsLed ?? [],
		// The tab, which is either a subject group id, the UNFILED sentinel, or nothing chosen.
		// `group` above is the resolved group and stays null for the sentinel — the two are
		// deliberately not the same field, so that "no group chosen" and "the instances in no
		// group" cannot be confused for one another.
		selected: { semester: wanted, group, search },
		unusable
	};
};

/**
 * What one part's refusal looks like on the way back, so the page can put it in its row.
 *
 * A refusal of a cohort's format is keyed `format:<instance id>`: it belongs to the cohort's row
 * rather than to any one part.
 */
type RowRefusal = { partId: string; message: string };

export const actions: Actions = {
	/**
	 * Save the table.
	 *
	 * One action for the whole screen rather than one per part, because that is how it is used:
	 * somebody works through a cohort and moves on. It also works without JavaScript, which a
	 * `<select>` that submits itself does not.
	 *
	 * Sequential, each mutation in its own `try`: one refused part must not take the ones after it
	 * with it, and what did go through stays through. A collision on one part is an ordinary
	 * outcome here — two roles may fill the same row — so it has to cost that row and not the
	 * screen.
	 */
	save: async ({ request }) => {
		const form = await request.formData();
		// From the body and not from the URL: `action="?/save"` replaces the page's query string,
		// so the semester is not there to read. It looked right and saved nothing.
		const semester = String(form.get('semester') ?? '');
		if (semester === '') return fail(400, { message: 'Kein Semester gewählt.', refusals: [] });

		const entries = new Map<string, AssignmentEntry>();
		for (const [key, value] of form) {
			if (!key.startsWith('who:')) continue;
			const partId = key.slice('who:'.length);
			entries.set(partId, {
				choice: String(value),
				note: String(form.get(`note:${partId}`) ?? '')
			});
		}

		// And the cohorts' own controls, which stand for every part at once. A cohort is normally
		// held by one person, so that is the control the screen leads with; the parts underneath are
		// the exception, and `mergeCombined` decides which of the two said something new. The note
		// is absent rather than empty where the page did not offer the field — the two are
		// different, and only one of them is an instruction to clear it.
		const combined: CombinedEntry[] = [];
		for (const [key, value] of form) {
			if (!key.startsWith('all:')) continue;
			const instanceId = key.slice('all:'.length);
			const partIds = String(form.get(`parts:${instanceId}`) ?? '')
				.split(',')
				.filter((id) => id !== '');
			if (partIds.length === 0) continue;

			const note = form.get(`allnote:${instanceId}`);
			combined.push({
				partIds,
				choice: String(value),
				note: note === null ? null : String(note)
			});
		}

		let stored;
		try {
			stored = await backendRequest(StoredDocument, { semester });
		} catch (err) {
			return fail(403, { message: toRefusal(err).message, refusals: [] });
		}

		const byPart = new Map<string, AssignmentLike>();
		for (const a of stored.assignments) {
			if (a.part?.id) byPart.set(a.part.id, a as AssignmentLike);
		}

		const changes = assignmentChanges(mergeCombined(combined, entries, byPart), byPart);
		const refusals: RowRefusal[] = [];
		let saved = 0;

		for (const change of changes) {
			try {
				if (change.kind === 'clear') {
					await backendRequest(ClearDocument, { id: change.assignmentId });
				} else {
					await backendRequest(SetDocument, {
						part: change.partId,
						person: change.personId ?? null,
						teacher: change.teacherId ?? null,
						note: change.note,
						replacing: change.replacing ?? null
					});
				}
				saved += 1;
			} catch (err) {
				refusals.push({ partId: change.partId, message: toRefusal(err).message });
			}
		}

		// How each cohort is taught. Its own mutation per cohort, and only for the cohorts whose
		// controls differ from what the page rendered: the table is saved as a whole on every
		// change, and restating every cohort's format would write a stale page over a colleague's
		// newer choice.
		for (const change of formatChanges(form)) {
			try {
				await backendRequest(SetFormatDocument, {
					id: change.instanceId,
					delivery: change.delivery,
					english: change.taughtInEnglish
				});
				saved += 1;
			} catch (err) {
				refusals.push({ partId: `format:${change.instanceId}`, message: toRefusal(err).message });
			}
		}

		return { saved, refusals };
	},

	/**
	 * Cut a piece off a part. The hours are the piece's; the part keeps the rest.
	 *
	 * The button names the part and the field beside it carries the hours, keyed by part: the
	 * whole table is one form, so every row menu's field travels with every submission, and only
	 * the one belonging to the pressed button is read.
	 */
	divide: async ({ request }) => {
		const form = await request.formData();
		const partId = String(form.get('partId') ?? '');
		const hours = parseHours(String(form.get(`divide:${partId}`) ?? ''));
		if (partId === '' || hours === null) {
			return fail(400, {
				message: null,
				refusals: [{ partId, message: 'Bitte die SWS des abgetrennten Teils angeben.' }]
			});
		}
		return arrange(partId, () => backendRequest(DivideDocument, { id: partId, hours }));
	},

	/** Put a piece back into the part it was cut from. */
	rejoin: async ({ request }) => {
		const form = await request.formData();
		const partId = String(form.get('partId') ?? '');
		return arrange(partId, () => backendRequest(RejoinDocument, { id: partId }));
	},

	/**
	 * Say that another faculty teaches a part, or — with the other button, `clearPart` — that we
	 * do again. An empty field is the same as the second button, as the backend reads it.
	 */
	taughtBy: async ({ request }) => {
		const form = await request.formData();
		const cleared = String(form.get('clearPart') ?? '');
		const partId = cleared !== '' ? cleared : String(form.get('partId') ?? '');
		const faculty =
			cleared !== '' ? null : String(form.get(`taughtBy:${partId}`) ?? '').trim() || null;
		return arrange(partId, () => backendRequest(TaughtByDocument, { id: partId, faculty }));
	},

	/**
	 * Open or shut this subject group's wish round.
	 *
	 * Its own action rather than part of the save, because it is a different kind of act: saving
	 * the table is a batch of small decisions, and this is one decision about the round itself.
	 * Sharing an action would also mean a stray click on the switch travelling with every
	 * autosave.
	 */
	window: async ({ request }) => {
		const form = await request.formData();
		const semester = String(form.get('semester') ?? '');
		const group = String(form.get('fachgruppe') ?? '');
		const open = String(form.get('open') ?? '') === 'true';

		if (semester === '' || group === '') {
			return fail(400, { message: 'Kein Semester oder keine Fachgruppe gewählt.', refusals: [] });
		}

		try {
			await backendRequest(SetWindowDocument, { semester, group, open });
		} catch (err) {
			return fail(403, { message: toRefusal(err).message, refusals: [] });
		}
		return { saved: 0, refusals: [] };
	}
};

/**
 * One of the three row-menu writes, answered the way the save answers: a refusal keyed by the part,
 * so the page puts it in the part's row.
 */
async function arrange(partId: string, write: () => Promise<unknown>) {
	if (partId === '') return fail(400, { message: 'Kein Teil gewählt.', refusals: [] });
	try {
		await write();
	} catch (err) {
		return fail(400, { message: null, refusals: [{ partId, message: toRefusal(err).message }] });
	}
	return { saved: 1, refusals: [] as RowRefusal[] };
}
