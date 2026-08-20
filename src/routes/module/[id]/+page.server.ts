import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { ALL_PART_KINDS } from '$lib/catalogue';
import type { Actions, PageServerLoad } from './$types';

const ModuleDocument = graphql(`
	query Module($id: ID!) {
		me {
			programmes {
				code
			}
			roles
		}
		module(id: $id) {
			id
			name
			zpaId
			active
			official
			retiredAt
			courseType
			frequency
			contactHoursPerWeek
			credits
			componentHours
			homeProgramme {
				code
				title
			}
			responsible {
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
				lastSemester
				isUser
			}
			components {
				id
				kind
				teachingHours
				position
			}
			offerings {
				isDuty
				moduleCodes
				focuses
				minProgrammeSemester
				spo {
					id
					version
					validFrom
					primussId
					programme {
						code
					}
				}
			}
		}
	}
`);

const SetComponentsDocument = graphql(`
	mutation SetModuleComponents($moduleId: ID!, $components: [ModuleComponentInput!]!) {
		setModuleComponents(moduleId: $moduleId, components: $components) {
			id
			componentHours
			components {
				id
				kind
				teachingHours
			}
		}
	}
`);

export const load: PageServerLoad = async ({ params }) => {
	try {
		const data = await backendRequest(ModuleDocument, { id: params.id });
		if (!data.module) {
			error(404, 'Dieses Modul gibt es nicht.');
		}
		return { module: data.module, me: data.me };
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		error(403, toRefusal(err).message);
	}
};

/**
 * The split, as a form action rather than a `/gui-api` proxy.
 *
 * It belongs to this page and nothing else needs it, and as a form it works without JavaScript.
 * The rows are read positionally — `kind` and `teachingHours` arrive as parallel lists — because
 * the order the person put them in is the order that gets stored, and the backend assigns the
 * positions from it.
 */
export const actions: Actions = {
	components: async ({ request, params }) => {
		const form = await request.formData();

		const kinds = form.getAll('kind').map(String);
		const hours = form.getAll('teachingHours').map(String);

		const components: { kind: InstancePartKind; teachingHours: number }[] = [];
		for (let i = 0; i < kinds.length; i++) {
			const kind = kinds[i];
			const raw = (hours[i] ?? '').replace(',', '.').trim();

			// An empty row is how somebody removes one: the form keeps its inputs and the person
			// clears the hours. Refusing it would mean the only way to shorten a split is a
			// button that has to know which row it is.
			if (raw === '') continue;
			if (!(ALL_PART_KINDS as readonly string[]).includes(kind)) {
				return fail(400, { error: 'Unbekannte Art von Lehrveranstaltung.' });
			}

			const teachingHours = Number(raw);
			if (!Number.isFinite(teachingHours)) {
				return fail(400, { error: `„${hours[i]}“ ist keine Zahl.` });
			}
			components.push({ kind: kind as InstancePartKind, teachingHours });
		}

		try {
			await backendRequest(SetComponentsDocument, { moduleId: params.id, components });
		} catch (err) {
			// PROGRAMME_SCOPE_MISSING arrives here for a study programme lead nobody has assigned
			// a programme to. Its sentence names the missing thing, which is worth more than a
			// generic refusal that would send them to ask for a role they already hold.
			return fail(400, toRefusal(err));
		}
		return { saved: true };
	}
};
