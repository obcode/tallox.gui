import { describe, expect, it } from 'vitest';
import { describeCounts, freshness, lastSuccessful, statusBadge } from './zpa';

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
	it('says nothing happened as a sentence', () => {
		// The ordinary outcome, and three zeroes would read as a fault.
		expect(describeCounts({ appeared: 0, changed: 0, disappeared: 0 })).toBe('keine Änderungen');
	});

	it('names only what is non-zero', () => {
		expect(describeCounts({ appeared: 0, changed: 4, disappeared: 1 })).toBe(
			'4 geändert, 1 entfallen'
		);
	});
});
