import { describe, expect, it } from 'vitest';
import {
	PROJECTION_GRACE_MS,
	awaitingProjection,
	describeCatalogue,
	describeCounts,
	describeRun,
	describeProgress,
	refusalSentence,
	freshness,
	lastSuccessful,
	runProgress,
	runningRun,
	statusBadge
} from './zpa';

/**
 * The freshness judgement is the reason the page exists, so it is the part that gets tested.
 *
 * The failure this import will actually have is not a wrong result — it is a nightly job that
 * quietly stopped weeks ago while every screen looks healthy and the planning uses stale data.
 * Everything else on the page is a table.
 */
describe('freshness', () => {
	const now = new Date('2026-08-19T09:00:00Z');

	it('says so when nothing has ever run', () => {
		// Not "unknown" and not a dash. An installation that has never imported is one whose
		// module catalogue is empty, and that is a sentence somebody has to read.
		expect(freshness(null, now).level).toBe('error');
		expect(freshness(undefined, now).message).toMatch(/noch keinen erfolgreichen/i);
	});

	it('is content with last night', () => {
		expect(freshness('2026-08-19T03:15:00Z', now).level).toBe('ok');
	});

	it('mentions a single missed night without alarming', () => {
		// One failed night is normal — an outage at the other end, a restart. Colouring it red
		// would teach people that red here means nothing, which is how the real alarm gets
		// ignored two months later.
		const result = freshness('2026-08-17T22:00:00Z', now);
		expect(result.level).toBe('warn');
		expect(result.message).toMatch(/eine Nacht/i);
	});

	it('raises the alarm after two missed nights', () => {
		const result = freshness('2026-08-16T03:15:00Z', now);
		expect(result.level).toBe('error');
		expect(result.message).toMatch(/nächtliche Job/i);
	});

	it('counts in days once it is really stale', () => {
		expect(freshness('2026-07-29T03:15:00Z', now).message).toMatch(/21 Tage/);
	});
});

describe('lastSuccessful', () => {
	it('accepts a partial run', () => {
		// Three of four endpoints is real progress and the ones that arrived are correctly up to
		// date. Treating it as silence would raise an alarm about a working import.
		const runs = [
			{ status: 'PARTIAL' as const, finishedAt: '2026-08-19T03:15:00Z' },
			{ status: 'SUCCEEDED' as const, finishedAt: '2026-08-18T03:15:00Z' }
		];
		expect(lastSuccessful(runs)?.finishedAt).toBe('2026-08-19T03:15:00Z');
	});

	it('skips a run that failed outright and one still going', () => {
		const runs = [
			{ status: 'RUNNING' as const, finishedAt: null },
			{ status: 'FAILED' as const, finishedAt: '2026-08-19T03:15:00Z' },
			{ status: 'SUCCEEDED' as const, finishedAt: '2026-08-18T03:15:00Z' }
		];
		expect(lastSuccessful(runs)?.finishedAt).toBe('2026-08-18T03:15:00Z');
	});
});

describe('statusBadge', () => {
	it('colours a partial run as a warning, not an error', () => {
		expect(statusBadge('PARTIAL')).toBe('badge-warning');
		expect(statusBadge('FAILED')).toBe('badge-error');
	});
});

describe('describeCounts', () => {
	it('says nothing happened as a sentence, and against what', () => {
		// The ordinary outcome, and three zeroes would read as a fault. "keine Änderungen" alone
		// read as "nothing arrived" on a run that brought a module into the catalogue.
		expect(describeCounts({ appeared: 0, changed: 0, disappeared: 0 })).toBe(
			'im ZPA nichts geändert seit dem vorigen Abgleich'
		);
	});

	it('names only what is non-zero', () => {
		expect(describeCounts({ appeared: 0, changed: 4, disappeared: 1 })).toBe(
			'im ZPA 4 geändert, 1 entfallen'
		);
	});
});

describe('refusalSentence', () => {
	it('words the refusals of a manual run itself, whatever the backend said', () => {
		// The generic sentence the server-side mapping substitutes for unknown codes.
		const generic = 'Das hat nicht geklappt.';
		expect(refusalSentence({ code: 'ZPA_SYNC_RUNNING', message: generic })).toMatch(
			/^Es läuft schon ein Abgleich/
		);
		expect(refusalSentence({ code: 'ZPA_SYNCED_RECENTLY', message: generic })).toMatch(
			/zehn Minuten Pause/
		);
	});

	it('keeps any other sentence', () => {
		expect(refusalSentence({ code: 'FORBIDDEN', message: 'Nicht erlaubt.' })).toBe(
			'Nicht erlaubt.'
		);
	});
});

