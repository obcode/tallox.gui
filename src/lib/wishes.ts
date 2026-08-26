import { cohortLabel, moduleRows, type ModuleRow, type ReadInstanceLike } from './demand';

/**
 * The wish phase — registering interest in a course instance.
 *
 * Pure logic only, so it can be tested without a browser; the page imports it back.
 *
 * **What this module must never contain: anything that counts wishes.** Not a total, not a
 * "somebody is already interested" flag, not a sort by how many people want something. Before the
 * publication date the backend answers with the rows the caller may see and nothing else — so a
 * number built here would be both wrong (it counts a filtered list) and telling (it varies with
 * who is looking). See `no-wish-aggregates` in the memory directory; this is the screen that
 * memo was written about.
 *
 * # The shape of the screen
 *
 * One row per module and study programme, a column per cohort. That is the table the faculty
 * planned in for years — in Confluence, as the view everybody had — and it is the granularity
 * people think in: „ich würde Softwareentwicklung II machen", not „ich würde die zweite
 * Praktikumsgruppe von IF2B machen". A wish points at the instance for the same reason, and which
 * part somebody ends up holding is settled in the assignment.
 */

/** The three levels, most wanted first. Mirrors domain.AllWishPriorities. */
export const WISH_PRIORITIES = ['FIRST_CHOICE', 'HAPPY_TO', 'IF_NEEDED'] as const;

export type WishPriorityValue = (typeof WISH_PRIORITIES)[number];

/**
 * The absence of a wish, as a form value.
 *
 * A cell is a `<select>` with four options rather than a checkbox plus a level, because "nicht
 * eingetragen" and "wie sehr" are one decision to the person filling the table in. The empty
 * string is what an unset `<select>` submits anyway, so the fourth option needs no special case
 * on the way in — and choosing it is how a wish is withdrawn.
 */
export const WISH_NONE = '';

/** What a cell may hold: one of the three levels, or nothing. */
export type WishChoice = WishPriorityValue | typeof WISH_NONE;

/**
 * What each level is called in German.
 *
 * The translation happens here and only here — the backend's enum is English like the rest of
 * its code, and these are the words the faculty actually uses.
 */
export const WISH_PRIORITY_LABELS: Record<WishPriorityValue, string> = {
	FIRST_CHOICE: 'unbedingt',
	HAPPY_TO: 'gerne',
	IF_NEEDED: 'notfalls'
};

/** What the empty option reads as. Not „nein" — nobody is refusing anything by leaving it alone. */
export const WISH_NONE_LABEL = '—';

/** The sentence under the picker, so nobody has to guess what the middle one means. */
export const WISH_PRIORITY_HINTS: Record<WishPriorityValue, string> = {
	FIRST_CHOICE: 'Darum bitte ich ausdrücklich.',
	HAPPY_TO: 'Mache ich gern — die übliche Antwort.',
	IF_NEEDED: 'Übernehme ich, wenn sonst eine Lücke bliebe.'
};

/** Whether a string is one of the three. Guards a value coming back out of a form. */
export function isWishPriority(value: string): value is WishPriorityValue {
	return (WISH_PRIORITIES as readonly string[]).includes(value);
}

/** Whether a string is one of the three or the empty choice. */
export function isWishChoice(value: string): value is WishChoice {
	return value === WISH_NONE || isWishPriority(value);
}

export type WishInstanceLike = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	programme: { code: string };
	module: { id: string; name: string };
};

export type WishLike = {
	id: string;
	priority: WishPriorityValue;
	note: string;
	person: { mail: string; name: string };
	instance: WishInstanceLike;
};

/**
 * How a wished-for instance reads in one line: `IF3A · Analysis`.
 *
 * The cohort first, because that is what somebody recognises in a list of their own entries — an
 * id is not, and in the table itself the module name is already the row.
 */
export function wishRowLabel(instance: WishInstanceLike): string {
	return `${cohortLabel(instance.programme.code, instance.programmeSemester, instance.track)} · ${instance.module.name}`;
}

/** The module fields the wish table reads, on top of what the overview needs. */
export type WishModule = {
	id: string;
	name: string;
	programmeSemester?: number | null;
	subjectGroup?: { id: string; code: string } | null;
};

/** One row of the wish table: a module in a study programme, with its cohorts. */
export type WishRow = ModuleRow<WishModule>;

/**
 * The rows of the table, in reading order.
 *
 * `moduleRows` and not a second grouping of its own: this is the same row the demand overview
 * shows, and somebody reading both screens has to find the same list on each. What differs is the
 * columns — there, what the cohort consists of; here, whether you want it.
 */
