import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { graphql } from '$lib/gql/__generated__';
import type { Role } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { ALL_ROLES } from '$lib/roles';
import type { TeacherAccountRow } from '$lib/teacherAccounts';

/** Which of the two lists is on screen. The ZPA one, because that is where the work is. */
export type View = 'zpa' | 'konten';

const TeacherAccountsDocument = graphql(`
	query TeacherAccounts {
		teacherAccounts {
			teacher {
				id
				name
				sortName
				mail
				isProfessor
				isLecturerOnContract
				isHonoraryProfessor
				isStaff
				active
				faculty
			}
			account {
				id
				mail
				active
				roles
				programmes {
					code
				}
			}
		}
		programmes {
			code
			title
			active
		}
	}
`);

const PeopleDocument = graphql(`
	query People($search: String, $includeInactive: Boolean) {
		people(search: $search, includeInactive: $includeInactive) {
			id
			mail
			name
			active
			roles
			programmes {
				code
			}
		}
		programmes {
			code
			title
			active
		}
	}
`);

const CreatePersonDocument = graphql(`
	mutation CreatePerson($mail: String!, $name: String) {
		createPerson(mail: $mail, name: $name) {
			id
			mail
		}
	}
`);

const SetPersonRolesDocument = graphql(`
	mutation SetPersonRoles($id: ID!, $roles: [Role!]!, $expiresAt: Time) {
		setPersonRoles(id: $id, roles: $roles, expiresAt: $expiresAt) {
			id
			roles
		}
	}
`);

const SetPersonProgrammesDocument = graphql(`
	mutation SetPersonProgrammes($id: ID!, $programmes: [String!]!) {
		setPersonProgrammes(id: $id, programmes: $programmes) {
			id
			programmes {
				code
			}
		}
	}
`);

const SetPersonActiveDocument = graphql(`
	mutation SetPersonActive($id: ID!, $active: Boolean!) {
		setPersonActive(id: $id, active: $active) {
			id
		}
	}
`);

const SetTeacherAdmittedDocument = graphql(`
	mutation SetTeacherAdmitted($teacherId: ID!, $admitted: Boolean!) {
		setTeacherAdmitted(teacherId: $teacherId, admitted: $admitted) {
			teacher {
				id
			}
			account {
				id
				roles
			}
		}
	}
`);

/**
 * The two lists this screen shows, and only the one being looked at.
 *
 * `people` and `teacherAccounts` are both ADMIN-only and `@interactiveOnly`, so the backend
 * answers here with either the list or a refusal. The refusal is passed on as a 403 rather than
 * caught: somebody opening this page without the role should see the reason, not an empty table
 * that looks as though there were nobody in the system. An empty list and "you may not do this"
 * are different answers, and the first is the more alarming one.
 *
 * Fetching per tab rather than both at once. The tab that is not on screen is a few hundred rows
 * nobody is looking at, and a switch that saves on every click re-runs this load each time.
 */
