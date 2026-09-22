import { expect } from '@playwright/test';
import { PERSONAS, gotoRendered, openDropdown, test } from './fixtures';

/**
 * "Kann ich einsehen welche Rollen ich habe?"
 *
 * A beta tester asked it, and the honest answer was no. The navigation only ever *implies* the
 * roles, the role preview in the footer is for administrators, and the banner that names roles
 * appears only while a preview runs — so the one person who could not find out what they held
 * was the person holding it.
 *
 * What the page has to get right is not the list but the **empty** list. `programmes` and
 * `subjectGroupsLed` come back empty for three different reasons, two of them opposites, and
 * rendering all three as "keine" would tell the dean's office the reverse of the truth.
 */
test.describe('my roles', () => {
	test('the entry is in everybody’s own area', async ({ asPersona }) => {
		const page = await asPersona(PERSONAS.zwei);
		await gotoRendered(page, '/');

		// Behind the identity, like the rest of the account area: the bar carries the steps of
		// the process, and below xl it carries them alone.
		await openDropdown(page, /Prof/);
		await expect(
			page.getByRole('banner').getByRole('link', { name: 'Meine Rollen', exact: true })
		).toBeVisible();
	});

	test('a subject group lead sees the groups she leads, and what that lets her do', async ({
		asPersona,
		checkA11y
	}) => {
		const page = await asPersona(PERSONAS.drei);
		await gotoRendered(page, '/konto/rollen');

		await expect(page.getByRole('heading', { name: 'Meine Rollen' })).toBeVisible();
		await expect(page.getByText('Fachgruppenleitung', { exact: true })).toBeVisible();

		// One heading, not two: the card that explains an empty answer and the card that lists a
		// full one carry the same title, and rendering both put an empty card above the list.
		await expect(page.getByRole('heading', { name: 'Geleitete Fachgruppen' })).toHaveCount(1);

		await checkA11y(page);
	});

	test('a study programme lead sees her programmes and no subject group section', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.vier);
		await gotoRendered(page, '/konto/rollen');

		await expect(page.getByRole('heading', { name: 'Studiengänge' })).toHaveCount(1);
		// Not held is not the same as held-and-empty. A section explaining a role she does not
		// have is noise on a page whose whole job is to say what she does have.
		await expect(page.getByRole('heading', { name: 'Geleitete Fachgruppen' })).toHaveCount(0);
	});

	test('the dean’s office is told it reaches everything, not that it has nothing', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.fuenf);
		await gotoRendered(page, '/konto/rollen');

		// The empty list that means the opposite of empty. The backend answers null here because
		// "every programme" includes ones that do not exist yet, and a snapshot would be a lie
		// in a different direction.
		await expect(page.getByText(/Alle Studiengänge/)).toBeVisible();
		await expect(page.getByText(/Alle Fachgruppen/)).toBeVisible();
	});

	test('a lead with no subject group is told what is missing, not that she may not', async ({
		asPersona
	}) => {
		// The state the beta tester is probably in, and the one that looks like a working setup
		// from every other screen: the role is there, the menu shows the area, and every list
		// inside it is empty.
		//
		// Her own persona rather than borrowing Drei's for a moment. The specs run in parallel,
		// so taking a subject group away and putting it back would make the three other files
		// that assert about Drei's leadership fail for a reason invisible in their own source.
		const page = await asPersona(PERSONAS.unassigned);
		await gotoRendered(page, '/konto/rollen');

		await expect(page.getByText(/Noch keiner Fachgruppe zugeordnet/)).toBeVisible();
		// The distinction the backend draws too: "you may not" sends somebody to ask for a role
		// they already hold.
		await expect(page.getByText(/Die Rolle allein erlaubt nichts/)).toBeVisible();
		await expect(page.getByText('Zuordnung fehlt')).toBeVisible();
	});
});
