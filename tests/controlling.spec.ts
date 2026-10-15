import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';

/**
 * The SWS controlling, end to end.
 *
 * On data of its own: a programme, a module and two semesters no other spec touches. The shared
 * fixture's semesters are planned, reset and re-seeded by the demand spec while this one runs, so
 * any figure read off them is a figure of whichever spec ran last.
 *
 * The arrangement: a module of E2S runs in 2029-SS as one E2S cohort — a lecture and two
 * laboratory groups of two hours — and one E2T cohort with a single two-hour group. A year
 * earlier E2S held it with one group. So E2S costs 8 hours, 6 of them its own and 2 lent to E2T,
 * against 4 the year before.
 */
const CONTROLLING = {
	home: { id: '0e2e0000-0000-4000-8000-0000000000a0', code: 'E2S' },
	other: { id: '0e2e0000-0000-4000-8000-0000000000a1', code: 'E2T' },
	module: '0e2e0000-0000-4000-8000-0000000000a2',
	semester: '2029-SS',
	previous: '2028-SS',
	instances: {
		home: '0e2e0000-0000-4000-8000-0000000000a3',
		lent: '0e2e0000-0000-4000-8000-0000000000a4',
		previous: '0e2e0000-0000-4000-8000-0000000000a5'
	}
} as const;

function seedSql(): string {
	const c = CONTROLLING;
	const i = c.instances;
	return [
		`DELETE FROM course_instance WHERE module_id = '${c.module}';`,
		`INSERT INTO programme (id, code, title) VALUES ('${c.home.id}', '${c.home.code}', 'Controlling-Test')
		 ON CONFLICT DO NOTHING;`,
		// Not planned here: it only receives, and a planned programme would turn up as a tab on
		// every other spec's demand page.
		`INSERT INTO programme (id, code, title, planning_status)
		 VALUES ('${c.other.id}', '${c.other.code}', 'Controlling-Gast', 'NOT_OURS')
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 VALUES ('${c.module}', '${c.home.id}', 'E2E Controlling-Modul', 'SU_WITH_LAB',
		         'EVERY_SUMMER_SEMESTER', 4, 5)
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO semester (code) VALUES ('${c.semester}'), ('${c.previous}')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track)
		 SELECT '${i.home}'::uuid, s.id, '${c.module}'::uuid, '${c.home.id}'::uuid, '' FROM semester s WHERE s.code = '${c.semester}'
		 UNION ALL
		 SELECT '${i.lent}'::uuid, s.id, '${c.module}'::uuid, '${c.other.id}'::uuid, '' FROM semester s WHERE s.code = '${c.semester}'
		 UNION ALL
		 SELECT '${i.previous}'::uuid, s.id, '${c.module}'::uuid, '${c.home.id}'::uuid, '' FROM semester s WHERE s.code = '${c.previous}';`,
		`INSERT INTO instance_part (course_instance_id, kind, position, teaching_hours)
		 VALUES ('${i.home}', 'LECTURE', 0, 2), ('${i.home}', 'LAB', 1, 2), ('${i.home}', 'LAB', 2, 2),
		        ('${i.lent}', 'LAB', 0, 2),
		        ('${i.previous}', 'LECTURE', 0, 2), ('${i.previous}', 'LAB', 1, 2);`
	].join('\n');
}

test.describe('the SWS controlling', () => {
	// Serial so that the fixture is written once: two workers each running the seed would meet on
	// the programme's primary key.
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(() => {
		runSql(seedSql(), 'seeding the controlling fixture');
	});

	test('counts the teaching at the home programme, with what it lends and a year earlier', async ({
		asPersona,
		checkA11y
	}) => {
		// A lecturer: the page is as readable as the demand it sums.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/bedarf/sws?semester=${CONTROLLING.semester}`);

		await expect(page.getByRole('heading', { level: 1, name: 'SWS-Controlling' })).toBeVisible();
		const cells = page
			.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} – `) })
			.getByRole('cell');

		// Total, own, lent (with where to), instances, FWP, previous year, difference. Eight and
		// not the module's four: every laboratory group is teaching somebody gives.
		await expect(cells.nth(0)).toHaveText('8');
		await expect(cells.nth(1)).toHaveText('6');
		await expect(cells.nth(2)).toContainText(`${CONTROLLING.other.code} 2`);
		await expect(cells.nth(3)).toHaveText('2');
		await expect(cells.nth(5)).toHaveText('4');
		await expect(cells.nth(6)).toHaveText('+4');

		// The receiving programme owns none of it, so it is not a row of its own.
		await expect(
			page.getByRole('row', { name: new RegExp(`^${CONTROLLING.other.code} – `) })
		).toHaveCount(0);

		await checkA11y(page);
	});

	test('lands on the planning semester and is reached from the demand page', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/bedarf?semester=${CONTROLLING.semester}`);

		await page.getByRole('main').getByRole('link', { name: 'SWS-Controlling' }).click();
		await expect(page).toHaveURL(/\/bedarf\/sws\?semester=\d{4}-(SS|WS)$/);
		await expect(page.getByRole('heading', { level: 1, name: 'SWS-Controlling' })).toBeVisible();
	});
});
