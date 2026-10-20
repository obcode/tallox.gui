import { leadNames, personLabel } from '$lib/subjectGroups';

/**
 * The start page's "who leads what": every programme and every subject group, with the people
 * holding the lead for it.
 *
 * Both lists are readable by every account in the backend — who leads a programme or a group is
 * not confidential inside the faculty, and it is whom a colleague asks. Nothing here is filtered
 * by role, so nothing here pretends to be a permission.
 */

type Lead = { sortName?: string | null; name?: string | null; mail: string };

/**
 * "Prof. Eins und Prof. Zwei", or "noch niemand".
 *
 * The full name rather than the surname-first sort name, because this is running text. Through
 * `personLabel` for the fallback: a lead may have been created by address and carry no name yet,
 * and `leadNames` alone would then render an empty string where a person is.
 */
export function leadLine(leads: readonly Lead[]): string {
	return leadNames(leads.map((l) => ({ name: personLabel({ name: l.name, mail: l.mail }) })));
}

/**
 * The programme's long name, or its code while nobody has typed one.
 *
 * The examination office publishes no long name, so `title` is empty until the faculty enters
 * it — and the backend's schema says to fall back to the code.
 */
export function programmeTitle(programme: { code: string; title: string }): string {
	return programme.title.trim() || programme.code;
}

/** "1 Modul", "12 Module". */
export function moduleCountLabel(count: number): string {
	return count === 1 ? '1 Modul' : `${count} Module`;
}