export function wishRows(instances: readonly ReadInstanceLike<WishModule>[]): WishRow[] {
	return moduleRows(instances);
}

/**
 * The cohort columns the table needs: every track that occurs, in order.
 *
 * Fixed columns rather than a list inside each row, because that is what makes the table readable
 * across rows — "who is down for Zug B" is a column somebody runs their eye down, and a ragged
 * row of chips is not. A module offered once has an empty track and gets the first column; a row
 * that does not run in a column's track shows nothing there.
 */
export function trackColumns(rows: readonly WishRow[]): string[] {
	const tracks = new Set<string>();
	for (const row of rows) {
		for (const cohort of row.cohorts) tracks.add(cohort.track);
	}
	return [...tracks].sort((a, b) => a.localeCompare(b, 'de'));
}

/**
 * What a track column is called.
 *
 * `Zug A`, and plain `Zug` for the modules that run once — "Zug " with nothing after it reads as a
 * missing value, and this column is not missing anything.
 */
export function trackHeading(track: string): string {
	return track === '' ? 'Zug' : `Zug ${track}`;
}

/** The row's cohort in that column, or undefined when it does not run there. */
export function cohortIn(row: WishRow, track: string) {
	return row.cohorts.find((cohort) => cohort.track === track);
}

/**
 * The leftmost column: which cohorts this row is about, as one string.
 *
 * `IF2A / IF2B` — the same shape the Confluence table used, and the reason it is one column
 * rather than repeated in every cell: the row is a subject being offered, and the cohorts are how
 * often.
 */
export function studyGroupLabel(row: WishRow): string {
	return row.cohorts.map((cohort) => cohort.label).join(' / ');
}

/**
 * Split the rows into "my subjects" and the rest.
 *
 * **A preselection and not a rule.** The backend refuses nothing here: FWP wildcards, teaching for
 * another programme and simply moving into a new subject are all real, and the repair for the last
 * one is joining the subject group rather than meeting a refusal. So the rest stays reachable and
 * the screen says so.
 *
 * A module in no subject group at all lands in "the rest" — it is nobody's subject yet, which in
 * October is most of the catalogue.
 */
export function splitByMySubjects(
	rows: readonly WishRow[],
	mySubjectGroupCodes: readonly string[]
): { mine: WishRow[]; others: WishRow[] } {
	const mine: WishRow[] = [];
	const others: WishRow[] = [];

	for (const row of rows) {
		const code = row.module.subjectGroup?.code;
		if (code != null && mySubjectGroupCodes.includes(code)) {
			mine.push(row);
		} else {
			others.push(row);
		}
	}
	return { mine, others };
}

/**
 * Index the caller's own wishes by the instance they are on.
 *
 * Own entries only — never a map over everybody's, which is how a "somebody is interested" mark
 * would get built by accident. What a cell shows is whether *you* asked for it.
 */
export function myWishByInstance(wishes: readonly WishLike[]): Map<string, WishLike> {
	return new Map(wishes.map((w) => [w.instance.id, w]));
}

/**
 * Other people's entries, per instance.
 *
 * Built by dropping the caller's own rows from what the backend returned — **never by counting**.
 * Before the publication date this is empty for everybody who is not responsible for the instance,
 * and that emptiness is the rule working rather than a fact about who is interested. The page says
 * so in words rather than rendering a zero.
 *
 * A plain record rather than a Map: it is rebuilt whole on every change and never mutated in
 * place, and `svelte/prefer-svelte-reactivity` has no way to tell the two apart.
 */
export function othersByInstance(
	wishes: readonly WishLike[],
	myMail: string | null | undefined
): Record<string, WishLike[]> {
	const byInstance: Record<string, WishLike[]> = {};
	for (const wish of wishes) {
		if (myMail != null && wish.person.mail === myMail) continue;
		byInstance[wish.instance.id] = [...(byInstance[wish.instance.id] ?? []), wish];
	}
	return byInstance;
}

/**
 * Whether wishes may still be entered or changed in this semester.
 *
 * Open for as long as the semester is **not finished** — through the demand planning, the wish
 * phase and the assignment. Not only in the wish phase: somebody saying in March that they would
 * take the second cohort after all is a correction, and a correction the tool refuses happens in a
 * mail instead, after which the list the tool holds is the wrong one.
 *
 * Cosmetic, like every phase check here: the backend refuses a late write with WISH_PHASE_CLOSED
 * through both doors. Worth doing so that a finished semester reads as a state of the process
 * rather than as a form that fails.
 */
export function wishesAreOpen(phase: string | null | undefined): boolean {
	return phase != null && phase !== 'FINAL';
}

