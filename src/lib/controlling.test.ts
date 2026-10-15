import { describe, expect, it } from 'vitest';
import { controllingTable, deltaLabel, type LoadInput } from './controlling';

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
