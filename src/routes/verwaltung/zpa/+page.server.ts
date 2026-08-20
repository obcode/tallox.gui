import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';

const ImportRunsDocument = graphql(`
	query ZpaSyncRuns {
		zpaSyncRuns(limit: 20) {
			id
			trigger
			startedBy
			startedAt
			finishedAt
			status
			fetched
			appeared
			changed
			disappeared
			error
			kinds {
				kind
				status
				fetched
				error
			}
		}
	}
`);

const ImportChangesDocument = graphql(`
	query ZpaChanges($runId: ID!) {
		zpaChanges(runId: $runId) {
			id
			kind
			zpaId
			label
			change
			changedKeys
			detectedAt
		}
	}
`);

const ProjectionsDocument = graphql(`
	query ZpaCatalogueProjections {
		zpaCatalogueProjections(limit: 10) {
			id
			runId
			startedAt
			finishedAt
			status
			programmesWritten
			modulesWritten
			offeringsWritten
			offeringsRemoved
			error
			notes {
				finding
				count
				sample
			}
		}
	}
`);

const ProjectNowDocument = graphql(`
	mutation ProjectZpaCatalogue {
		projectZpaCatalogue {
			id
			status
		}
	}
`);

const SyncNowDocument = graphql(`
	mutation SyncZpaNow {
		syncZpaNow {
			id
			status
		}
	}
`);

/**
 * The module import: when it last ran, and what it changed.
 *
 * All four fields are `@interactiveOnly`, so through a Personal Access Token they answer
 * `null` — the API console under /api-doku goes through the token door and cannot show them.
 * Without this page they would be unreachable in production, which is exactly what happened to
 * `diagnoseAccess` on its first attempt.
 *
 * The changes of the newest run are loaded here rather than on demand. A run that changed
 * nothing is the ordinary case and costs one empty list; a run that changed something is the
 * only reason anybody opens this page, and making them click again for it would be a click
 * they always make.
 */
export const load: PageServerLoad = async ({ url }) => {
	try {
		const { zpaSyncRuns } = await backendRequest(ImportRunsDocument);

		// The run whose report is shown: the one named in the URL, or the newest. Being in the
		// URL means a specific report can be pasted into a mail, which is what somebody does
		// with "look at what the ZPA did to your programme".
		const selectedId = url.searchParams.get('lauf') ?? zpaSyncRuns[0]?.id;
		const selected = zpaSyncRuns.find((run) => run.id === selectedId) ?? zpaSyncRuns[0] ?? null;

		const changes = selected
			? (await backendRequest(ImportChangesDocument, { runId: selected.id })).zpaChanges
			: [];

		// The projection is a second thing that can be stale, and it is shown beside the runs
		// rather than instead of them. A successful import with a failed projection is fresh
		// payloads behind a week-old catalogue, and a page that showed only the first would say
		// everything was fine.
		const { zpaCatalogueProjections } = await backendRequest(ProjectionsDocument);

		return {
			runs: zpaSyncRuns,
			selected,
			changes,
			projections: zpaCatalogueProjections,
			projection: zpaCatalogueProjections[0] ?? null
		};
	} catch (err) {
		// A refusal here means the caller is neither administration nor the dean's office. The
		// root layout already turns "no account at all" into its own page, so passing this on
		// as a 403 keeps the two from being confused.
		error(403, toRefusal(err).message);
	}
};

export const actions = {
	/**
	 * Ask for a run now.
	 *
	 * A form action rather than a client-side call, so it works without JavaScript — and the
	 * refusals that matter (`ZPA_SYNC_RUNNING`, `ZPA_SYNCED_RECENTLY`, `ZPA_NOT_CONFIGURED`)
	 * arrive as codes this page can word for itself.
	 *
	 * No second confirmation. The interval and the lock in the backend are what keep this from
	 * hammering another institution's system; a check here would be a second opinion about a
	 * rule that is already enforced where it has to be.
	 */
	sync: async () => {
		try {
			await backendRequest(SyncNowDocument);
			return { started: true };
		} catch (err) {
			return fail(400, toRefusal(err));
		}
	},

	/**
	 * Rebuild the catalogue from what is already cached, without fetching.
	 *
	 * Separate from `sync` because they fail for different reasons and are wanted at different
	 * times. This one reaches nothing outside the installation, so there is no interval and
	 * nothing to hammer — it exists because the rules of the projection change, and a changed
	 * rule has to be applicable to data already held.
	 */
	project: async () => {
		try {
			await backendRequest(ProjectNowDocument);
			return { projected: true };
		} catch (err) {
			return fail(400, toRefusal(err));
		}
	}
} satisfies Actions;
