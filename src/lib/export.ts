/**
 * The semester export: what a semester's planning looks like as a spreadsheet.
 *
 * Built here from what the API answered, never from a query of its own. That is the whole safety
 * argument: the assignments arrive through the same visibility filter as on every screen, so the
 * file contains exactly what the person downloading it may already read — no more, because the
 * backend never sent more. Nothing here decides who sees what.
 *
 * **No wishes, and nothing derived from them.** Not a column, not a count. Before publication a
 * count leaks as much as a name, and a file is the one place where nobody can take it back.
 *
 * Svelte-free and I/O-free, so vitest checks the rows; `$lib/server/export.ts` turns them into
 * bytes.
 */

import { PART_KIND_LABELS } from '$lib/catalogue';
import { controllingTable, type LoadInput } from '$lib/controlling';
import {
	DELIVERY_LABELS,
	cohortLabel,
	coverageLabel,
	coversLabel,
	type CoverageLike,
	type DeliveryFormat
} from '$lib/demand';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
import { semesterName } from '$lib/semester';

/** A cell as the writer takes it: a number stays a number, so a spreadsheet can sum it. */
export type ExportCell = string | number | null;

/** One sheet: its name, the header row, the rows, and how wide each column starts. */
export type ExportSheet = {
	name: string;
	header: string[];
	rows: ExportCell[][];
	widths: number[];
};

export type ExportPart = {
	id: string;
	kind: InstancePartKind;
	position: number;
	teachingHours?: number | null;
	sharedAcrossTracks: boolean;
	/** The part this one was cut from, where it is a piece of one. */
	dividedFrom?: string | null;
	/** The other faculty that teaches this part. */
	taughtBy?: string | null;
};

export type ExportInstance = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	note: string;
	programme: { code: string };
	module: {
		name: string;
		zpaId?: string | null;
		subjectGroup?: { name: string } | null;
	};
	parts: readonly ExportPart[];
	coveredBy?: CoverageLike | null;
	covers: readonly CoverageLike[];
	delivery?: DeliveryFormat;
	taughtInEnglish?: boolean;
	/** Whether the cohort is listed as a course in English (CiE). */
	cie?: boolean;
	/** Which seminar the cohort is, for an umbrella module. */
	topic?: string | null;
};

export type ExportAssignment = {
	note: string;
	assignee: { name: string };
	part: { id: string };
};

export const PLANNING_HEADER = [
	'Studiengang',
	'Fachsemester',
	'Zug',
	'Modul',
	'Thema',
	'ZPA-Nr.',
	'Fachgruppe',
	'Durchführung',
	'Englisch',
	'CiE',
	'Teil',
	'SWS (Lehrperson)',
	'Für alle Züge',
	'Besetzt durch',
	'Notiz Zuteilung',
	'Notiz Instanz',
	'Hinweis'
];

/**
 * One row per part, which is the unit that is assigned.
 *
 * An instance without parts of its own still gets a row: one whose teaching another programme
 * holds says so, and one whose split nobody has entered says that. Dropping either would make
 * the file look like the cohort is not planned at all — and a spreadsheet is read for exactly
 * that question.
 *
 * A part has at most one holder — the backend's `UNIQUE` on the assignment's part — so the join
 * is a lookup, and a part is never two rows whose hours a sum would count twice.
 */
