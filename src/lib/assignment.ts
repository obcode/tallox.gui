import { PART_KIND_LABELS, formatHours } from '$lib/catalogue';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';

/**
 * The assignment screen: who holds which part of which instance.
 *
 * What this module must never contain: anything that counts. No "2 von 3 besetzt", no progress
 * bar, no sorting by how full a cohort is, no colouring that depends on somebody else's
 * assignment. Before publication that is the confidential fact with the names taken out, and the
 * planning screen is exactly where such a number looks like an ordinary convenience.
 *
 * The same rule the wish screen follows, and the same reason it is written at the top of the file
 * rather than in a review comment. See `no-wish-aggregates` in the memory directory.
 *
 * The numbers that *are* allowed here are about teaching hours, which come from the demand and are
 * not confidential at all: what a part is worth, and what a cohort costs.
 */

/** A part of an instance, as much of it as this module needs. */
export type PartLike = {
	id: string;
	kind: InstancePartKind;
	teachingHours?: number | null;
	sharedAcrossTracks?: boolean;
};

/** An instance, as much of it as this module needs. */
export type InstanceLike = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	teachingHours: number;
	programme: { code: string; title?: string };
	module: { id: string; name: string; subjectGroup?: { id: string; code: string } | null };
	parts: PartLike[];
	/**
	 * The other study programmes' demands this cohort meets, where any are agreed.
	 *
	 * The event is held once, so the interest registered for those cohorts is interest in *this*
	 * teaching. It is read where the decision is taken rather than left on a screen the person
	 * filling the part never opens.
	 */
	covers?: readonly {
		acceptedAt?: string | null;
		instance: { id: string; programme: { code: string } };
	}[];
};

/** An assignment as the page reads it. */
export type AssignmentLike = {
	id: string;
	note: string;
	assignee: { personId?: string | null; teacherId?: string | null; name: string };
	part: { id?: string };
};

/** A wish on an instance, as much of it as the candidate list needs. */
export type WishLike = {
	priority: string;
	note: string;
	person: { id: string; name: string };
	instance: { id: string };
};

/** One row of the table: a part, and whoever holds it. */
export type PartRow = {
	part: PartLike;
	/** `Vorlesung`, `Praktikum 2` — numbered only where there is more than one of a kind. */
	heading: string;
	/** The assignment on this part, or null while nobody holds it. */
	assignment: AssignmentLike | null;
};

/** One group of rows: a cohort of a module, with its parts under it. */
export type CohortGroup = {
	instance: InstanceLike;
	/** `IF1A` as the faculty says it, assembled here and never stored. */
	label: string;
	rows: PartRow[];
};

/**
 * The heading of one part, numbered within its kind.
 *
 * `Vorlesung` on its own, `Praktikum 1` and `Praktikum 2` where there are two — numbered only
 * where the number distinguishes something. A lone "Praktikum 1" invites the question which other
 * one there is.
 */
export function partHeading(part: PartLike, index: number, sameKind: number): string {
	const kind = PART_KIND_LABELS[part.kind];
	return sameKind > 1 ? `${kind} ${index + 1}` : kind;
}

/**
 * What a part is worth to whoever holds it, as a sentence.
 *
 * `instance_part.teaching_hours` and not the module's contact hours: three quantities could be
 * called SWS and this is the one a lecturer is credited with. A part whose hours nobody has stated
 * says so rather than showing a zero — zero credits nobody with anything, and "not settled yet" is
 * an ordinary state.
 */
export function partHours(part: PartLike): string {
	if (part.teachingHours == null) return 'SWS offen';
	return `${formatHours(part.teachingHours)} SWS`;
}

/** The cohort label: the programme's code, the cohort year, and the track letter. */
export function cohortLabel(instance: InstanceLike): string {
	const year = instance.programmeSemester == null ? '' : String(instance.programmeSemester);
	return `${instance.programme.code}${year}${instance.track}`;
}