export const load: PageServerLoad = async ({ url }) => {
	const view: View = url.searchParams.get('ansicht') === 'konten' ? 'konten' : 'zpa';
	const search = url.searchParams.get('q') ?? '';
	const includeInactive = url.searchParams.get('inaktiv') === '1';
	try {
		if (view === 'konten') {
			const data = await backendRequest(PeopleDocument, {
				search: search === '' ? null : search,
				includeInactive
			});
			return {
				view,
				people: data.people ?? [],
				accounts: [] as TeacherAccountRow[],
				// Every programme, so the editor can offer them. Twenty rows, loaded with the
				// list rather than on demand: a lead is assigned a programme in the same click
				// path as being granted the role, and a second round trip in the middle of it
				// would be one.
				programmes: data.programmes,
				search,
				includeInactive
			};
		}

		const data = await backendRequest(TeacherAccountsDocument);
		return {
			view,
			people: [],
			// Unfiltered, deliberately. The filter is in the address and the page narrows the
			// list with the same function on both sides, so the first render is already narrowed
			// and a click on a checkbox then costs no round trip.
			accounts: (data.teacherAccounts ?? []) as TeacherAccountRow[],
			programmes: data.programmes,
			search,
			includeInactive
		};
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};

/** The roles the form sent, keeping only the ones this version of the interface knows. */
function rolesFrom(form: FormData): Role[] {
	return form
		.getAll('roles')
		.map(String)
		.filter((role): role is Role => (ALL_ROLES as readonly string[]).includes(role));
}

/**
 * Writing actions as form actions rather than as /gui-api proxies.
 *
 * They belong to this page and nothing else needs them, and as forms they work without
 * JavaScript — the right property for the screen on which access to the system is
 * administered. `/gui-api/` stays for what several pages share.
 *
 * Every failure carries the id of the row it happened on. A refusal on this screen is about one
 * person — LAST_ADMIN is the obvious one — and a sentence at the top of a list of two hundred
 * rows does not say which switch produced it.
 */
export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const mail = String(form.get('mail') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();

		// The real check is in the backend (domain.ValidateMail) and applies to both doors. Only
		// the case a round trip would be a waste on is handled here.
		if (mail === '') {
			return fail(400, { error: 'Bitte eine Mailadresse angeben.', id: '' });
		}

		try {
			await backendRequest(CreatePersonDocument, { mail, name: name === '' ? null : name });
		} catch (error) {
			return fail(400, { error: toRefusal(error).message, id: '' });
		}
		return { created: mail };
	},

	roles: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		// The whole set, not additions and removals: that is what the screen shows, and
		// add/remove loses a race as soon as two people have the same person open.
		const roles = rolesFrom(form);

		// An expiry applies only to the roles being ADDED — that is what the schema says. So
		// "DEANS_OFFICE until this evening" is one operation and not two.
		const until = String(form.get('expiresAt') ?? '').trim();
		let expiresAt: string | null = null;
		if (until !== '') {
			const parsed = new Date(until);
			if (Number.isNaN(parsed.getTime())) {
				return fail(400, { error: 'Das Datum konnte nicht gelesen werden.', id });
			}
			expiresAt = parsed.toISOString();
		}

		try {
			await backendRequest(SetPersonRolesDocument, { id, roles, expiresAt });
		} catch (error) {
			return fail(400, { error: toRefusal(error).message, id });
		}
		return { saved: id };
	},

	programmes: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		// The whole set, like the roles above and for the same reason: add/remove loses a race
		// the moment two administrators have the same person open, and here the race would end
		// with somebody leading a programme nobody assigned them.
		const programmes = form.getAll('programmes').map(String);

		try {
			await backendRequest(SetPersonProgrammesDocument, { id, programmes });
		} catch (error) {
			// NOT_A_PROGRAMME_LEAD arrives here when somebody sets programmes before the role.
			// Its sentence names the next step, which is worth more than a generic refusal.
			return fail(400, { error: toRefusal(error).message, id });
		}
		return { saved: id };
	},

	active: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const active = form.get('active') === '1';

		try {
			await backendRequest(SetPersonActiveDocument, { id, active });
		} catch (error) {
			// LAST_ADMIN arrives here, among others. The sentence comes from the backend and is on
			// the allowlist in graphqlError.ts — it explains what to do, and that is worth more
			// here than a generic phrasing.
			return fail(400, { error: toRefusal(error).message, id });
		}
		return { saved: id };
	},

	/**
	 * The switch on the ZPA tab: give somebody an account, or take it away.
	 *
	 * One action for both directions, because the backend has one mutation for both and for the
	 * same reason — it is one switch, and its two positions are the same statement with opposite
	 * signs. Sending the state somebody is already in changes nothing, which is what a second
	 * click deserves.
	 */
	admit: async ({ request }) => {
		const form = await request.formData();
		const teacherId = String(form.get('teacherId') ?? '');
		const admitted = form.get('admitted') === '1';

		try {
			await backendRequest(SetTeacherAdmittedDocument, { teacherId, admitted });
		} catch (error) {
			// TEACHER_HAS_NO_MAIL and LAST_ADMIN both arrive here, and both say what to do next.
			return fail(400, { error: toRefusal(error).message, id: teacherId });
		}
		return { saved: teacherId };
	}
};
