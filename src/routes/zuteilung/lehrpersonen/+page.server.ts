import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { localTeachers, parseLocalTeacherForm } from '$lib/localTeachers';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * Teachers the ZPA does not list yet, entered by hand so they can be assigned and given
 * competences before the source catches up — the usual case is a lecturer on contract planned for
 * next semester.
 *
 * Who may enter them is the backend's decision (subject group leads, programme leads and the dean's
 * office, with full reach); the tab is shown to the assigning roles, and anybody else who comes
 * here gets the backend's refusal on the first save. The list itself is not confidential: every
 * account reads every teacher.
 */
const LocalTeachersDocument = graphql(`
	query LocalTeachers {
		teachers(includeInactive: true) {
			id
			name
			sortName
			mail
			isLecturerOnContract
			active
			enteredByHand
		}
	}
`);

const CreateLocalTeacherDocument = graphql(`
	mutation CreateLocalTeacher($input: LocalTeacherInput!) {
		createLocalTeacher(input: $input) {
			id
			name
		}
	}
`);

const ChangeLocalTeacherDocument = graphql(`
	mutation ChangeLocalTeacher($id: ID!, $input: LocalTeacherInput!) {
		changeLocalTeacher(id: $id, input: $input) {
			id
			name
			active
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(LocalTeachersDocument);
		return { teachers: localTeachers(data.teachers) };
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const parsed = parseLocalTeacherForm(await request.formData());
		if ('message' in parsed) return fail(400, { message: parsed.message, id: null });
		try {
			const out = await backendRequest(CreateLocalTeacherDocument, {
				input: { ...parsed.input, active: true }
			});
			return { created: out.createLocalTeacher.name, changed: null };
		} catch (err) {
			return fail(400, { message: toRefusal(err).message, id: null });
		}
	},

	change: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id === '') return fail(400, { message: 'Keine Lehrperson gewählt.', id: null });
		const parsed = parseLocalTeacherForm(data);
		if ('message' in parsed) return fail(400, { message: parsed.message, id });
		try {
			const out = await backendRequest(ChangeLocalTeacherDocument, { id, input: parsed.input });
			return { created: null, changed: out.changeLocalTeacher.name };
		} catch (err) {
			return fail(400, { message: toRefusal(err).message, id });
		}
	}
};
