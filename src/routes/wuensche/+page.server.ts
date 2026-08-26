import { error, fail, redirect } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { WishPriority } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { isWishPriority } from '$lib/wishes';
import type { Actions, PageServerLoad } from './$types';

/**
 * The wish phase: registering interest in an instance part.
 *
 * The screen the confidentiality rule was built for. Two things it must never do, and both are
 * easier to do here than anywhere else in this application:
 *
 * 1. **Show any aggregate over wishes before publication.** No count, no "somebody is already
 *    interested" mark, no sorting by interest, no colouring. The backend answers with the rows the
 *    caller may see, so a number computed here would be both wrong and telling — it would vary
 *    with who is looking. See `no-wish-aggregates` in the memory directory.
 * 2. **Say "noch niemand hat sich eingetragen".** An empty list before the stichtag means the
 *    caller may not see, not that nobody is there.
 *
 * The semester travels in the URL like every other filter in this application, and defaults to
 * the one the faculty is planning.
 */
const WishesDocument = graphql(`
	query WishScreen($semester: String!, $withSemester: Boolean!) {
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
		}
		# Own subjects first — a preselection and not a rule, so the rest stays on the page.
		mySubjectGroups {
			id
			code
			name
		}
		# What may be wished for: the demand of the semester. Readable by anybody with an account,
		# which is the reason the demand page is open too — somebody who cannot see the instances
		# has nothing to register interest in.
		courseInstances(semester: $semester) @include(if: $withSemester) {
			id
			track
			programmeSemester
			programme {
				code
			}
			module {
				id
				name
				subjectGroup {
					id
					code
				}
			}
			parts {
				id
				kind
				teachingHours
			}
		}
		myWishes(semester: $semester) @include(if: $withSemester) {
			id
			priority
			note
			person {
				mail
				name
			}
			part {
				id
				kind
				teachingHours
			}
			instance {
				track
				programmeSemester
				programme {
					code
				}
				module {
					id
					name
				}
			}
		}
		# Everything the caller may see. Before publication that is their own entries and whatever
		# they are responsible for; after it, everybody's. The page renders the difference as
		# "other people" by dropping its own rows — never by counting.
		wishes(semester: $semester) @include(if: $withSemester) {
			id
			priority
			note
			person {
				mail
				name
			}
			part {
				id
				kind
				teachingHours
			}
			instance {
				track
				programmeSemester
				programme {
					code
				}
				module {
					id
					name
				}
			}
		}
		me {
			mail
		}
	}
`);

const SetWishDocument = graphql(`
	mutation SetWish($part: ID!, $priority: WishPriority!, $note: String) {
		setWish(instancePartId: $part, priority: $priority, note: $note) {
			id
			priority
			note
		}
	}
`);

const WithdrawWishDocument = graphql(`
	mutation WithdrawWish($id: ID!) {
		withdrawWish(id: $id)
	}
`);

/**
 * The semester-scoped half of the query is asked for only when there is a semester.
 *
 * Without `@include`, a bare `/wuensche` had to invent a code for a required argument — and any
 * code it invents is one the backend judges. A placeholder outside the ten-year window refused the
 * whole document, so the page answered 403 before it ever got to the redirect that would have put
 * a real semester in the address. The demand page has solved it this way since it was written;
 * this is that solution, copied rather than reinvented.
 */
export const load: PageServerLoad = async ({ url }) => {
	const wanted = url.searchParams.get('semester') ?? '';

	const ask = (semester: string) =>
		backendRequest(WishesDocument, { semester, withSemester: semester !== '' });

	let data;
	let unusable: string | null = null;
	try {
		data = await ask(wanted);
	} catch (err) {
		const refusal = toRefusal(err);
		// A semester somebody typed into the address is not a broken page. Render the picker and
		// say what is wrong with it — the alternative is a 403 for a query parameter, which reads
		// as "you may not be here" when it means "that is not a semester".
		if (refusal.code === 'SEMESTER_OUT_OF_RANGE' || refusal.code === 'SEMESTER_CODE_INVALID') {
			unusable = refusal.message;
			data = await ask('');
		} else {
			// Anything else here is "no account" — the wish screen itself needs no role, and the
			// root layout already renders that as its own page.
			error(403, refusal.message);
		}
	}

	// Without a usable semester, go to the one the faculty is planning — and say so in the
	// address, so the view is a thing somebody can send to a colleague.
	if (unusable === null && wanted === '' && data.planningSemester) {
		const to = new URLSearchParams(url.searchParams);
		to.set('semester', data.planningSemester.code);
		redirect(303, `${url.pathname}?${to}`);
	}

	return {
		// null when nothing was asked for — no semester in the address and none being planned, or
		// a code that is not one. The page renders its picker and says so.
		semester: data.semester ?? null,
		semesters: data.semesters,
		planningSemester: data.planningSemester,
		mySubjectGroups: data.mySubjectGroups,
		instances: data.courseInstances ?? [],
		myWishes: data.myWishes ?? [],
		wishes: data.wishes ?? [],
		me: data.me,
		unusable
	};
};

export const actions: Actions = {
	/**
	 * Register interest, or change it.
	 *
	 * A form action rather than a proxy: it belongs to this page, and as a form it works without
	 * JavaScript. There is no field for whose wish it is — the backend takes the owner from the
	 * session, and adding one here would be the decision reversed.
	 */
	set: async ({ request }) => {
		const form = await request.formData();
		const part = String(form.get('part') ?? '');
		const raw = String(form.get('priority') ?? '');
		const note = String(form.get('note') ?? '');

		if (!isWishPriority(raw)) {
			return fail(400, { message: 'Diese Priorität gibt es nicht.' });
		}

		try {
			await backendRequest(SetWishDocument, {
				part,
				priority: raw as WishPriority,
				note: note === '' ? null : note
			});
		} catch (err) {
			// Through toRefusal like every write path here: only the codes on its allowlist keep
			// their wording, and everything else becomes a generic sentence. On this page that
			// matters more than anywhere else — a passed-through uniqueness violation is exactly
			// the leak the rule exists to prevent.
			return fail(400, toRefusal(err));
		}
		return { changed: part };
	},

	withdraw: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		try {
			await backendRequest(WithdrawWishDocument, { id });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: id };
	}
};
