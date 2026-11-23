import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Every environment variable this app reads. Since SvelteKit 3 a variable exists for the code
 * only once it is declared here: private ones come from `$app/env/private` (server-only),
 * public ones from `$app/env/public`.
 *
 * All of them are read when the process starts, not baked in at build time — one image runs
 * in every installation. All of them are optional: an unset value means "not configured", and
 * each reader states its own fallback. The schema only turns an empty string into undefined,
 * which is how an unset variable arrives from a compose file.
 */
const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	TALLOX_SERVER: {
		description:
			'GraphQL endpoint for the SSR process, container-internal in production. Never the public URL.',
		schema: optional
	},
	SENTRY_DSN: {
		description: 'Where server-side errors are reported. Unset means no reporting.',
		schema: optional
	},
	SENTRY_ENVIRONMENT: {
		description: 'Environment name attached to server-side reports.',
		schema: optional
	},
	PUBLIC_TALLOX_SERVER: {
		public: true,
		description: 'The public GraphQL URL, as the browser and API clients see it.',
		schema: optional
	},
	PUBLIC_TALLOX_FEEDBACK_URL: {
		public: true,
		description: 'A temporary "Feedback" entry in the navigation bar. Unset means none.',
		schema: optional
	},
	PUBLIC_SENTRY_DSN: {
		public: true,
		description:
			'Where browser errors are reported. Public by design: a DSN may only write. Unset means no reporting.',
		schema: optional
	},
	PUBLIC_SENTRY_ENVIRONMENT: {
		public: true,
		description: 'Environment name attached to browser reports.',
		schema: optional
	}
});