export function planningRows(
	instances: readonly ExportInstance[],
	assignments: readonly ExportAssignment[]
): ExportCell[][] {
	const byPart = new Map(assignments.map((a) => [a.part.id, a]));

	const rows: ExportCell[][] = [];
	for (const instance of [...instances].sort(compareInstances)) {
		const lead: ExportCell[] = [
			instance.programme.code,
			instance.programmeSemester ?? null,
			cohortLabel(instance.programme.code, instance.programmeSemester, instance.track),
			instance.module.name,
			instance.topic ?? '',
			instance.module.zpaId ?? '',
			instance.module.subjectGroup?.name ?? '',
			instance.delivery ? DELIVERY_LABELS[instance.delivery] : '',
			instance.taughtInEnglish ? 'ja' : '',
			instance.cie ? 'ja' : ''
		];
		const hint = instanceHint(instance);

		if (instance.parts.length === 0) {
			rows.push([...lead, '', null, '', '', '', instance.note, hint || 'keine Teile angelegt']);
			continue;
		}

		// Stable: a piece has its part's position and follows it, in the order the backend lists them.
		const parts = [...instance.parts].sort((a, b) => a.position - b.position);
		// Numbered among the undivided parts, as on the assignment screen: a lecture cut in two is
		// still the one lecture, and its piece is named after it.
		const perKind = new Map<InstancePartKind, number>();
		const pieces = new Map<string, number>();
		for (const p of parts) {
			if (p.dividedFrom) pieces.set(p.dividedFrom, (pieces.get(p.dividedFrom) ?? 0) + 1);
			else perKind.set(p.kind, (perKind.get(p.kind) ?? 0) + 1);
		}
		const seen = new Map<InstancePartKind, number>();
		const headings = new Map<string, string>();
		const cut = new Map<string, number>();

		for (const part of parts) {
			const kind = PART_KIND_LABELS[part.kind];
			let heading: string;
			if (part.dividedFrom) {
				const index = (cut.get(part.dividedFrom) ?? 0) + 1;
				cut.set(part.dividedFrom, index);
				const of = headings.get(part.dividedFrom) ?? kind;
				heading =
					(pieces.get(part.dividedFrom) ?? 0) > 1 ? `${of} – Anteil ${index}` : `${of} – Anteil`;
			} else {
				const index = (seen.get(part.kind) ?? 0) + 1;
				seen.set(part.kind, index);
				heading = (perKind.get(part.kind) ?? 0) > 1 ? `${kind} ${index}` : kind;
				headings.set(part.id, heading);
			}
			const held = byPart.get(part.id);
			rows.push([
				...lead,
				heading,
				part.teachingHours ?? null,
				part.sharedAcrossTracks ? 'ja' : '',
				// Another faculty's part has nobody of ours on it; who gives it is what this column
				// is for.
				part.taughtBy ?? held?.assignee.name ?? '',
				held?.note ?? '',
				instance.note,
				hint
			]);
		}
	}
	return rows;
}

/** Who holds this cohort's teaching, or for whom it holds it — the coverage badges, as text. */
function instanceHint(instance: ExportInstance): string {
	const hints: string[] = [];
	if (instance.coveredBy) hints.push(coverageLabel(instance.coveredBy));
	for (const c of instance.covers) hints.push(coversLabel(c));
	return hints.join('; ');
}

/** Programme, cohort year (unknown last), track, module: the order the demand page reads in. */
function compareInstances(a: ExportInstance, b: ExportInstance): number {
	return (
		a.programme.code.localeCompare(b.programme.code) ||
		(a.programmeSemester ?? Infinity) - (b.programmeSemester ?? Infinity) ||
		a.track.localeCompare(b.track) ||
		a.module.name.localeCompare(b.module.name, 'de')
	);
}

export const LOAD_HEADER = [
	'Studiengang',
	'Bezeichnung',
	'SWS gesamt',
	'davon eigene Module',
	'davon Module anderer Studiengänge',
	'Instanzen',
	'davon FWP',
	'FWP-SWS',
	'Teile ohne SWS',
	'Jahreskontingent',
	'Anteil dieses Semesters',
	'Saldo',
	// Last rather than beside the hours it is not part of, so that a sheet somebody built on the
	// earlier columns keeps reading them where they were.
	'SWS anderer Fakultäten (nicht enthalten)'
];

/**
 * The SWS controlling as `/statistik` shows it: this faculty's programmes first, then the others,
 * then the sum. The arrangement is `controllingTable`'s, so the file and the page cannot disagree.
 *
 * The quota columns are left empty on the sum. Adding up quotas of programmes that are partly not
 * this faculty's would produce a figure nobody entered and nobody can check.
 */
