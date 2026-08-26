import { error, fail, redirect } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { WishPriority } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { isWishChoice, wishChanges, type WishEntry } from '$lib/wishes';
import type { Actions, PageServerLoad } from './$types';

/**
 * The wish phase: registering interest in a course instance.
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
		#
		# The same projection the demand overview reads, because the table is the same table: one
		# row per module and programme, a column per cohort.
		courseInstances(semester: $semester) @include(if: $withSemester) {
			id
			track
			programmeSemester
			teachingHours
			programme {
				code
				title
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
				sharedAcrossTracks
			}
		}
		# **Every semester, not the one on screen.** Somebody who entered something for the summer
		# term and then moved the picker to the winter term has not withdrawn it, and a list that
		# showed nothing would say they had. Asking without the argument is allowed here and
		# nowhere else: own entries never go through the confidentiality rule, so there is no
		# publication date to pick.
		#
		# Spelled out rather than shared as a fragment with the field below: the client preset
		# masks a fragment's fields, so a page that renders them would have to unmask every row.
		myWishes {
			id
			priority
			note
			person {
				mail
				name
			}
			instance {
				id
				semester
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
			instance {
				id
				semester
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

/**
 * The caller's own entries, read again on the way in to a save.
 *
 * The form carries the state of every cell and not what changed, so the difference is worked out
 * here — against what is actually stored rather than against a hidden field the page rendered
 * minutes ago. Two tabs open on the same semester is the case that makes the distinction real.
 */
const MyWishesDocument = graphql(`
	query MyWishesForSaving($semester: String!) {
		myWishes(semester: $semester) {
			id
			priority
			note
			instance {
				id
			}
		}
	}
`);

const SetWishDocument = graphql(`
	mutation SetWish($instance: ID!, $priority: WishPriority!, $note: String) {
		setWish(courseInstanceId: $instance, priority: $priority, note: $note) {
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
		// Every semester, so the summary above the table is the whole picture. The cells pick
		// their own row out of it by instance id, which is semester-specific anyway.
		myWishes: data.myWishes,
		wishes: data.wishes ?? [],
		me: data.me,
		unusable
	};
};

/** What one instance's refusal looks like on the way back, so the page can put it in its row. */
type CellRefusal = { instanceId: string; message: string };

export const actions: Actions = {
	/**
	 * Save the table.
	 *
	 * One action for the whole thing rather than one per cell, because that is how the table is
	 * used: somebody goes down the list, changes three or four things and is done. It also works
	 * without JavaScript, which a `<select>` that submits itself does not.
	 *
	 * There is no field for whose wishes these are — the backend takes the owner from the session,
	 * and adding one here would be the decision reversed.
	 */
	save: async ({ request }) => {
		const form = await request.formData();
		const semester = String(form.get('semester') ?? '');

		const entries = new Map<string, WishEntry>();
		const entryFor = (instanceId: string) => {
			const existing = entries.get(instanceId);
			if (existing) return existing;
			const fresh: WishEntry = { instanceId, priority: '', note: '' };
			entries.set(instanceId, fresh);
			return fresh;
		};

		for (const [key, value] of form.entries()) {
			const text = String(value);
			if (key.startsWith('wish:')) {
				if (!isWishChoice(text)) {
					// Not a level and not the empty choice: somebody sent something this build does
					// not know. Refusing the whole save is right — the alternative is guessing what
					// they meant about one cell of a table they are about to stop looking at.
					return fail(400, { message: 'Diese Priorität gibt es nicht.', refusals: [] });
				}
				entryFor(key.slice('wish:'.length)).priority = text;
			} else if (key.startsWith('note:')) {
				entryFor(key.slice('note:'.length)).note = text.trim();
			}
		}

		let stored;
		try {
			stored = await backendRequest(MyWishesDocument, { semester });
		} catch (err) {
			return fail(400, { ...toRefusal(err), refusals: [] });
		}

		const changes = wishChanges(
			[...entries.values()],
			stored.myWishes.map((w) => ({
				id: w.id,
				instanceId: w.instance.id,
				priority: w.priority,
				note: w.note
			}))
		);

		// Sequentially, and deliberately: a save is at most a handful of mutations, and one refused
		// cell must not take the ones after it with it. What did go through stays through.
		const refusals: CellRefusal[] = [];
		let saved = 0;
		for (const change of changes) {
			try {
				if (change.kind === 'withdraw') {
					await backendRequest(WithdrawWishDocument, { id: change.wishId });
				} else {
					await backendRequest(SetWishDocument, {
						instance: change.instanceId,
						priority: change.priority as WishPriority,
						note: change.note === '' ? null : change.note
					});
				}
				saved++;
			} catch (err) {
				// Through toRefusal like every write path here: only the codes on its allowlist keep
				// their wording, and everything else becomes a generic sentence. On this page that
				// matters more than anywhere else — a passed-through uniqueness violation is exactly
				// the leak the rule exists to prevent.
				refusals.push({ instanceId: change.instanceId, message: toRefusal(err).message });
			}
		}

		return { saved, refusals };
	}
};
