import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { FILING, filingResetSql } from './seed';

/**
 * A subject group lead files modules into her own group and releases them again.
 *
 * The backend has allowed it since the filing rule was widened to the leads; until the screens
 * offered it, the only person who could act on it was an administrator. What these tests hold the
 * screens to is the shape of the rule, which the backend asserts from its own side: **both ends
 * of a move have to be in reach**. A lead pulls in a module that is in no group and releases one
 * of hers; a module under a colleague's group is not hers to touch, so it is not tickable — a
 * batch containing it would be refused as a whole.
 *
 * Serial, because every test moves the same three modules; each starts from the fixture's state.
 */
test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
	runSql(filingResetSql(), 'putting the filing fixture back');
});

const OWN_TARGET = `${FILING.ownGroupCode} — ${FILING.ownGroupName}`;

test.describe('a subject group lead filing modules', () => {
	test('ticks what is in reach, and nothing in a colleague’s group', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module?q=${FILING.programme}`);

		const tick = (name: string) => page.getByRole('checkbox', { name: `${name} auswählen` });
		await expect(tick(FILING.unfiledName)).toBeEnabled();
		await expect(tick(FILING.ownName)).toBeEnabled();
		await expect(tick(FILING.foreignName)).toBeDisabled();

		// Only her own groups as targets — the colleague's is not offered, because filing into it
		// would be refused.
		const target = page.getByLabel('Ausgewählte Module zuordnen zu');
		await expect(target.locator('option', { hasText: FILING.ownGroupCode })).toHaveCount(1);
		await expect(target.locator('option', { hasText: FILING.foreignGroupCode })).toHaveCount(0);
	});

	test('pulls a module that is in no group into her own', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module?q=${FILING.programme}`);

		await page.getByRole('checkbox', { name: `${FILING.unfiledName} auswählen` }).check();
		await page.getByLabel('Ausgewählte Module zuordnen zu').selectOption({ label: OWN_TARGET });
		await page.getByRole('button', { name: 'Zuordnen' }).click();

		// A string rather than a regular expression: the sentence spans several lines in the markup.
		await expect(page.getByText(`1 Modul nach ${FILING.ownGroupCode} verschoben`)).toBeVisible();
	});

	test('releases a module of her own group', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module?q=${FILING.programme}`);

		await page.getByRole('checkbox', { name: `${FILING.ownName} auswählen` }).check();
		await page.getByLabel('Ausgewählte Module zuordnen zu').selectOption('');
		await page.getByRole('button', { name: 'Zuordnen' }).click();

		await expect(page.getByText('1 Modul aus ihrer Fachgruppe genommen')).toBeVisible();

		// And it is now in the work list of modules without a group, where anybody leading a group
		// can pick it up.
		await gotoRendered(page, `/module?q=${FILING.programme}&ohne-fachgruppe=1`);
		await expect(page.getByRole('link', { name: FILING.ownName })).toBeVisible();
	});

	test('releases and files one module on its own page', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module/${FILING.own}`);

		const card = page.locator('form[action="?/subjectGroup"]');
		const picker = card.getByRole('combobox', { name: 'Fachgruppe' });
		const store = card.getByRole('button', { name: 'Speichern' });

		await expect(picker.locator('option', { hasText: FILING.foreignGroupCode })).toHaveCount(0);

		await picker.selectOption('');
		await store.click();
		await expect(page.getByText('Aus der Fachgruppe herausgenommen')).toBeVisible();
		await expect(page.getByText('noch keiner Fachgruppe zugeordnet')).toBeVisible();

		await picker.selectOption({ label: OWN_TARGET });
		await store.click();
		await expect(page.getByText(`Jetzt in ${FILING.ownGroupCode}`)).toBeVisible();
	});

	test('is told why a colleague’s module offers no control', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module/${FILING.foreign}`);

		await expect(page.locator('form[action="?/subjectGroup"]')).toHaveCount(0);
		await expect(page.getByText('die Du nicht leitest')).toBeVisible();
	});

	test('a lead nobody has given a group is offered nothing', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.unassigned);
		await gotoRendered(page, `/module?q=${FILING.programme}`);

		await expect(page.getByRole('link', { name: FILING.unfiledName })).toBeVisible();
		// The row checkboxes, not the filter bar's — those are checkboxes too.
		await expect(page.getByRole('checkbox', { name: /auswählen$/ })).toHaveCount(0);
		await expect(page.getByRole('columnheader', { name: 'Auswahl' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Zuordnen' })).toHaveCount(0);
	});

	test('the catalogue is accessible with the filing controls', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, `/module?q=${FILING.programme}`);
		await checkA11y(page);
	});
});
