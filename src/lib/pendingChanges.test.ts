import { describe, expect, it } from 'vitest';
import { PendingChanges, serializeFields, waitUntil } from './pendingChanges';

const noSleep = () => Promise.resolve();

describe('serializeFields', () => {
	it('keeps order and repeated names, and escapes what would collide', () => {
		expect(
			serializeFields([
				['id', 'g1'],
				['personId', 'a'],
				['personId', 'b&c=d']
			])
		).toBe('id=g1&personId=a&personId=b%26c%3Dd');
	});

	it('tells an unticked box from a ticked one', () => {
		expect(serializeFields([['id', 'g1']])).not.toBe(
			serializeFields([
				['id', 'g1'],
				['subjectGroupId', 'x']
			])
		);
	});
});

describe('waitUntil', () => {
	it('returns at once when the condition already holds', async () => {
		expect(await waitUntil(() => true, { sleep: noSleep })).toBe(true);
	});

	it('gives up after the timeout', async () => {
		expect(await waitUntil(() => false, { timeoutMs: 100, intervalMs: 50, sleep: noSleep })).toBe(
			false
		);
	});

	it('returns once the condition starts to hold', async () => {
		let calls = 0;
		expect(await waitUntil(() => ++calls === 3, { sleep: noSleep })).toBe(true);
		expect(calls).toBe(3);
	});
});

describe('PendingChanges — a form that asks', () => {
	it('is not dirty before anybody touched it', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'ask', baseline: 'a=' });
		expect(p.askDirty(() => 'a=x')).toEqual([]);
	});

	it('is dirty once touched and different from where it started', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'ask', label: 'Neues Token', baseline: 'a=' });
		p.touch('f');
		expect(p.askDirty(() => 'a=x').map((e) => e.label)).toEqual(['Neues Token']);
	});

	it('is not dirty when the typing was undone', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'ask', baseline: 'a=' });
		p.touch('f');
		expect(p.askDirty(() => 'a=')).toEqual([]);
	});

	it('is clean after a successful save, against the state the save left behind', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'ask', baseline: 'h=' });
		p.touch('f');
		p.beginSubmit('f');
		p.endSubmit('f', true, 'h=2');
		expect(p.isDirty('f', 'h=2')).toBe(false);
		// And the next edit is measured against the saved state, not the first render.
		p.touch('f');
		expect(p.isDirty('f', 'h=')).toBe(true);
	});

	it('stays dirty after a refusal — what was refused is still only in the browser', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'ask', baseline: 'a=' });
		p.touch('f');
		p.beginSubmit('f');
		p.endSubmit('f', false, 'a=x');
		expect(p.isDirty('f', 'a=x')).toBe(true);
		expect(p.anyFailed()).toBe(true);
	});

	it('is forgotten when the form goes away', () => {
		const p = new PendingChanges<string>();
		const unregister = p.register('f', { mode: 'ask', baseline: '' });
		p.touch('f');
		unregister();
		expect(p.askDirty(() => 'x')).toEqual([]);
		expect(p.get('f')).toBeUndefined();
	});
});

describe('PendingChanges — a form that saves itself', () => {
	it('is pending while a save is on the wire', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'auto' });
		p.beginSubmit('f');
		expect(p.autoPending()).toHaveLength(1);
		p.endSubmit('f', true, '');
		expect(p.autoPending()).toHaveLength(0);
	});

	it('is pending while it holds something back, and flushes it', () => {
		const p = new PendingChanges<string>();
		let waiting = true;
		let flushed = 0;
		p.register('f', {
			mode: 'auto',
			waiting: () => waiting,
			flush: () => {
				flushed++;
				waiting = false;
			}
		});
		expect(p.autoPending()).toHaveLength(1);
		p.flushAuto();
		expect(flushed).toBe(1);
		expect(p.autoPending()).toHaveLength(0);
	});

	it('does not flush a form whose save is still on the wire', () => {
		const p = new PendingChanges<string>();
		let flushed = 0;
		p.register('f', { mode: 'auto', waiting: () => true, flush: () => flushed++ });
		p.beginSubmit('f');
		p.flushAuto();
		expect(flushed).toBe(0);
	});

	it('never counts towards the dialog', () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'auto', baseline: '' });
		p.touch('f');
		expect(p.askDirty(() => 'x')).toEqual([]);
	});
});

describe('PendingChanges.settle', () => {
	it('sends what is held back and waits until it has arrived', async () => {
		const p = new PendingChanges<string>();
		let waiting = true;
		p.register('f', {
			mode: 'auto',
			waiting: () => waiting,
			flush: () => {
				waiting = false;
				p.beginSubmit('f');
				// The answer comes back a little later.
				queueMicrotask(() => p.endSubmit('f', true, ''));
			}
		});
		expect(await p.settle({ sleep: noSleep })).toBe(true);
		expect(p.autoPending()).toHaveLength(0);
	});

	it('also waits for a save queued behind the first', async () => {
		const p = new PendingChanges<string>();
		let queued = true;
		let sent = 0;
		p.register('f', {
			mode: 'auto',
			waiting: () => queued,
			flush: () => {
				sent++;
				queued = false;
			}
		});
		p.beginSubmit('f');
		const settled = p.settle({ sleep: noSleep });
		// The first answer arrives; the queued change goes out after it.
		p.endSubmit('f', true, '');
		expect(await settled).toBe(true);
		expect(sent).toBe(1);
	});

	it('reports a refusal, and retries it once rather than forever', async () => {
		const p = new PendingChanges<string>();
		let sent = 0;
		p.register('f', {
			mode: 'auto',
			flush: () => {
				sent++;
				p.beginSubmit('f');
				p.endSubmit('f', false);
			}
		});
		// Refused earlier: counts as touched, so leaving tries once more.
		p.beginSubmit('f');
		p.endSubmit('f', false);
		expect(await p.settle({ sleep: noSleep })).toBe(false);
		expect(sent).toBe(1);
	});

	it('gives up when nothing arrives', async () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'auto' });
		p.beginSubmit('f');
		expect(await p.settle({ timeoutMs: 100, intervalMs: 50, sleep: noSleep })).toBe(false);
	});

	it('waits for an explicit form that was just sent from the dialog', async () => {
		const p = new PendingChanges<string>();
		p.register('f', { mode: 'ask' });
		p.beginSubmit('f');
		let polls = 0;
		const settled = p.settle({
			sleep: () => {
				if (++polls === 2) p.endSubmit('f', true, '');
				return Promise.resolve();
			}
		});
		expect(await settled).toBe(true);
		expect(polls).toBeGreaterThanOrEqual(2);
	});
});
