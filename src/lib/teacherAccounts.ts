/**
 * The admission screen's list: the people the examination office publishes, and the account
 * each of them has here.
 *
 * Svelte-free on purpose. The filtering is the whole screen, and it runs twice — in the server
 * load so that the first render is already narrowed and the page works without JavaScript, and
 * in the browser so that a click on a filter costs nothing. Two copies of that logic would
 * disagree the first time somebody changed one; this is the one copy, and vitest checks it.
 *
 * The backend deliberately offers no filter arguments: it is a few hundred rows behind an
 * administrator's login, and which of them anybody wants to see is a question for the screen.
 */

/** One row: somebody who teaches, and their account here if they have one. */
export type TeacherAccountRow = {
	teacher: {
		id: string;
		name: string;
		sortName: string;
		mail?: string | null;
		isProfessor: boolean;
		isLecturerOnContract: boolean;
		isHonoraryProfessor: boolean;
		isStaff: boolean;
		active: boolean;
		faculty?: string | null;
		lastSemester?: string | null;
	};
	account?: {
		id: string;
		mail: string;
		active: boolean;
		roles: readonly string[];
		programmes: readonly { code: string }[];
	} | null;
};

/**
 * What the examination office says about somebody's employment. Not exclusive: the same person
 * can be staff and hold an honorary professorship, which is why the source has four booleans
 * and not one enum.
 */
export type Employment = 'PROFESSOR' | 'LECTURER_ON_CONTRACT' | 'HONORARY_PROFESSOR' | 'STAFF';

export const EMPLOYMENTS: readonly Employment[] = [
	'PROFESSOR',
	'LECTURER_ON_CONTRACT',
	'HONORARY_PROFESSOR',
	'STAFF'
];

export const EMPLOYMENT_LABELS: Record<Employment, string> = {
	PROFESSOR: 'Professur',
	LECTURER_ON_CONTRACT: 'Lehrbeauftragt',
	HONORARY_PROFESSOR: 'Honorarprofessur',
	STAFF: 'Mitarbeitend'
};

/**
 * The three states an account can be in, and they are three and not two.
 *
 * NONE has never been admitted; INACTIVE was admitted and had it taken away. They look alike in
 * a list and are not: the first is a decision nobody has made yet, the second is one somebody
 * made. Their next steps differ, and so do the questions they raise.
 */
export type AccountState = 'NONE' | 'ACTIVE' | 'INACTIVE';

export const ACCOUNT_STATES: readonly AccountState[] = ['NONE', 'ACTIVE', 'INACTIVE'];

export const ACCOUNT_STATE_LABELS: Record<AccountState, string> = {
	NONE: 'kein Konto',
	ACTIVE: 'Konto aktiv',
	INACTIVE: 'Konto deaktiviert'
};

/** Whether the examination office still lists somebody as teaching. */
export type Teaching = 'ACTIVE' | 'FORMER';

export const TEACHING_STATES: readonly Teaching[] = ['ACTIVE', 'FORMER'];

export const TEACHING_LABELS: Record<Teaching, string> = {
	ACTIVE: 'lehrt',
	FORMER: 'lehrt nicht mehr'
};

/**
 * The value that stands for "the examination office states no faculty".
 *
 * It has to be a value rather than an absence, because more than half of them are in this
 * state — for the real list, 146 of 257 — and a filter that could not name it would hide the
 * larger half of the faculty behind a gap nobody could see.
 */
export const FACULTY_UNKNOWN = 'OHNE';

export const FACULTY_UNKNOWN_LABEL = 'ohne Angabe';

/** What the screen is currently showing. An empty list means "this facet filters nothing". */
export type TeacherFilter = {
	search: string;
	faculty: string[];
	employment: Employment[];
	teaching: Teaching[];
	account: AccountState[];
	roles: string[];
	lastSemester: string[];
};

