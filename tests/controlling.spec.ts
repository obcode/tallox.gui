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
 *
 * E2S has a quota of 20 for the study year 2028 (2028-WS and 2029-SS), so the summer may spend 10
 * and the balance is +2. And seen from E2T, the cohort it holds is an import from E2S.
 */
const CONTROLLING = {
	home: { id: '0e2e0000-0000-4000-8000-0000000000a0', code: 'E2S' },
	other: { id: '0e2e0000-0000-4000-8000-0000000000a1', code: 'E2T' },
	module: '0e2e0000-0000-4000-8000-0000000000a2',
	semester: '2029-SS',
	previous: '2028-SS',
	studyYear: 2028,
	// A year of its own for the form test, so that what the dean's office types there cannot move
	// the balance asserted above.
	formYear: 2031,
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
		`DELETE FROM programme_quota WHERE programme_id = '${c.home.id}';`,
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
		        ('${i.previous}', 'LECTURE', 0, 2), ('${i.previous}', 'LAB', 1, 2);`,
		`INSERT INTO programme_quota (programme_id, study_year, teaching_hours)
		 VALUES ('${c.home.id}', ${c.studyYear}, 20);`
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
		await gotoRendered(page, `/statistik?semester=${CONTROLLING.semester}`);

		await expect(page.getByRole('heading', { level: 1, name: 'SWS-Controlling' })).toBeVisible();
		const load = page.getByRole('region', { name: /^SWS je Heimatstudiengang/ });
		const cells = load
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
			load.getByRole('row', { name: new RegExp(`^${CONTROLLING.other.code} – `) })
		).toHaveCount(0);

		await checkA11y(page);
	});

	test('reads a semester against half of the study year’s quota', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/statistik?semester=${CONTROLLING.semester}`);

		const cells = page
			.getByRole('region', { name: /^Kontingent/ })
			.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} – `) })
			.getByRole('cell');

		// Year, the summer's half, what is planned, and what is left.
		await expect(cells.nth(0)).toHaveText('20');
		await expect(cells.nth(1)).toHaveText('10');
		await expect(cells.nth(2)).toHaveText('8');
		await expect(cells.nth(3)).toHaveText('+2');
	});

	test('shows what a programme takes from elsewhere', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(
			page,
			`/statistik?semester=${CONTROLLING.semester}&studiengang=${CONTROLLING.other.code}`
		);

		const imports = page.getByRole('region', { name: /^Module mit fremder Heimat/ });
		await expect(imports.getByRole('rowheader', { name: /^aus E2S – / })).toBeVisible();
		const row = imports.getByRole('row', { name: /E2E Controlling-Modul/ });
		await expect(row.getByRole('cell').last()).toHaveText('2');

		// The home programme takes nothing from anybody.
		await gotoRendered(
			page,
			`/statistik?semester=${CONTROLLING.semester}&studiengang=${CONTROLLING.home.code}`
		);
		await expect(imports).toContainText('kein Modul aus einem anderen Studiengang');

		await checkA11y(page);
	});

	test('the dean’s office enters a quota, and a lecturer only reads it', async ({
		asPersona,
		checkA11y
	}) => {
		const path = `/verwaltung/studiengaenge?studienjahr=${CONTROLLING.formYear}`;
		const field = `Kontingent ${CONTROLLING.home.code} 2031/32`;

		const dean = await asPersona(PERSONAS.fuenf);
		await gotoRendered(dean, path);
		const row = dean.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} `) });
		await row.getByRole('textbox', { name: field }).fill('12,5');
		await row.getByRole('button', { name: 'Speichern' }).click();
		await expect(row.getByRole('textbox', { name: field })).toHaveValue('12,5');

		await gotoRendered(dean, path);
		await expect(
			dean
				.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} `) })
				.getByRole('textbox', { name: field })
		).toHaveValue('12,5');
		await checkA11y(dean);

		const lecturer = await asPersona(PERSONAS.eins);
		await gotoRendered(lecturer, path);
		const read = lecturer.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} `) });
		await expect(read.getByRole('textbox')).toHaveCount(0);
		await expect(read.getByRole('cell').last()).toHaveText('12,5');
	});

	test('is the statistics area for a programme lead, and lands on the planning semester', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, '/');

		// .first(): the bar renders every area twice, side by side and in the hamburger menu.
		await page
			.getByRole('navigation')
			.getByRole('link', { name: /Statistik/ })
			.first()
			.click();
		await expect(page).toHaveURL(/\/statistik\?semester=\d{4}-(SS|WS)$/);
		await expect(page.getByRole('heading', { level: 1, name: 'SWS-Controlling' })).toBeVisible();
	});

	test('the address it had on its first day still works', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/bedarf/sws?semester=${CONTROLLING.semester}`);
		await expect(page).toHaveURL(new RegExp(`/statistik\\?semester=${CONTROLLING.semester}$`));
	});

	test('is linked from the demand page', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/bedarf?semester=${CONTROLLING.semester}`);

		await page.getByRole('main').getByRole('link', { name: 'Statistik' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'SWS-Controlling' })).toBeVisible();
	});
});
