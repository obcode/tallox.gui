/**
 * The module catalogue, in the language the faculty speaks it.
 *
 * The same translation `$lib/semester.ts` and `$lib/zpa.ts` do, and for the same reason: the
 * backend is English throughout, and the mapping to the words people read happens once, here.
 *
 * Svelte-free on purpose, so vitest can check the parts that are easy to get wrong — the
 * cohort label and the reading of "compulsory or elective", both of which say something the
 * reader will act on.
 */

import type {
	CourseType,
	DutyStatus,
	Frequency,
	InstancePartKind,
	ZpaProjectionFinding
} from '$lib/gql/__generated__/graphql';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
	EVERY_SEMESTER: 'jedes Semester',
	EVERY_WINTER_SEMESTER: 'nur Wintersemester',
	EVERY_SUMMER_SEMESTER: 'nur Sommersemester',
	ALTERNATING_WITHIN_SUBJECT_GROUP: 'im Wechsel in der Fachgruppe',
	ON_ANNOUNCEMENT: 'nach Ankündigung',
	UNKNOWN: 'ohne Angabe'
};

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
	SU_WITH_LAB: 'SU mit Praktikum',
	SU_WITH_EXERCISE: 'SU mit Übung',
	SEMINAR: 'Seminar',
	LAB: 'Praktikum',
	SU: 'SU',
	EXERCISE: 'Übung',
	PROJECT: 'Projekt',
	SELF_STUDY: 'selbständiges Arbeiten',
	DEPENDS_ON_SUBJECT: 'je nach Fach'
};

export const PART_KIND_LABELS: Record<InstancePartKind, string> = {
	LECTURE: 'Vorlesung',
	LAB: 'Praktikum',
	EXERCISE: 'Übung',
	SEMINAR: 'Seminar',
	PROJECT: 'Projekt',
	OTHER: 'Sonstiges'
};

/**
 * Compulsory or elective, in words.
 *
 * `MIXED` gets a sentence rather than a word, because a reader who sees only "Pflicht" for a
 * module that is compulsory in one version of the regulations and elective in another has been
 * told something false. Measured against the real catalogue, 74 modules are in that state
 * across programmes and three within a single one.
 */
export const DUTY_LABELS: Record<DutyStatus, string> = {
	COMPULSORY: 'Pflicht',
	ELECTIVE: 'Wahlpflicht',
	MIXED: 'Pflicht (nicht in allen SPOs)'
};

/**
 * The badge a duty status gets.
 *
 * MIXED is a neutral badge rather than a warning: it is not a problem with the data, it is what
 * the regulations say. Colouring it like a fault would teach people that this column has errors
 * in it.
 */
export function dutyBadge(status: DutyStatus | null | undefined): string {
	switch (status) {
		case 'COMPULSORY':
			return 'badge-primary';
		case 'ELECTIVE':
			return 'badge-ghost';
		case 'MIXED':
			return 'badge-secondary';
		default:
			return 'badge-ghost';
	}
}

/**
 * What a module is called when the examination office gives it no name.
 *
 * Seventeen modules of the real catalogue are in this state, six of them active. Rendering an
 * empty cell would make them look like a fault in this page; rendering the identifier makes
 * them findable and says where the gap is.
 */
export function moduleName(module: { name: string; zpaId?: string | null }): string {
	if (module.name.trim() !== '') return module.name;
	if (module.zpaId) return `Modul ohne Namen (ZPA ${module.zpaId})`;
	return 'Modul ohne Namen';
}

/**
 * The label of one version of a programme's examination regulations.
 *
 * An unfinished version is marked, because it holds a fraction of its eventual modules — a
 * filter set to it would look like a catalogue that had lost most of itself.
 */
export function spoLabel(spo: { version: number; primussId?: string | null }): string {
	return spo.primussId ? `SPO ${spo.version}` : `SPO ${spo.version} (im Aufbau)`;
}

/** Hours per week, without a trailing `.00` on the whole numbers most of them are. */
export function formatHours(hours: number): string {
	return Number.isInteger(hours)
		? String(hours)
		: hours.toFixed(2).replace(/0+$/, '').replace('.', ',');
}

/**
 * The split of a module, as one line: `Vorlesung 2 + Praktikum 2 = 4 SWS`.
 */
export function componentSummary(
	components: readonly { kind: InstancePartKind; teachingHours: number }[]
): string {
	if (components.length === 0) return '';
	const parts = components.map(
		(c) => `${PART_KIND_LABELS[c.kind]} ${formatHours(c.teachingHours)}`
	);
	const total = components.reduce((sum, c) => sum + c.teachingHours, 0);
	return `${parts.join(' + ')} = ${formatHours(total)} SWS`;
}

/**
 * Whether the split disagrees with what the examination office states for the module.
 *
 * A note, never a refusal. Twelve modules of the real catalogue carry no hours at all in the
 * source and several carry a figure that does not match what is taught — a hard rule would make
 * exactly those unplannable, which is where somebody most needs to enter the truth.
 */
export function componentMismatch(
	componentHours: number | null | undefined,
	contactHours: number | null | undefined
): string | null {
	if (componentHours == null || contactHours == null) return null;
	if (Math.abs(componentHours - contactHours) < 0.001) return null;
	return `Die Aufteilung ergibt ${formatHours(componentHours)} SWS, der Modulkatalog nennt ${contactHours}.`;
}

