import { expect, type Page } from '@playwright/test';
import readXlsxFile from 'read-excel-file/node';
import { PERSONAS, gotoRendered, test, type Persona } from './fixtures';
import { runSql } from './psql';

/**
 * The semester export, end to end — and above all what it does **not** contain.
 *
 * The export is assembled from what the API answers for the person downloading it, so the rules
 * it has to keep are the backend's. What this spec pins is that the file really goes through that
 * path: through the identity relay, through the assignment visibility filter, and without the
 * wishes. A file that read the database another way would pass every unit test and leak here.
 *
 * Data of its own: a programme, a module and a semester no other spec touches. One cohort with a
 * lecture and two laboratory groups; the lecture is held by Eins, the first group by a teacher
 * without an account, the second by nobody. The dean's office has wished for the cohort, with a
 * note that has to stay out of every file — Fuenf rather than anybody else for the reason the
 * assignment fixture gives in `seed.ts`: "Meine Eintragungen" spans every semester, so a wish
 * given to a persona the wish spec asserts about would change that spec's page.
 */
const EXPORT = {
	programme: { id: '0e2e0000-0000-4000-8000-0000000000b0', code: 'E2X' },
	module: '0e2e0000-0000-4000-8000-0000000000b1',
	instance: '0e2e0000-0000-4000-8000-0000000000b2',
	teacher: '0e2e0000-0000-4000-8000-0000000000b3',
	parts: {
		lecture: '0e2e0000-0000-4000-8000-0000000000b4',
		lab1: '0e2e0000-0000-4000-8000-0000000000b5',
		lab2: '0e2e0000-0000-4000-8000-0000000000b6'
	},
	semester: '2035-WS',
	moduleName: 'E2E Export-Modul',
	teacherName: 'Lehrbeauftragte Export',
	wishNote: 'E2E-Wunschnotiz, vertraulich'
} as const;

function seedSql(): string {
	const e = EXPORT;
	const p = e.parts;
	return [
		`DELETE FROM assignment WHERE instance_part_id IN ('${p.lecture}', '${p.lab1}', '${p.lab2}');`,
		`DELETE FROM wish WHERE course_instance_id = '${e.instance}';`,
		`DELETE FROM course_instance WHERE module_id = '${e.module}';`,
		// Not planned here, for the reason the controlling spec gives: a planned programme turns up
		// as a tab on every other spec's demand page.
		`INSERT INTO programme (id, code, title, planning_status)
		 VALUES ('${e.programme.id}', '${e.programme.code}', 'Export-Test', 'NOT_OURS')
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 VALUES ('${e.module}', '${e.programme.id}', '${e.moduleName}', 'SU_WITH_LAB',
		         'EVERY_WINTER_SEMESTER', 4, 5)
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO teacher (id, full_name, short_name) VALUES ('${e.teacher}', '${e.teacherName}', '')
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO semester (code) VALUES ('${e.semester}') ON CONFLICT (code) DO NOTHING;`,
		`UPDATE semester SET phase = 'ASSIGNMENT', assignments_published_at = NULL
		 WHERE code = '${e.semester}';`,
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track, programme_semester)
		 SELECT '${e.instance}'::uuid, s.id, '${e.module}'::uuid, '${e.programme.id}'::uuid, '', 3
		 FROM semester s WHERE s.code = '${e.semester}';`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
		 VALUES ('${p.lecture}', '${e.instance}', 'LECTURE', 0, 2),
		        ('${p.lab1}', '${e.instance}', 'LAB', 1, 2),
		        ('${p.lab2}', '${e.instance}', 'LAB', 2, 1.5);`,
		`INSERT INTO assignment (instance_part_id, person_id, note)
		 SELECT '${p.lecture}', id, 'nur erste Hälfte' FROM person WHERE mail = '${PERSONAS.eins.mail}';`,
		`INSERT INTO assignment (instance_part_id, teacher_id) VALUES ('${p.lab1}', '${e.teacher}');`,
		`INSERT INTO wish (course_instance_id, person_id, priority, note)
		 SELECT '${e.instance}', id, 1, '${e.wishNote}' FROM person WHERE mail = '${PERSONAS.fuenf.mail}';`
	].join('\n');
}

const URL = `/gui-api/export/semester?semester=${EXPORT.semester}`;

type Rows = (string | number | boolean | Date | null)[][];

/** Downloads the export as this person and reads every sheet back. */
async function download(page: Page): Promise<Map<string, Rows>> {
	const response = await page.request.get(URL);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('spreadsheetml');
	expect(response.headers()['content-disposition']).toContain(`tallox-${EXPORT.semester}.xlsx`);
	const sheets = await readXlsxFile(await response.body());
	return new Map(sheets.map((s) => [s.sheet, s.data as Rows]));
}

