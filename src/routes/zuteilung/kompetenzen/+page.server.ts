import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { CompetenceLevel } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { isCompetenceLevel } from '$lib/competences';
import type { Actions, PageServerLoad } from './$types';

/**
 * The pool of one subject group: who can teach its modules, who would like to, which modules
 * nobody can teach, and which members are below the minimum.
 *
 * For the lead of the group and the dean's office. The backend decides both halves: the rows come
 * through the competence filter, and the two counts are refused (`COMPETENCE_GROUP_REFUSED`) to
 * anybody who could not read every row they count. This page offers the groups the caller leads —
 * all of them for the dean's office — and that is cosmetic; the refusal is not.
 *
 * It is also where the lead enters the competences of teachers without an account: lecturers on
 * contract cannot sign in to say it themselves, and they are exactly who the pool needs.
 */
const PoolDocument = graphql(`
	query CompetencePool($group: ID!, $withGroup: Boolean!, $search: String!, $withSearch: Boolean!) {
		session {
			effectiveRoles
		}
		subjectGroups {
			id
			code
			name
		}
		me {
			subjectGroupsLed {
				id
			}
		}
		subjectGroup(id: $group) @include(if: $withGroup) {
			id
			code
			name
			modules {
				id
				name
				homeProgrammeCode
				compulsory
			}
		}
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
			isUser
		}
	}
`);

/**
 * The two counts over the group, in a document of their own: they are refused to anybody who may
 * not count over the whole group, and a refusal in the same document as the rows would take the
 * page down with it — the lesson from the subject group pages.
 */
const GroupCountsDocument = graphql(`
	query CompetenceGroupCounts($group: ID!) {
		competenceMemberStatus(subjectGroup: $group) {
			member {
				personId
				name
			}
			canTeachCompulsory
			minimum
		}
		modulesWithoutCompetence(subjectGroup: $group) {
			id
			name
			compulsory
		}
	}
`);

const SetTeacherCompetenceDocument = graphql(`
	mutation SetTeacherCompetence(
		$module: ID!
		$teacher: ID!
		$level: CompetenceLevel!
		$note: String
	) {
		setTeacherCompetence(moduleId: $module, teacherId: $teacher, level: $level, note: $note) {
			id
		}
	}
`);

const WithdrawTeacherCompetenceDocument = graphql(`
	mutation WithdrawTeacherCompetence($id: ID!) {
		withdrawTeacherCompetence(id: $id)
	}
`);

const NO_GROUP = '00000000-0000-0000-0000-000000000000';

export const load: PageServerLoad = async ({ url }) => {
	const group = url.searchParams.get('fachgruppe') ?? '';
	const search = (url.searchParams.get('q') ?? '').trim();

	let data;
	try {
		data = await backendRequest(PoolDocument, {
			// A required ID needs a value even when the field is excluded; an excluded field never
			// reads it. The assignment page's arrangement.
			group: group || NO_GROUP,
			withGroup: group !== '',
			search,
			withSearch: search !== ''
		});
	} catch (err) {
		error(403, toRefusal(err).message);
	}

	let counts = null;
	let countsRefused: string | null = null;
	if (group !== '') {
		try {
			counts = await backendRequest(GroupCountsDocument, { group });
		} catch (err) {
			// Said on the page rather than turned into a 403: the pool above is still readable.
			countsRefused = toRefusal(err).message;
		}
	}

	const deansOffice = data.session?.effectiveRoles.includes('DEANS_OFFICE') ?? false;
	const led = new Set((data.me?.subjectGroupsLed ?? []).map((g) => g.id));

	return {
		// Which groups to offer. Cosmetic, as every such list here: the backend answers for a group
		// the caller does not reach with no rows and a refusal on the counts.
		groups: data.subjectGroups.filter((g) => deansOffice || led.has(g.id)),
		group: data.subjectGroup ?? null,
		competences: data.competences ?? [],
		members: counts?.competenceMemberStatus ?? [],
		gaps: counts?.modulesWithoutCompetence ?? [],
		countsRefused,
		// Only teachers without an account: somebody who can sign in states it themselves, and
		// the backend refuses the other case anyway.
		found: (data.teachers ?? []).filter((t) => !t.isUser),
		selected: { group, search }
	};
};

export const actions: Actions = {
	/** Enter or change a statement for a teacher without an account. */
	setTeacher: async ({ request }) => {
		const form = await request.formData();
		const module = String(form.get('module') ?? '');
		const teacher = String(form.get('teacher') ?? '');
		const level = String(form.get('level') ?? '');
		const note = String(form.get('note') ?? '').trim();

		if (module === '' || teacher === '') {
			return fail(400, { message: 'Bitte Modul und Person wählen.' });
		}
		if (!isCompetenceLevel(level)) return fail(400, { message: 'Diese Stufe gibt es nicht.' });

		try {
			await backendRequest(SetTeacherCompetenceDocument, {
				module,
				teacher,
				level: level as CompetenceLevel,
				note: note === '' ? null : note
			});
		} catch (err) {
			return fail(400, { message: toRefusal(err).message });
		}
		return { saved: true };
	},

	/** Remove a statement about a teacher without an account. */
	withdrawTeacher: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await backendRequest(WithdrawTeacherCompetenceDocument, { id });
		} catch (err) {
			return fail(400, { message: toRefusal(err).message });
		}
		return { saved: true };
	}
};
