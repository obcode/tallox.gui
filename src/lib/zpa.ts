/**
 * The module import, in the language the faculty speaks it.
 *
 * The same translation `#lib/semester.ts` does, and for the same reason: the backend is English
 * throughout, and the mapping to the words people read happens once, here.
 *
 * Svelte-free on purpose, so vitest can check the part that is easy to get wrong — the
 * freshness judgement, which is the whole point of the page.
 */

import type {
	ZpaChangeType,
	ZpaObjectKind,
	ZpaProjectionStatus,
	ZpaSyncStatus,
	ZpaSyncTrigger
} from '#lib/gql/__generated__/graphql.ts';

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
 * Nothing new is the ordinary answer and deserves to be a sentence rather than three zeroes: the
 * whole point of the nightly job is that most nights are quiet.
 *
 * The sentence names what it compares, because on 2026-11-18 it did not: the counts compare the
 * fetch with what the previous run had already fetched, not with the catalogue. A module the
 * nightly run brought is not new again in the morning, and "keine Änderungen" on a run that
 * nonetheless brought a module into the catalogue read like an error. What reached the catalogue
 * is describeCatalogue's sentence.
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
	return parts.length === 0
		? 'im ZPA nichts geändert seit dem vorigen Abgleich'
		: `im ZPA ${parts.join(', ')}`;
}

/** The projection of a run, as far as the page reads it. */
export type RunProjection = {
	status: ZpaProjectionStatus;
	modulesAdded: number;
	addedModules: readonly string[];
};

/**
 * What a run brought into the catalogue, or null when there is nothing to say.
 *
 * Silent rather than "kein Modul neu" when none was added. Projections from before 2026-11-18
 * recorded nothing and read as zero, and a sentence claiming nothing arrived would be false for
 * exactly the run that prompted this — so only the positive statement is made.
 */
export function describeCatalogue(projection: RunProjection | null | undefined): string | null {
	if (!projection) return null;
	switch (projection.status) {
		case 'RUNNING':
			return 'Katalog wird aufgebaut';
		case 'FAILED':
			return 'Katalog nicht aufgebaut';
		case 'SUCCEEDED':
			if (projection.modulesAdded === 0) return null;
			return projection.modulesAdded === 1
				? '1 Modul neu im Katalog'
				: `${projection.modulesAdded} Module neu im Katalog`;
	}
}

/** The counts and the catalogue, as the line under a run. */
export function describeRun(run: {
	appeared: number;
	changed: number;
	disappeared: number;
	projection?: RunProjection | null;
}): string {
	const catalogue = describeCatalogue(run.projection);
	return catalogue ? `${describeCounts(run)} · ${catalogue}` : describeCounts(run);
}

/**
 * How long after a run's end the page keeps reading while its projection has not settled.
 *
 * The projection starts only once the run has finished, and takes a fraction of a second. The
 * bound keeps a run whose projection never comes — nothing configured to project, or a crashed
 * process — from making the page poll for ever.
 */
export const PROJECTION_GRACE_MS = 30_000;

/**
 * Whether a finished run's projection is still to come, so the page keeps following it.
 *
 * Only after a run that fully succeeded: no other run projects.
 */
export function awaitingProjection(
	run: { status: ZpaSyncStatus; finishedAt?: string | null; projection?: RunProjection | null },
	now: Date = new Date()
): boolean {
	if (run.status !== 'SUCCEEDED' || !run.finishedAt) return false;
	if (run.projection && run.projection.status !== 'RUNNING') return false;
	return now.getTime() - new Date(run.finishedAt).getTime() < PROJECTION_GRACE_MS;
}

/**
 * The refusals of a manual run, worded here by their code.
 *
 * The backend's sentences for these are terse and are not on the pass-through list in
 * `#lib/server/graphqlError.ts`, so without this the person at the button read the generic
 * failure — for the most ordinary refusal there is, now that the leads press it too: somebody
 * else's run, or the nightly one, is still going. None of them gives anything away.
 */
export const SYNC_REFUSALS: Record<string, string> = {
	ZPA_SYNC_RUNNING:
		'Es läuft schon ein Abgleich, angestoßen von jemand anderem oder nächtlich. Einen zweiten startet Tallox nicht; sein Ergebnis steht hier, sobald er fertig ist.',
	ZPA_SYNCED_RECENTLY:
		'Der letzte Abgleich ist erst wenige Minuten her. Danach ist zehn Minuten Pause, damit das ZPA nicht überlastet wird; was er geholt hat, steht in der Liste.',
	ZPA_NOT_CONFIGURED: 'Der ZPA-Abgleich ist in dieser Installation nicht eingerichtet.'
};

/** The sentence for a refusal: the page's own wording where it has one. */
export function refusalSentence(refusal: { code: string; message: string }): string {
	return SYNC_REFUSALS[refusal.code] ?? refusal.message;
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
