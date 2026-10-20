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
			# The groups a subject group lead may file this module into or release it from.
			subjectGroupsLed {
				id
			}
		}
		# The groups to choose from. Readable by anybody with an account — who leads which subject
		# is what the faculty's organisation looks like, not something confidential.
		subjectGroups {
			id
			code
			name
			active
		}
		module(id: $id) {
			id
			name
			projectBased
			zpaId
			handbookUrl
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
			subjectGroup {
				id
				code
				name
				active
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
			splitIsEstimated
			proposedComponents {
				kind
				teachingHours
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

const SetSubjectGroupDocument = graphql(`
	mutation SetModuleSubjectGroup($moduleIds: [ID!]!, $subjectGroup: ID) {
		setModulesSubjectGroup(moduleIds: $moduleIds, subjectGroup: $subjectGroup) {
			modulesAssigned
			modulesWithoutSubjectGroup
			subjectGroup {
				code
				name
			}
		}
	}
`);

const SetProjectBasedDocument = graphql(`
	mutation SetModuleProjectBased($moduleId: ID!, $projectBased: Boolean!) {
		setModuleProjectBased(moduleId: $moduleId, projectBased: $projectBased) {
			id
			projectBased
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

const ApplySplitDocument = graphql(`
	mutation ApplyModuleSplitToInstances($moduleId: ID!, $dryRun: Boolean!) {
		applyModuleSplitToInstances(moduleId: $moduleId, dryRun: $dryRun) {
			dryRun
			unchanged
			changed {
				instance {
					id
					semester
					track
					programmeSemester
					programme {
						code
					}
				}
				teachingHoursBefore
				teachingHoursAfter
			}
			refused {
				instance {
					id
					semester
					track
					programmeSemester
					programme {
						code
					}
				}
				kind
				code
				message
			}
		}
	}
`);

/**
 * What carrying the split over would do, or `null` where there is nothing to ask about.
 *
 * Asked right after a split is saved, so the person sees in the same moment that the existing
 * instances did not change with it — the gap the faculty reported was that nobody could tell.
 * A refusal here is no reason to spoil a save that worked: the split is stored, and the preview
 * button below the form asks again and shows the refusal there.
 */
async function previewSplit(moduleId: string) {
	try {
		const data = await backendRequest(ApplySplitDocument, { moduleId, dryRun: true });
		return data.applyModuleSplitToInstances;
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ params }) => {
	try {
		const data = await backendRequest(ModuleDocument, { id: params.id });
		if (!data.module) {
			error(404, 'Dieses Modul gibt es nicht.');
		}
		return { module: data.module, me: data.me, subjectGroups: data.subjectGroups };
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
	/** Mark the module as a PBLV, or take the mark back. The same people as the split. */
	projectBased: async ({ request, params }) => {
		const form = await request.formData();
		const projectBased = form.get('projectBased') === '1';
		try {
			await backendRequest(SetProjectBasedDocument, { moduleId: params.id, projectBased });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { projectBasedSaved: true };
	},

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
			// button that has to know which row it is. A 0 means the same — it is what people
			// type when they mean "none of this", and the backend would refuse it anyway.
			if (raw === '' || Number(raw) === 0) continue;
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
		// An empty split cleared the module; there is nothing to carry over.
		const splitPreview = components.length > 0 ? await previewSplit(params.id) : null;
		return { saved: true, splitPreview };
	},

	/**
	 * Carry the split over to the existing instances — `dryRun=1` for the preview, `0` to do it.
	 *
	 * Two submits of one form rather than a client-side confirmation: the preview is the same
	 * transaction rolled back in the backend, so what was shown is what the second click does.
	 */
	applySplit: async ({ request, params }) => {
		const form = await request.formData();
		const dryRun = form.get('dryRun') !== '0';
		try {
			const data = await backendRequest(ApplySplitDocument, { moduleId: params.id, dryRun });
			return { splitApplication: data.applyModuleSplitToInstances };
		} catch (err) {
			return fail(400, toRefusal(err));
		}
	},

	/**
	 * Put this one module into a subject group, or take it out of every group.
	 *
	 * The same mutation the catalogue's batch assignment uses, with a list of one. Not a second
	 * mutation for the single case: "a module belongs to exactly one group, and moving it is one
	 * statement" is a rule of that mutation, and a second way in is a second place for it to be
	 * got wrong.
	 *
	 * Here as well as in the list because the two answer different questions. The list is the
	 * October work list — 506 modules, tick and assign. This is somebody looking at one module and
	 * noticing it is filed wrongly, and sending them to a filtered list to fix one row is how a
	 * correction turns into something nobody does.
	 */
	subjectGroup: async ({ request, params }) => {
		const form = await request.formData();
		const chosen = String(form.get('subjectGroup') ?? '');

		try {
			const data = await backendRequest(SetSubjectGroupDocument, {
				moduleIds: [params.id],
				// The empty option is "in no group at all" — this form's other answer, not a
				// missing one.
				subjectGroup: chosen === '' ? null : chosen
			});
			return { assigned: data.setModulesSubjectGroup };
		} catch (err) {
			return fail(400, toRefusal(err));
		}
	}
};
