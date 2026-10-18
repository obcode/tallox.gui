import type { InstancePartKind } from '$lib/gql/__generated__/graphql';

/** One of the caller's own assignments, in the shape `myAssignments` answers. */
export type MyAssignmentLike = {
	id: string;
	note: string;
	part: { id: string; kind: InstancePartKind; teachingHours?: number | null };
	instance: {
		id: string;
		semester: string;
		track: string;
		programmeSemester?: number | null;
		programme: { code: string };
		module: { id: string; name: string };
	};
};

/** One semester of the caller's teaching. */
export type MyTeachingSemester<T extends MyAssignmentLike = MyAssignmentLike> = {
	code: string;
	/** Whether the assignment of this semester is published; before that it is a draft. */
	published: boolean;
	assignments: T[];
	/** What the parts credit, summed. A part whose hours nobody has stated counts zero. */
	teachingHours: number;
	/** How many of the parts state no hours, so the sum can say it is incomplete. */
	partsWithoutHours: number;
};

/**
 * The caller's own assignments, by semester, newest first.
 *
 * Every semester and not only the one being planned: "where am I teaching" is asked about the
 * coming term and the running one alike. Newest first, because the semester somebody opens this
 * for is the next one.
 *
 * `published` comes from the semester list and decides the draft mark. A semester missing from it
 * — one nobody has decided anything about yet — is unpublished, which is the conservative reading:
 * a draft marked as a draft costs nothing, a draft read as final is the question this mark exists
 * to prevent.
 */
export function teachingBySemester<T extends MyAssignmentLike>(
	assignments: readonly T[],
	publishedSemesters: ReadonlySet<string>
): MyTeachingSemester<T>[] {
	const bySemester = new Map<string, MyTeachingSemester<T>>();
	for (const a of assignments) {
		const code = a.instance.semester;
		let entry = bySemester.get(code);
		if (!entry) {
			entry = {
				code,
				published: publishedSemesters.has(code),
				assignments: [],
				teachingHours: 0,
				partsWithoutHours: 0
			};
			bySemester.set(code, entry);
		}
		entry.assignments.push(a);
		if (a.part.teachingHours == null) entry.partsWithoutHours++;
		else entry.teachingHours += a.part.teachingHours;
	}
	for (const entry of bySemester.values()) {
		entry.assignments.sort(
			(x, y) =>
				x.instance.module.name.localeCompare(y.instance.module.name, 'de') ||
				x.instance.programme.code.localeCompare(y.instance.programme.code) ||
				x.instance.track.localeCompare(y.instance.track)
		);
	}
	return [...bySemester.values()].sort((a, b) => b.code.localeCompare(a.code));
}
