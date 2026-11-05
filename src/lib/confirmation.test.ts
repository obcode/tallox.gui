import { describe, expect, it } from 'vitest';
import {
	berlinToday,
	confirmationsByPerson,
	dueIsAhead,
	formatDueDate,
	holderStates,
	mayOfferConfirm,
	shouldRemind,
	type ReminderInput
} from './confirmation';

describe('berlinToday', () => {
	it('takes the day in Berlin, not in UTC', () => {
		// 23:30 UTC on 19 November is already 20 November in Berlin (UTC+1 in winter).
		expect(berlinToday(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-20');
		expect(berlinToday(new Date('2026-11-19T12:00:00Z'))).toBe('2026-11-19');
	});
});

describe('formatDueDate', () => {
	it('writes a date the German way', () => {
		expect(formatDueDate('2026-11-20')).toBe('20.11.2026');
	});
	it('leaves anything else alone', () => {
		expect(formatDueDate('irgendwann')).toBe('irgendwann');
	});
});

describe('dueIsAhead', () => {
	it('counts the due day itself', () => {
		expect(dueIsAhead('2026-11-20', '2026-11-20')).toBe(true);
		expect(dueIsAhead('2026-11-20', '2026-11-21')).toBe(false);
	});
	it('is false without a date', () => {
		expect(dueIsAhead(null, '2026-11-20')).toBe(false);
		expect(dueIsAhead(undefined, '2026-11-20')).toBe(false);
	});
});

describe('shouldRemind', () => {
	const base: ReminderInput = {
		due: '2026-11-20',
		state: 'OPEN',
		holds: true,
		finished: false,
		today: '2026-11-10'
	};

	it('reminds while the date is ahead and nothing is confirmed', () => {
		expect(shouldRemind(base)).toBe(true);
	});
	it('reminds again when a confirmation went out of date', () => {
		expect(shouldRemind({ ...base, state: 'STALE' })).toBe(true);
	});
	it('stops on confirming', () => {
		expect(shouldRemind({ ...base, state: 'CONFIRMED' })).toBe(false);
	});
	it('stops once the date has passed', () => {
		expect(shouldRemind({ ...base, today: '2026-11-21' })).toBe(false);
	});
	it('says nothing while the dean’s office has not asked', () => {
		expect(shouldRemind({ ...base, due: null })).toBe(false);
	});
	it('says nothing to somebody who holds nothing, or in a finished semester', () => {
		expect(shouldRemind({ ...base, holds: false })).toBe(false);
		expect(shouldRemind({ ...base, finished: true })).toBe(false);
	});
});

describe('mayOfferConfirm', () => {
	it('offers the button for open and stale, not for confirmed', () => {
		expect(mayOfferConfirm(true, false, 'OPEN')).toBe(true);
		expect(mayOfferConfirm(true, false, 'STALE')).toBe(true);
		expect(mayOfferConfirm(true, false, 'CONFIRMED')).toBe(false);
	});
	it('does not offer it without assignments or after the semester', () => {
		expect(mayOfferConfirm(false, false, 'OPEN')).toBe(false);
		expect(mayOfferConfirm(true, true, 'OPEN')).toBe(false);
	});
});

describe('holderStates', () => {
	const states = confirmationsByPerson([
		{ personId: 'p1', state: 'CONFIRMED' },
		{ personId: 'p2', state: 'STALE' }
	]);

	it('lists each holder once, in order, with their state', () => {
		const held = [
			{ assignee: { personId: 'p2', name: 'Zwei' } },
			{ assignee: { personId: 'p1', name: 'Eins' } },
			{ assignee: { personId: 'p2', name: 'Zwei' } }
		];
		expect(holderStates(held, states)).toEqual([
			{ personId: 'p2', name: 'Zwei', state: 'STALE' },
			{ personId: 'p1', name: 'Eins', state: 'CONFIRMED' }
		]);
	});

	it('leaves out teachers without an account and anybody the backend did not answer for', () => {
		const held = [
			{ assignee: { personId: null, name: 'Ohne Konto' } },
			{ assignee: { personId: 'p3', name: 'Unbekannt' } }
		];
		expect(holderStates(held, states)).toEqual([]);
	});
});
