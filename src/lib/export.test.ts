import { describe, expect, it } from 'vitest';
import type { LoadInput } from '$lib/controlling';
import {
	LOAD_HEADER,
	PLANNING_HEADER,
	exportFileName,
	exportSheets,
	loadRows,
	noticeLines,
	planningRows,
	type ExportAssignment,
	type ExportInstance,
	type ExportPart
} from './export';

function part(id: string, over: Partial<ExportPart> = {}): ExportPart {
	return {
		id,
		kind: 'LECTURE',
		position: 0,
		teachingHours: 2,
		sharedAcrossTracks: false,
		...over
	};
}

function instance(id: string, over: Partial<ExportInstance> = {}): ExportInstance {
	return {
		id,
		track: '',
		programmeSemester: 1,
		note: '',
		programme: { code: 'IF' },
		module: { name: 'Analysis', zpaId: '1001', subjectGroup: { name: 'Mathematik' } },
		parts: [],
		coveredBy: null,
		covers: [],
		...over
	};
}

function held(partId: string, name: string, note = ''): ExportAssignment {
	return { note, assignee: { name }, part: { id: partId } };
}

const col = (name: string) => PLANNING_HEADER.indexOf(name);

describe('planningRows', () => {
	// A seminar of an umbrella module: the spreadsheet says which one, beside the module.
	it('writes the topic of a cohort beside its module', () => {
		const rows = planningRows(
			[
				instance('i', {
					track: 'C',
					topic: 'Green Software Engineering',
					module: { name: 'Seminar', zpaId: '2001' }
				})
			],
			[]
		);
		expect(rows[0][col('Modul')]).toBe('Seminar');
		expect(rows[0][col('Thema')]).toBe('Green Software Engineering');
	});

	it('writes one row per part with whoever holds it', () => {
		const rows = planningRows(
			[
				instance('i1', {
					track: 'A',
					parts: [
						part('p1'),
						part('p2', { kind: 'LAB', position: 1 }),
						part('p3', { kind: 'LAB', position: 2 })
					]
				})
			],
			[held('p1', 'Prof. Eins', 'nur erste Hälfte'), held('p3', 'Prof. Zwei')]
		);

		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r[col('Teil')])).toEqual(['Vorlesung', 'Praktikum 1', 'Praktikum 2']);
		expect(rows.map((r) => r[col('Besetzt durch')])).toEqual(['Prof. Eins', '', 'Prof. Zwei']);
		expect(rows[0][col('Notiz Zuteilung')]).toBe('nur erste Hälfte');
		// No topic: the column is there and empty, as for every cohort that is not a seminar.
		expect(rows[0].slice(0, 7)).toEqual(['IF', 1, 'IF1A', 'Analysis', '', '1001', 'Mathematik']);
	});

	it('keeps hours as numbers and an unstated figure empty rather than zero', () => {
		const rows = planningRows(
			[
				instance('i1', {
					parts: [
						part('p1', { teachingHours: 1.5 }),
						part('p2', { teachingHours: null, position: 1, kind: 'LAB' })
					]
				})
			],
			[]
		);
		expect(rows[0][col('SWS (Lehrperson)')]).toBe(1.5);
		expect(rows[1][col('SWS (Lehrperson)')]).toBeNull();
	});

	// The case from the request: the lecture given half here and half by another faculty.
	it('names a piece after its part and writes the other faculty where the holder goes', () => {
		const rows = planningRows(
			[
				instance('i1', {
					track: 'A',
					parts: [
						part('p1'),
						part('p1a', { dividedFrom: 'p1', taughtBy: 'FK 04' }),
						part('p2', { kind: 'LAB', position: 1 }),
						part('p3', { kind: 'LAB', position: 2 })
					]
				})
			],
			[held('p1', 'Prof. Eins')]
		);
		expect(rows.map((r) => r[col('Teil')])).toEqual([
			'Vorlesung',
			'Vorlesung – Anteil',
			'Praktikum 1',
			'Praktikum 2'
		]);
		expect(rows.map((r) => r[col('Besetzt durch')])).toEqual(['Prof. Eins', 'FK 04', '', '']);
	});

	it('marks the lecture held once for all tracks', () => {
		const rows = planningRows(
			[instance('i1', { track: 'A', parts: [part('p1', { sharedAcrossTracks: true })] })],
			[]
		);
		expect(rows[0][col('Für alle Züge')]).toBe('ja');
	});

	it('keeps a cohort whose teaching another programme holds, and says so', () => {
		const rows = planningRows(
			[
				instance('i1', {
					programme: { code: 'DC' },
					coveredBy: {
						acceptedAt: '2026-09-01T00:00:00Z',
						instance: { id: 'x', track: '', programmeSemester: 1, programme: { code: 'IF' } }
					}
				})
			],
			[]
		);
		expect(rows).toHaveLength(1);
		expect(rows[0][col('Hinweis')]).toBe('gemeinsam mit IF1, dort gehalten');
		expect(rows[0][col('SWS (Lehrperson)')]).toBeNull();
	});

	it('says how the cohort is taught on every row of it', () => {
		const rows = planningRows(
			[
				instance('i1', {
					delivery: 'BLOCK',
					taughtInEnglish: true,
					parts: [part('p1'), part('p2', { kind: 'LAB', position: 1 })]
				}),
				instance('i2', { track: 'B', delivery: 'WEEKLY', taughtInEnglish: false })
			],
			[]
		);
		expect(rows.map((r) => [r[col('Durchführung')], r[col('Englisch')]])).toEqual([
			['Block', 'ja'],
			['Block', 'ja'],
			['semesterbegleitend', '']
		]);
	});

	it('has a column of its own for the CiE listing', () => {
		const rows = planningRows(
			[
				instance('i1', { taughtInEnglish: false, cie: true }),
				instance('i2', { track: 'B', taughtInEnglish: true, cie: false })
			],
			[]
		);
		expect(rows.map((r) => [r[col('Englisch')], r[col('CiE')]])).toEqual([
			['', 'ja'],
			['ja', '']
		]);
		expect(rows.every((r) => r.length === PLANNING_HEADER.length)).toBe(true);
	});

	it('keeps a cohort without parts and names the gap', () => {
		const rows = planningRows([instance('i1')], []);
		expect(rows[0][col('Hinweis')]).toBe('keine Teile angelegt');
	});

	it('names the cohorts a part is held for as well', () => {
		const rows = planningRows(
			[
				instance('i1', {
					parts: [part('p1')],
					covers: [
						{
							acceptedAt: '2026-09-01T00:00:00Z',
							instance: { id: 'x', track: '', programmeSemester: 1, programme: { code: 'DC' } }
						}
					]
				})
			],
			[]
		);
		expect(rows[0][col('Hinweis')]).toBe('hält auch für DC1');
	});

	it('sorts by programme, cohort year (unknown last), track and module', () => {
		const rows = planningRows(
			[
				instance('a', { programme: { code: 'IF' }, programmeSemester: null, parts: [part('1')] }),
				instance('b', {
					programme: { code: 'IF' },
					programmeSemester: 2,
					track: 'B',
					parts: [part('2')]
				}),
				instance('c', {
					programme: { code: 'IF' },
					programmeSemester: 2,
					track: 'A',
					parts: [part('3')]
				}),
				instance('d', { programme: { code: 'DC' }, programmeSemester: 3, parts: [part('4')] }),
				instance('e', {
					programme: { code: 'IF' },
					programmeSemester: 2,
					track: 'A',
					module: { name: 'Algorithmen' },
					parts: [part('5')]
				})
			],
			[]
		);
		expect(rows.map((r) => `${r[col('Zug')]} ${r[col('Modul')]}`)).toEqual([
			'DC3 Analysis',
			'IF2A Algorithmen',
			'IF2A Analysis',
			'IF2B Analysis',
			'IF? Analysis'
		]);
	});
});

