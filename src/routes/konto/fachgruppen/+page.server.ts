import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * The subject groups, and which of them are mine.
 *
 * In the account area rather than under the administration, because that is what it is: a
 * statement about which subjects somebody works in, made by that person. Membership grants
 * nothing — the backend's `policy.AssignmentScope` deliberately does not read it — so there is
 * nothing here an administrator has to stand between.
 *
 * What it decides is what the wish screen offers first. Being able to change it is the difference
 * between a preselection and a barrier: somebody moving into a new subject joins its group, rather
 * than meeting a refusal and writing a mail about it.
 *
 * The modules are on the page because "is this my subject" is not answerable from a group's name
 * — `MATHE` says nothing about whether it holds the statistics module somebody teaches.
 */
const OwnSubjectGroupsDocument = graphql(`
	query OwnSubjectGroups {
		subjectGroups {
			id
			code
			name
			moduleCount
			leads {
				id
				name
				sortName
			}
			modules {
				id
				name
				homeProgrammeCode
			}
		}
		mySubjectGroups {
			id
			code
		}
	}
`);

const SetMineDocument = graphql(`
	mutation SetMySubjectGroups($subjectGroupIds: [ID!]!) {
		setMySubjectGroups(subjectGroupIds: $subjectGroupIds) {
			id
			code
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(OwnSubjectGroupsDocument);
		return {
			groups: data.subjectGroups,
			mine: data.mySubjectGroups.map((g) => g.id)
		};
	} catch (err) {
		// A refusal here is "no account" — this page needs no role at all. The root layout renders
		// that as its own page.
		error(403, toRefusal(err).message);
	}
};

export const actions: Actions = {
	/**
	 * Replace my own memberships.
	 *
	 * The whole set at once: the page is a list of ticks with one button, and a per-group mutation
	 * would let the two halves of a swap be separated.
	 *
	 * Nothing here says whose memberships these are. The backend takes the owner from the session,
	 * and an argument for it would turn self-service into administration by another name.
	 */
	setMine: async ({ request }) => {
		const form = await request.formData();
		// getAll returns [] when nothing is ticked, which is a real answer — "I am in no groups" —
		// and not a missing one.
		const subjectGroupIds = form.getAll('subjectGroupId').map(String).filter(Boolean);

		try {
			await backendRequest(SetMineDocument, { subjectGroupIds });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: true };
	}
};
