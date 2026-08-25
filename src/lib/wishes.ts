import { cohortLabel, partLabel, type PartLike } from './demand';

/**
 * The wish phase — registering interest in an instance part.
 *
 * Pure logic only, so it can be tested without a browser; the page imports it back.
 *
 * **What this module must never contain: anything that counts wishes.** Not a total, not a
 * "somebody is already interested" flag, not a sort by how many people want a part. Before the
 * publication date the backend answers with the rows the caller may see and nothing else — so a
 * number built here would be both wrong (it counts a filtered list) and telling (it varies with
 * who is looking). See `no-wish-aggregates` in the memory directory; this is the screen that
 * memo was written about.
 */

/** The three levels, most wanted first. Mirrors domain.AllWishPriorities. */
export const WISH_PRIORITIES = ['FIRST_CHOICE', 'HAPPY_TO', 'IF_NEEDED'] as const;

export type WishPriorityValue = (typeof WISH_PRIORITIES)[number];

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

export type WishInstanceLike = {
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
	part: PartLike & { id: string };
	instance: WishInstanceLike;
};

/**
 * How a wished-for part reads in one line: `IF3A · Vorlesung 2 SWS`.
 *
 * The cohort first, because that is what somebody recognises — a part id is not, and the module
 * name is already the heading of the group it sits under.
 */
export function wishRowLabel(instance: WishInstanceLike, part: PartLike): string {
	return `${cohortLabel(instance.programme.code, instance.programmeSemester, instance.track)} · ${partLabel(part)}`;
}

export type OfferedPart = {
	id: string;
	kind: PartLike['kind'];
	teachingHours?: number | null;
};

export type OfferedInstance = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	programme: { code: string };
	module: { id: string; name: string; subjectGroup?: { id: string; code: string } | null };
	parts: readonly OfferedPart[];
};

/** One module's instances, as the wish screen groups them. */
export type WishGroup = {
	moduleId: string;
	moduleName: string;
	subjectGroupCode: string | null;
	instances: OfferedInstance[];
};

/**
 * Group the offered instances by module, in reading order.
 *
 * By module rather than by cohort, because that is how somebody looks for something: they know
 * they want to teach Analysis, not that they want IF3B specifically. The cohorts sit inside.
 */
export function groupByModule(instances: readonly OfferedInstance[]): WishGroup[] {
	const groups = new Map<string, WishGroup>();

	for (const instance of instances) {
		const existing = groups.get(instance.module.id);
		if (existing) {
			existing.instances.push(instance);
			continue;
		}
		groups.set(instance.module.id, {
			moduleId: instance.module.id,
			moduleName: instance.module.name,
			subjectGroupCode: instance.module.subjectGroup?.code ?? null,
			instances: [instance]
		});
	}

	const out = [...groups.values()];
	out.sort((a, b) => a.moduleName.localeCompare(b.moduleName, 'de'));
	for (const group of out) {
		group.instances.sort((a, b) => a.track.localeCompare(b.track, 'de'));
	}
	return out;
}

/**
 * Split the offered modules into "my subjects" and the rest.
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
	groups: readonly WishGroup[],
	mySubjectGroupCodes: readonly string[]
): { mine: WishGroup[]; others: WishGroup[] } {
	const mine: WishGroup[] = [];
	const others: WishGroup[] = [];

	for (const group of groups) {
		if (group.subjectGroupCode != null && mySubjectGroupCodes.includes(group.subjectGroupCode)) {
			mine.push(group);
		} else {
			others.push(group);
		}
	}
	return { mine, others };
}

/**
 * Index the caller's own wishes by the part they are on.
 *
 * Own entries only — never a map over everybody's, which is how a "somebody is interested" mark
 * would get built by accident. What the screen renders next to a part is whether *you* asked for
 * it, and nothing about anybody else.
 */
export function myWishByPart(wishes: readonly WishLike[]): Map<string, WishLike> {
	return new Map(wishes.map((w) => [w.part.id, w]));
}

/**
 * Whether wishes may still be entered or changed in this semester.
 *
 * Open for as long as the semester is **not finished** — through the demand planning, the wish
 * phase and the assignment. Not only in the wish phase: somebody saying in March that they would
 * take the second laboratory group after all is a correction, and a correction the tool refuses
 * happens in a mail instead, after which the list the tool holds is the wrong one.
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