/**
 * What the screen shows before anybody touches it: the professors of faculty 07 who still
 * teach.
 *
 * That is who this faculty plans with, and it is the list somebody opens this page to work
 * through. Everything else is one click away — and the row above the table says how many rows
 * each part of this default is keeping out, because a pre-filtered list that does not say so is
 * indistinguishable from a short one.
 */
export const DEFAULT_FILTER: TeacherFilter = {
	search: '',
	faculty: ['FK07'],
	employment: ['PROFESSOR'],
	teaching: ['ACTIVE'],
	account: [],
	roles: [],
	lastSemester: []
};

export const EMPTY_FILTER: TeacherFilter = {
	search: '',
	faculty: [],
	employment: [],
	teaching: [],
	account: [],
	roles: [],
	lastSemester: []
};

/** The URL parameter that says the filter in this address was written by somebody. */
export const FILTER_MARKER = 'filter';

/**
 * Read the filter out of a URL.
 *
 * An address with no marker gets the default rather than "everything": arriving here from the
 * menu is the case the default is for. Once the screen has written the filter into the URL the
 * marker is there, and an empty facet then means what it says — this facet filters nothing —
 * so that "show me all faculties" survives a reload.
 */
export function parseTeacherFilter(params: URLSearchParams): TeacherFilter {
	if (!params.has(FILTER_MARKER)) {
		return { ...DEFAULT_FILTER };
	}
	const known = <T extends string>(name: string, allowed: readonly T[]): T[] =>
		params
			.getAll(name)
			.filter((value): value is T => (allowed as readonly string[]).includes(value));

	return {
		search: (params.get('q') ?? '').trim(),
		faculty: params.getAll('fk'),
		employment: known('art', EMPLOYMENTS),
		teaching: known('lehrt', TEACHING_STATES),
		account: known('konto', ACCOUNT_STATES),
		roles: params.getAll('rolle'),
		lastSemester: params.getAll('sem')
	};
}

/** Write the filter into a URL, so that a reload and a shared link show the same rows. */
export function teacherFilterParams(filter: TeacherFilter): URLSearchParams {
	const params = new URLSearchParams();
	params.set(FILTER_MARKER, '1');
	if (filter.search !== '') {
		params.set('q', filter.search);
	}
	const add = (name: string, values: readonly string[]) => {
		for (const value of values) {
			params.append(name, value);
		}
	};
	add('fk', filter.faculty);
	add('art', filter.employment);
	add('lehrt', filter.teaching);
	add('konto', filter.account);
	add('rolle', filter.roles);
	add('sem', filter.lastSemester);
	return params;
}

/** Which of the three states this row's account is in. */
export function accountState(row: TeacherAccountRow): AccountState {
	if (!row.account) {
		return 'NONE';
	}
	return row.account.active ? 'ACTIVE' : 'INACTIVE';
}

/** What the examination office says about this person's employment — none, one or several. */
export function employmentsOf(row: TeacherAccountRow): Employment[] {
	const out: Employment[] = [];
	if (row.teacher.isProfessor) out.push('PROFESSOR');
	if (row.teacher.isLecturerOnContract) out.push('LECTURER_ON_CONTRACT');
	if (row.teacher.isHonoraryProfessor) out.push('HONORARY_PROFESSOR');
	if (row.teacher.isStaff) out.push('STAFF');
	return out;
}

/** The faculty, or the value that stands for "the source states none". */
export function facultyOf(row: TeacherAccountRow): string {
	const faculty = (row.teacher.faculty ?? '').trim();
	return faculty === '' ? FACULTY_UNKNOWN : faculty;
}

/** The roles this row's account holds, empty for a row with no account. */
export function rolesOf(row: TeacherAccountRow): readonly string[] {
	return row.account?.roles ?? [];
}

function matchesSearch(row: TeacherAccountRow, search: string): boolean {
	if (search === '') {
		return true;
	}
	const needle = search.toLowerCase();
	return [row.teacher.name, row.teacher.sortName, row.teacher.mail ?? '']
		.join('\n')
		.toLowerCase()
		.includes(needle);
}

