import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { Phase } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

const SemestersDocument = graphql(`
	query Semesters {
		semesters {
			code
			phase
			isPlanningSemester
			reachablePhases
			wishesPublishedAt
		}
	}
`);

const AdvancePhaseDocument = graphql(`
	mutation AdvanceSemesterPhase($code: String!, $to: Phase!) {
		advanceSemesterPhase(code: $code, to: $to) {
			code
			phase
		}
	}
`);

const SetPlanningSemesterDocument = graphql(`
	mutation SetPlanningSemester($code: String!) {
		setPlanningSemester(code: $code) {
			code
			isPlanningSemester
		}
	}
`);

const PublishWishesDocument = graphql(`
	mutation PublishWishes($code: String!) {
		publishWishes(code: $code) {
			code
			wishesPublishedAt
		}
	}
`);

/**
 * The list of semesters, and where each one stands.
 *
 * Nothing has to be set up for this to answer: the backend lists the semesters around now
 * plus everything anybody has decided something about, so a fresh installation shows the
 * process rather than an empty page with a form on it.
 *
 * `semesters` requires a signed-in identity but no particular role — the phase is the answer to
 * "may I enter my wishes yet", and every lecturer needs it. A refusal here therefore means the
 * caller has no account at all, which the root layout already turns into its own page; passing
 * it on as a 403 keeps the two from being confused.
 */
export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(SemestersDocument);
		return { semesters: data.semesters };
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};

/**
 * The writes as form actions rather than /gui-api proxies.
 *
 * They belong to this page and nothing else needs them, and as forms they work without
 * JavaScript. For the screen the dean's office runs the process from, that is the right
 * property: switching a phase during a meeting should not depend on a bundle having loaded.
 */
export const actions: Actions = {
	advance: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const to = String(form.get('to') ?? '') as Phase;

		try {
			await backendRequest(AdvancePhaseDocument, { code, to });
		} catch (err) {
			// PHASE_MOVED_ON arrives here: somebody else switched the semester between this page
			// rendering and the click. Its sentence asks for a reload, which is the useful
			// instruction — the page in front of the user is simply out of date.
			return fail(400, toRefusal(err));
		}
		return { advanced: code };
	},

	/**
	 * Say which semester the faculty is planning from now on.
	 *
	 * Unlike publishing, this one is reversible — so no disclosure, no second sentence, just a
	 * button. The mark moves off whichever semester carried it in the same act, so there is
	 * nothing to clear first and no way to end up with two.
	 */
	setPlanning: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');

		try {
			await backendRequest(SetPlanningSemesterDocument, { code });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { planning: code };
	},

	publish: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');

		// No second confirmation here. The one in the page is a dialogue for the person; a check
		// in this handler would be a rule, and the rule about who may publish lives in the
		// backend, where the token door meets it too.
		try {
			await backendRequest(PublishWishesDocument, { code });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { published: code };
	}
};
