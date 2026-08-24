import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';
import { loadServerBuildInfo } from '$lib/server/buildInfo';
import { loadSession } from '$lib/server/session';

/**
 * What appears in the frame on every page: identity, roles, theme, server version.
 *
 * In the layout rather than in every `+page.server.ts`, so that a new page cannot accidentally
 * render the frame without these values.
 *
 * The session comes from `session` and not from `me`, because the two diverge as soon as
 * somebody has narrowed their roles: `me.roles` are the held ones, `session.effectiveRoles` are
 * the ones the server judges this request by. A navigation built from the held roles shows, in
 * the preview, the menu of a person whose permissions the server is no longer applying — and
 * thereby fails to answer the very question the preview exists for.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const [session, serverBuild] = await Promise.all([loadSession(), loadServerBuildInfo()]);

	if (session.kind === 'no-access') {
		// 403 and not 401: signing in again does not help. The auth proxy already let this person
		// through — what is missing is a row in `person`, and the administrators create that.
		// `+error.svelte` turns it into a sentence that says so.
		error(403, session.message);
	}

	return {
		// A temporary "Feedback" entry in the navigation, or null for none.
		//
		// From the environment rather than from the source: this repository is public and the
		// space it points at is not, and it makes "temporary" a configuration change instead of
		// a revert. `$env/dynamic/public` rather than `static`, so the deployment can set it
		// without a rebuild.
		feedbackUrl: env.PUBLIC_TALLOX_FEEDBACK_URL || null,
		remoteUser: locals.remoteUser ?? null,
		remoteDisplayname: locals.remoteDisplayname ?? null,
		// null when the backend was unreachable. The page keeps rendering, with the note in the
		// footer — a deploy in progress must not make every page answer with an error.
		session: session.kind === 'ok' ? session.session : null,
		theme: locals.theme,
		serverBuild
	};
};
