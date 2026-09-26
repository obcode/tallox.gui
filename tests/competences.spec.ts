import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, test } from './fixtures';
import { runSql } from './psql';
import { ASSIGNMENTS, COMPETENCES, competenceStatements } from './seed';

/**
 * The competence profile, end to end: a member states what she can teach, the lead of the group
 * sees it — and a colleague does not — and the pool shows up where the assignment is made.
 *
 * Neun is the member (see the fixture for why her), Drei leads the group, Zwei is the colleague
 * the confidentiality protects against.
 *
 * Serial, because the tests build on one another's statements.
 */
test.describe.configure({ mode: 'serial' });

const POOL = `/zuteilung/kompetenzen?fachgruppe=${COMPETENCES.subjectGroup}`;
const NOTE = 'nur die Übung';

test.beforeAll(() => runSql(competenceStatements().join('\n'), 'resetting the competences'));
test.afterAll(() => runSql(competenceStatements().join('\n'), 'resetting the competences'));

test.describe('competences', () => {
	test('a member states one, and the minimum is a hint', async ({ asPersona, checkA11y }) => {
		const page = await asPersona(PERSONAS.unassigned);
		await gotoRendered(page, '/konto/kompetenzen');

		await expect(page.getByRole('heading', { name: 'Meine Kompetenzen', level: 1 })).toBeVisible();
		const group = page.getByRole('region', { name: new RegExp(COMPETENCES.subjectGroupCode) });
		await expect(group).toBeVisible();

		// Compulsory first: it is what the faculty asks for.
		const rows = group.getByRole('row');
		await expect(rows.nth(1)).toContainText(COMPETENCES.compulsoryName);
		await expect(rows.nth(1)).toContainText('Pflicht');
		await expect(group.getByText('0 von mindestens 3 Pflichtfächern')).toBeVisible();

		await group
			.getByRole('combobox', { name: `Stufe für ${COMPETENCES.compulsoryName}` })
			.selectOption('CAN_TEACH');
		await group.getByRole('textbox', { name: `Notiz zu ${COMPETENCES.compulsoryName}` }).fill(NOTE);
		await group
			.getByRole('combobox', { name: `Stufe für ${COMPETENCES.electiveName}` })
			.selectOption('WOULD_LIKE');
		await page.getByRole('button', { name: 'Speichern' }).click();

		await expect(page.getByText('2 Änderungen gespeichert.')).toBeVisible();
		// The elective counts for nothing: one of three.
		await expect(group.getByText('1 von mindestens 3 Pflichtfächern')).toBeVisible();

		// And it is stored, not just shown.
		await gotoRendered(page, '/konto/kompetenzen');
		await expect(
			page.getByRole('combobox', { name: `Stufe für ${COMPETENCES.compulsoryName}` })
		).toHaveValue('CAN_TEACH');
		await expect(
			page.getByRole('textbox', { name: `Notiz zu ${COMPETENCES.compulsoryName}` })
		).toHaveValue(NOTE);

		// Saving again without a change says so, and changes nothing.
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByText('Es gab nichts zu speichern.')).toBeVisible();

		await checkA11y(page);
	});

	test('the lead of the group sees the pool, the gaps and who is below', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, POOL);

		const pool = page.getByRole('region', { name: /Wer kann was/ });
		const compulsory = pool.getByRole('row', { name: new RegExp(COMPETENCES.compulsoryName) });
		await expect(compulsory).toContainText(new RegExp(`Neun \\(${NOTE}\\)`));
		const elective = pool.getByRole('row', { name: new RegExp(COMPETENCES.electiveName) });
		await expect(elective).toContainText('Neun');

		// Nobody can teach the elective — only "würde gern" — so it is a gap.
		const gaps = page.getByRole('region', { name: 'Wenn es brennt, kann es niemand' });
		await expect(gaps).toContainText(COMPETENCES.electiveName);
		await expect(gaps).not.toContainText(COMPETENCES.compulsoryName);

		const below = page.getByRole('region', { name: 'Unter den erbetenen Pflichtfächern' });
		await expect(below).toContainText('Neun');
		await expect(below).toContainText('1 von 3');

		await checkA11y(page);
	});

	test('a colleague sees nothing of it', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);

		// Not offered the page's group — and the backend answers the rows with nothing and the
		// counts with a refusal if the address is typed in anyway.
		await gotoRendered(page, POOL);
		await expect(page.getByText('Du leitest keine Fachgruppe.')).toBeVisible();
		await expect(page.getByText(/Neun/)).toHaveCount(0);

		// Nor on her own page, where only her own statements are.
		await gotoRendered(page, '/konto/kompetenzen');
		await expect(page.getByText(/Neun/)).toHaveCount(0);
		await expect(page.getByText(NOTE)).toHaveCount(0);
	});

	test('the lead enters for a lecturer without an account, and removes it', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, POOL);

		const teacher = page.getByRole('region', { name: 'Für Lehrende ohne Konto eintragen' });
		await teacher.getByRole('searchbox', { name: 'Person suchen' }).fill('Kompetenz');
		await teacher.getByRole('button', { name: 'Suchen' }).click();

		await teacher.getByRole('combobox', { name: 'Modul' }).selectOption({
			label: COMPETENCES.electiveName
		});
		await teacher.getByRole('combobox', { name: 'Stufe' }).selectOption('CAN_TEACH');
		await teacher.getByRole('button', { name: 'Eintragen' }).click();

		const pool = page.getByRole('region', { name: /Wer kann was/ });
		const elective = pool.getByRole('row', { name: new RegExp(COMPETENCES.electiveName) });
		await expect(elective).toContainText(COMPETENCES.teacherName);
		await expect(elective).toContainText('ohne Konto');
		// Somebody can teach it now, so it is no longer a gap.
		await expect(
			page.getByRole('region', { name: 'Wenn es brennt, kann es niemand' })
		).not.toContainText(COMPETENCES.electiveName);

		await elective
			.getByRole('button', {
				name: `${COMPETENCES.teacherName} bei ${COMPETENCES.electiveName} entfernen`
			})
			.click();
		await expect(elective).not.toContainText(COMPETENCES.teacherName);
	});

	test('the pool is offered where the assignment is made', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(
			page,
			`/zuteilung?semester=${ASSIGNMENTS.semester}&fachgruppe=${COMPETENCES.subjectGroup}`
		);

		const chooser = page.getByRole('combobox', {
			name: new RegExp(`^Wer hält alle Teile von ${COMPETENCES.compulsoryName}`)
		});
		await expect(
			chooser.getByRole('option', { name: new RegExp(`Neun \\(kann halten · ${NOTE}\\)`) })
		).toHaveCount(1);
	});
});
