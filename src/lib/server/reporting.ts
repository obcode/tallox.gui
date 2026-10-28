import type { ErrorEvent } from '@sentry/sveltekit';

/**
 * The last pass over an event before it leaves for the collector.
 *
 * `requestDataIntegration` is told not to attach request headers at all (see hooks.server.ts).
 * This is the second line: whatever integration or SDK version attaches a header after all,
 * the identity the proxy put on the request — `x-remote-user`, `x-remote-displayname`,
 * `x-remote-department` — does not travel. The collector is a different trust zone from the
 * container's own log, and a mail address beside a stack trace is a person beside a failure.
 */
export function stripIdentityHeaders(event: ErrorEvent): ErrorEvent {
	const headers = event.request?.headers;
	if (!headers) return event;

	for (const name of Object.keys(headers)) {
		const lower = name.toLowerCase();
		if (lower.startsWith('x-remote-') || lower === 'cookie' || lower === 'authorization') {
			delete headers[name];
		}
	}
	return event;
}
