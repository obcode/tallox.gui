/**
 * Teachers entered by hand: somebody who teaches and whom the ZPA does not list yet, typically a
 * lecturer on contract won for next semester. The backend keeps them in the same list as everybody
 * the ZPA publishes, so they can be assigned and given competences; the nightly import takes such
 * a row over once the ZPA lists the same address.
 */

/** What the form sends, and what the backend's `LocalTeacherInput` takes. */
export type LocalTeacherInput = {
	surname: string;
	givenName: string;
	mail: string;
	isLecturerOnContract: boolean;
	active: boolean;
};

/**
 * Reads the form, or says what is missing.
 *
 * The backend checks the same and refuses with its own sentence; checking here only saves the
 * round trip for the two mistakes a person actually makes, and keeps what they typed.
 */
export function parseLocalTeacherForm(
	data: FormData
): { input: LocalTeacherInput } | { message: string } {
	const text = (name: string) => String(data.get(name) ?? '').trim();
	const input: LocalTeacherInput = {
		surname: text('surname'),
		givenName: text('givenName'),
		mail: text('mail'),
		isLecturerOnContract: data.get('isLecturerOnContract') === 'on',
		active: data.get('active') !== 'off'
	};
	if (input.surname === '') return { message: 'Bitte einen Nachnamen angeben.' };
	if (!/^[^\s@]+@[^\s@]+$/.test(input.mail)) {
		return { message: 'Bitte eine gültige Mailadresse angeben.' };
	}
	return { input };
}

/**
 * Surname and given name back out of the sort name („Neu, Lehrauftrag“), to fill the form of a
 * row that is to be corrected. The backend builds the sort name from exactly these two, and a
 * name entered here holds no comma, so splitting at the first one gives them back.
 */
export function namesOf(sortName: string): { surname: string; givenName: string } {
	const at = sortName.indexOf(',');
	if (at < 0) return { surname: sortName.trim(), givenName: '' };
	return { surname: sortName.slice(0, at).trim(), givenName: sortName.slice(at + 1).trim() };
}

/** The rows entered by hand, active ones first, then by sort name. */
export function localTeachers<
	T extends { enteredByHand: boolean; active: boolean; sortName: string }
>(teachers: readonly T[]): T[] {
	return teachers
		.filter((t) => t.enteredByHand)
		.sort(
			(a, b) => Number(b.active) - Number(a.active) || a.sortName.localeCompare(b.sortName, 'de')
		);
}
