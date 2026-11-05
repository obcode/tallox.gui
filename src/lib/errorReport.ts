/**
 * What happens to an error nobody expected — on the server and in the browser alike.
 *
 * Such an error ends on the error page as SvelteKit's bare "Internal Error", which tells the
 * person nothing and whoever they report it to even less. So every one of them gets a short
 * number: it is shown on the page, it heads the log line with the stack trace, and it is a tag
 * on the event in the collector. "Fehlernummer 3f9a01c2" in a mail finds the stack in one grep.
 *
 * The log line names the path, not the URL: a query string can carry a mail address
 * (/verwaltung/diagnose?mail=…). Nobody's identity is logged either — the number is what the
 * person sends, and that already says who it was.
 */

/** The parts of SvelteKit's handleError input this needs, server and client alike. */
export type UnexpectedError = {
	error: unknown;
	status: number;
	message: string;
	method?: string;
	path: string;
	routeId: string | null;
};

export type ErrorSinks = {
	/** Hands the error to the collector, tagged with its number. A no-op without a DSN. */
	capture: (error: unknown, errorId: string) => void;
	log: (line: string) => void;
	version: string;
};

/** Eight hex digits: short enough to read out on the phone, plenty for a log of failures. */
export function newErrorId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(4));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function stackOf(error: unknown): string {
	if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`;
	return String(error);
}

/**
 * Reports the error and returns what the error page gets. A 404 is a wrong address, not a
 * failure: no number, no stack, nothing reported, and the page keeps SvelteKit's message.
 */
export function reportUnexpectedError(input: UnexpectedError, sinks: ErrorSinks): App.Error {
	if (input.status === 404) return { message: input.message };

	const errorId = newErrorId();
	sinks.capture(input.error, errorId);
	const request = [input.method, input.path].filter(Boolean).join(' ');
	sinks.log(
		`unexpected error ${errorId}: ${input.status} ${request} ` +
			`(route ${input.routeId ?? 'none'}, version ${sinks.version})\n${stackOf(input.error)}`
	);
	return { message: input.message, errorId };
}
