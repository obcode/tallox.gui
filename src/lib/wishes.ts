import {
	cohortLabel,
	moduleRows,
	taughtEntirelyElsewhere,
	withTopic,
	type ModuleRow,
	type ReadInstanceLike,
	type SeparateLike
} from './demand';

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

/**
 * How strongly a chosen row is tinted — one hue, three strengths.
 *
 * **One hue and not three colours**, because a priority is an amount and not a judgement.
 * `success`/`warning`/`error` would read as good, careful, bad, and „notfalls" is none of those —
 * it is a colleague offering to fill a gap. Three strengths of `primary` read as more and less,
 * which is what the scale actually is.
 *
 * daisyUI's semantic colour rather than a fixed one, so it follows the theme: a hard-coded green
 * is unreadable on half of the twelve. And a *background* rather than a text colour, which is the
 * rule this repository keeps having to relearn — `text-success` and friends measure between 1.35:1
 * and 3.5:1 on the light themes.
 *
 * # Why 22 and not 35
 *
 * These numbers are a measured ceiling and not a taste. The band runs behind the module name, the
 * cohort label and the hours, so `base-content` has to stay readable on it in all twelve themes —
 * and `primary` is an accent whose own luminance sits mid-way on some of them. On `dim` its green
 * over the dark surface lands at #4d6754, where the theme's light `base-content` measures 3.69:1
 * at 30 %. Above roughly 24 % there is a theme on which *neither* a light nor a dark foreground is
 * safe, because the surface has been pushed into the middle.
 *
 * `tests/contrast.spec.ts` measures this on every theme rather than trusting the sentence, and it
 * is what found the ceiling: 26 % fails on `dim`, 22 % passes everywhere with a step to spare.
 *
 * **What it may never depend on: anybody else's wishes.** The colour of a cell says what *you*
 * chose. Tinting by what other people registered would be the heat map that
 * [[no-wish-aggregates]] was written about — the confidential fact with the names taken out.
 */
export const WISH_PRIORITY_TINTS: Record<WishPriorityValue, string> = {
	FIRST_CHOICE: 'bg-primary/22',
	HAPPY_TO: 'bg-primary/14',
	IF_NEEDED: 'bg-primary/8'
};

/**
 * The tint for one cell, from the wish that is **stored** for it.
 *
 * The stored one and not the one currently picked, now that a change saves itself: the colour then
 * means "this is what the table holds", which is the question somebody scanning it is asking. The
 * gap between picking and saving is one round trip, and during it the picker already shows the new
 * value — so nothing is unanswered, it just is not coloured in yet.
 *
 * An empty string rather than a transparent class: the great majority of cells are empty, and the
 * table should not carry a class per cell to say so.
 */
export function wishTint(choice: WishChoice): string {
	return choice === WISH_NONE ? '' : WISH_PRIORITY_TINTS[choice];
}

/**
 * The strongest of a row's entries, for tinting the row itself.
 *
 * A row can hold two cohorts wanted differently — unbedingt for Zug A, notfalls for Zug B — and a
 * band across the whole row has to be one colour. The strongest wins, because what the band
 * answers is "is there something of mine in this row, and how much", and the weaker cell still
 * says its own thing in its own tint.
 */
export function strongestPriority(
	priorities: readonly (WishPriorityValue | undefined)[]
): WishChoice {
	for (const level of WISH_PRIORITIES) {
		if (priorities.includes(level)) return level;
	}
	return WISH_NONE;
}

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
	/** Which semester the instance is in — carried because the own-entries list groups by it. */
	semester?: string;
	/**
	 * What this cohort costs the faculty, from the backend rather than summed from its parts.
	 *
	 * A shared lecture counts once, at the cohort that holds it, and a sum built in the browser
	 * would count it in both.
	 */
	teachingHours?: number | null;
	programme: { code: string };
	module: { id: string; name: string };
	/** Which seminar the cohort is, for an umbrella module. */
	topic?: string | null;
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
	return withTopic(
		`${cohortLabel(instance.programme.code, instance.programmeSemester, instance.track)} · ${instance.module.name}`,
		instance.topic
	);
}

