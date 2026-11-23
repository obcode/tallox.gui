import { describe, expect, it } from 'vitest';
import {
	BIG_COURSE_SORT_KEYS,
	filterBigCourses,
	parseBigCourseFilter,
	parseStudyYear,
	rowKey,
	statusBadge,
	statusCounts,
	studyYearChoices,
	targetLabel,
	type BigCourseRowInput
} from './bigCourses';
import { sortRows } from './sorting';

function row(over: Partial<BigCourseRowInput> & { name: string }): BigCourseRowInput {
	const { name, ...rest } = over;
	return {
		professor: { personId: `p-${name}`, teacherId: `t-${name}`, name },
		subjectGroups: [],
		winterHours: 0,
		summerHours: 0,
		averageHours: 0,
		target: 0,
		actual: 0,
		status: 'NOT_APPLICABLE',
		courses: [],
		...rest
	};
}

const MATHE = { id: 'g1', code: 'MATHE', name: 'Mathematik' };
const SWE = { id: 'g2', code: 'SWE', name: 'Softwareentwicklung' };

describe('the filter', () => {
	it('reads the subject group and a known status from the address', () => {
		expect(parseBigCourseFilter(new URLSearchParams('fachgruppe=g1&status=FULFILLED'))).toEqual({
			group: 'g1',
			status: 'FULFILLED'
		});
	});

	it('ignores a status it does not know', () => {
		expect(parseBigCourseFilter(new URLSearchParams('status=MAYBE')).status).toBe('');
	});

	it('keeps the members of a group with the status asked for', () => {
		const rows = [
			row({ name: 'Eins', subjectGroups: [MATHE], status: 'FULFILLED' }),
			row({ name: 'Zwei', subjectGroups: [MATHE, SWE], status: 'NOT_FULFILLED' }),
			row({ name: 'Drei', subjectGroups: [SWE], status: 'FULFILLED' })
		];
		const names = (f: Parameters<typeof filterBigCourses>[1]) =>
			filterBigCourses(rows, f).map((r) => r.professor.name);
		expect(names({ group: '', status: '' })).toEqual(['Eins', 'Zwei', 'Drei']);
		expect(names({ group: 'g1', status: '' })).toEqual(['Eins', 'Zwei']);
		expect(names({ group: 'g2', status: 'FULFILLED' })).toEqual(['Drei']);
	});
});

describe('the figures', () => {
	it('counts the statuses of the rows shown', () => {
		expect(
			statusCounts([
				row({ name: 'a', status: 'FULFILLED' }),
				row({ name: 'b', status: 'NOT_FULFILLED' }),
				row({ name: 'c', status: 'NOT_FULFILLED' })
			])
		).toEqual({ FULFILLED: 1, NOT_FULFILLED: 2, NOT_APPLICABLE: 0 });
	});

	it('says no target as a dash rather than a zero', () => {
		expect(targetLabel(0)).toBe('–');
		expect(targetLabel(2)).toBe('2');
	});

	it('marks a status by a background colour, never only by text colour', () => {
		expect(statusBadge('FULFILLED')).toBe('badge-success');
		expect(statusBadge('NOT_FULFILLED')).toBe('badge-error');
		expect(statusBadge('NOT_APPLICABLE')).toBe('badge-ghost');
	});

	it('sorts the unmet targets first by status', () => {
		const rows = [
			row({ name: 'a', status: 'NOT_APPLICABLE' }),
			row({ name: 'b', status: 'FULFILLED' }),
			row({ name: 'c', status: 'NOT_FULFILLED' })
		];
		expect(
			sortRows(rows, { key: 'status', dir: 'asc' }, BIG_COURSE_SORT_KEYS).map(
				(r) => r.professor.name
			)
		).toEqual(['c', 'b', 'a']);
	});

	it('keys a professor without an account by the teacher record', () => {
		expect(
			rowKey(row({ name: 'x', professor: { personId: null, teacherId: 't9', name: 'x' } }))
		).toBe('t9');
	});
});

describe('the study year', () => {
	it('offers the year of every semester once, newest first', () => {
		expect(studyYearChoices(['2026-WS', '2027-SS', '2026-SS', 'nonsense'])).toEqual([2026, 2025]);
	});

	it('reads only a four-digit year from the address', () => {
		expect(parseStudyYear('2026')).toBe(2026);
		expect(parseStudyYear('26')).toBeNull();
		expect(parseStudyYear('2026; DROP')).toBeNull();
		expect(parseStudyYear(null)).toBeNull();
	});
});
