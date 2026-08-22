import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

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
 */
if (env.PUBLIC_GLITCHTIP_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_GLITCHTIP_DSN,
		environment: env.PUBLIC_GLITCHTIP_ENVIRONMENT || 'production',
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

/** Reports unhandled browser errors, then hands them back to SvelteKit. A pass-through
 * when no DSN is set. */
export const handleError = Sentry.handleErrorWithSentry();
