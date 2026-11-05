import type { ThemeChoice } from '$lib/themes';

declare global {
	namespace App {
		interface Error {
			message: string;
			/** Set for unexpected errors: shown on the error page, heads the log line. */
			errorId?: string;
		}
		interface Locals {
			/** The verified mail address, set by the auth proxy. Undefined locally. */
			remoteUser?: string;
			remoteDisplayname?: string;
			/**
			 * Role narrowing from the cookie. `undefined` = not narrowed, `[]` = narrowed to no
			 * role at all. See $lib/assumedRoles.
			 */
			assumedRoles?: string[];
			/** Resolved from the cookie, see hooks.server.ts. Never an unchecked value. */
			theme: ThemeChoice;
		}
	}

	/** Substituted at build time by vite.config.ts. */
	const __APP_VERSION__: string;
	const __BUILD_TIME__: string;
}

export {};
