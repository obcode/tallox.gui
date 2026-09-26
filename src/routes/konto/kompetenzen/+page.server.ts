import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { CompetenceLevel } from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import { competenceChanges, isCompetenceChoice, type CompetenceEntry } from '$lib/competences';
import type { Actions, PageServerLoad } from './$types';

/**
 * My competence profile: which modules of my subject groups I can teach, and which I would like to.
 *
 * In the account area, like "Meine Fachgruppen": it is a statement about myself, it needs no role,
 * and it is read by nobody but me and the people responsible for the module. The groups are the
 * ones I am in — joining one there is what opens its modules here, which is the backend's rule and
 * not this page's.
 */
const OwnCompetencesDocument = graphql(`
	query OwnCompetences {
		mySubjectGroups {
			id
			code
			name
			modules {
				id
				name
				homeProgrammeCode
				compulsory
			}
		}
		myCompetences {
			id
			level
			note
			outsideSubjectGroups
			module {
				id
				name
				compulsory
				subjectGroup {
					code
				}
			}
		}
		myCompetenceStatus {
			subjectGroup {
				id
			}
			canTeachCompulsory
			minimum
		}
	}
`);

/** Read again on the way in to a save, so the difference is against what is stored. */
const MyCompetencesForSavingDocument = graphql(`
	query MyCompetencesForSaving {
		myCompetences {
			id
			level
			note
			module {
				id
			}
		}
	}
`);

const SetMyCompetenceDocument = graphql(`
	mutation SetMyCompetence($module: ID!, $level: CompetenceLevel!, $note: String) {
		setMyCompetence(moduleId: $module, level: $level, note: $note) {
			id
		}
	}
`);

const WithdrawMyCompetenceDocument = graphql(`
	mutation WithdrawMyCompetence($id: ID!) {
		withdrawMyCompetence(id: $id)
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(OwnCompetencesDocument);
		return {
			groups: data.mySubjectGroups,
			mine: data.myCompetences,
			status: data.myCompetenceStatus
		};
	} catch (err) {
		// This page needs no role; a refusal here is "no account", which the root layout renders.
		error(403, toRefusal(err).message);
	}
};

/** One module's refusal, so the page can put it in its row. */
type RowRefusal = { moduleId: string; message: string };

export const actions: Actions = {
	/**
	 * Save the whole profile. One form, one button, the difference worked out here against what
	 * is stored — the wish table's arrangement, for the wish table's reasons.
	 *
	 * Nothing here says whose profile it is: the backend takes the holder from the session.
	 */
	save: async ({ request }) => {
		const form = await request.formData();

		const entries = new Map<string, CompetenceEntry>();
		const entryFor = (moduleId: string) => {
			const existing = entries.get(moduleId);
			if (existing) return existing;
			const fresh: CompetenceEntry = { moduleId, level: '', note: '' };
			entries.set(moduleId, fresh);
			return fresh;
		};

		for (const [key, value] of form.entries()) {
			const text = String(value);
			if (key.startsWith('level:')) {
				if (!isCompetenceChoice(text)) {
					return fail(400, { message: 'Diese Stufe gibt es nicht.', refusals: [] });
				}
				entryFor(key.slice('level:'.length)).level = text;
			} else if (key.startsWith('note:')) {
				entryFor(key.slice('note:'.length)).note = text.trim();
			}
		}

		let stored;
		try {
			stored = await backendRequest(MyCompetencesForSavingDocument);
		} catch (err) {
			return fail(400, { ...toRefusal(err), refusals: [] });
		}

		const changes = competenceChanges(
			[...entries.values()],
			stored.myCompetences.map((c) => ({
				id: c.id,
				moduleId: c.module.id,
				level: c.level,
				note: c.note
			}))
		);

		// One after the other: a refused row must not take the ones after it with it.
		const refusals: RowRefusal[] = [];
		let saved = 0;
		for (const change of changes) {
			try {
				if (change.kind === 'withdraw') {
					await backendRequest(WithdrawMyCompetenceDocument, { id: change.competenceId });
				} else {
					await backendRequest(SetMyCompetenceDocument, {
						module: change.moduleId,
						level: change.level as CompetenceLevel,
						note: change.note === '' ? null : change.note
					});
				}
				saved++;
			} catch (err) {
				refusals.push({ moduleId: change.moduleId, message: toRefusal(err).message });
			}
		}
		return { saved, refusals };
	},

	/** Remove one statement that no group table shows any more. */
	withdraw: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await backendRequest(WithdrawMyCompetenceDocument, { id });
		} catch (err) {
			return fail(400, { ...toRefusal(err), refusals: [] });
		}
		return { saved: 1, refusals: [] };
	}
};
