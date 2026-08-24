import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { ProgrammeStatus } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * Which study programmes this faculty plans.
 *
 * The examination office's catalogue holds every programme its regulations mention, and some of
 * them are not this faculty's business — either somebody else runs them, or they were ours and
 * have run out. The source cannot tell the two apart from the ones that are planned: the newest
 * regulations of two planned programmes are from 2010, older than every programme on the other
 * list. So it is a decision, and this is the screen it is taken on.
 */
const ProgrammesDocument = graphql(`
	query AllProgrammes {
		programmes(includeUnplanned: true) {
			code
			title
			active
			planningStatus
			spos {
				version
			}
		}
	}
`);

const SetStatusDocument = graphql(`
	mutation SetProgrammePlanningStatus($code: String!, $status: ProgrammeStatus!) {
		setProgrammePlanningStatus(code: $code, status: $status) {
			code
			planningStatus
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(ProgrammesDocument);
		return { programmes: data.programmes };
	} catch (err) {
		// The list itself needs no particular role — the refusal here is "no account", which the
		// root layout already shows as its own page. What is scoped is the button.
		error(403, toRefusal(err).message);
	}
};

export const actions: Actions = {
	/**
	 * Record that this faculty plans a programme, or no longer does.
	 *
	 * A form action rather than a proxy: it belongs to this page and nothing else needs it, and
	 * as a form it works without JavaScript.
	 */
	setStatus: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const status = String(form.get('status') ?? '') as ProgrammeStatus;

		try {
			await backendRequest(SetStatusDocument, { code, status });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: code };
	}
};
