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
 * laboratory groups of two hours — and one E2U cohort with a single two-hour group of its own. A
 * year earlier E2S held it with one group. Whoever holds the teaching pays: E2S 6 hours against 4
 * the year before, E2U 2 hours for a module that is E2S's.
 *
 * E2S has a quota of 20 for the study year 2028, and its winter 2028-WS held the module once with a
 * lecture and a laboratory group: 4 hours. The winter may spend half the year, 10, and has 6 left.
 * The summer may spend what the winter left, 16, and with 6 planned has 10 left — which is also
 * what is left of the year. And seen from E2U, the cohort it holds is an import from E2S.
 *
 * The summer is in the review, so the dean's office can announce it as reviewed.
 */
const CONTROLLING = {
	home: { id: '0e2e0000-0000-4000-8000-0000000000a0', code: 'E2S' },
	// Not E2T: the divided-parts fixture plans that code under an id of its own, so on a fresh
	// database the insert below skipped this row and left the instances pointing at nothing.
	other: { id: '0e2e0000-0000-4000-8000-0000000000a1', code: 'E2U' },
	module: '0e2e0000-0000-4000-8000-0000000000a2',
	// E2U's regulations, where the module is an elective in two baskets at once.
	guestSpo: '0e2e0000-0000-4000-8000-0000000000a7',
	semester: '2029-SS',
	previous: '2028-SS',
	winter: '2028-WS',
	studyYear: 2028,
	// A year of its own for the form test, so that what the dean's office types there cannot move
	// the balance asserted above.
	formYear: 2031,
	instances: {
		home: '0e2e0000-0000-4000-8000-0000000000a3',
		lent: '0e2e0000-0000-4000-8000-0000000000a4',
		previous: '0e2e0000-0000-4000-8000-0000000000a5',
		winter: '0e2e0000-0000-4000-8000-0000000000a6'
	}
} as const;

