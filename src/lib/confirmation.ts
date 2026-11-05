/**
 * Confirming one's assignments: „passt so“, once per person and semester.
 *
 * The dean's office sets a due date per semester (`Semester.assignmentConfirmationDue`), by which
 * everybody who teaches is asked to check what they have been given. The state is derived by the
 * backend on every read: a confirmation goes out of date by itself once the person's parts or hours
 * change. Nothing here decides anything — it only says which reminder to show and how to label
 * what the backend answered.
 *
 * The date blocks nothing, in the backend or here: confirming stays possible after it, and the
 * assignment stays open until the semester is finished.
 */

export type ConfirmationState = 'CONFIRMED' | 'OPEN' | 'STALE';

export const CONFIRMATION_LABELS: Record<ConfirmationState, string> = {
	CONFIRMED: 'bestätigt',
	OPEN: 'offen',
	STALE: 'veraltet'
};

/** What each state means, as a tooltip or a sentence. */
export const CONFIRMATION_HINTS: Record<ConfirmationState, string> = {
	CONFIRMED: 'Hat die eigenen Zuteilungen bestätigt, und seitdem hat sich nichts daran geändert.',
	OPEN: 'Hat die eigenen Zuteilungen in diesem Semester noch nicht bestätigt.',
	STALE: 'Hatte bestätigt, aber die Zuteilungen haben sich seitdem geändert.'
};

/** Badge classes: semantic colours are background colours (see CLAUDE.md, contrast). */
export const CONFIRMATION_BADGES: Record<ConfirmationState, string> = {
	CONFIRMED: 'badge-success',
	OPEN: 'badge-ghost',
	STALE: 'badge-warning'
};

/** Today as `YYYY-MM-DD` in Europe/Berlin, the form the API's `Date` travels in. */
export function berlinToday(now: Date = new Date()): string {
	// en-CA formats as YYYY-MM-DD; the time zone is fixed so that a server in UTC agrees with the
	// faculty about which day it is shortly after midnight.
	return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

/** `2026-11-20` → `20.11.2026`. Anything that is not such a date is returned as it came. */
export function formatDueDate(date: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	return m ? `${m[3]}.${m[2]}.${m[1]}` : date;
}

/** Whether a due date is set and not yet passed — the due day itself still counts. */
export function dueIsAhead(due: string | null | undefined, today: string): boolean {
	return !!due && due >= today;
}

export type ReminderInput = {
	due: string | null | undefined;
	state: ConfirmationState;
	/** Whether I hold anything in the semester; with nothing there is nothing to confirm. */
	holds: boolean;
	/** FINAL: the semester is over and confirming is closed. */
	finished: boolean;
	today: string;
};

/**
 * Whether to ask me to confirm: the dean's office has asked, the date has not passed, I hold
 * something, and I have not confirmed what I hold now. Gone the moment I confirm or the date passes,
 * as asked for the start page on 2026-10-29 — after the date the page itself still offers the button.
 */
export function shouldRemind(input: ReminderInput): boolean {
	return (
		input.holds &&
		!input.finished &&
		dueIsAhead(input.due, input.today) &&
		input.state !== 'CONFIRMED'
	);
}

/** Whether the page offers „Passt so“: I hold something, the semester is open, and it is not done. */
export function mayOfferConfirm(holds: boolean, finished: boolean, state: ConfirmationState) {
	return holds && !finished && state !== 'CONFIRMED';
}

export type ConfirmationLike = { personId: string; state: ConfirmationState };

/** The backend's list as a lookup by person. */
export function confirmationsByPerson(
	list: readonly ConfirmationLike[]
): Map<string, ConfirmationState> {
	return new Map(list.map((c) => [c.personId, c.state]));
}

export type HolderLike = { assignee: { personId?: string | null; name: string } };

/**
 * The holders of a cohort with their state, each once, in the order they first appear. Somebody
 * without an account (a teacher from the ZPA list) cannot confirm and is left out rather than shown
 * as „offen“ for ever; so is anybody the backend did not answer for.
 */
export function holderStates(
	held: readonly HolderLike[],
	states: ReadonlyMap<string, ConfirmationState>
): { personId: string; name: string; state: ConfirmationState }[] {
	const out: { personId: string; name: string; state: ConfirmationState }[] = [];
	const seen = new Set<string>();
	for (const h of held) {
		const id = h.assignee.personId;
		if (!id || seen.has(id)) continue;
		const state = states.get(id);
		if (!state) continue;
		seen.add(id);
		out.push({ personId: id, name: h.assignee.name, state });
	}
	return out;
}