export function loadRows(load: readonly LoadInput[]): ExportCell[][] {
	const table = controllingTable(load, null);
	const quota = new Map(load.map((l) => [l.programme.code, l]));
	const rows: ExportCell[][] = [...table.planned, ...table.others].map((r) => {
		const q = quota.get(r.programme.code);
		return [
			r.programme.code,
			r.programme.title,
			r.teachingHours,
			r.ownHours,
			r.foreignHours,
			r.instanceCount,
			r.fwpInstanceCount,
			r.fwpHours,
			r.partsWithoutHours,
			q?.yearlyQuota ?? null,
			q?.semesterQuota ?? null,
			q?.balance ?? null,
			r.externalHours
		];
	});
	const t = table.total;
	rows.push([
		'Summe',
		'',
		t.teachingHours,
		t.ownHours,
		t.foreignHours,
		t.instanceCount,
		t.fwpInstanceCount,
		t.fwpHours,
		t.partsWithoutHours,
		null,
		null,
		null,
		t.externalHours
	]);
	return rows;
}

/**
 * The sentences a reader needs before trusting the numbers.
 *
 * The visibility sentence is there whenever the assignments are unpublished, for everybody —
 * including the dean's office, who sees every row. Saying it only to those who are missing rows
 * would tell them that rows are missing.
 */
export function noticeLines(
	semester: string,
	assignmentsPublishedAt: string | null | undefined,
	exportedAt: Date
): string[] {
	const lines = [
		`Tallox – Planungsstand ${semesterName(semester)} (${semester})`,
		`Exportiert am ${exportedAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
		''
	];
	if (!assignmentsPublishedAt) {
		lines.push(
			'Die Zuteilung dieses Semesters ist noch nicht veröffentlicht. Besetzungen erscheinen nur, ' +
				'soweit Du sie in Tallox sehen darfst – eine leere Zelle heißt nicht unbedingt „unbesetzt“.',
			''
		);
	}
	lines.push(
		'Blatt „Planung“: eine Zeile je Teil (Vorlesung, Praktikumsgruppe, …), so wie zugeteilt wird.',
		'„SWS (Lehrperson)“ ist, was die Lehrperson für diesen Teil angerechnet bekommt – nicht die ' +
			'SWS, die Studierende belegen.',
		'„Für alle Züge“: der Teil findet einmal für alle Züge des Moduls statt, seine SWS zählen ' +
			'einmal.',
		'„… – Anteil“: ein Teil, der zwischen zwei Lehrenden oder mit einer anderen Fakultät ' +
			'aufgeteilt ist. Hält ihn eine andere Fakultät, steht sie unter „Besetzt durch“, und seine SWS ' +
			'zählen nicht zum Studiengang.',
		'Blatt „SWS je Studiengang“: das SWS-Controlling wie unter „Statistik“ in Tallox.',
		'',
		'Der Export ist eine Momentaufnahme. Änderungen in der Datei fließen nicht nach Tallox zurück.'
	);
	return lines;
}

export type ExportInput = {
	semester: string;
	assignmentsPublishedAt: string | null | undefined;
	instances: readonly ExportInstance[];
	assignments: readonly ExportAssignment[];
	load: readonly LoadInput[];
	exportedAt: Date;
};

/** The three sheets, in the order a reader opens them. */
export function exportSheets(input: ExportInput): ExportSheet[] {
	return [
		{
			name: 'Planung',
			header: PLANNING_HEADER,
			rows: planningRows(input.instances, input.assignments),
			widths: [11, 12, 8, 40, 28, 10, 11, 18, 9, 6, 14, 10, 10, 28, 28, 28, 30]
		},
		{
			name: 'SWS je Studiengang',
			header: LOAD_HEADER,
			rows: loadRows(input.load),
			widths: [11, 36, 11, 12, 14, 10, 10, 10, 10, 12, 12, 10, 16]
		},
		{
			name: 'Hinweise',
			header: [],
			rows: noticeLines(input.semester, input.assignmentsPublishedAt, input.exportedAt).map((l) => [
				l
			]),
			widths: [120]
		}
	];
}

/** The file name: the semester in its own spelling, which sorts and needs no quoting. */
export function exportFileName(semester: string): string {
	return `tallox-${semester}.xlsx`;
}