function seedSql(): string {
	const c = CONTROLLING;
	const i = c.instances;
	return [
		`DELETE FROM course_instance WHERE module_id = '${c.module}';`,
		`DELETE FROM programme_quota WHERE programme_id = '${c.home.id}';`,
		`DELETE FROM review_completion WHERE programme_id = '${c.home.id}';`,
		`INSERT INTO programme (id, code, title) VALUES ('${c.home.id}', '${c.home.code}', 'Controlling-Test')
		 ON CONFLICT DO NOTHING;`,
		// Not planned here: it only receives, and a planned programme would turn up as a tab on
		// every other spec's demand page.
		`INSERT INTO programme (id, code, title, planning_status)
		 VALUES ('${c.other.id}', '${c.other.code}', 'Controlling-Gast', 'NOT_OURS')
		 ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 VALUES ('${c.module}', '${c.home.id}', 'E2E Controlling-Modul', 'SU_WITH_LAB',
		         'EVERY_SUMMER_SEMESTER', 4, 5)
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO semester (code) VALUES ('${c.semester}'), ('${c.previous}'), ('${c.winter}')
		 ON CONFLICT (code) DO NOTHING;`,
		`UPDATE semester SET phase = 'REVIEW' WHERE code = '${c.semester}';`,
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track)
		 SELECT '${i.home}'::uuid, s.id, '${c.module}'::uuid, '${c.home.id}'::uuid, '' FROM semester s WHERE s.code = '${c.semester}'
		 UNION ALL
		 SELECT '${i.lent}'::uuid, s.id, '${c.module}'::uuid, '${c.other.id}'::uuid, '' FROM semester s WHERE s.code = '${c.semester}'
		 UNION ALL
		 SELECT '${i.previous}'::uuid, s.id, '${c.module}'::uuid, '${c.home.id}'::uuid, '' FROM semester s WHERE s.code = '${c.previous}'
		 UNION ALL
		 SELECT '${i.winter}'::uuid, s.id, '${c.module}'::uuid, '${c.home.id}'::uuid, '' FROM semester s WHERE s.code = '${c.winter}';`,
		`INSERT INTO instance_part (course_instance_id, kind, position, teaching_hours)
		 VALUES ('${i.home}', 'LECTURE', 0, 2), ('${i.home}', 'LAB', 1, 2), ('${i.home}', 'LAB', 2, 2),
		        ('${i.lent}', 'LAB', 0, 2),
		        ('${i.previous}', 'LECTURE', 0, 2), ('${i.previous}', 'LAB', 1, 2),
		        ('${i.winter}', 'LECTURE', 0, 2), ('${i.winter}', 'LAB', 1, 2);`,
		`INSERT INTO spo (id, programme_id, version, valid_from, primuss_id)
		 VALUES ('${c.guestSpo}', '${c.other.id}', 2025, '2025-10-01', '07-E2U-2025')
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, baskets, source_rows)
		 VALUES ('${c.module}', '${c.guestSpo}', false, ARRAY['E2U-01'],
		         ARRAY['E2E Vertiefung', 'E2E WPF-Korb'], 2)
		 ON CONFLICT (module_id, spo_id) DO UPDATE SET baskets = EXCLUDED.baskets;`,
		// The partner faculty follows E2U, the programme that only receives.
		`INSERT INTO person_programme_scope (person_id, role, programme_id)
		 SELECT id, 'PARTNER_READER', '${c.other.id}' FROM person WHERE mail = '${PERSONAS.partner.mail}'
		 ON CONFLICT DO NOTHING;`,
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

	test('charges the programme that holds the teaching, with a year earlier', async ({
		asPersona,
		checkA11y
	}) => {
		// A lecturer: the page is as readable as the demand it sums.
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/statistik?semester=${CONTROLLING.semester}`);

		await expect(page.getByRole('heading', { level: 1, name: 'SWS-Controlling' })).toBeVisible();
		const load = page.getByRole('region', { name: /^SWS je Studiengang/ });
		const row = (code: string) =>
			load.getByRole('row', { name: new RegExp(`^${code} – `) }).getByRole('cell');

		// Total, own modules, other programmes' modules, instances, FWP, previous year, difference.
		// Six and not the module's four: every laboratory group is teaching somebody gives.
		const home = row(CONTROLLING.home.code);
		await expect(home.nth(0)).toHaveText('6');
		await expect(home.nth(1)).toHaveText('6');
		await expect(home.nth(2)).toHaveText('0');
		await expect(home.nth(3)).toHaveText('1');
		await expect(home.nth(5)).toHaveText('4');
		await expect(home.nth(6)).toHaveText('+2');

		// E2U plans E2S's module with a group of its own, so E2U pays for it — whoever holds the
		// teaching pays, as DC does for its own Analysis.
		const other = row(CONTROLLING.other.code);
		await expect(other.nth(0)).toHaveText('2');
		await expect(other.nth(1)).toHaveText('0');
		await expect(other.nth(2)).toContainText(`${CONTROLLING.home.code} 2`);

		await checkA11y(page);
	});

	test('puts the study year beside its quota, winter and summer', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/statistik?semester=${CONTROLLING.semester}`);

		const year = page.getByRole('region', { name: /^Studienjahr 2028\/29/ });
		const cells = year
			.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} – `) })
			.getByRole('cell');
		// Quota, winter, summer, what is left.
		await expect(cells.nth(0)).toHaveText('20');
		await expect(cells.nth(1)).toHaveText('4');
		await expect(cells.nth(2)).toHaveText('6');
		await expect(cells.nth(3)).toHaveText('+10');

		// The summer is played through from here: its figure leads into its demand.
		await expect(cells.nth(2).getByRole('link')).toHaveAttribute(
			'href',
			`/bedarf?semester=${CONTROLLING.semester}&studiengang=${CONTROLLING.home.code}`
		);
		await checkA11y(page);
	});

	test('holds a winter to half the year and a summer to what the winter left', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		const semesterRow = () =>
			page
				.getByRole('region', { name: /^Dieses Semester/ })
				.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} – `) })
				.getByRole('cell');

		// Available, planned, balance.
		await gotoRendered(page, `/statistik?semester=${CONTROLLING.winter}`);
		await expect(semesterRow().nth(0)).toHaveText('10');
		await expect(semesterRow().nth(1)).toHaveText('4');
		await expect(semesterRow().nth(2)).toHaveText('+6');

		await gotoRendered(page, `/statistik?semester=${CONTROLLING.semester}`);
		await expect(semesterRow().nth(0)).toHaveText('16');
		await expect(semesterRow().nth(1)).toHaveText('6');
		await expect(semesterRow().nth(2)).toHaveText('+10');
	});

	test('the dean’s office announces the review, and the statistics show it', async ({
		asPersona
	}) => {
		const dean = await asPersona(PERSONAS.fuenf);
		await gotoRendered(
			dean,
			`/bedarf?semester=${CONTROLLING.semester}&studiengang=${CONTROLLING.home.code}`
		);
		await dean.getByRole('button', { name: 'Review fertig' }).click();
		await expect(dean.getByRole('button', { name: 'Review-Meldung zurücknehmen' })).toBeVisible();

		await gotoRendered(dean, `/statistik?semester=${CONTROLLING.semester}`);
		await expect(
			dean
				.getByRole('region', { name: /^Studienjahr/ })
				.getByRole('row', { name: new RegExp(`^${CONTROLLING.home.code} – `) })
		).toContainText('Review fertig');
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

	// The question a programme lead asked: which electives of a basket run this semester. A module
	// in two baskets is in both groups, and says where else it is.
	test('groups the electives by basket', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(
			page,
			`/statistik?semester=${CONTROLLING.semester}&studiengang=${CONTROLLING.other.code}`
		);

		const baskets = page.getByRole('region', { name: /^Wahlpflicht nach Korb/ });
		for (const [basket, other] of [
			['E2E Vertiefung', 'E2E WPF-Korb'],
			['E2E WPF-Korb', 'E2E Vertiefung']
		]) {
			const group = baskets.getByRole('rowgroup').filter({
				has: page.getByRole('rowheader', { name: basket, exact: true })
			});
			const row = group.getByRole('row', { name: /E2E Controlling-Modul/ });
			await expect(row).toContainText(other);
			await expect(row.getByRole('cell').last()).toHaveText('2');
		}

		await checkA11y(page);
	});

	// A partner faculty reads the statistics of the programme it follows and nothing of the others,
	// and is offered none of the pages where somebody states something about themselves.
	test('a partner faculty reads its own programme only', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.partner);
		await gotoRendered(page, `/statistik?semester=${CONTROLLING.semester}`);

		const load = page.getByRole('region', { name: /^SWS je Studiengang/ });
		const row = (code: string) => load.getByRole('row', { name: new RegExp(`^${code} – `) });
		await expect(row(CONTROLLING.other.code)).toBeVisible();
		await expect(row(CONTROLLING.home.code)).toHaveCount(0);

		const nav = page.getByRole('navigation').first();
		await expect(nav.getByRole('link', { name: /Statistik/ }).first()).toBeAttached();
		await expect(nav.getByRole('link', { name: /Meine Lehre|Wünsche/ })).toHaveCount(0);

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
