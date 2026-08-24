import type { AccessDoor, AccessOutcome } from '$lib/gql/__generated__/graphql';

/**
 * The access log in German.
 *
 * The translation the backend deliberately does not do. The enum values are stable contract —
 * the API console and colleagues' scripts read them — and the sentences here are the half that
 * gets reworded after a support question, which is exactly why they live only here.
 */
export const DOOR_LABELS: Record<AccessDoor, string> = {
	INTERACTIVE: 'Browser',
	TOKEN: 'Token'
};

export const OUTCOME_LABELS: Record<AccessOutcome, string> = {
	OK: 'ok',
	ERROR: 'Fehler',
	REFUSED_AUTH: 'Anmeldung abgewiesen',
	REFUSED_SCOPE: 'Scope fehlt',
	REFUSED_INTERACTIVE: 'nur interaktiv'
};

/**
 * What each outcome means for whoever is reading, in one sentence.
 *
 * Three refusals rather than one, because they need three different actions. Somebody who
 * cannot sign in at all needs an account; a token that lacks a scope needs a new token; a
 * script reaching for personnel data does not need a token at all but a browser. A log that
 * called all three "abgewiesen" would send the reader down the wrong path twice out of three
 * times.
 */
export const OUTCOME_HINTS: Record<AccessOutcome, string> = {
	OK: 'Die Operation lief durch.',
	ERROR: 'Die Operation lief und ist gescheitert.',
	REFUSED_AUTH:
		'Die Anfrage kam nicht bis zum Schema: unbekannte Kennung, deaktiviertes Konto, ' +
		'abgelaufenes oder widerrufenes Token.',
	REFUSED_SCOPE: 'Das Token war enger ausgestellt, als die Operation verlangt.',
	REFUSED_INTERACTIVE: 'Ein Skript hat ein Feld angefragt, das es nur im Browser gibt.'
};

/**
 * The badge class for an outcome.
 *
 * Semantic colours are background colours here, never text: `text-error` on `base-100` reaches
 * 1.35:1 on the light themes. daisyUI pairs `badge-error` with its own `*-content` foreground,
 * which is the pair built for contrast.
 */
export function outcomeBadge(outcome: AccessOutcome): string {
	switch (outcome) {
		case 'OK':
			return 'badge-ghost';
		case 'ERROR':
			return 'badge-error';
		default:
			return 'badge-warning';
	}
}

/**
 * Whether an outcome is one somebody should look at.
 *
 * Used for the "nur Auffälliges" filter and nothing else. `OK` is the only quiet one — an error
 * is as much worth seeing as a refusal, and a filter that hid it would be a filter that lies
 * about what it shows.
 */
export function isNotable(outcome: AccessOutcome): boolean {
	return outcome !== 'OK';
}

/** How long an operation took, for a table column. */
export function duration(ms: number | null | undefined): string {
	if (ms === null || ms === undefined) return '—';
	if (ms < 1000) return `${ms} ms`;
	return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * What an entry was about, as one readable string.
 *
 * The root fields, and the operation name in front of them when the client sent one. Deliberate
 * shape: the field names are what the log actually knows and what a rule is written against,
 * the operation name is the client's own word for the same thing and can be anything at all.
 */
export function asked(operation: string | null | undefined, fields: readonly string[]): string {
	const what = fields.length > 0 ? fields.join(', ') : '—';
	return operation ? `${operation}: ${what}` : what;
}

/**
 * Who an entry was, with whichever identifier the door had.
 *
 * Three cases, and the third is not padding: the browser door knows an address, the token door
 * knows the token's public half, and a credential too malformed to parse knows neither — which
 * is somebody sending something that is not a Tallox credential at all, and the one line that
 * says so.
 */
export function who(mail: string | null | undefined, tokenId: string | null | undefined): string {
	if (mail) return mail;
	if (tokenId) return `Token ${tokenId}`;
	return 'kein Credential lesbar';
}

/** Date and time as they are read in Europe/Berlin. */
export function when(value: string): string {
	return new Date(value).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' });
}

/**
 * The windows the page offers, and the one it starts on.
 *
 * A day by default, because the question this page answers most often is the one the nightly
 * mail just raised. Ninety days is the retention period: offering more would be a filter that
 * silently returns less than it promises.
 */
export const WINDOWS: readonly { days: number; label: string }[] = [
	{ days: 1, label: '24 Stunden' },
	{ days: 7, label: '7 Tage' },
	{ days: 30, label: '30 Tage' },
	{ days: 90, label: '90 Tage' }
];

export const DEFAULT_WINDOW_DAYS = 1;

/** Clamps a window from the URL to one this page offers. */
export function windowDays(raw: string | null): number {
	const days = Number(raw);
	return WINDOWS.some((w) => w.days === days) ? days : DEFAULT_WINDOW_DAYS;
}

/** The filters this page keeps in the URL. */
export type AccessFilters = {
	days: number;
	mail: string;
	door: string;
	only: string;
};

/**
 * The query string for a link that keeps the current filters and changes one of them.
 *
 * Here rather than in the component for two reasons. It is the sort of thing that is wrong in a
 * way nobody notices — a lost filter looks like a page that found fewer entries — so it wants a
 * test. And `URLSearchParams` is a mutable built-in, which the Svelte lint rule rejects inside a
 * component because a mutation there would not be reactive; in a plain module it is exactly the
 * right tool.
 *
 * Default values are left out, so an unfiltered link is `?` and nothing else rather than four
 * parameters spelling out the defaults.
 */
export function withParam(current: AccessFilters, key: string, value: string): string {
	const params = new URLSearchParams();
	if (current.days !== DEFAULT_WINDOW_DAYS) params.set('zeitraum', String(current.days));
	if (current.mail) params.set('person', current.mail);
	if (current.door) params.set('tuer', current.door);
	if (current.only) params.set('nur', current.only);

	if (value === '') params.delete(key);
	else params.set(key, value);

	const query = params.toString();
	return query === '' ? '' : `?${query}`;
}
