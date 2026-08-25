import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { SubjectGroupCandidatesQuery } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * Fachgruppen — the faculty's own grouping of modules and people.
 *
 * Four things hang off a group and they are not the same thing: its modules, its members, its
 * leads, and the group itself. This screen sets three of them; the modules are assigned from the
 * module catalogue, where the list of them is.
 *
 * The distinction this page has to keep visible is membership versus leadership. Membership says
 * which subjects somebody works in and grants nothing — it is what the wish screen offers first.
 * Leadership is a grant: it decides who fills the group's instances and, before the publication
 * date, who reads the wishes on them.
 */
const SubjectGroupsDocument = graphql(`
	query SubjectGroupsAdministration {
		subjectGroups(includeInactive: true) {
			id
			code
			name
			active
			moduleCount
			leads {
				id
				mail
				name
			}
			members {
				id
				mail
				name
			}
		}
		subjectGroupsWithoutLead
		modulesWithoutSubjectGroup
	}
`);

/**
 * The people to pick from, in a request of its own.
 *
 * Not folded into the query above, and the reason is a real defect this separation fixes:
 * `people` is administration and **refuses** rather than answering null, so a lecturer asking for
 * both in one document got an error for the whole document and the page rendered as 403 — a
 * screen they are meant to be able to read, lost to a field they are not.
 *
 * That is the general shape of the mistake: a document is only as readable as its least readable
 * field, so a field with a narrower rule than the page belongs in a request of its own.
 */
const PeopleDocument = graphql(`
	query SubjectGroupCandidates {
		people {
			id
			mail
			name
			sortName
			active
			roles
		}
	}
`);

const CreateDocument = graphql(`
	mutation CreateSubjectGroup($code: String!, $name: String!) {
		createSubjectGroup(code: $code, name: $name) {
			id
			code
		}
	}
`);

const RenameDocument = graphql(`
	mutation RenameSubjectGroup($id: ID!, $name: String!) {
		renameSubjectGroup(id: $id, name: $name) {
			id
			name
		}
	}
`);

const SetActiveDocument = graphql(`
	mutation SetSubjectGroupActive($id: ID!, $active: Boolean!) {
		setSubjectGroupActive(id: $id, active: $active) {
			id
			active
		}
	}
`);

const SetLeadsDocument = graphql(`
	mutation SetSubjectGroupLeads($id: ID!, $personIds: [ID!]!) {
		setSubjectGroupLeads(id: $id, personIds: $personIds) {
			id
			leads {
				id
			}
		}
	}
`);

const SetMembersDocument = graphql(`
	mutation SetSubjectGroupMembers($id: ID!, $personIds: [ID!]!) {
		setSubjectGroupMembers(id: $id, personIds: $personIds) {
			id
			members {
				id
			}
		}
	}
`);

export const load: PageServerLoad = async () => {
	let data;
	try {
		data = await backendRequest(SubjectGroupsDocument);
	} catch (err) {
		// A refusal here means no account at all — the groups themselves need no role. The root
		// layout already turns that into its own page.
		error(403, toRefusal(err).message);
	}

	// Swallowed on purpose, and this is the one place in this file where that is right: the
	// refusal *is* the answer. Somebody who may not read the list of people may not set members or
	// leads either, so what this decides is whether there are forms to render — and reproducing
	// the rule here instead would be a second opinion about permissions, which is one more than
	// this application may have.
	let people: SubjectGroupCandidatesQuery['people'] = null;
	try {
		people = (await backendRequest(PeopleDocument)).people ?? null;
	} catch {
		// Nothing to do: the absence is the answer.
	}

	return {
		groups: data.subjectGroups,
		groupsWithoutLead: data.subjectGroupsWithoutLead,
		modulesWithoutSubjectGroup: data.modulesWithoutSubjectGroup,
		people
	};
};

/** The ids a multi-select hands back, as the mutation wants them. */
function personIds(form: FormData): string[] {
	return form.getAll('personId').map(String).filter(Boolean);
}

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const name = String(form.get('name') ?? '');

		try {
			await backendRequest(CreateDocument, { code, name });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: code };
	},

	rename: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '');

		try {
			await backendRequest(RenameDocument, { id, name });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: name };
	},

	/**
	 * Retire a group, or bring it back.
	 *
	 * There is no delete, here or in the API. A group that was split still has to render in the
	 * planning it was part of, and its module assignments are weeks of somebody's judgement.
	 */
	setActive: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const active = form.get('active') === 'true';

		try {
			await backendRequest(SetActiveDocument, { id, active });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: id };
	},

	/**
	 * The whole set at once, so the two calls of a swap cannot be separated.
	 *
	 * An empty selection is a real answer and means nobody leads this group — which is what
	 * `subjectGroupsWithoutLead` counts, and not the same thing as "everybody".
	 */
	setLeads: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		try {
			await backendRequest(SetLeadsDocument, { id, personIds: personIds(form) });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: id };
	},

	setMembers: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		try {
			await backendRequest(SetMembersDocument, { id, personIds: personIds(form) });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: id };
	}
};
