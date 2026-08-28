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

/** One module and every cohort of it this subject group has to fill. */
export type ModuleBlock = {
	id: string;
	name: string;
	cohorts: CohortGroup[];
};

/**
 * The cohorts of one subject group, gathered under their modules.
 *
 * The screen is one table: a row per cohort, and the module written once at the head of its
 * cohorts rather than again on every row. "Softwareentwicklung II" three times over is three
 * chances to read it as three different things, and the eye has to compare the strings to find
 * out that it is not.
 *
 * Sorted here rather than left in whatever order the demand answered in, because the grouping
 * only works if the cohorts of a module are next to each other — and by name rather than by id,
 * because that is the order somebody reads down the first column looking for a module.
 */
export function moduleBlocks(groups: readonly CohortGroup[]): ModuleBlock[] {
	const blocks = new Map<string, ModuleBlock>();

	for (const group of groups) {
		const module = group.instance.module;
		const block = blocks.get(module.id) ?? { id: module.id, name: module.name, cohorts: [] };
		block.cohorts.push(group);
		blocks.set(module.id, block);
	}

	for (const block of blocks.values()) {
		// Inside a module: the study programme, then the cohort year, then the track letter — the
		// order the label itself reads in, so the column runs IF2A, IF2B and not IF2B, IF2A.
		block.cohorts.sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }));
	}

	return [...blocks.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
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
 * What a cohort's parts are called, as one line: `Vorlesung · Praktikum 1 · Praktikum 2`.
 *
 * It stands next to the one dropdown that fills all of them, and it is there to say what "all of
 * them" is. Without it the single control is a promise the page has not shown the extent of.
 */
export function partsSummary(rows: readonly PartRow[]): string {
	return rows.map((row) => row.heading).join(' · ');
}

/**
 * What every part of a cohort holds, or null where they do not all hold the same.
 *
 * Null is the interesting value: it is the exception this screen is built to keep exceptional,
 * and it is what the cohort's own dropdown shows instead of a name.
 */
export function commonValue(rows: readonly PartRow[]): string | null {
	if (rows.length === 0) return null;
	const first = currentValue(rows[0].assignment);
	return rows.every((row) => currentValue(row.assignment) === first) ? first : null;
}

/** The note every part of a cohort carries, or null where they do not all carry the same. */
export function commonNote(rows: readonly PartRow[]): string | null {
	if (rows.length === 0) return null;
	const first = rows[0].assignment?.note ?? '';
	return rows.every((row) => (row.assignment?.note ?? '') === first) ? first : null;
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
	/**
	 * Whoever already holds something here.
	 *
	 * The whole cohort's assignments and not just this part's: the cohort is filled by one
	 * dropdown, and a list that offered somebody for the lecture but not for the laboratory could
	 * not be copied down onto both.
	 */
	current: readonly AssignmentLike[],
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

	for (const held of current) {
		add({
			personId: held.assignee.personId ?? undefined,
			teacherId: held.assignee.teacherId ?? undefined,
			name: held.assignee.name,
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

/**
 * What a cohort's own dropdown says when its parts do not all hold the same person.
 *
 * A sentinel and not an absence, because the value space is already full: `''` means "nobody",
 * and this has to mean "leave each part with whoever it has". Chosen so that it can never
 * collide with `p:<uuid>` or `t:<uuid>`.
 */
export const MIXED_CHOICE = '*';

/** What the cohort's own two controls submit. */
export type CombinedEntry = {
	/** The parts it stands for, in the order the page rendered them. */
	partIds: string[];
	/** `p:<id>`, `t:<id>`, `''` for nobody, or MIXED_CHOICE. */
	choice: string;
	/** The note for every part, or null where the page did not offer the field. */
	note: string | null;
};

/**
 * The cohort's dropdown written down onto its parts, where it says something new.
 *
 * # Why the cohort has a control at all
 *
 * A cohort is normally held by one person: the same colleague takes the lecture and its
 * laboratories, and splitting them is the arrangement somebody makes on purpose. A screen that
 * asks for every part separately makes the ordinary case the laborious one and the exception the
 * cheap one, which is the wrong way round.
 *
 * # Why "where it says something new"
 *
 * Both controls are always submitted — the parts live in a `<details>`, and a closed one still
 * carries its fields — so the two have to be ranked without a hidden flag saying which the person
 * used. The rule is that the cohort's dropdown acts only when it differs from what its parts
 * already hold in common. Somebody working in the open detail view leaves it showing exactly that
 * common value, so it stays silent and the parts decide; somebody choosing a name at the top
 * changes it, so it wins.
 *
 * That also makes the control work with no JavaScript at all, which the autosave does not: the
 * form posts, and the server works out the same thing from the same fields.
 *
 * The note is ranked separately, because clearing a note is a change and `''` is its value. It is
 * only offered where the parts agree — where they do not, there is no common note to edit, and
 * the field is not rendered rather than rendered lying.
 */
export function mergeCombined(
	combined: readonly CombinedEntry[],
	entries: Map<string, AssignmentEntry>,
	stored: ReadonlyMap<string, AssignmentLike>
): Map<string, AssignmentEntry> {
	const merged = new Map(entries);

	for (const block of combined) {
		const held = block.partIds.map((id) => stored.get(id) ?? null);
		const values = new Set(held.map(currentValue));
		const notes = new Set(held.map((a) => a?.note ?? ''));
		const common = values.size === 1 ? [...values][0] : null;
		const commonNote = notes.size === 1 ? [...notes][0] : null;

		const setsChoice = block.choice !== MIXED_CHOICE && block.choice !== common;
		const setsNote = block.note !== null && block.note !== commonNote;
		if (!setsChoice && !setsNote) continue;

		for (const partId of block.partIds) {
			const row = stored.get(partId) ?? null;
			const entry = merged.get(partId) ?? {
				choice: currentValue(row),
				note: row?.note ?? ''
			};
			merged.set(partId, {
				choice: setsChoice ? block.choice : entry.choice,
				note: setsNote ? (block.note ?? '') : entry.note
			});
		}
	}
	return merged;
}

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
