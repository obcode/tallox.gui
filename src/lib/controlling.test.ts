import { describe, expect, it } from 'vitest';
import {
	balanceBadge,
	controllingTable,
	deltaLabel,
	importGroups,
	quotaTable,
	semesterQuotaRule,
	studyYearLabel,
	studyYearSemesters,
	studyYearTable,
	studyYearOf,
	type ImportInput,
	type LoadInput
} from './controlling';

function load(code: string, hours: number, own: number, extra: Partial<LoadInput> = {}): LoadInput {
	return {
		homeProgramme: { code, title: '', planningStatus: 'PLANNED' },
		teachingHours: hours,
		ownHours: own,
		instanceCount: 1,
		fwpInstanceCount: 0,
		fwpHours: 0,
		partsWithoutHours: 0,
		shares: [],
		...extra
	};
}

describe('the SWS controlling table', () => {
	// The export is what is taught outside the home programme. The backend sends the split; the
	// row names the other programmes and leaves the home programme's own share out of that list.
	it('lists what a programme lends, and not what it teaches itself', () => {
		const { planned } = controllingTable(
			[
				load('IF', 12, 8, {
					shares: [
						{ programme: { code: 'IF', title: '' }, teachingHours: 8, instanceCount: 2 },
						{ programme: { code: 'IG', title: '' }, teachingHours: 4, instanceCount: 1 }
					]
				})
			],
			null
		);
		expect(planned[0].lentHours).toBe(4);
		expect(planned[0].lent.map((s) => s.code)).toEqual(['IG']);
	});

	// A year earlier is the figure a programme lead plans the electives against while there is no
	// target, so a programme missing there compares against zero — but only when the earlier
	// semester could be read at all.
	it('compares with the same semester a year earlier', () => {
		const { planned, total } = controllingTable(
			[load('IF', 12, 12), load('IG', 6, 6)],
			[load('IF', 10, 10)]
		);
		expect(planned.map((r) => [r.programme.code, r.previousHours, r.delta])).toEqual([
			['IF', 10, 2],
			['IG', 0, 6]
		]);
		expect(total.previousHours).toBe(10);
		expect(total.delta).toBe(8);
	});

	it('says nothing about a year it could not read', () => {
		const { planned, total } = controllingTable([load('IF', 12, 12)], null);
		expect(planned[0].previousHours).toBeNull();
		expect(planned[0].delta).toBeNull();
		expect(total.delta).toBeNull();
	});

	// The faculty's own programmes are the table; another faculty's are a footnote. Both count in
	// the total, because the total is what the faculty spends.
	it('keeps the programmes the faculty does not plan apart, and in the total', () => {
		const other = load('XX', 3, 0);
		other.homeProgramme.planningStatus = 'NOT_OURS';
		const { planned, others, total } = controllingTable(
			[load('IG', 6, 6), other, load('IF', 12, 12)],
			null
		);
		expect(planned.map((r) => r.programme.code)).toEqual(['IF', 'IG']);
		expect(others.map((r) => r.programme.code)).toEqual(['XX']);
		expect(total.teachingHours).toBe(21);
		expect(total.lentHours).toBe(3);
	});

	it('writes a difference with its sign', () => {
		const f = (n: number) => String(n);
		expect(deltaLabel(null, f)).toBe('–');
		expect(deltaLabel(0, f)).toBe('±0');
		expect(deltaLabel(2.5, f)).toBe('+2.5');
		expect(deltaLabel(-4, f)).toBe('−4');
	});
});

describe('the quota table', () => {
	// A planned programme without a quota is the row somebody still has to fill in, so it stays —
	// with no figure, not with zero, which would read as a programme with nothing to spend.
	it('keeps a planned programme without a quota, with no figure', () => {
		const rows = quotaTable([
			load('IG', 40, 40),
			load('IF', 200, 180, { yearlyQuota: 425, semesterQuota: 212.5, balance: 12.5 })
		]);
		expect(rows.map((r) => r.programme.code)).toEqual(['IF', 'IG']);
		expect(rows[0].balance).toBe(12.5);
		expect(rows[1].yearlyQuota).toBeNull();
		expect(rows[1].balance).toBeNull();
	});

	// A programme the faculty does not plan only lends modules; it has a row only when somebody
	// entered a quota for it anyway.
	it('leaves out a programme the faculty does not plan unless it has a quota', () => {
		const other = (code: string, extra: Partial<LoadInput> = {}) =>
			load(code, 4, 0, {
				homeProgramme: { code, title: '', planningStatus: 'NOT_OURS' },
				...extra
			});
		const rows = quotaTable([other('XA'), other('XB', { yearlyQuota: 0, balance: -4 })]);
		expect(rows.map((r) => r.programme.code)).toEqual(['XB']);
	});

	// Negative is the one state on the page that asks for a conversation.
	it('colours a negative balance as an error and nothing as nothing', () => {
		expect(balanceBadge(-0.5)).toContain('badge-error');
		expect(balanceBadge(0)).toContain('badge-success');
		expect(balanceBadge(3)).toContain('badge-success');
		expect(balanceBadge(null)).toContain('badge-ghost');
	});
});

describe('the imports of a programme', () => {
	function instance(home: string, hours: number, name: string): ImportInput {
		return {
			id: `${home}-${name}`,
			track: '',
			teachingHours: hours,
			module: { name, kind: 'MODULE', homeProgramme: { code: home, title: '' } }
		};
	}

	it('groups by home programme and sums the hours of each', () => {
		const groups = importGroups([
			instance('WT', 4, 'Eins'),
			instance('IF', 6, 'Zwei'),
			instance('WT', 0, 'Drei')
		]);
		expect(groups.map((g) => g.home.code)).toEqual(['IF', 'WT']);
		expect(groups[1].instances).toHaveLength(2);
		expect(groups[1].teachingHours).toBe(4);
	});
});

describe('the study year', () => {
	// The summer belongs to the winter before it: the quota is stated for October to September.
	it('is named after the year its winter starts in', () => {
		expect(studyYearOf('2026-WS')).toBe(2026);
		expect(studyYearOf('2027-SS')).toBe(2026);
		expect(studyYearOf('Sommer 27')).toBeNull();
		expect(studyYearLabel(2026)).toBe('2026/27');
		expect(studyYearLabel(2099)).toBe('2099/00');
	});
});

describe('the study-year table', () => {
	const row = (code: string, status = 'PLANNED', extra = {}) => ({
		homeProgramme: { code, title: '', planningStatus: status },
		winterHours: 100,
		summerHours: 50,
		partsWithoutHours: 0,
		...extra
	});

	it('lists the planned programmes and the others with a quota, marked when reviewed', () => {
		const rows = studyYearTable(
			[
				row('IG'),
				row('XA', 'NOT_OURS'),
				row('IF', 'PLANNED', { yearlyQuota: 425, remaining: 275 }),
				row('XB', 'NOT_OURS', { yearlyQuota: 10, remaining: -140 })
			],
			new Set(['IF'])
		);
		expect(rows.map((r) => r.programme.code)).toEqual(['IF', 'IG', 'XB']);
		expect(rows[0]).toMatchObject({ remaining: 275, reviewed: true });
		expect(rows[1]).toMatchObject({ yearlyQuota: null, remaining: null, reviewed: false });
	});

	it('names the two semesters of a study year and the rule each is held to', () => {
		expect(studyYearSemesters(2026)).toEqual({ winter: '2026-WS', summer: '2027-SS' });
		expect(semesterQuotaRule('2026-WS')).toMatch(/Hälfte/);
		expect(semesterQuotaRule('2027-SS')).toMatch(/übrig/);
	});
});
