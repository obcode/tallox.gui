import { expect, type APIRequestContext } from '@playwright/test';
import { advanceSemesters } from '../src/lib/advanceWishes';
import { semesterName } from '../src/lib/semester';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { WISHES } from './seed';

/**
 * Advance wishes („Vormerkungen“), end to end: noted down before the demand is settled, read by
 * the leads and by nobody else, "not offered" on the start page when the release leaves the module
 * out, and a wish on the cohort when it does not.
 *
 * The wish fixture's programme and module, in a semester the form offers — computed, because the
 * list moves with the calendar. Nothing else in the suite releases that programme there, and
 * `reset` takes back everything this file did.
 *
 * Serial, because the steps build on each other.
 */
test.describe.configure({ mode: 'serial' });

const SEMESTER = advanceSemesters(new Date())[3];
const COHORT = '0e2e0000-0000-4000-8000-0000000000a1';

function reset(): void {
	runSql(
		`DELETE FROM advance_wish WHERE module_id = '${WISHES.module}';
		 DELETE FROM wish WHERE course_instance_id = '${COHORT}';
		 DELETE FROM wish_track_limit WHERE module_id = '${WISHES.module}'
		   AND semester_id IN (SELECT id FROM semester WHERE code = '${SEMESTER}');
		 DELETE FROM instance_part WHERE course_instance_id = '${COHORT}';
		 DELETE FROM course_instance WHERE id = '${COHORT}';
		 DELETE FROM demand_completion
		  WHERE semester_id IN (SELECT id FROM semester WHERE code = '${SEMESTER}')
		    AND programme_id IN (SELECT id FROM programme WHERE code = '${WISHES.programme}');`,
		'clearing the advance wishes'
	);
}

test.beforeAll(reset);
test.afterAll(reset);

/**
 * The programme lead releases the demand — straight at the backend, playing the proxy the way the
 * fixtures do. What is under test here is what the colleague sees afterwards, not the button.
 */
async function release(request: APIRequestContext): Promise<void> {
	const response = await request.post(process.env.TALLOX_SERVER ?? 'http://localhost:8080/query', {
		headers: { 'X-Remote-User': PERSONAS.vier.mail },
		data: {
			query: `mutation($s: String!, $p: String!) {
				setDemandComplete(semester: $s, programme: $p, complete: true) { semester }
			}`,
			variables: { s: SEMESTER, p: WISHES.programme }
		}
	});
	expect(response.ok()).toBe(true);
	expect((await response.json()).errors).toBeUndefined();
}

test.describe('advance wishes', () => {
	test('a colleague notes down a module for a coming semester', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/wuensche/vormerkungen?programme=${WISHES.programme}`);

		await expect(page.getByRole('heading', { name: 'Vormerkungen', level: 1 })).toBeVisible();
		await expect(page.getByText('Eine Vormerkung ist kein Anspruch')).toBeVisible();

		// By the field's name: the accessible name of a select carries its chosen option, and a programme
		// title in the fixture set contains the word "Semester".
		await page.locator('select[name="semester"]').selectOption(SEMESTER);
		await page.locator('select[name="module"]').selectOption({ label: 'E2E Fachmodul' });
		await page.locator('select[name="priority"]').selectOption({ label: 'unbedingt' });
		await page.locator('select[name="maxTracks"]').selectOption({ label: 'einen' });
		await page.locator('input[name="note"]').fill('nur die Vorlesung');
		await page.getByRole('button', { name: 'Vormerken' }).click();

		const card = page.locator('article').filter({ hasText: semesterName(SEMESTER) });
		await expect(card.getByText('E2E Fachmodul')).toBeVisible();
		await expect(card.getByText('unbedingt · höchstens einen Zug')).toBeVisible();
		await expect(card.getByText('wartet auf Freigabe')).toBeVisible();
		await checkA11y(page);
	});

	test('the subject group lead reads it, a colleague does not', async ({ asPersona }) => {
		const lead = await asPersona(PERSONAS.drei);
		await gotoRendered(lead, `/zuteilung/vormerkungen?semester=${SEMESTER}`);
		const row = lead.getByRole('row').filter({ hasText: 'E2E Fachmodul' });
		await expect(row).toContainText(PERSONAS.eins.name);
		await expect(row).toContainText('nur die Vorlesung');

		const colleague = await asPersona(PERSONAS.zwei);
		await gotoRendered(colleague, `/zuteilung/vormerkungen?semester=${SEMESTER}`);
		await expect(colleague.getByText(PERSONAS.eins.name)).toHaveCount(0);
		// Empty means "nothing you may see", never "nobody has noted anything down".
		await expect(colleague.getByText('nichts vor, das Du sehen darfst')).toBeVisible();
		await expect(colleague.getByText(/niemand/i)).toHaveCount(0);

		await gotoRendered(colleague, '/wuensche/vormerkungen');
		await expect(colleague.getByText('E2E Fachmodul')).toHaveCount(0);
	});

	test('a release without the module says so, on the page and at the start', async ({
		asPersona,
		request
	}) => {
		await release(request);

		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/wuensche/vormerkungen');
		const card = page.locator('article').filter({ hasText: semesterName(SEMESTER) });
		await expect(card.getByText('nicht im Bedarf', { exact: true })).toBeVisible();

		await gotoRendered(page, '/');
		const notice = page.getByRole('region', { name: /Vormerkungen/ });
		await expect(notice).toContainText(
			`E2E Fachmodul (${WISHES.programme}, ${semesterName(SEMESTER)})`
		);
	});

	test('a cohort declared after all turns it into a wish', async ({ asPersona, request }) => {
		runSql(
			`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track)
			 SELECT '${COHORT}', s.id, '${WISHES.module}', pr.id, ''
			   FROM semester s, programme pr
			  WHERE s.code = '${SEMESTER}' AND pr.code = '${WISHES.programme}';`,
			'declaring the late cohort'
		);
		// Re-announcing after a late change is the ordinary act, and it is what converts.
		await release(request);

		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/wuensche/vormerkungen');
		const card = page.locator('article').filter({ hasText: semesterName(SEMESTER) });
		await expect(card.getByText('als Wunsch übernommen')).toBeVisible();

		await gotoRendered(page, `/wuensche?semester=${SEMESTER}`);
		const own = page.locator('article').filter({ hasText: semesterName(SEMESTER) });
		await expect(own).toContainText('E2E Fachmodul');
		await expect(own).toContainText('unbedingt');

		// The start page has nothing left to report.
		await gotoRendered(page, '/');
		await expect(page.getByRole('region', { name: /Vormerkungen/ })).toHaveCount(0);
	});
});
