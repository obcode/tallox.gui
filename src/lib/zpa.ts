/**
 * The module import, in the language the faculty speaks it.
 *
 * The same translation `$lib/semester.ts` does, and for the same reason: the backend is English
 * throughout, and the mapping to the words people read happens once, here.
 *
 * Svelte-free on purpose, so vitest can check the part that is easy to get wrong — the
 * freshness judgement, which is the whole point of the page.
 */

import type {
	ZpaChangeType,
	ZpaObjectKind,
	ZpaSyncStatus,
	ZpaSyncTrigger
} from '$lib/gql/__generated__/graphql';

export const STATUS_LABELS: Record<ZpaSyncStatus, string> = {
	RUNNING: 'läuft',
	SUCCEEDED: 'erfolgreich',
	PARTIAL: 'teilweise',
	FAILED: 'gescheitert'
};

export const TRIGGER_LABELS: Record<ZpaSyncTrigger, string> = {
	SCHEDULE: 'nächtlich',
	MANUAL: 'von Hand'
};

export const KIND_LABELS: Record<ZpaObjectKind, string> = {
	MODULE: 'Module',
	BASKET: 'Kataloge',
	MSBA: 'Zuordnungen',
	SPO: 'SPOs',
	TEACHER: 'Lehrende'
};

export const CHANGE_LABELS: Record<ZpaChangeType, string> = {
	APPEARED: 'neu',
	CHANGED: 'geändert',
	DISAPPEARED: 'entfallen',
	REAPPEARED: 'wieder da'
};

/**
 * The badge a status gets.
 *
 * PARTIAL is a warning and not an error, deliberately: the endpoints that arrived are correctly
 * up to date, and nothing belonging to the one that failed was retired. Colouring it like a
 * failure would teach people that a red badge here means nothing.
 */
export function statusBadge(status: ZpaSyncStatus): string {
	switch (status) {
		case 'SUCCEEDED':
			return 'badge-success';
		case 'PARTIAL':
			return 'badge-warning';
		case 'FAILED':
			return 'badge-error';
		case 'RUNNING':
			return 'badge-ghost';
	}
}

/** How stale the catalogue is allowed to look before the page says so. */
export const STALE_AFTER_HOURS = 48;

export type Freshness = {
	/** `error` when nothing has ever run or the last run is too old. */
	level: 'ok' | 'warn' | 'error';
	/** A whole sentence, because this is the one thing on the page that has to be read. */
	message: string;
};

/**
 * How the "last successful run" line reads.
 *
 * This is the most important thing on the page and the reason it exists. The failure this
 * import will actually have is not a wrong result — it is a job that quietly stopped weeks ago,
 * while every screen looks healthy and the planning quietly uses stale data. A relative age in
 * plain words is what makes that visible at a glance.
 *
 * `now` is a parameter so the test does not depend on the clock.
 */
export function freshness(
	lastSuccessfulFinishedAt: string | null | undefined,
	now: Date = new Date()
): Freshness {
	if (!lastSuccessfulFinishedAt) {
		return {
			level: 'error',
			message: 'Es gab noch keinen erfolgreichen Abgleich. Der Modulkatalog ist leer oder veraltet.'
		};
	}

	const finished = new Date(lastSuccessfulFinishedAt);
	const hours = (now.getTime() - finished.getTime()) / 3_600_000;

	if (hours > STALE_AFTER_HOURS) {
		return {
			level: 'error',
			message: `Der letzte erfolgreiche Abgleich ist ${describeAge(hours)} her. Läuft der nächtliche Job noch?`
		};
	}
	if (hours > 26) {
		// More than a day but inside the allowance: one missed night. Worth mentioning, not
		// worth alarming about — a single failed night is normal and two are not.
		return {
			level: 'warn',
			message: `Der letzte erfolgreiche Abgleich ist ${describeAge(hours)} her. Eine Nacht ist ausgefallen.`
		};
	}
	return {
		level: 'ok',
		message: `Der letzte erfolgreiche Abgleich ist ${describeAge(hours)} her.`
	};
}

function describeAge(hours: number): string {
	if (hours < 1) {
		const minutes = Math.max(1, Math.round(hours * 60));
		return minutes === 1 ? 'eine Minute' : `${minutes} Minuten`;
	}
	if (hours < 48) {
		const whole = Math.round(hours);
		return whole === 1 ? 'eine Stunde' : `${whole} Stunden`;
	}
	const days = Math.round(hours / 24);
	return `${days} Tage`;
}

/**
 * The newest run that actually applied something.
 *
 * PARTIAL counts. A run that got three of four endpoints is not the silence this is watching
 * for, and treating it as one would raise an alarm about a working import.
 */
export function lastSuccessful<T extends { status: ZpaSyncStatus; finishedAt?: string | null }>(
	runs: readonly T[]
): T | undefined {
	return runs.find((run) => run.status === 'SUCCEEDED' || run.status === 'PARTIAL');
}

/**
 * What a run's counts say, in one sentence.
 *
 * "Keine Änderungen" is the ordinary answer and deserves to be a sentence rather than three
 * zeroes: the whole point of the nightly job is that most nights are quiet.
 */
export function describeCounts(run: {
	appeared: number;
	changed: number;
	disappeared: number;
}): string {
	const parts: string[] = [];
	if (run.appeared > 0) parts.push(`${run.appeared} neu`);
	if (run.changed > 0) parts.push(`${run.changed} geändert`);
	if (run.disappeared > 0) parts.push(`${run.disappeared} entfallen`);
	return parts.length === 0 ? 'keine Änderungen' : parts.join(', ');
}

/**
 * How often the page reads a running run again.
 *
 * A whole run takes about a quarter of a minute, and what changes during it is one endpoint
 * finishing after another — so once a second is enough to see each of them arrive, and cheap
 * enough for a page only administration and the dean's office open.
 */
export const POLL_INTERVAL_MS = 1000;

/** The key the import page's load depends on, and what the page invalidates while polling. */
export const ZPA_DEPENDENCY = 'tallox:zpa';

/** The run in progress, if there is one. */
export function runningRun<T extends { status: ZpaSyncStatus }>(runs: readonly T[]): T | undefined {
	return runs.find((run) => run.status === 'RUNNING');
}

export type RunProgress = {
	/** Endpoints already fetched and applied, in the order the backend lists them. */
	done: string[];
	/** How many endpoints there are. */
	total: number;
	/** Whole seconds since the run started. */
	seconds: number;
};

/**
 * Where a running run is.
 *
 * Endpoint by endpoint, because that is the finest step there is: measured on the recorded
 * payloads, the database work of a whole run is about one second, and eight of the eleven
 * seconds a real run takes are a single request to the ZPA. A counter below the level of an
 * endpoint would have nothing to count.
 *
 * The total comes from the labels, which are typed against every kind the schema knows — a new
 * endpoint without a label is a compile error rather than a progress bar that ends at 5 of 6.
 */
export function runProgress(
	run: { startedAt: string; kinds: readonly { kind: ZpaObjectKind }[] },
	now: Date = new Date()
): RunProgress {
	return {
		done: run.kinds.map((k) => KIND_LABELS[k.kind]),
		total: Object.keys(KIND_LABELS).length,
		seconds: Math.max(0, Math.floor((now.getTime() - new Date(run.startedAt).getTime()) / 1000))
	};
}

/** The sentence a screen reader hears when an endpoint is done — not every second. */
export function describeProgress(progress: RunProgress): string {
	if (progress.done.length === 0) return 'Die Daten werden beim ZPA angefragt.';
	return `${progress.done.length} von ${progress.total} Quellen übernommen: ${progress.done.join(', ')}.`;
}