describe('describeCatalogue', () => {
	const succeeded = (modulesAdded: number) => ({
		status: 'SUCCEEDED' as const,
		modulesAdded,
		addedModules: []
	});

	it('names the modules that arrived', () => {
		expect(describeCatalogue(succeeded(1))).toBe('1 Modul neu im Katalog');
		expect(describeCatalogue(succeeded(3))).toBe('3 Module neu im Katalog');
	});

	it('claims nothing when none was added', () => {
		// Projections from before the count existed read as zero; "kein Modul neu" would be
		// false for them.
		expect(describeCatalogue(succeeded(0))).toBeNull();
		expect(describeCatalogue(null)).toBeNull();
	});

	it('says when the catalogue is still being built or was not', () => {
		expect(describeCatalogue({ ...succeeded(0), status: 'RUNNING' })).toBe(
			'Katalog wird aufgebaut'
		);
		expect(describeCatalogue({ ...succeeded(0), status: 'FAILED' })).toBe(
			'Katalog nicht aufgebaut'
		);
	});
});

describe('describeRun', () => {
	it('is the 2026-11-18 case: nothing new in the ZPA, a module new in the catalogue', () => {
		expect(
			describeRun({
				appeared: 0,
				changed: 0,
				disappeared: 0,
				projection: { status: 'SUCCEEDED', modulesAdded: 1, addedModules: ['IF · Neu'] }
			})
		).toBe('im ZPA nichts geändert seit dem vorigen Abgleich · 1 Modul neu im Katalog');
	});

	it('is the counts alone without a projection', () => {
		expect(describeRun({ appeared: 2, changed: 0, disappeared: 0, projection: null })).toBe(
			'im ZPA 2 neu'
		);
	});
});

describe('awaitingProjection', () => {
	const finished = '2026-11-18T09:27:10Z';
	const at = (seconds: number) => new Date(new Date(finished).getTime() + seconds * 1000);

	it('waits for the projection of a run that just succeeded', () => {
		const run = { status: 'SUCCEEDED' as const, finishedAt: finished, projection: null };
		expect(awaitingProjection(run, at(1))).toBe(true);
		expect(
			awaitingProjection(
				{ ...run, projection: { status: 'RUNNING', modulesAdded: 0, addedModules: [] } },
				at(1)
			)
		).toBe(true);
	});

	it('stops when it has settled, after the grace, or for a run that does not project', () => {
		const run = { status: 'SUCCEEDED' as const, finishedAt: finished, projection: null };
		expect(
			awaitingProjection(
				{ ...run, projection: { status: 'SUCCEEDED', modulesAdded: 1, addedModules: [] } },
				at(1)
			)
		).toBe(false);
		expect(awaitingProjection(run, at(PROJECTION_GRACE_MS / 1000 + 1))).toBe(false);
		expect(awaitingProjection({ ...run, status: 'PARTIAL' }, at(1))).toBe(false);
		expect(awaitingProjection({ ...run, finishedAt: null }, at(1))).toBe(false);
	});
});

describe('runningRun', () => {
	it('finds the run in progress and nothing else', () => {
		expect(runningRun([{ status: 'SUCCEEDED' as const }])).toBeUndefined();
		const runs = [
			{ status: 'RUNNING' as const, id: 'a' },
			{ status: 'SUCCEEDED' as const, id: 'b' }
		];
		expect(runningRun(runs)?.id).toBe('a');
	});
});

describe('runProgress', () => {
	const startedAt = '2026-10-23T10:00:00Z';

	it('counts the endpoints that are done against all there are', () => {
		const progress = runProgress(
			{ startedAt, kinds: [{ kind: 'SPO' }, { kind: 'BASKET' }] },
			new Date('2026-10-23T10:00:07.900Z')
		);
		expect(progress).toEqual({ done: ['SPOs', 'Kataloge'], total: 5, seconds: 7 });
		expect(describeProgress(progress)).toBe('2 von 5 Quellen übernommen: SPOs, Kataloge.');
	});

	it('says what is happening before the first endpoint is done', () => {
		const progress = runProgress({ startedAt, kinds: [] }, new Date(startedAt));
		expect(progress.seconds).toBe(0);
		expect(describeProgress(progress)).toBe('Die Daten werden beim ZPA angefragt.');
	});

	it('never counts backwards when the clocks disagree', () => {
		expect(runProgress({ startedAt, kinds: [] }, new Date('2026-10-23T09:59:58Z')).seconds).toBe(0);
	});
});
