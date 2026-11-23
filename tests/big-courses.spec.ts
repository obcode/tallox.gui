import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';

/**
 * The big-course overview (FKR 387), end to end.
 *
 * On data of its own: a programme, a module and a study year no other spec touches. Zwei, a
 * professor in the examination office's list (the global seed's teacher record), holds a
 * compulsory module of E2L in 2031-WS with a single cohort: a 4-hour lecture and eight 2-hour
 * laboratory groups, 20 hours. Nothing in 2032-SS, so 10 hours on average: a target of one big
 * course, met by this one. Neither semester is in the assignment, so the overview is provisional.
 */
const BIG = {
	programme: { id: '0e2e0000-0000-4000-8000-0000000000c4', code: 'E2L' },
	module: '0e2e0000-0000-4000-8000-0000000000c5',
	spo: '0e2e0000-0000-4000-8000-0000000000c6',
	instance: '0e2e0000-0000-4000-8000-0000000000c7',
	moduleName: 'E2E Großes Pflichtfach',
	studyYear: 2031,
	winter: '2031-WS',
	summer: '2032-SS'
} as const;

function seedSql(): string {
	const b = BIG;
	const labs = Array.from({ length: 8 }, (_, n) => `('${b.instance}', 'LAB', ${n + 1}, 2)`).join(
		', '
	);
	return [
		`DELETE FROM assignment WHERE instance_part_id IN
		   (SELECT id FROM instance_part WHERE course_instance_id = '${b.instance}');`,
		`DELETE FROM course_instance WHERE module_id = '${b.module}';`,
		// Not planned here, so it never turns up as a tab on another spec's demand page.
		`INSERT INTO programme (id, code, title, planning_status)
		 VALUES ('${b.programme.id}', '${b.programme.code}', 'Große-Fächer-Test', 'NOT_OURS')
		 ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 VALUES ('${b.module}', '${b.programme.id}', '${b.moduleName}', 'SU_WITH_LAB',
		         'EVERY_WINTER_SEMESTER', 4, 5)
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO spo (id, programme_id, version, valid_from, primuss_id)
		 VALUES ('${b.spo}', '${b.programme.id}', 2025, '2025-10-01', '07-E2L-2025')
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, baskets, source_rows)
		 VALUES ('${b.module}', '${b.spo}', true, ARRAY['E2L-01'], ARRAY[]::text[], 1)
		 ON CONFLICT (module_id, spo_id) DO UPDATE SET is_duty = true;`,
		`INSERT INTO semester (code) VALUES ('${b.winter}') ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track)
		 SELECT '${b.instance}'::uuid, s.id, '${b.module}'::uuid, '${b.programme.id}'::uuid, ''
		   FROM semester s WHERE s.code = '${b.winter}';`,
		`INSERT INTO instance_part (course_instance_id, kind, position, teaching_hours)
		 VALUES ('${b.instance}', 'LECTURE', 0, 4), ${labs};`,
		`INSERT INTO assignment (instance_part_id, person_id)
		 SELECT ip.id, p.id FROM instance_part ip, person p
		  WHERE ip.course_instance_id = '${b.instance}' AND p.mail = '${PERSONAS.zwei.mail}';`
	].join('\n');
}

const PATH = `/statistik/grosse-faecher?studienjahr=${BIG.studyYear}`;

test.describe('the big-course overview', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(() => {
		runSql(seedSql(), 'seeding the big-course fixture');
	});

	test('shows the dean’s office every professor with target, actual and status', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, PATH);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Große Fächer (FKR 387)' })
		).toBeVisible();
		await expect(page.getByText('vorläufig', { exact: true })).toBeVisible();

		const row = page.getByRole('row').filter({ hasText: PERSONAS.zwei.name });
		await expect(row).toHaveCount(1);
		const cells = row.getByRole('cell');
		// Person, groups, winter, summer, average, target, actual, status, courses.
		await expect(cells.nth(2)).toHaveText('20');
		await expect(cells.nth(3)).toHaveText('0');
		await expect(cells.nth(4)).toHaveText('10');
		await expect(cells.nth(5)).toHaveText('1');
		await expect(cells.nth(6)).toHaveText('1');
		await expect(cells.nth(7)).toHaveText('erfüllt');
		await expect(cells.nth(8)).toContainText(BIG.moduleName);
		await expect(cells.nth(8)).toContainText(BIG.programme.code);

		await checkA11y(page);
	});

	test('filters by status', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, `${PATH}&status=NOT_FULFILLED`);
		await expect(page.getByRole('row').filter({ hasText: PERSONAS.zwei.name })).toHaveCount(0);
	});

	test('lands without a year on the planning semester’s, and keeps the filter', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/statistik/grosse-faecher?status=FULFILLED');
		await expect(page).toHaveURL(/studienjahr=\d{4}/);
		await expect(page).toHaveURL(/status=FULFILLED/);
	});

	test('leads a subject group lead to it from the bar, with every row', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, PATH);
		await expect(page.getByRole('row').filter({ hasText: PERSONAS.zwei.name })).toHaveCount(1);
		await expect(
			page
				.locator('header')
				.getByRole('link', { name: /Statistik/ })
				.first()
		).toBeAttached();
	});

	test('shows a lecturer their own row only', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, PATH);
		await expect(page.getByText('Du siehst Deine eigene Zeile.')).toBeVisible();
		await expect(page.getByRole('row').filter({ hasText: PERSONAS.zwei.name })).toHaveCount(0);
	});
});
