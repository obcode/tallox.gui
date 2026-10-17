import { expect, type Page } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { DIVIDED, dividedStatements } from './seed';

/**
 * Dividing a part and handing one to another faculty, end to end.
 *
 * The case from the request: a module of 4 hours lecture and 4 hours laboratory, half of each
 * given by another faculty. The exception of an exception, so it lives behind the gear of a cohort
 * row — and what has to hold is that the ordinary screen does not change, that another faculty's
 * part cannot be staffed, and that a cohort taught entirely elsewhere is not on the wish screen.
 *
 * Serial, because the steps build on one another.
 */
test.describe.configure({ mode: 'serial' });

const URL = `/zuteilung?semester=${DIVIDED.semester}&fachgruppe=${DIVIDED.subjectGroup}`;
const COHORT = `${DIVIDED.programme}3`;

async function reset() {
	await runSql(dividedStatements().join('\n'), 'resetting the divided-parts fixture');
}

function menu(page: Page) {
	return page.locator(`#part-menu-${DIVIDED.instance}`);
}

async function openMenu(page: Page) {
	await page
		.getByRole('button', {
			name: `Teile von ${DIVIDED.moduleName} in ${COHORT} aufteilen oder abgeben`
		})
		.click();
	await expect(menu(page)).toBeVisible();
}

/** One part's section in the menu, by its heading. */
function section(page: Page, heading: string) {
	return menu(page)
		.locator('section')
		.filter({ has: page.getByRole('heading', { name: new RegExp(`^${heading} ·`) }) });
}

test.describe('dividing a part', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('a cohort nobody divided looks as it always did', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		// One part per kind, folded away behind the switch — no pieces, no badge.
		await expect(page.getByText(/Anteil/)).toHaveCount(0);
		await expect(
			page.getByRole('combobox', {
				name: `Wer hält alle Teile von ${DIVIDED.moduleName} in ${COHORT}`
			})
		).toBeVisible();
	});

	test('the lead cuts half the lecture off and hands it to another faculty', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		await openMenu(page);
		await checkA11y(page);
		await section(page, 'Vorlesung')
			.getByRole('spinbutton', { name: 'SWS, die von Vorlesung abgetrennt werden' })
			.fill('2');
		await section(page, 'Vorlesung').getByRole('button', { name: 'abtrennen' }).click();

		// The piece is a row of its own now, and the cohort shows its parts unasked.
		const piece = page.getByRole('combobox', { name: /^Wer hält Vorlesung – Anteil in / });
		await expect(piece).toBeVisible();

		await openMenu(page);
		await section(page, 'Vorlesung – Anteil')
			.getByRole('textbox', { name: 'Fakultät, die Vorlesung – Anteil hält' })
			.fill('FK 04');
		await section(page, 'Vorlesung – Anteil')
			.getByRole('button', { name: 'an andere Fakultät' })
			.click();

		// Nobody here can be put on it: no dropdown, and it says who gives it.
		await expect(piece).toHaveCount(0);
		await expect(page.getByText('hält FK 04', { exact: true })).toBeVisible();
		await expect(page.getByText(`Ein Teil hält FK 04.`)).toBeVisible();
	});

	test('one name for the cohort fills only our share', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		const cohort = page.getByRole('combobox', {
			name: `Wer hält alle Teile von ${DIVIDED.moduleName} in ${COHORT}`
		});
		// The first candidate: whoever registered interest.
		await cohort.selectOption({ index: 2 });
		await expect(page.getByText(/2 Änderungen gespeichert/)).toBeVisible();

		await gotoRendered(page, URL);
		await expect(page.getByRole('combobox', { name: /^Wer hält Vorlesung in / })).toHaveValue(
			/^p:/
		);
		await expect(page.getByRole('combobox', { name: /^Wer hält Praktikum in / })).toHaveValue(
			/^p:/
		);
		await expect(page.getByText('hält FK 04', { exact: true })).toBeVisible();
	});

	test('a cohort another faculty teaches entirely has nothing to fill', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);
		await expect(page.getByText('hält FK 06', { exact: true }).first()).toBeVisible();
		await expect(
			page.getByRole('combobox', { name: new RegExp(`alle Teile von ${DIVIDED.elsewhereName}`) })
		).toHaveCount(0);
	});

	test('the lecture is put back together', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, URL);

		await openMenu(page);
		await section(page, 'Vorlesung – Anteil')
			.getByRole('button', { name: 'Wieder selbst halten' })
			.click();
		await expect(page.getByText('hält FK 04', { exact: true })).toHaveCount(0);

		await openMenu(page);
		await section(page, 'Vorlesung – Anteil')
			.getByRole('button', { name: 'wieder zusammenführen' })
			.click();
		await expect(
			page.getByRole('combobox', { name: /^Wer hält Vorlesung – Anteil in / })
		).toHaveCount(0);
		await openMenu(page);
		await expect(section(page, 'Vorlesung').getByRole('heading')).toHaveText(/4 SWS/);
	});
});

test.describe('the wish screen', () => {
	test.beforeAll(reset);
	test.afterAll(reset);

	test('does not offer a cohort another faculty teaches entirely', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, `/wuensche?semester=${DIVIDED.semester}`);

		await expect(page.getByText(DIVIDED.moduleName).first()).toBeVisible();
		await expect(page.getByText(DIVIDED.elsewhereName)).toHaveCount(0);
	});
});
