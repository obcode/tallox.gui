import type { BigCourseReason, BigCourseStatus } from '#lib/gql/__generated__/graphql.ts';
import { studyYearOf } from '#lib/controlling.ts';

/**
 * The big-course overview: the faculty council's rule that whoever teaches a lot over a study year
 * also holds big compulsory or basket courses.
 *
 * Every figure is the backend's — hours, target, actual, status and which courses count. This
 * module only filters, sorts and names them. Whose rows come back is the backend's decision too:
 * the dean's office and the leads read every professor's, everybody else their own.
 */

/** One row in the shape `bigCourseOverview` answers. */
export type BigCourseRowInput = {
	professor: { personId?: string | null; teacherId?: string | null; name: string };
	subjectGroups: readonly { id: string; code: string; name: string }[];
	winterHours: number;
	summerHours: number;
	averageHours: number;
	target: number;
	actual: number;
	status: BigCourseStatus;
	courses: readonly unknown[];
};

export type BigCourseFilter = {
	/** A subject group id, or '' for all. Membership, as on "SWS im Kollegium". */
	group: string;
	/** A status, or '' for all. */
	status: BigCourseStatus | '';
};

export const STATUS_LABELS: Record<BigCourseStatus, string> = {
	FULFILLED: 'erfüllt',
	NOT_FULFILLED: 'nicht erfüllt',
	NOT_APPLICABLE: 'nicht anwendbar'
};

/**
 * The badge of a status. A background colour with its paired foreground, never coloured text —
 * and the word is always there, so the colour is never the only signal.
 */
export function statusBadge(status: BigCourseStatus): string {
	switch (status) {
		case 'FULFILLED':
			return 'badge-success';
		case 'NOT_FULFILLED':
			return 'badge-error';
		default:
			return 'badge-ghost';
	}
}

export const REASON_LABELS: Record<BigCourseReason, string> = {
	BY_HOURS: 'mind. 6 SWS',
	BY_COHORT: 'ganze Kohorte'
};

/** The target in words: "2", "1", or "–" where the rule asks for nothing. */
export function targetLabel(target: number): string {
	return target > 0 ? String(target) : '–';
}

const STATUSES: readonly BigCourseStatus[] = ['FULFILLED', 'NOT_FULFILLED', 'NOT_APPLICABLE'];

export function parseBigCourseFilter(params: URLSearchParams): BigCourseFilter {
	const status = params.get('status') ?? '';
	return {
		group: params.get('fachgruppe') ?? '',
		status: (STATUSES as readonly string[]).includes(status) ? (status as BigCourseStatus) : ''
	};
}

/** The rows of one subject group's members and one status. */
export function filterBigCourses<T extends BigCourseRowInput>(
	rows: readonly T[],
	filter: BigCourseFilter
): T[] {
	return rows.filter(
		(row) =>
			(filter.group === '' || row.subjectGroups.some((g) => g.id === filter.group)) &&
			(filter.status === '' || row.status === filter.status)
	);
}

/** How many rows have each status — over the rows shown, for the line above the table. */
export function statusCounts(rows: readonly BigCourseRowInput[]): Record<BigCourseStatus, number> {
	const counts: Record<BigCourseStatus, number> = {
		FULFILLED: 0,
		NOT_FULFILLED: 0,
		NOT_APPLICABLE: 0
	};
	for (const row of rows) counts[row.status] += 1;
	return counts;
}

/** The order of the status column when sorted: the ones to look at first. */
const STATUS_ORDER: Record<BigCourseStatus, number> = {
	NOT_FULFILLED: 0,
	FULFILLED: 1,
	NOT_APPLICABLE: 2
};

/** The columns a click on a head sorts by. */
export const BIG_COURSE_SORT_KEYS = {
	name: (row: BigCourseRowInput) => row.professor.name,
	groups: (row: BigCourseRowInput) => row.subjectGroups.map((g) => g.code).join(', ') || null,
	average: (row: BigCourseRowInput) => row.averageHours,
	target: (row: BigCourseRowInput) => row.target,
	actual: (row: BigCourseRowInput) => row.actual,
	status: (row: BigCourseRowInput) => STATUS_ORDER[row.status]
} as const;

export type BigCourseSortKey = keyof typeof BIG_COURSE_SORT_KEYS;

/** A stable key for a row: the account, else the examination office's record. */
export function rowKey(row: BigCourseRowInput): string {
	return row.professor.personId ?? row.professor.teacherId ?? row.professor.name;
}

/**
 * The study years to choose from: the one of every semester the backend knows, and the planning
 * one, newest first. The backend refuses a year out of reach; this only offers the known ones.
 */
export function studyYearChoices(codes: readonly string[]): number[] {
	const years = new Set<number>();
	for (const code of codes) {
		const year = studyYearOf(code);
		if (year !== null) years.add(year);
	}
	return [...years].sort((a, b) => b - a);
}

/** The study year in the URL, or null when it is missing or not a year. */
export function parseStudyYear(value: string | null): number | null {
	if (value === null || !/^\d{4}$/.test(value)) return null;
	return Number(value);
}
