import { describe, expect, it } from 'vitest';
import {
	ACCOUNT_STATES,
	ACCOUNT_STATE_LABELS,
	DEFAULT_FILTER,
	EMPLOYMENTS,
	EMPLOYMENT_LABELS,
	EMPTY_FILTER,
	FACULTY_UNKNOWN,
	TEACHING_LABELS,
	TEACHING_STATES,
	accountState,
	canBeAdmitted,
	facetCounts,
	facultiesIn,
	facultyOf,
	filterTeacherAccounts,
	hiddenBy,
	parseTeacherFilter,
	programmesAfterToggle,
	rolesAfterToggle,
	semestersIn,
	teacherFilterParams,
	type TeacherAccountRow
} from './teacherAccounts';

/** A row, with only the parts a test is about spelled out. */
function row(
	name: string,
	teacher: Partial<TeacherAccountRow['teacher']> = {},
	account: TeacherAccountRow['account'] = null
): TeacherAccountRow {
	return {
		teacher: {
			id: name,
			name: `Prof. Dr. ${name}`,
			sortName: `${name}, Prof.`,
			mail: `${name.toLowerCase()}@example.org`,
			isProfessor: true,
			isLecturerOnContract: false,
			isHonoraryProfessor: false,
			isStaff: false,
			active: true,
			faculty: 'FK07',
			lastSemester: '2026-WS',
			...teacher
		},
		account
	};
}

const ACCOUNT = {
	id: 'a1',
	mail: 'eins@example.org',
	active: true,
	roles: ['LECTURER'],
	programmes: [{ code: 'IF' }]
};

describe('labels', () => {
	it('names every value of every facet', () => {
		// A facet whose value has no label renders as PROFESSOR or FORMER, which is not a word
		// to anybody reading a German administration screen.
		for (const value of EMPLOYMENTS) expect(EMPLOYMENT_LABELS[value], value).toBeTruthy();
		for (const value of ACCOUNT_STATES) expect(ACCOUNT_STATE_LABELS[value], value).toBeTruthy();
		for (const value of TEACHING_STATES) expect(TEACHING_LABELS[value], value).toBeTruthy();
	});
});

describe('accountState', () => {
	it('tells never admitted from admitted and withdrawn', () => {
		// The two look alike in a list and are not: one is a decision nobody has made, the other
		// is one somebody made. Collapsing them would offer "admit" for a person whose access
		// was deliberately taken away.
		expect(accountState(row('Eins'))).toBe('NONE');
		expect(accountState(row('Eins', {}, ACCOUNT))).toBe('ACTIVE');
		expect(accountState(row('Eins', {}, { ...ACCOUNT, active: false }))).toBe('INACTIVE');
	});
});

describe('facultyOf', () => {
	it('turns a missing faculty into a value a filter can name', () => {
		// More than half of the real list states no faculty. If that were an absence rather than
		// a value, the pre-filter would hide the larger half behind a gap nobody could see.
		expect(facultyOf(row('Eins', { faculty: null }))).toBe(FACULTY_UNKNOWN);
		expect(facultyOf(row('Eins', { faculty: '  ' }))).toBe(FACULTY_UNKNOWN);
		expect(facultyOf(row('Eins', { faculty: 'FK10' }))).toBe('FK10');
	});
});

describe('filterTeacherAccounts', () => {
	const rows = [
		row('Eins'),
		row('Zwei', { isProfessor: false, isLecturerOnContract: true }),
		row('Drei', { faculty: 'FK10' }),
		row('Vier', { faculty: null }),
		row('Fuenf', { active: false }),
		row('Sechs', {}, ACCOUNT),
		row('Sieben', {}, { ...ACCOUNT, active: false, roles: ['LECTURER', 'ADMIN'] })
	];

	it('keeps everything when nothing is selected', () => {
		// An empty facet can only ever take rows away, so selecting nothing removes nothing —
		// the same reading policy.Narrow has of an empty set on the backend.
		expect(filterTeacherAccounts(rows, EMPTY_FILTER)).toHaveLength(rows.length);
	});

	it('shows the professors of FK07 who still teach, before anybody touches it', () => {
		const shown = filterTeacherAccounts(rows, DEFAULT_FILTER).map((r) => r.teacher.id);
		expect(shown).toEqual(['Eins', 'Sechs', 'Sieben']);
	});

	it('is OR within a facet and AND between facets', () => {
		const shown = filterTeacherAccounts(rows, {
			...EMPTY_FILTER,
			faculty: ['FK07', 'FK10'],
			employment: ['LECTURER_ON_CONTRACT']
		});
		expect(shown.map((r) => r.teacher.id)).toEqual(['Zwei']);
	});

	it('finds the faculty nobody stated', () => {
		expect(
			filterTeacherAccounts(rows, { ...EMPTY_FILTER, faculty: [FACULTY_UNKNOWN] }).map(
				(r) => r.teacher.id
			)
		).toEqual(['Vier']);
	});

	it('filters by the three account states', () => {
		const ids = (state: 'NONE' | 'ACTIVE' | 'INACTIVE') =>
			filterTeacherAccounts(rows, { ...EMPTY_FILTER, account: [state] }).map((r) => r.teacher.id);
		expect(ids('ACTIVE')).toEqual(['Sechs']);
		expect(ids('INACTIVE')).toEqual(['Sieben']);
		expect(ids('NONE')).toHaveLength(5);
	});

	it('filters by a role somebody holds', () => {
		expect(
			filterTeacherAccounts(rows, { ...EMPTY_FILTER, roles: ['ADMIN'] }).map((r) => r.teacher.id)
		).toEqual(['Sieben']);
	});

	it('filters by whether the examination office still lists them', () => {
		expect(
			filterTeacherAccounts(rows, { ...EMPTY_FILTER, teaching: ['FORMER'] }).map(
				(r) => r.teacher.id
			)
		).toEqual(['Fuenf']);
	});

	it('searches the name, the sort name and the address, case-insensitively', () => {
		// Whatever fragment somebody has: half a surname, half an address.
		expect(
			filterTeacherAccounts(rows, { ...EMPTY_FILTER, search: 'DREI@' }).map((r) => r.teacher.id)
		).toEqual(['Drei']);
		expect(
			filterTeacherAccounts(rows, { ...EMPTY_FILTER, search: 'prof. dr. zwei' }).map(
				(r) => r.teacher.id
			)
		).toEqual(['Zwei']);
	});

	it('keeps somebody with several employments when either is selected', () => {
		// The four are not exclusive in the source: staff who hold an honorary professorship are
		// both, and a filter that read them as one enum would lose them from both lists.
		const both = row('Acht', { isProfessor: false, isStaff: true, isHonoraryProfessor: true });
		for (const employment of ['STAFF', 'HONORARY_PROFESSOR'] as const) {
			expect(
				filterTeacherAccounts([both], { ...EMPTY_FILTER, employment: [employment] })
			).toHaveLength(1);
		}
	});
});