/** The module fields the wish table reads, on top of what the overview needs. */
export type WishModule = {
	id: string;
	name: string;
	programmeSemester?: number | null;
	subjectGroup?: { id: string; code: string; name: string } | null;
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
export function wishRows(
	instances: readonly ReadInstanceLike<WishModule>[],
	/** The instances the reader has an entry on, which keep their line whatever else is true. */
	entered: ReadonlySet<string> = new Set()
): WishRow[] {
	// A cohort another programme holds is not a second thing to want.
	//
	// It is the same event, seen from the programme whose demand it meets, and it holds no parts —
	// so it arrived here as a second line for the same teaching, at zero hours beside the real
	// figure. Whoever wants to teach it wants the event, and the event is the holder's row: that is
	// also where the part is, and where filling it will happen.
	//
	// The wish therefore lands on the holding cohort. Its subject group is the module's, so the
	// lead who fills the part sees it either way — see the note in tallox.go about what a covered
	// cohort's wishes are visible to.
	//
	// WITH ONE EXCEPTION, AND IT IS NOT A DECORATION
	//
	// A cohort somebody already entered something for keeps its line. Coupling leaves wishes alone
	// — they point at the instance, and the instance survives — so an entry made before the
	// coupling would otherwise be left with nowhere to change or withdraw it: "Meine Eintragungen"
	// lists entries, and the only control for one is the cell in this table. Hiding the row would
	// take somebody's own entry out of their hands, which is the one thing this screen may never
	// do.
	//
	// The same exception for a cohort another faculty teaches entirely: nothing in it is ours to
	// want, and the backend refuses the wish (INSTANCE_TAUGHT_ELSEWHERE). Half of it elsewhere is an
	// ordinary cohort — the wish is for the cohort, and the note says which half.
	return moduleRows(
		instances.filter(
			(instance) =>
				entered.has(instance.id) ||
				(!instance.coveredBy?.acceptedAt && !taughtEntirelyElsewhere(instance.parts))
		)
	);
}

/**
 * The other programmes a row's teaching is held for, as one deduplicated list.
 *
 * Read off the cohorts' `covers`, which is per instance because that is what the backend has.
 * "This event also serves GS" is true of the row.
 */
export function heldForOthers(row: WishRow): SeparateLike[] {
	const seen = new Set<string>();
	const out: SeparateLike[] = [];
	for (const cohort of row.cohorts) {
		for (const covered of cohort.covers ?? []) {
			if (!covered.acceptedAt || seen.has(covered.instance.id)) continue;
			seen.add(covered.instance.id);
			out.push(covered.instance);
		}
	}
	return out;
}

/**
 * Which column a cohort belongs in.
 *
 * A module that runs once has **no** track — that is the ordinary case and the one the cohort
 * label reads best for (`IF3`, not `IF3A`). In this table it belongs in the first column all the
 * same: a screen with a "Zug" column beside "Zug A" and "Zug B" asks the reader to work out that
 * the first two are the same thing. The single cohort is Zug A.
 *
 * Only the *column* is renamed, never the cohort: `track` stays empty on the instance and in its
 * label, because the day it becomes two cohorts the first one is named A for real — by the demand
 * screen, in the database — and a label that had said A all along would make that a no-op nobody
 * can see.
 */
export function trackColumn(track: string): string {
	return track === '' ? 'A' : track;
}

/**
 * The cohort columns the table needs: every track that occurs, in order.
 *
 * Fixed columns rather than a list inside each row, because that is what makes the table readable
 * across rows — "who is down for Zug B" is a column somebody runs their eye down, and a ragged
 * row of chips is not. A row that does not run in a column's track shows nothing there.
 */
export function trackColumns(rows: readonly WishRow[]): string[] {
	const tracks = new Set<string>();
	for (const row of rows) {
		// A seminar's row holds its one cohort in the first column, whatever its letter.
		for (const cohort of row.cohorts) tracks.add(row.topic ? 'A' : trackColumn(cohort.track));
	}
	return [...tracks].sort((a, b) => a.localeCompare(b, 'de'));
}

/** What a track column is called. */
export function trackHeading(track: string): string {
	return `Zug ${trackColumn(track)}`;
}

/**
 * The row's cohort in that column, or undefined when it does not run there.
 *
 * The exact track first and the unnamed one only as a fall-back. The two cannot both occur in one
 * row — the demand screen names the cohorts A and B the moment there are two of them — but a
 * lookup that preferred the unnamed one would hide a real cohort A rather than fail, and a cell
 * nobody can enter a wish into is worse than an error.
 */
export function cohortIn(row: WishRow, track: string) {
	if (row.topic) return track === 'A' ? row.cohorts[0] : undefined;
	return (
		row.cohorts.find((cohort) => cohort.track === track) ??
		row.cohorts.find((cohort) => trackColumn(cohort.track) === track)
	);
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
 * The rows of the backend's wish list that the wish screen may show: none before publication.
 *
 * The backend's rule is owner ∨ published ∨ responsible, and it is right — the subject group lead
 * and the programme lead need the unpublished entries to assign. But the wish screen is where they
 * register **their own** interest, as lecturers, alongside everybody else. Showing them there who
 * else wants the same cohort is the head start the confidentiality exists to prevent: a lead who
 * sees a newcomer's name before entering is exactly the race the rule was written against.
 *
 * So the permission is used on the assignment screen and not here. Dropped in the server load, so
 * the rows never reach the browser — this is not a security boundary (the API still answers the
 * lead), it is the choice of which screen exercises a permission somebody holds.
 */
export function othersForWishScreen<T>(
	publishedAt: string | null | undefined,
	wishes: readonly T[] | null | undefined
): T[] {
	return publishedAt ? [...(wishes ?? [])] : [];
}

/**
 * Other people's entries, per instance.
 *
 * Built by dropping the caller's own rows from what the backend returned — **never by counting**.
 * On the wish screen this is empty for everybody before the publication date (see
 * `othersForWishScreen`), and that emptiness is the rule working rather than a fact about who is
 * interested. The page says so in words rather than rendering a zero.
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
		return 'Dieses Semester ist vorbei — Wünsche lassen sich nicht mehr ändern.';
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
		case 'REVIEW':
			return 'Die Instanzen sind besetzt, die Studiengangsleitungen prüfen gerade. Ändern geht weiter — sag der Fachgruppenleitung Bescheid, damit es ankommt.';
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
export function othersHint(
	publishedAt: string | null | undefined,
	/**
	 * Whether this person leads at least one subject group.
	 *
	 * A lead reads the unpublished entries on her groups' modules — on the assignment screen, not
	 * here (see `othersForWishScreen`). The sentence says where, so that the absence on this page
	 * does not read as a missing permission; it says nothing about the entries themselves.
	 */
	leadsGroups = false
): string {
	if (publishedAt) {
		return 'Die Wünsche sind veröffentlicht: hier steht, wer sich außerdem eingetragen hat.';
	}
	const rule =
		'Bis zur Veröffentlichung sind die Eintragungen anderer hier nicht sichtbar — auch nicht als ' +
		'Anzahl. Das ist Absicht: niemand soll sich fragen müssen, ob ein Fach schon „besetzt" ist, ' +
		'bevor man sich einträgt.';
	if (leadsGroups) {
		return (
			rule +
			' Das gilt auch für Fachgruppenleitungen: die Eintragungen für Deine Fachgruppen stehen ' +
			'unter Zuteilung, nicht auf der Seite, auf der Du Dich selbst einträgst.'
		);
	}
	return rule;
}

/** One semester's worth of somebody's own entries. */
export type OwnWishSemester = {
	/** `2027-SS`. */
	code: string;
	wishes: WishLike[];
	/**
	 * What the entries of this semester add up to.
	 *
	 * **An upper bound and not a promise.** It is what the wished-for cohorts cost the faculty, and
	 * a wish is for the cohort — which part somebody ends up holding is settled in the assignment,
	 * and "nur die Vorlesung" in a note is exactly the case where the figure is too high. Worth
	 * showing anyway: somebody entering four things wants to know roughly what they have offered,
	 * and the alternative is that they add it up on paper.
	 *
	 * One's own number and nobody else's, which is what makes it sayable on this screen at all.
	 */
	teachingHours: number;
};

/**
 * The caller's own entries, grouped by the semester they are in.
 *
 * Across every semester and not only the one on screen: somebody who entered something for the
 * summer term and then moved the picker to the winter term has not withdrawn it, and a list that
 * showed nothing would say they had. The backend answers this without a semester argument, which
 * it may because own entries do not go through the confidentiality rule at all.
 *
 * Chronological, which is what sorting the codes as text gives — that is what the format is for.
 * A wish whose instance did not carry its semester lands under an empty heading rather than being
 * dropped; losing somebody's own entry to a missing field would be worse than an odd heading.
 */
export function ownWishesBySemester(wishes: readonly WishLike[]): OwnWishSemester[] {
	const bySemester = new Map<string, OwnWishSemester>();

	for (const wish of wishes) {
		const code = wish.instance.semester ?? '';
		const hours = wish.instance.teachingHours ?? 0;
		const existing = bySemester.get(code);
		if (existing) {
			existing.wishes.push(wish);
			existing.teachingHours += hours;
			continue;
		}
		bySemester.set(code, { code, wishes: [wish], teachingHours: hours });
	}

	return [...bySemester.values()].sort((a, b) => a.code.localeCompare(b.code));
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

/**
 * Which subject groups have shut their wish round.
 *
 * Built from the exceptions the backend answers with, so the reading that matters is the one that
 * is not in the data: **a group that is not in this set is open**, and so is a module in no subject
 * group at all. Taking the list as "the open ones" is the mistake its shape invites, and it would
 * shut the whole faculty.
 */
export function closedSubjectGroups(
	windows: { open: boolean; subjectGroup: { id: string } }[]
): Set<string> {
	const closed = new Set<string>();
	for (const window of windows) {
		if (!window.open) closed.add(window.subjectGroup.id);
	}
	return closed;
}

/** Which study programmes have announced their demand as settled, by code. */
export function settledProgrammes(completions: { programme: { code: string } }[]): Set<string> {
	return new Set(completions.map((c) => c.programme.code));
}

/**
 * Why this row takes no entries, or null when it does.
 *
 * Only the subject group's own door. A finished semester closes the whole page and is said once at
 * the top — repeating it on every row would be noise, and it was: the sentence appeared twice and
 * an end-to-end test found it as two elements.
 *
 * That is the rule this follows rather than an exception to it. What holds for the whole screen
 * belongs at its head; what differs per row belongs in the row. The wish window differs per row,
 * because two modules in the table can be in different subject groups.
 *
 * A sentence rather than a boolean, because the repair is a person: this subject group's lead, and
 * not whoever runs the process. The backend refuses either way; saying so *before* somebody types
 * is what this is for.
 */
export function rowClosedReason(
	row: { module: { subjectGroup?: { id: string; name: string } | null } },
	closed: Set<string>
): string | null {
	const group = row.module.subjectGroup;
	if (group && closed.has(group.id)) {
		return `Die Wunschphase der Fachgruppe ${group.name} ist derzeit geschlossen. Die Fachgruppenleitung kann sie wieder öffnen.`;
	}
	return null;
}

/**
 * What a row says about the state of its programme's demand.
 *
 * Null when the programme has announced it as settled, because at that point the ordinary state
 * needs no label — a mark on every row would be noise on the rows that matter most.
 *
 * The sentence deliberately does not say "warte noch": registering interest in a programme that is
 * still working on its demand is allowed and often sensible, and this is an orientation rather
 * than a warning.
 */
export function demandStateHint(
	row: { programme: { code: string } },
	settled: Set<string>
): string | null {
	if (settled.has(row.programme.code)) return null;
	return 'Bedarf noch in Arbeit';
}

/**
 * What somebody typed into "how many hours would you like to teach": a number in half hours from
 * 0 to 40, with a comma or a point, or nothing to take the figure back.
 *
 * The backend refuses the same range; this is here so the field can say what is wrong before a
 * round trip, and so "12,5" — how the faculty writes it — is not read as a typo.
 */
export function parseDesiredHours(text: string): number | null | 'invalid' {
	const trimmed = text.trim().replace(',', '.');
	if (trimmed === '') return null;
	if (!/^\d{1,2}(\.\d)?$/.test(trimmed)) return 'invalid';
	const hours = Number(trimmed);
	if (hours > 40 || (hours * 2) % 1 !== 0) return 'invalid';
	return hours;
}

/** A figure the way the faculty writes it: "12", "12,5". */
export function desiredHoursLabel(hours: number): string {
	return hours.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

/**
 * How strongly the reader wants a priority, as a sort key: 0 for unbedingt, then 1, then 2.
 *
 * Undefined without an entry, so the row goes last in both directions. Ascending therefore puts
 * the strongest first, which is what a click on the column head should show.
 *
 * **Only ever fed with the reader's own wishes.** Sorting by anybody else's would show, by order
 * alone, where the others have entered something — see [[no-wish-aggregates]].
 */
export function ownPriorityRank(priority: WishPriorityValue | undefined): number | undefined {
	return priority === undefined ? undefined : WISH_PRIORITIES.indexOf(priority);
}

/** The sortable columns of the wish table: the three fixed ones and one per track. */
export type WishSortKey = 'group' | 'module' | 'hours' | `track:${string}`;

/** The sort key of a track column. */
export function trackSortKey(track: string): WishSortKey {
	return `track:${track}`;
}

/**
 * What a column of the wish table sorts by.
 *
 * A track column sorts by the reader's **own** priority in that cohort, from `mine` — never from
 * the other people's entries, which this function deliberately does not take.
 */
export function wishSortValue(
	mine: ReadonlyMap<string, Pick<WishLike, 'priority'>>
): (key: WishSortKey) => (row: WishRow) => string | number | undefined {
	return (key) => {
		if (key === 'group') return studyGroupLabel;
		if (key === 'module') return (row) => row.module.name;
		if (key === 'hours') return (row) => row.teachingHours;
		const track = key.slice('track:'.length);
		return (row) => {
			const cohort = cohortIn(row, track);
			return ownPriorityRank(cohort ? mine.get(cohort.instanceId)?.priority : undefined);
		};
	};
}

/** The sortable columns of the caller's own list. */
export type OwnWishSortKey = 'label' | 'priority' | 'note';

export const OWN_WISH_SORT: Record<
	OwnWishSortKey,
	(wish: WishLike) => string | number | undefined
> = {
	label: (wish) => wishRowLabel(wish.instance),
	priority: (wish) => ownPriorityRank(wish.priority),
	note: (wish) => wish.note
};
