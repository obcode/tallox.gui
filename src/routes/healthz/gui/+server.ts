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
 * answers one question — is this process alive — and it has to keep answering when the backend
 * is gone, because that outage has its own watchman. A liveness endpoint that depends on other
 * services reports their failures as its own, which makes both signals useless.
 *
 * Only the status, since 2026-10-28: the route sits outside the login gate, and the build
 * version and time were a fingerprint handed to anybody who could reach the host. Which build
 * runs is in the footer of every page for whoever is signed in, and in the deploy's own
 * smoke check through the backend's `buildInfo`.
 */
export const GET: RequestHandler = () =>
	json(
		{ status: 'ok' },
		// A cached liveness answer is a lie with a timestamp on it.
		{ headers: { 'Cache-Control': 'no-store' } }
	);