/**
 * The table: one group per cohort, one row per part.
 *
 * Grouped rather than flat, because the unit somebody works through is a cohort — "wer macht IF1A"
 * — while the unit they decide is a part. A flat list would repeat the module name on every row
 * and make the lecture and its laboratories look unrelated.
 *
 * Instances with no parts are dropped: there is nothing to fill, and a heading with nothing under
 * it reads as a mistake rather than as a cohort whose split nobody has stated.
 */
export function cohortGroups(
	instances: InstanceLike[],
	assignments: AssignmentLike[]
): CohortGroup[] {
	const byPart = new Map<string, AssignmentLike>();
	for (const a of assignments) {
		if (a.part?.id) byPart.set(a.part.id, a);
	}

	const groups: CohortGroup[] = [];
	for (const instance of instances) {
		if (instance.parts.length === 0) continue;

		const counts = new Map<string, number>();
		for (const p of instance.parts) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);

		const seen = new Map<string, number>();
		const rows: PartRow[] = instance.parts.map((part) => {
			const index = seen.get(part.kind) ?? 0;
			seen.set(part.kind, index + 1);
			return {
				part,
				heading: partHeading(part, index, counts.get(part.kind) ?? 1),
				assignment: byPart.get(part.id) ?? null
			};
		});

		groups.push({ instance, label: cohortLabel(instance), rows });
	}
	return groups;
}

/** Somebody who can be put on a part. */
export type Candidate = {
	/** Exactly one of these is set, which is what the mutation takes. */
	personId?: string;
	teacherId?: string;
	name: string;
	/** Why they are in the list: shown after the name, so the reason is visible in the dropdown. */
	hint?: string;
};

/** How much somebody wants an instance, in words. */
const WISH_WORDS: Record<string, string> = {
	FIRST_CHOICE: 'unbedingt',
	HAPPY_TO: 'gerne',
	IF_NEEDED: 'notfalls'
};

/**
 * One cohort plus the cohorts whose demand it covers, as the candidate list reads them.
 *
 * The event is held once, so the interest registered for a covered cohort is interest in this
 * teaching. Only agreed coverage: an unanswered request has changed nothing yet, and the cohort
 * that asked still holds its own parts and fills them itself.
 *
 * The holding cohort is always first, which is what lets the list tell "registered here" from
 * "registered over there" without carrying a second flag per candidate.
 */
export function pooledInstances(instance: InstanceLike): {
	ids: string[];
	programmes: Map<string, string>;
} {
	const ids = [instance.id];
	const programmes = new Map<string, string>();
	for (const covered of instance.covers ?? []) {
		if (!covered.acceptedAt) continue;
		ids.push(covered.instance.id);
		programmes.set(covered.instance.id, covered.instance.programme.code);
	}
	return { ids, programmes };
}

/**
 * The list a part's dropdown offers, in the order it offers it.
 *
 * Whoever registered interest in this cohort comes first and carries how much they want it. That
 * is the point of the whole screen: the assignment is made *from* the wishes, so the wishes have
 * to be where the decision is taken rather than on another page somebody compares against.
 *
 * Then the members of the module's subject group, then whoever the search turned up, then the
 * person currently holding the part if none of the above named them. Deduplicated by identity, so
 * somebody who wished for it and is in the subject group appears once, with the reason that says
 * more.
 *
 * **Not a permission.** A name being absent from this list does not mean somebody may not hold the
 * part; it means the page did not think to offer them, which is what the search field is for.
 */