/**
 * Keep the rows this filter describes.
 *
 * Every facet is OR within itself and AND against the others, which is how a reader of such a
 * list expects it: "professors and honorary professors, of faculty 07". An empty facet keeps
 * everything, because a selection can only ever take rows away — the same reading `policy.Narrow`
 * has of an empty set on the backend.
 */
export function filterTeacherAccounts(
	rows: readonly TeacherAccountRow[],
	filter: TeacherFilter
): TeacherAccountRow[] {
	const some = (wanted: readonly string[], have: readonly string[]) =>
		wanted.length === 0 || have.some((value) => wanted.includes(value));

	return rows.filter((row) => {
		if (!matchesSearch(row, filter.search)) return false;
		if (!some(filter.faculty, [facultyOf(row)])) return false;
		if (!some(filter.employment, employmentsOf(row))) return false;
		if (!some(filter.teaching, [row.teacher.active ? 'ACTIVE' : 'FORMER'])) return false;
		if (!some(filter.account, [accountState(row)])) return false;
		if (!some(filter.roles, rolesOf(row))) return false;
		if (!some(filter.lastSemester, [row.teacher.lastSemester ?? ''])) return false;
		return true;
	});
}

/**
 * How many further rows this facet — and only this facet — is keeping out.
 *
 * The sentence over the table. A list pre-filtered to faculty 07 looks exactly like a list of
 * everybody when more than half the entries state no faculty at all, and somebody looking for a
 * colleague who is not in it has no way to tell which of the two they are seeing.
 */
export function hiddenBy(
	rows: readonly TeacherAccountRow[],
	filter: TeacherFilter,
	facet: keyof TeacherFilter
): number {
	const shown = filterTeacherAccounts(rows, filter).length;
	const without = filterTeacherAccounts(rows, {
		...filter,
		[facet]: facet === 'search' ? '' : []
	}).length;
	return without - shown;
}

/** How many rows carry each value of a facet, over the whole list. */
export function facetCounts(
	rows: readonly TeacherAccountRow[],
	of: (row: TeacherAccountRow) => readonly string[]
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const row of rows) {
		for (const value of of(row)) {
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
	}
	return counts;
}

/** The faculties the list actually contains, the "no faculty stated" bucket last. */
export function facultiesIn(rows: readonly TeacherAccountRow[]): string[] {
	const seen = [...new Set(rows.map(facultyOf))];
	return seen
		.filter((faculty) => faculty !== FACULTY_UNKNOWN)
		.sort()
		.concat(seen.includes(FACULTY_UNKNOWN) ? [FACULTY_UNKNOWN] : []);
}

/** The semesters the list mentions, newest first — the codes sort chronologically as text. */
export function semestersIn(rows: readonly TeacherAccountRow[]): string[] {
	return [...new Set(rows.map((row) => row.teacher.lastSemester ?? ''))]
		.filter((code) => code !== '')
		.sort()
		.reverse();
}

/**
 * The set of roles a switch produces, given what somebody holds now.
 *
 * The whole set rather than "add this one", because that is what `setPersonRoles` takes and why
 * it takes it: add-and-remove loses to a race the moment two administrators have the same
 * person open, and the second one's stale view would decide the outcome.
 */
export function rolesAfterToggle(held: readonly string[], role: string, on: boolean): string[] {
	const next = new Set(held);
	if (on) {
		next.add(role);
	} else {
		next.delete(role);
	}
	return [...next];
}

/** The same, for the study programmes a study-programme lead is assigned to. */
export function programmesAfterToggle(
	held: readonly { code: string }[],
	code: string,
	on: boolean
): string[] {
	return rolesAfterToggle(
		held.map((programme) => programme.code),
		code,
		on
	);
}

/** Whether this row can ever be admitted. The address is the whole link between the two lists. */
export function canBeAdmitted(row: TeacherAccountRow): boolean {
	return (row.teacher.mail ?? '').trim() !== '';
}
