import { describe, expect, it } from 'vitest';
import {
	DEFAULT_WINDOW_DAYS,
	DOOR_LABELS,
	OUTCOME_HINTS,
	OUTCOME_LABELS,
	asked,
	duration,
	isNotable,
	outcomeBadge,
	who,
	windowDays,
	withParam
} from './access';

describe('labels', () => {
	it('covers every door and every outcome', () => {
		// The compiler already requires this through Record<…>; the test is here because the
		// enums come from codegen, so a new backend value arrives as a type error in CI and as a
		// missing label at runtime — and this is the assertion that names it.
		expect(Object.keys(DOOR_LABELS)).toHaveLength(2);
		expect(Object.keys(OUTCOME_LABELS)).toHaveLength(5);
		expect(Object.keys(OUTCOME_HINTS)).toHaveLength(5);
	});

	it('keeps the three refusals apart', () => {
		// They need three different actions from whoever reads them: an account, a new token, a
		// browser. One shared word would send the reader down the wrong path twice out of three.
		const refusals = [
			OUTCOME_LABELS.REFUSED_AUTH,
			OUTCOME_LABELS.REFUSED_SCOPE,
			OUTCOME_LABELS.REFUSED_INTERACTIVE
		];
		expect(new Set(refusals).size).toBe(3);
	});
});

describe('outcomeBadge', () => {
	it('marks an error as an error and a refusal as a warning', () => {
		expect(outcomeBadge('ERROR')).toBe('badge-error');
		expect(outcomeBadge('REFUSED_AUTH')).toBe('badge-warning');
		expect(outcomeBadge('REFUSED_SCOPE')).toBe('badge-warning');
	});

	it('leaves an ordinary operation unmarked', () => {
		expect(outcomeBadge('OK')).toBe('badge-ghost');
	});
});

describe('isNotable', () => {
	it('counts an error, not only a refusal', () => {
		// A filter that hid errors would be a filter that lies about what it shows.
		expect(isNotable('ERROR')).toBe(true);
		expect(isNotable('REFUSED_INTERACTIVE')).toBe(true);
		expect(isNotable('OK')).toBe(false);
	});
});

describe('who', () => {
	it('prefers the address, falls back to the token, and says so when there is neither', () => {
		expect(who('prof.eins@example.org', null)).toBe('prof.eins@example.org');
		expect(who('', 'AAAAAAAAAAAAAAAA')).toBe('Token AAAAAAAAAAAAAAAA');
		expect(who(null, null)).toBe('kein Credential lesbar');
	});
});

describe('asked', () => {
	it('names the root fields, with the client-supplied operation in front when there is one', () => {
		expect(asked('Semesterliste', ['semesters'])).toBe('Semesterliste: semesters');
		expect(asked(null, ['me', 'semesters'])).toBe('me, semesters');
	});

	it('has something to say about a refusal, which reached no field at all', () => {
		expect(asked(null, [])).toBe('—');
	});
});

describe('duration', () => {
	it('reads in milliseconds below a second and in seconds above', () => {
		expect(duration(7)).toBe('7 ms');
		expect(duration(1500)).toBe('1.5 s');
	});

	it('says nothing for an entry that never ran', () => {
		// A refused sign-in has no duration: it was turned away before there was anything to time.
		expect(duration(null)).toBe('—');
	});
});

describe('windowDays', () => {
	it('accepts the windows the page offers', () => {
		expect(windowDays('7')).toBe(7);
		expect(windowDays('90')).toBe(90);
	});

	it('falls back for anything else, including a window beyond the retention period', () => {
		// 365 days of entries do not exist — the nightly run deletes after 90 — so offering it
		// would be a filter that silently returns less than it promises.
		expect(windowDays('365')).toBe(DEFAULT_WINDOW_DAYS);
		expect(windowDays('katze')).toBe(DEFAULT_WINDOW_DAYS);
		expect(windowDays(null)).toBe(DEFAULT_WINDOW_DAYS);
	});
});

describe('withParam', () => {
	const none = { days: 1, mail: '', door: '', only: '' };

	it('leaves defaults out, so an unfiltered link carries nothing', () => {
		expect(withParam(none, 'weiter', 'abc')).toBe('?weiter=abc');
	});

	it('keeps every filter that is set while changing one', () => {
		// The failure this guards against does not look like a bug: a lost filter looks like a
		// page that found fewer entries.
		const params = new URLSearchParams(
			withParam({ days: 7, mail: 'eins@', door: 'TOKEN', only: 'auffaellig' }, 'weiter', 'abc')
		);
		expect(params.get('zeitraum')).toBe('7');
		expect(params.get('person')).toBe('eins@');
		expect(params.get('tuer')).toBe('TOKEN');
		expect(params.get('nur')).toBe('auffaellig');
		expect(params.get('weiter')).toBe('abc');
	});

	it('drops a parameter set to the empty string', () => {
		expect(withParam({ ...none, door: 'TOKEN' }, 'tuer', '')).toBe('');
	});
});
