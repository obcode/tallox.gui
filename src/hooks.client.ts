import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { reportUnexpectedError } from '$lib/errorReport';

/**
 * Report browser errors to GlitchTip.
 *
 * The DSN ends up in the bundle everyone downloads and is therefore public. That is how
 * Sentry DSNs are meant to work — they may only write — but SvelteKit still refuses to hand
 * an unprefixed variable to the client, and that refusal is why the decision is visible in
 * the name rather than buried in a config file.
 *
 * Empty or unset means no reporting at all, so development needs neither a collector nor
 * configuration.
 *
 * SENTRY_*, not GLITCHTIP_*: the collector happens to be GlitchTip, but the protocol and
 * the variable are Sentry's, and plexams.gui already carries that name. One name across
 * both installations beats naming the product we currently point at.
 */
if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		environment: env.PUBLIC_SENTRY_ENVIRONMENT || 'production',
		// Errors only. GlitchTip does not read traces, and every span would be another
		// request out of every user's browser.
		tracesSampleRate: 0,
		// Stated rather than inherited: this screen shows teaching load and the wishes of
		// named colleagues, and what leaves it is not a default worth taking on trust.
		//
		// NOTE: breadcrumbs still record the URLs visited. A person id in a path is in the
		// issue as well.
		sendDefaultPii: false
	});
}

/**
 * Unexpected errors in the browser — a client-side load or navigation. Same number scheme as
 * on the server; the line goes to the browser console, the event to the collector when a DSN
 * is set. See $lib/errorReport.
 */
export const handleError: HandleClientError = ({ error, event, status, message }) =>
	reportUnexpectedError(
		{ error, status, message, path: event.url.pathname, routeId: event.route.id },
		{
			capture: (err, errorId) => {
				if (env.PUBLIC_SENTRY_DSN) Sentry.captureException(err, { tags: { errorId } });
			},
			log: (line) => console.error(line),
			version: __APP_VERSION__
		}
	);
