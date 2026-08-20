import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { graphql } from '$lib/gql/__generated__';
import type { Role } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { ALL_ROLES } from '$lib/roles';

const PeopleDocument = graphql(`
	query People($search: String, $includeInactive: Boolean) {
		people(search: $search, includeInactive: $includeInactive) {
			id
			mail
			name
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

/**
 * The list of people.
 *
 * `people` is `@interactiveOnly` and ADMIN-only, so the backend answers here with either the
 * list or a refusal. The refusal is passed on as a 403 rather than caught: somebody opening
 * this page without the role should see the reason, not an empty table that looks as though
 * there were nobody in the system. An empty list and "you may not do this" are different
 * answers, and the first is the more alarming one.
 *
 * A 403 rather than the raw error, so that `+error.svelte` shows a sentence instead of a stack
 * trace — and with the backend's text, which is on the allowlist in graphqlError.ts.
 */
export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q') ?? '';
	const includeInactive = url.searchParams.get('inaktiv') === '1';

	try {
		const data = await backendRequest(PeopleDocument, {
			search: search === '' ? null : search,
			includeInactive
		});
		return {
			people: data.people ?? [],
			// Every programme, so the editor can offer them. Twenty rows, loaded with the list
			// rather than on demand: a lead is assigned a programme in the same click path as
			// being granted the role, and a second round trip in the middle of it would be one.
			programmes: data.programmes,
			search,
			includeInactive
		};
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};

/**
 * Writing actions as form actions rather than as /gui-api proxies.
 *
 * They belong to this page and nothing else needs them, and as forms they work without
 * JavaScript — the right property for the screen on which access to the system is
 * administered. `/gui-api/` stays for what several pages share.
 */
export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const mail = String(form.get('mail') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();

		// The real check is in the backend (domain.ValidateMail) and applies to both doors. Only
		// the case a round trip would be a waste on is handled here.
		if (mail === '') {
			return fail(400, { error: 'Bitte eine Mailadresse angeben.' });
		}

		try {
			await backendRequest(CreatePersonDocument, { mail, name: name === '' ? null : name });
		} catch (error) {
			return fail(400, { error: toRefusal(error).message });
		}
		return { created: mail };
	},

	roles: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		// The whole set, not additions and removals: that is what the screen shows, and
		// add/remove loses a race as soon as two people have the same person open.
		const roles = form
			.getAll('roles')
			.map(String)
			.filter((role): role is Role => (ALL_ROLES as readonly string[]).includes(role));

		// An expiry applies only to the roles being ADDED — that is what the schema says. So
		// "DEANS_OFFICE until this evening" is one operation and not two.
		const until = String(form.get('expiresAt') ?? '').trim();
		let expiresAt: string | null = null;
		if (until !== '') {
			const parsed = new Date(until);
			if (Number.isNaN(parsed.getTime())) {
				return fail(400, { error: 'Das Datum konnte nicht gelesen werden.' });
			}
			expiresAt = parsed.toISOString();
		}

		try {
			await backendRequest(SetPersonRolesDocument, { id, roles, expiresAt });
		} catch (error) {
			return fail(400, { error: toRefusal(error).message });
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
			return fail(400, { error: toRefusal(error).message });
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
			return fail(400, { error: toRefusal(error).message });
		}
		return { saved: id };
	}
};