export function candidatesFor(
	instanceIds: readonly string[],
	wishes: WishLike[],
	members: { id: string; name: string }[],
	found: { id: string; name: string }[],
	current: AssignmentLike | null,
	/**
	 * Which programme a wish's own cohort belongs to, for the cohorts that are not the first.
	 *
	 * Only consulted for pooled ids, so an ordinary part — one cohort, one id — renders exactly
	 * as it did.
	 */
	programmeOf: ReadonlyMap<string, string> = new Map()
): Candidate[] {
	const out: Candidate[] = [];
	const seen = new Set<string>();

	const add = (c: Candidate) => {
		const key = c.personId ?? `t:${c.teacherId}`;
		if (seen.has(key)) return;
		seen.add(key);
		out.push(c);
	};

	for (const wish of wishes) {
		if (!instanceIds.includes(wish.instance.id)) continue;

		// Where the interest was registered, named when it was not this cohort. That prefix is the
		// whole reason to pool rather than to merge silently: the person deciding is choosing
		// between two programmes' colleagues for one event, and they should know it.
		const from = wish.instance.id === instanceIds[0] ? '' : programmeOf.get(wish.instance.id);
		const words = WISH_WORDS[wish.priority] ?? '';
		const base = wish.note ? `${words} · ${wish.note}` : words;
		add({
			personId: wish.person.id,
			name: wish.person.name,
			hint: from ? `Wunsch aus ${from} · ${base}` : base
		});
	}

	for (const member of members) add({ personId: member.id, name: member.name, hint: 'Fachgruppe' });

	// Whoever the search turned up, offered by their teacher id whether or not they hold an
	// account. The backend canonicalises on the way in — a teacher who has one is stored as the
	// account — so the page does not need to know which, and cannot get it wrong by knowing
	// something that was true when it rendered.
	for (const teacher of found) add({ teacherId: teacher.id, name: teacher.name, hint: 'Suche' });

	if (current) {
		add({
			personId: current.assignee.personId ?? undefined,
			teacherId: current.assignee.teacherId ?? undefined,
			name: current.assignee.name,
			hint: 'zugeteilt'
		});
	}
	return out;
}

/** The value a dropdown option carries: which kind of id, and which one. */
export function candidateValue(c: Candidate): string {
	return c.personId ? `p:${c.personId}` : `t:${c.teacherId}`;
}

/** What a row's dropdown currently shows. Empty means nobody holds the part. */
export function currentValue(assignment: AssignmentLike | null): string {
	if (!assignment) return '';
	if (assignment.assignee.personId) return `p:${assignment.assignee.personId}`;
	if (assignment.assignee.teacherId) return `t:${assignment.assignee.teacherId}`;
	return '';
}

/** One cell of the form, as the page submits it. */
export type AssignmentEntry = {
	/** `p:<uuid>` or `t:<uuid>`, or empty for "nobody". */
	choice: string;
	note: string;
};

/** What the save has to do to one part. */
export type AssignmentChange =
	| {
			kind: 'set';
			partId: string;
			personId?: string;
			teacherId?: string;
			note: string;
			replacing?: string;
	  }
	| { kind: 'clear'; partId: string; assignmentId: string };

/**
 * The difference between what the form says and what is stored.
 *
 * Worked out against the stored state read on the way in, not against a hidden field the page
 * rendered minutes ago — two tabs open on the same semester is the case that makes the distinction
 * real, and here it is more than a nicety: `replacing` is what the backend compares against, so a
 * stale id would be refused rather than silently overwriting.
 *
 * A cell whose choice and note both match what is stored produces nothing. Saving a screen nobody
 * changed should write nothing at all, or every visit would move `updatedAt` on every row and the
 * audit would stop meaning anything.
 */
export function assignmentChanges(
	entries: Map<string, AssignmentEntry>,
	stored: Map<string, AssignmentLike>
): AssignmentChange[] {
	const changes: AssignmentChange[] = [];

	for (const [partId, entry] of entries) {
		const held = stored.get(partId) ?? null;
		const before = currentValue(held);
		const note = entry.note.trim();

		if (entry.choice === '') {
			if (held) changes.push({ kind: 'clear', partId, assignmentId: held.id });
			continue;
		}
		if (entry.choice === before && note === (held?.note ?? '')) continue;

		const [kind, id] = entry.choice.split(':');
		changes.push({
			kind: 'set',
			partId,
			personId: kind === 'p' ? id : undefined,
			teacherId: kind === 't' ? id : undefined,
			note,
			replacing: held?.id
		});
	}
	return changes;
}

/**
 * What the page says about how many changes went through.
 *
 * Counts what this caller just did and nothing else, which is why it is safe: it is a statement
 * about their own clicks, not about the state of the plan.
 */
export function savedHint(count: number): string {
	if (count === 0) return 'Nichts zu speichern.';
	return count === 1 ? '1 Änderung gespeichert.' : `${count} Änderungen gespeichert.`;
}