/** The planning rows of this spec's cohort, as objects keyed by the header. */
function cohortRows(sheets: Map<string, Rows>): Record<string, unknown>[] {
	const [header, ...rows] = sheets.get('Planung') ?? [];
	return rows
		.filter((r) => r[header.indexOf('Modul')] === EXPORT.moduleName)
		.map((r) => Object.fromEntries(header.map((h, i) => [String(h), r[i]])));
}

/** Every cell of every sheet, as text — for the assertions about what must appear nowhere. */
function everyCell(sheets: Map<string, Rows>): string {
	return [...sheets.values()]
		.flat(2)
		.map((c) => String(c ?? ''))
		.join('\n');
}

async function exportAs(
	asPersona: (p: Persona) => Promise<Page>,
	persona: Persona
): Promise<Map<string, Rows>> {
	const page = await asPersona(persona);
	return download(page);
}

test.describe('the semester export', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(() => {
		runSql(seedSql(), 'seeding the export fixture');
	});

	test('is offered on the controlling page and downloads a workbook', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `/statistik?semester=${EXPORT.semester}`);

		const link = page.getByRole('link', { name: 'Als Excel exportieren' });
		await expect(link).toBeVisible();
		await checkA11y(page);

		const [file] = await Promise.all([page.waitForEvent('download'), link.click()]);
		expect(file.suggestedFilename()).toBe(`tallox-${EXPORT.semester}.xlsx`);
		const sheets = await readXlsxFile(await file.createReadStream());
		expect(sheets.map((s) => s.sheet)).toEqual(['Planung', 'SWS je Studiengang', 'Hinweise']);
	});

	test('shows the dean’s office every assignment, one row per part', async ({ asPersona }) => {
		const sheets = await exportAs(asPersona, PERSONAS.fuenf);
		const rows = cohortRows(sheets);

		expect(rows.map((r) => r['Teil'])).toEqual(['Vorlesung', 'Praktikum 1', 'Praktikum 2']);
		expect(rows.map((r) => r['Besetzt durch'] ?? '')).toEqual([
			PERSONAS.eins.name,
			EXPORT.teacherName,
			''
		]);
		expect(rows.map((r) => r['SWS (Lehrperson)'])).toEqual([2, 2, 1.5]);
		expect(rows[0]['Zug']).toBe(`${EXPORT.programme.code}3`);
		expect(rows[0]['Notiz Zuteilung']).toBe('nur erste Hälfte');

		// The controlling sheet: the cohort costs its programme 5.5 hours.
		const [header, ...load] = sheets.get('SWS je Studiengang') ?? [];
		const own = load.find((r) => r[0] === EXPORT.programme.code);
		expect(own?.[header.indexOf('SWS gesamt')]).toBe(5.5);

		expect(everyCell(sheets)).toContain('noch nicht veröffentlicht');
	});

	test('carries no wish — not even for those who may read them', async ({ asPersona }) => {
		// The dean's office reads wishes before publication on the wish page — and this one is
		// even its own. The export still carries none: a file cannot be taken back.
		const text = everyCell(await exportAs(asPersona, PERSONAS.fuenf));
		// The note is the marker: only the wish row carries it. Not the word "Wunsch" — other specs
		// name a programme after the wish round, and that title is rightly in the controlling sheet.
		expect(text).not.toContain(EXPORT.wishNote);
	});

	test('shows a colleague only their own assignments before publication', async ({ asPersona }) => {
		// Zwei holds nothing here, so before publication the whole column is empty for Zwei —
		// including Eins's lecture and the teacher's group.
		const zwei = cohortRows(await exportAs(asPersona, PERSONAS.zwei));
		expect(zwei.map((r) => r['Besetzt durch'] ?? '')).toEqual(['', '', '']);
		expect(zwei.map((r) => r['Notiz Zuteilung'] ?? '')).toEqual(['', '', '']);

		// Eins sees the own lecture and nothing else.
		const eins = cohortRows(await exportAs(asPersona, PERSONAS.eins));
		expect(eins.map((r) => r['Besetzt durch'] ?? '')).toEqual([PERSONAS.eins.name, '', '']);
	});

	test('shows everybody every assignment once they are published', async ({ asPersona }) => {
		runSql(
			`UPDATE semester SET assignments_published_at = now() WHERE code = '${EXPORT.semester}';`,
			'publishing the export fixture'
		);
		try {
			const sheets = await exportAs(asPersona, PERSONAS.zwei);
			expect(cohortRows(sheets).map((r) => r['Besetzt durch'] ?? '')).toEqual([
				PERSONAS.eins.name,
				EXPORT.teacherName,
				''
			]);
			expect(everyCell(sheets)).not.toContain('noch nicht veröffentlicht');
			expect(everyCell(sheets)).not.toContain(EXPORT.wishNote);
		} finally {
			runSql(
				`UPDATE semester SET assignments_published_at = NULL WHERE code = '${EXPORT.semester}';`,
				'unpublishing the export fixture'
			);
		}
	});

	test('refuses a semester that is not one', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		const response = await page.request.get('/gui-api/export/semester?semester=2035 WS');
		expect(response.status()).toBe(400);
	});
});