function load(code: string, over: Partial<LoadInput> = {}): LoadInput {
	return {
		programme: { code, title: `Studiengang ${code}`, planningStatus: 'PLANNED' },
		teachingHours: 10,
		ownHours: 8,
		instanceCount: 4,
		fwpInstanceCount: 1,
		fwpHours: 2,
		partsWithoutHours: 0,
		shares: [],
		yearlyQuota: 40,
		semesterQuota: 20,
		balance: 10,
		...over
	};
}

describe('loadRows', () => {
	it('lists the faculty’s programmes first, then the others, then the sum', () => {
		const rows = loadRows([
			load('IF'),
			load('XX', {
				programme: { code: 'XX', title: 'Fremd', planningStatus: 'NOT_PLANNED' },
				yearlyQuota: null,
				semesterQuota: null,
				balance: null
			}),
			load('DC', { teachingHours: 6, ownHours: 6 })
		]);
		expect(rows.map((r) => r[0])).toEqual(['DC', 'IF', 'XX', 'Summe']);
		const total = rows[3];
		expect(total[LOAD_HEADER.indexOf('SWS gesamt')]).toBe(26);
		expect(total[LOAD_HEADER.indexOf('davon Module anderer Studiengänge')]).toBe(4);
		expect(total[LOAD_HEADER.indexOf('Jahreskontingent')]).toBeNull();
		expect(total[LOAD_HEADER.indexOf('SWS anderer Fakultäten (nicht enthalten)')]).toBe(0);
		expect(rows[2][LOAD_HEADER.indexOf('Saldo')]).toBeNull();
		expect(rows[1][LOAD_HEADER.indexOf('Saldo')]).toBe(10);
	});
});

describe('noticeLines', () => {
	const at = new Date('2026-10-16T08:00:00Z');

	it('warns that cells may be hidden while the assignments are unpublished', () => {
		const text = noticeLines('2026-WS', null, at).join('\n');
		expect(text).toContain('noch nicht veröffentlicht');
		expect(text).toContain('Wintersemester 2026/27');
		expect(text).toContain('16.10.2026');
	});

	it('drops the warning once they are published', () => {
		const text = noticeLines('2026-WS', '2026-10-01T00:00:00Z', at).join('\n');
		expect(text).not.toContain('noch nicht veröffentlicht');
	});
});

describe('exportSheets', () => {
	it('builds three sheets whose widths match their columns', () => {
		const sheets = exportSheets({
			semester: '2026-WS',
			assignmentsPublishedAt: null,
			instances: [instance('i1', { parts: [part('p1')] }), instance('i2')],
			assignments: [],
			load: [load('IF')],
			exportedAt: new Date()
		});
		expect(sheets.map((s) => s.name)).toEqual(['Planung', 'SWS je Studiengang', 'Hinweise']);
		for (const s of sheets.slice(0, 2)) {
			expect(s.widths).toHaveLength(s.header.length);
			for (const r of s.rows) expect(r).toHaveLength(s.header.length);
		}
	});

	it('names the file after the semester', () => {
		expect(exportFileName('2027-SS')).toBe('tallox-2027-SS.xlsx');
	});
});