/**
 * What to say when they may not.
 *
 * One case, because there is one closed phase — and its sentence says the semester is over rather
 * than that the window has passed. There is nothing here the reader can repair, and pretending
 * otherwise would send them looking for a deadline they missed.
 */
export function closedPhaseHint(phase: string | null | undefined): string {
	if (phase === 'FINAL') {
		return 'Dieses Semester ist abgeschlossen — die Zuteilung ist erfolgt, Wünsche lassen sich nicht mehr ändern.';
	}
	return 'Wünsche lassen sich in diesem Semester gerade nicht eintragen.';
}

/**
 * What to say while they may — which is most of the time, and worth saying, because "you may
 * enter a wish now" is not obvious from a form that is simply not disabled.
 *
 * The wish phase is the one somebody is *asked* to do it in; before and after, it is a correction
 * they are allowed to make. Saying which of the two it is stops the open form during the
 * assignment from reading like an oversight.
 */
export function openPhaseHint(phase: string | null | undefined): string {
	switch (phase) {
		case 'DEMAND_PLANNING':
			return 'Der Bedarf wird gerade erst festgelegt — was hier steht, kann sich noch ändern. Eintragen kannst Du Dich trotzdem schon.';
		case 'WISHES':
			return 'Die Wunschphase läuft. Jetzt ist der Zeitpunkt, sich einzutragen.';
		case 'ASSIGNMENT':
			return 'Die Zuteilung läuft bereits. Ändern geht weiter — sag der Fachgruppenleitung am besten Bescheid, damit es ankommt.';
		default:
			return '';
	}
}

/**
 * What to say about other people's entries, before and after the publication date.
 *
 * The sentence exists because the empty list needs an explanation that is not "nobody is
 * interested" — which would be a statement about other people's wishes, i.e. exactly the thing
 * that may not be said.
 */
export function othersHint(publishedAt: string | null | undefined): string {
	if (publishedAt) {
		return 'Die Wünsche sind veröffentlicht: hier steht, wer sich außerdem eingetragen hat.';
	}
	return (
		'Bis zur Veröffentlichung sind die Eintragungen anderer nicht sichtbar — auch nicht als ' +
		'Anzahl. Das ist Absicht: niemand soll sich fragen müssen, ob ein Fach schon „besetzt" ist, ' +
		'bevor er sich einträgt.'
	);
}

/** One cell as it comes back out of the form. */
export type WishEntry = {
	instanceId: string;
	priority: WishChoice;
	note: string;
};

/** What the caller has stored for one instance, as the diff below needs it. */
export type StoredWish = {
	id: string;
	instanceId: string;
	priority: WishPriorityValue;
	note: string;
};

/** What has to happen to one instance for the form to become the stored state. */
export type WishChange =
	| { kind: 'set'; instanceId: string; priority: WishPriorityValue; note: string }
	| { kind: 'withdraw'; instanceId: string; wishId: string };

/**
 * What changed between what is stored and what came back from the form.
 *
 * The whole table is one form and one save, the way the Confluence table was filled in: somebody
 * goes down the list, ticks four things and is done. So the server is handed the complete state of
 * every cell and works out the difference itself, rather than being told what to do — a form that
 * carried the previous value in a hidden field per cell would be telling the server what it
 * already knows, and would be wrong the moment two browser tabs are open.
 *
 * Cells that did not change produce nothing, which is what keeps a save from being several hundred
 * mutations.
 */
export function wishChanges(
	entries: readonly WishEntry[],
	stored: readonly StoredWish[]
): WishChange[] {
	const byInstance = new Map(stored.map((w) => [w.instanceId, w]));
	const changes: WishChange[] = [];

	for (const entry of entries) {
		const current = byInstance.get(entry.instanceId);

		if (entry.priority === WISH_NONE) {
			// Nothing there and nothing wanted is the ordinary state of nearly every cell.
			if (current) {
				changes.push({ kind: 'withdraw', instanceId: entry.instanceId, wishId: current.id });
			}
			continue;
		}
		if (current && current.priority === entry.priority && current.note === entry.note) {
			continue;
		}
		changes.push({
			kind: 'set',
			instanceId: entry.instanceId,
			priority: entry.priority,
			note: entry.note
		});
	}
	return changes;
}

/**
 * What to say after a save.
 *
 * Counts the caller's own entries and nobody else's, which is what makes a number sayable here at
 * all. "3 Änderungen gespeichert" is about what they just did.
 */
export function savedHint(changes: number): string {
	if (changes === 0) return 'Es gab nichts zu speichern — die Tabelle stand schon so.';
	if (changes === 1) return 'Eine Änderung gespeichert.';
	return `${changes} Änderungen gespeichert.`;
}