describe('hiddenBy', () => {
	it('counts what one facet alone is keeping out', () => {
		// The sentence over the table. A list pre-filtered to FK07 looks exactly like a list of
		// everybody when most entries state no faculty, and this is the only way to tell.
		const rows = [row('Eins'), row('Zwei', { faculty: null }), row('Drei', { faculty: 'FK10' })];
		expect(hiddenBy(rows, DEFAULT_FILTER, 'faculty')).toBe(2);
		expect(hiddenBy(rows, DEFAULT_FILTER, 'employment')).toBe(0);
	});
});

describe('the filter in the URL', () => {
	it('gives an untouched address the default rather than everything', () => {
		// Arriving from the menu is what the default is for.
		expect(parseTeacherFilter(new URLSearchParams())).toEqual(DEFAULT_FILTER);
	});

	it('lets an emptied facet survive a reload', () => {
		// Once the screen has written the filter, an empty facet means what it says. Without the
		// marker, "show me every faculty" would snap back to FK07 on every reload.
		const params = teacherFilterParams({ ...DEFAULT_FILTER, faculty: [] });
		expect(parseTeacherFilter(params).faculty).toEqual([]);
	});

	it('survives a round trip', () => {
		const filter = {
			search: 'meier',
			faculty: ['FK07', FACULTY_UNKNOWN],
			employment: ['PROFESSOR' as const, 'STAFF' as const],
			teaching: ['FORMER' as const],
			account: ['NONE' as const],
			roles: ['ADMIN'],
			lastSemester: ['2026-WS']
		};
		expect(parseTeacherFilter(teacherFilterParams(filter))).toEqual(filter);
	});

	it('drops values it does not know rather than filtering by them', () => {
		// A hand-edited address must not be able to produce a facet that matches nothing and
		// looks like an empty database.
		const params = new URLSearchParams('filter=1&art=PROFESSOR&art=ERFUNDEN&konto=NIRGENDS');
		const filter = parseTeacherFilter(params);
		expect(filter.employment).toEqual(['PROFESSOR']);
		expect(filter.account).toEqual([]);
	});
});

describe('facets offered', () => {
	const rows = [
		row('Eins'),
		row('Zwei', { faculty: 'FK10', lastSemester: '2025-SS' }),
		row('Drei', { faculty: null, lastSemester: null })
	];

	it('offers the faculties that occur, with the unstated one last', () => {
		expect(facultiesIn(rows)).toEqual(['FK07', 'FK10', FACULTY_UNKNOWN]);
	});

	it('offers the semesters newest first and leaves out the empty one', () => {
		expect(semestersIn(rows)).toEqual(['2026-WS', '2025-SS']);
	});

	it('counts how many rows carry each value', () => {
		expect(facetCounts(rows, (r) => [facultyOf(r)]).get('FK07')).toBe(1);
		expect(facetCounts(rows, (r) => [facultyOf(r)]).get(FACULTY_UNKNOWN)).toBe(1);
	});
});

describe('what a switch sends', () => {
	it('sends the whole set rather than the change', () => {
		// setPersonRoles takes the whole set, and it takes it because add-and-remove loses to a
		// race the moment two administrators have the same person open.
		expect(rolesAfterToggle(['LECTURER'], 'ADMIN', true).sort()).toEqual(['ADMIN', 'LECTURER']);
		expect(rolesAfterToggle(['LECTURER', 'ADMIN'], 'ADMIN', false)).toEqual(['LECTURER']);
	});

	it('does not duplicate a role somebody already holds', () => {
		expect(rolesAfterToggle(['LECTURER'], 'LECTURER', true)).toEqual(['LECTURER']);
	});

	it('lets a study-programme lead hold several programmes at once', () => {
		// A lead can be responsible for more than one, and the switches are independent.
		expect(programmesAfterToggle([{ code: 'IF' }], 'IG', true).sort()).toEqual(['IF', 'IG']);
		expect(programmesAfterToggle([{ code: 'IF' }, { code: 'IG' }], 'IF', false)).toEqual(['IG']);
	});
});

describe('canBeAdmitted', () => {
	it('refuses somebody the examination office gives no address for', () => {
		// The address is the whole link between the two lists. Three of the 257 have none, and
		// offering a switch for them would promise something the backend refuses.
		expect(canBeAdmitted(row('Eins'))).toBe(true);
		expect(canBeAdmitted(row('Eins', { mail: null }))).toBe(false);
		expect(canBeAdmitted(row('Eins', { mail: '  ' }))).toBe(false);
	});
});
