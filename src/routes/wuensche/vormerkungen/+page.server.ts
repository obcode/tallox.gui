import { error, fail } from '@sveltejs/kit';
import { advanceSemesters, parseAdvanceForm } from '$lib/advanceWishes';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * My advance wishes („Vormerkungen“): modules I would like to teach in a coming semester whose
 * demand is not settled yet.
 *
 * Own rows only, in every semester. The leads read theirs under `/zuteilung/vormerkungen` — not
 * here, for the reason the wish page shows nobody else's entries before publication: a lead noting
 * something down for themselves must not read the others' while doing it.
 *
 * The programme is chosen first and travels in the URL, because the module list is that
 * programme's catalogue — a few hundred modules for the whole faculty would be no choice at all.
 */
const AdvanceWishScreenDocument = graphql(`
	query AdvanceWishScreen($programme: String!, $withProgramme: Boolean!) {
		programmes {
			code
			title
		}
		mySubjectGroups {
			id
		}
		modules(filter: { programme: $programme }) @include(if: $withProgramme) {
			id
			name
			subjectGroup {
				id
				name
			}
		}
		myAdvanceWishes {
			id
			semester
			priority
			note
			maxTracks
			status
			convertedAt
			programme {
				code
				title
			}
			module {
				id
				name
			}
		}
	}
`);

const SetAdvanceWishDocument = graphql(`
	mutation SetAdvanceWish(
		$semester: String!
		$module: ID!
		$programme: String!
		$priority: WishPriority!
		$note: String
		$maxTracks: Int
	) {
		setAdvanceWish(
			semester: $semester
			module: $module
			programme: $programme
			priority: $priority
			note: $note
			maxTracks: $maxTracks
		) {
			id
		}
	}
`);

const WithdrawAdvanceWishDocument = graphql(`
	mutation WithdrawAdvanceWish($id: ID!) {
		withdrawAdvanceWish(id: $id)
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	const programme = url.searchParams.get('programme')?.trim() ?? '';
	try {
		const data = await backendRequest(AdvanceWishScreenDocument, {
			programme,
			withProgramme: programme !== ''
		});
		return {
			programme,
			programmes: data.programmes,
			mySubjectGroupIds: data.mySubjectGroups.map((g) => g.id),
			modules: data.modules ?? [],
			mine: data.myAdvanceWishes,
			semesters: advanceSemesters(new Date())
		};
	} catch (err) {
		// This page needs no role; a refusal here is "no account", which the root layout renders.
		error(403, toRefusal(err).message);
	}
};

export const actions: Actions = {
	/** Note one down, or change one that is pending — the same offering is the same row. */
	save: async ({ request }) => {
		const parsed = parseAdvanceForm(await request.formData());
		if (!parsed.ok) return fail(400, { message: parsed.message });
		try {
			await backendRequest(SetAdvanceWishDocument, parsed.value);
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { saved: true };
	},

	withdraw: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await backendRequest(WithdrawAdvanceWishDocument, { id });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { withdrawn: true };
	}
};
