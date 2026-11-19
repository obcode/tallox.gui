/**
 * What leaves the browser for the collector carries addresses, and addresses carry query
 * strings: the person search sends what was typed into it (`?q=…`), the diagnosis a mail address
 * (`?mail=…`). Both are names of colleagues in an issue tracker. Found on 2026-11-19 in an issue
 * whose breadcrumbs held the start of a name.
 *
 * So every URL is cut at `?` and `#` before it is sent — the same rule as the log line in
 * $lib/errorReport, which names the path and never the URL. The path is what finds the page; the
 * filter that was set on it is not worth a name.
 *
 * Structural types rather than Sentry's own, so the module stays a pure function of its input.
 */

export function withoutQuery(url: string): string {
	const cut = url.search(/[?#]/);
	return cut === -1 ? url : url.slice(0, cut);
}

/** The breadcrumb fields that hold an address: fetch/xhr `url`, navigation `from` and `to`. */
const URL_FIELDS = ['url', 'from', 'to'] as const;

type ScrubbableBreadcrumb = { message?: string; data?: { [key: string]: unknown } };

export function scrubBreadcrumb<B extends ScrubbableBreadcrumb>(breadcrumb: B): B {
	if (!breadcrumb.data) return breadcrumb;
	const data = { ...breadcrumb.data };
	for (const field of URL_FIELDS) {
		const value = data[field];
		if (typeof value === 'string') data[field] = withoutQuery(value);
	}
	return { ...breadcrumb, data };
}

type ScrubbableEvent = {
	message?: string;
	request?: {
		url?: string;
		query_string?: unknown;
		headers?: { [key: string]: string };
	};
	breadcrumbs?: ScrubbableBreadcrumb[];
};

export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
	const scrubbed = { ...event };
	if (event.request) {
		const request = { ...event.request };
		if (request.url) request.url = withoutQuery(request.url);
		delete request.query_string;
		if (request.headers) {
			request.headers = Object.fromEntries(
				Object.entries(request.headers).map(([name, value]) =>
					name.toLowerCase() === 'referer' ? [name, withoutQuery(value)] : [name, value]
				)
			);
		}
		scrubbed.request = request;
	}
	if (event.breadcrumbs) scrubbed.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
	return scrubbed;
}