/**
 * The findings of a catalogue projection, in the words an operator needs.
 *
 * Each one says what happened to the objects, not only what was wrong with them — "skipped",
 * "kept", "not transferred" — because the question being asked in front of this list is always
 * "so where are those modules now".
 */
export const FINDING_LABELS: Record<ZpaProjectionFinding, string> = {
	MODULE_WITHOUT_HOME_PROGRAMME: 'Module ohne Heimatstudiengang — nicht übernommen',
	PROGRAMME_CODE_MALFORMED: 'Studiengangskürzel, die nicht gespeichert werden können',
	ASSOCIATION_WITH_UNKNOWN_REGULATIONS:
		'Zuordnungen zu Prüfungsordnungen, die das ZPA nicht mehr ausliefert',
	PROGRAMME_WITHOUT_REGULATIONS: 'Studiengänge ohne Prüfungsordnung — als inaktiv übernommen',
	MODULE_WITHOUT_NAME: 'Module ohne Namen — mit Kennung übernommen',
	MODULE_INACTIVE: 'Vom ZPA zurückgezogene Module — übernommen und markiert',
	FREQUENCY_UNMAPPED: 'Unbekannte Angaben zum Turnus',
	COURSE_TYPE_UNMAPPED: 'Unbekannte Angaben zur Lehrform',
	MIN_SEMESTER_CONFLICT: 'Widersprüchliche Angaben zum frühesten Fachsemester',
	DUTY_CONFLICT: 'Widersprüchliche Angaben zu Pflicht und Wahlpflicht',
	MODULE_RESPONSIBLE_UNKNOWN:
		'Module, deren Verantwortliche das ZPA nicht in der Lehrendenliste führt',
	TEACHER_WITHOUT_MAIL: 'Lehrende ohne Mailadresse — übernommen, aber nie verknüpfbar'
};

/**
 * Which findings are worth a warning badge.
 *
 * Exactly one is, and that is the point of the distinction. The others are decisions the
 * projection took on purpose and reports so that nobody has to wonder where the rows went;
 * colouring them as problems would train people to ignore the colour. DUTY_CONFLICT is
 * different: the way a module's entry per set of regulations is folded is only correct while
 * that number is zero.
 */
export function findingIsAlarming(finding: ZpaProjectionFinding): boolean {
	return finding === 'DUTY_CONFLICT';
}

/**
 * How somebody who teaches is described, for the line under their name.
 *
 * The four flags are not exclusive — somebody can be staff and hold an honorary professorship —
 * so this reads them all and joins what it finds rather than picking the first.
 */
export function teacherRole(teacher: {
	isProfessor: boolean;
	isLecturerOnContract: boolean;
	isHonoraryProfessor: boolean;
	isStaff: boolean;
}): string {
	const parts: string[] = [];
	if (teacher.isProfessor) parts.push('Professur');
	if (teacher.isHonoraryProfessor) parts.push('Honorarprofessur');
	if (teacher.isLecturerOnContract) parts.push('Lehrauftrag');
	if (teacher.isStaff) parts.push('Mitarbeit');
	return parts.join(', ');
}

/**
 * The kinds of teachable unit, in the order a split is usually written.
 *
 * A list rather than `Object.keys(PART_KIND_LABELS)`, because the order of that object is not
 * something the type system holds to and a form's dropdown should not reshuffle itself when
 * somebody adds a label.
 */
export const ALL_PART_KINDS: readonly InstancePartKind[] = [
	'LECTURE',
	'LAB',
	'EXERCISE',
	'SEMINAR',
	'PROJECT',
	'OTHER'
];

/**
 * The rows a split editor should start with for a module that has none.
 *
 * Derived from the course type, which is the only thing the examination office says about the
 * breakdown, and split evenly between the two named halves — which is what the effort
 * descriptions say wherever they say anything at all. A proposal for a form and never a stored
 * value: nothing writes these without somebody confirming them.
 *
 * No proposal at all when the module carries no hours. Twelve modules of the real catalogue are
 * in that state, and an empty form is a more honest starting point than a row of zeroes.
 */
export function proposedComponents(
	courseType: CourseType,
	contactHours: number | null | undefined
): { kind: InstancePartKind; teachingHours: number }[] {
	if (contactHours == null || contactHours <= 0) return [];

	const halves = (second: InstancePartKind) => [
		{ kind: 'LECTURE' as InstancePartKind, teachingHours: Math.ceil(contactHours / 2) },
		{ kind: second, teachingHours: Math.floor(contactHours / 2) }
	];

	switch (courseType) {
		case 'SU_WITH_LAB':
			return halves('LAB');
		case 'SU_WITH_EXERCISE':
			return halves('EXERCISE');
		case 'SU':
			return [{ kind: 'LECTURE', teachingHours: contactHours }];
		case 'SEMINAR':
			return [{ kind: 'SEMINAR', teachingHours: contactHours }];
		case 'LAB':
			return [{ kind: 'LAB', teachingHours: contactHours }];
		case 'EXERCISE':
			return [{ kind: 'EXERCISE', teachingHours: contactHours }];
		case 'PROJECT':
			return [{ kind: 'PROJECT', teachingHours: contactHours }];
		default:
			return [{ kind: 'OTHER', teachingHours: contactHours }];
	}
}
