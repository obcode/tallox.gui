import type { ServerBuildInfo } from '#lib/buildInfo.ts';
import { graphql } from '#lib/gql/__generated__/index.ts';
import { backendRequest } from './backend';

const BuildInfoQuery = graphql(`
	query BuildInfo {
		buildInfo {
			version
			commit
			builtAt
		}
	}
`);

/**
 * The backend's version stamp for the footer.
 *
 * Swallows every error and returns `null`. That is not sloppy error handling here but the
 * actual requirement: the footer hangs on every page, and an unreachable backend must not make
 * every single page answer with a 500 — during a deploy, while the API container is
 * restarting, that is the least useful error message there is. The footer then shows "—", and
 * that is exactly the useful information.
 */
export async function loadServerBuildInfo(): Promise<ServerBuildInfo | null> {
	try {
		const data = await backendRequest(BuildInfoQuery);
		return data.buildInfo;
	} catch {
		return null;
	}
}
