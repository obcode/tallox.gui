import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Liveness of the SSR node process.
 *
 * Behind forward_auth a hung SvelteKit process is indistinguishable from a healthy one: a
 * request to `/` is answered by oauth2-proxy with a redirect to the login, and the container is
 * never asked. This route is the only place where "the GUI answers" can be told apart from "the
 * front door answers".
 *
 * The path is nested rather than plain `/healthz` so that it cannot collide with a backend
 * endpoint on the same host — Caddy matches paths exactly, and the convention is the same on
 * plexams and glabs.
 *
 * Deliberately checks nothing else: not the identity, not tallox-api, not the database. It
 * answers one question — is this process alive and which build is it — and it has to keep
 * answering when the backend is gone, because that outage has its own watchman. A liveness
 * endpoint that depends on other services reports their failures as its own, which makes both
 * signals useless.
 */
export const GET: RequestHandler = () =>
	json(
		{ status: 'ok', version: __APP_VERSION__, built: __BUILD_TIME__ },
		// A cached liveness answer is a lie with a timestamp on it.
		{ headers: { 'Cache-Control': 'no-store' } }
	);
