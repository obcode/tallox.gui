import { describe, expect, it } from 'vitest';
import { assignmentOverview, type OverviewInstance } from './assignmentOverview';

function instance(
	id: string,
	programme: string,
	module: string,
	track: string,
	parts: OverviewInstance['parts']
): OverviewInstance {
	return {
		id,
		track,
		programmeSemester: 2,
		programme: { code: programme, title: '' },
		module: { id: module, name: module },
		parts
	};
}

describe('the assignment overview', () => {
	it('gathers programme, module and cohort, and names who holds each part', () => {
		const overview = assignmentOverview(
			[
				instance('i2', 'IF', 'Betriebssysteme', 'B', [{ id: 'p3', kind: 'LECTURE' }]),
				instance('i1', 'IF', 'Betriebssysteme', 'A', [
					{ id: 'p1', kind: 'LECTURE' },
					{ id: 'p2', kind: 'LAB' }
				]),
				instance('i3', 'DC', 'Analysis', '', [{ id: 'p4', kind: 'LECTURE' }])
			],
			[
				{ part: { id: 'p1' }, assignee: { name: 'Prof. Eins' } },
				{ part: { id: 'p4' }, assignee: { name: 'Prof. Zwei' } }
			]
		);
		expect(overview.map((p) => p.code)).toEqual(['DC', 'IF']);
		const os = overview[1].modules[0];
		expect(os.cohorts.map((c) => c.label)).toEqual(['IF2A', 'IF2B']);
		expect(os.cohorts[0].rows.map((r) => r.assignee)).toEqual(['Prof. Eins', null]);
	});

	// A part another faculty teaches says so rather than reading as a gap.
	it('keeps the other faculty of a part taught elsewhere', () => {
		const [p] = assignmentOverview(
			[instance('i', 'IF', 'M', '', [{ id: 'x', kind: 'LAB', taughtBy: 'FK 04' }])],
			[]
		);
		expect(p.modules[0].cohorts[0].rows[0]).toMatchObject({ assignee: null, taughtBy: 'FK 04' });
	});

	// A covered cohort has no parts of its own; it says where its teaching is.
	it('names the cohort a covered one is held with', () => {
		const covered: OverviewInstance = {
			...instance('i', 'IG', 'M', '', []),
			coveredBy: {
				acceptedAt: '2026-10-01T00:00:00Z',
				instance: { track: 'A', programmeSemester: 2, programme: { code: 'IF' } }
			}
		};
		const [p] = assignmentOverview([covered], []);
		expect(p.modules[0].cohorts[0].heldWith).toBe('IF2A');
	});

	// Within each programme, by first basket and then name, modules without a basket last.
	it('sorts the modules of a programme by basket where asked', () => {
		const withBaskets = (id: string, module: string, baskets: string[]): OverviewInstance => ({
			...instance(id, 'IG', module, '', [{ id: `${id}-p`, kind: 'LECTURE' }]),
			baskets
		});
		const instances = [
			withBaskets('a', 'Analysis', ['Wahlpflicht B']),
			withBaskets('b', 'Betriebssysteme', []),
			withBaskets('c', 'Compilerbau', ['Wahlpflicht A'])
		];
		const names = (order: 'name' | 'basket') =>
			assignmentOverview(instances, [], order)[0].modules.map((m) => m.name);
		expect(names('name')).toEqual(['Analysis', 'Betriebssysteme', 'Compilerbau']);
		expect(names('basket')).toEqual(['Compilerbau', 'Analysis', 'Betriebssysteme']);
	});
});
