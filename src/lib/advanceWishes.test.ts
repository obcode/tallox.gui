import { describe, expect, it } from 'vitest';
import {
	ADVANCE_STATUS_LABELS,
	advanceStatusBadge,
	advanceBySemester,
	advanceLevelLabel,
	advanceSemesters,
	advanceStatusHint,
	maxTracksLabel,
	nextSemester,
	notOfferedNotice,
	parseAdvanceForm,
	semesterAt,
	type AdvanceWishLike
} from './advanceWishes';

const row = (over: Partial<AdvanceWishLike> = {}): AdvanceWishLike => ({
	id: '1',
	semester: '2028-SS',
	status: 'PENDING',
	programme: { code: 'IF' },
	module: { id: 'm', name: 'Analysis' },
	...over
});

describe('semesterAt', () => {
	it('puts March to August in the summer', () => {
		expect(semesterAt(new Date(2026, 2, 1))).toBe('2026-SS');
		expect(semesterAt(new Date(2026, 7, 31))).toBe('2026-SS');
	});

	it('puts January and February in the winter that began the year before', () => {
		expect(semesterAt(new Date(2026, 8, 1))).toBe('2026-WS');
		expect(semesterAt(new Date(2027, 1, 28))).toBe('2026-WS');
	});
});

describe('nextSemester', () => {
	it('alternates and moves the year after the winter', () => {
		expect(nextSemester('2026-SS')).toBe('2026-WS');
		expect(nextSemester('2026-WS')).toBe('2027-SS');
	});

	it('passes an unknown code through', () => {
		expect(nextSemester('irgendwas')).toBe('irgendwas');
	});
});

describe('advanceSemesters', () => {
	it('starts after the current semester and reaches four years ahead', () => {
		const list = advanceSemesters(new Date(2026, 10, 1));
		expect(list[0]).toBe('2027-SS');
		expect(list).toHaveLength(8);
		expect(list.at(-1)).toBe('2030-WS');
	});
});

describe('advanceBySemester', () => {
	it('groups in calendar order and sorts by module within', () => {
		const groups = advanceBySemester([
			row({ id: 'a', semester: '2029-SS', module: { id: 'x', name: 'Zeta' } }),
			row({ id: 'b', semester: '2028-WS', module: { id: 'y', name: 'Beta' } }),
			row({ id: 'c', semester: '2029-SS', module: { id: 'z', name: 'Alpha' } })
		]);
		expect(groups.map((g) => g.semester)).toEqual(['2028-WS', '2029-SS']);
		expect(groups[1].rows.map((r) => r.id)).toEqual(['c', 'a']);
		expect(groups[0].name).toBe('Wintersemester 2028/29');
	});
});

describe('notOfferedNotice', () => {
	it('is null without a row the release left out', () => {
		expect(notOfferedNotice([row(), row({ status: 'CONVERTED' })])).toBeNull();
	});

	it('names the module, programme and semester', () => {
		expect(notOfferedNotice([row({ status: 'NOT_OFFERED' })])).toBe(
			'Nicht im Bedarf: Analysis (IF, Sommersemester 2028). Der freigegebene Bedarf enthält dieses Modul nicht.'
		);
	});

	it('lists several in calendar order', () => {
		const text = notOfferedNotice([
			row({ status: 'NOT_OFFERED', semester: '2029-SS', module: { id: 'b', name: 'Beta' } }),
			row({ status: 'NOT_OFFERED', semester: '2028-WS', module: { id: 'a', name: 'Alpha' } })
		]);
		expect(text).toContain('Alpha (IF, Wintersemester 2028/29) und Beta (IF, Sommersemester 2029)');
		expect(text).toContain('enthalten diese Module nicht');
	});
});

describe('advanceStatusHint', () => {
	it('says what each state means', () => {
		expect(advanceStatusHint('PENDING', 'IF')).toContain('Studiengangsleitung von IF');
		expect(advanceStatusHint('CONVERTED', 'IF')).toContain('Wunsch');
		expect(advanceStatusHint('NOT_OFFERED', 'IF')).toContain('enthält dieses Modul nicht');
	});

	// The status of one noted down after the release, too: the hint must not claim a release
	// "without offering it" happened after the note, and must say the lead sees it.
	it('reads true for one noted down after the release', () => {
		const hint = advanceStatusHint('NOT_OFFERED', 'IF');
		expect(hint).toContain('Studiengangsleitung sieht Deine Vormerkung');
		expect(hint).toContain('wird sie zum Wunsch');
		expect(ADVANCE_STATUS_LABELS.NOT_OFFERED).toBe('nicht im Bedarf');
	});
});

describe('parseAdvanceForm', () => {
	const form = (entries: Record<string, string>) => {
		const f = new FormData();
		for (const [k, v] of Object.entries(entries)) f.set(k, v);
		return f;
	};
	const complete = {
		semester: '2028-SS',
		programme: 'IF',
		module: 'm1',
		priority: 'HAPPY_TO',
		note: '  nur die Vorlesung ',
		maxTracks: ''
	};

	it('reads a complete form', () => {
		const parsed = parseAdvanceForm(form(complete));
		expect(parsed).toEqual({
			ok: true,
			value: {
				semester: '2028-SS',
				programme: 'IF',
				module: 'm1',
				priority: 'HAPPY_TO',
				note: 'nur die Vorlesung',
				maxTracks: null
			}
		});
	});

	it('takes a bound from one to nine', () => {
		const parsed = parseAdvanceForm(form({ ...complete, maxTracks: '1' }));
		expect(parsed.ok && parsed.value.maxTracks).toBe(1);
		expect(parseAdvanceForm(form({ ...complete, maxTracks: '0' })).ok).toBe(false);
	});

	it('names what is missing', () => {
		expect(parseAdvanceForm(form({ ...complete, semester: '' }))).toEqual({
			ok: false,
			message: 'Bitte ein Semester wählen.'
		});
		expect(parseAdvanceForm(form({ ...complete, module: '' }))).toMatchObject({ ok: false });
		expect(parseAdvanceForm(form({ ...complete, priority: 'SOFORT' }))).toMatchObject({
			ok: false
		});
	});
});

describe('maxTracksLabel', () => {
	it('spells one out and is empty without a bound', () => {
		expect(maxTracksLabel(1)).toBe('höchstens einen Zug');
		expect(maxTracksLabel(2)).toBe('höchstens 2 Züge');
		expect(maxTracksLabel(null)).toBe('');
	});
});

describe('advanceLevelLabel', () => {
	it('joins level and bound with a spaced dot', () => {
		expect(advanceLevelLabel('FIRST_CHOICE', 1)).toBe('unbedingt · höchstens einen Zug');
		expect(advanceLevelLabel('HAPPY_TO', null)).toBe('gerne');
	});
});

describe('advanceStatusBadge', () => {
	it('lets a wrapped label grow the badge instead of spilling out of it', () => {
		for (const status of ['PENDING', 'CONVERTED', 'NOT_OFFERED'] as const) {
			expect(advanceStatusBadge(status)).toContain('h-auto');
		}
	});
});
