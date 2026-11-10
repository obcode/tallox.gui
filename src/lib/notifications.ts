import type {
	AnnouncementAudienceKind,
	NotificationDelivery,
	NotificationKind,
	NotificationTargetSet
} from '$lib/gql/__generated__/graphql';

/**
 * What the subscription and announcement pages say about kinds, targets and audiences.
 *
 * Labels only. Which subscription matches which event is decided by the backend's fan-out query
 * against the subscriber's own rows; which audience somebody may write to by its policy. The
 * one rule mirrored here — which sets fit which kind — is there so that the form does not offer a
 * combination the backend refuses (`SUBSCRIPTION_INVALID`), and it is cosmetic like every rule in
 * this app: the backend checks it again.
 */

/** The kinds, in the order the form offers them — process order, roughly. */
export const NOTIFICATION_KINDS: readonly NotificationKind[] = [
	'MODULE_OFFERED',
	'MODULE_WITHDRAWN',
	'DEMAND_RELEASED',
	'ADVANCE_WISH_RESOLVED',
	'WISH_WINDOW_CHANGED',
	'WISHES_PUBLISHED',
	'ASSIGNMENTS_PUBLISHED',
	'CONFIRMATION_DUE',
	'DESIRED_HOURS_FROZEN',
	'DESIRED_HOURS_PUBLISHED',
	'REVIEW_COMPLETED',
	'PHASE_ADVANCED'
];

const KIND_LABELS: Record<NotificationKind, string> = {
	MODULE_OFFERED: 'Modul wird angeboten',
	MODULE_WITHDRAWN: 'Modul wird doch nicht angeboten',
	DEMAND_RELEASED: 'Bedarf eines Studiengangs freigegeben',
	ADVANCE_WISH_RESOLVED: 'Vormerkung entschieden',
	WISH_WINDOW_CHANGED: 'Wunschrunde geöffnet oder geschlossen',
	WISHES_PUBLISHED: 'Wünsche veröffentlicht',
	ASSIGNMENTS_PUBLISHED: 'Zuteilungen veröffentlicht',
	CONFIRMATION_DUE: 'Bestätigung der Zuteilungen (Frist und Erinnerung)',
	DESIRED_HOURS_FROZEN: 'Wunsch-SWS eingefroren',
	DESIRED_HOURS_PUBLISHED: 'Wunsch-SWS veröffentlicht',
	REVIEW_COMPLETED: 'Review eines Studiengangs abgeschlossen',
	PHASE_ADVANCED: 'Neue Phase eines Semesters'
};

/** How a kind of event is named on a screen. */
export function kindLabel(kind: NotificationKind): string {
	return KIND_LABELS[kind] ?? kind;
}

const TARGET_SET_LABELS: Record<NotificationTargetSet, string> = {
	MY_ADVANCE_WISHES: 'meine Vormerkungen',
	MY_WISHES: 'meine Wünsche',
	MY_ASSIGNMENTS: 'meine Zuteilungen',
	MY_COMPETENCES: 'meine Kompetenzen',
	MY_SUBJECT_GROUPS: 'meine Fachgruppen',
	MY_PROGRAMMES: 'meine Studiengänge'
};

/** How a set of one's own rows is named. */
export function targetSetLabel(set: NotificationTargetSet): string {
	return TARGET_SET_LABELS[set] ?? set;
}

/**
 * Which sets can say something about which kind — the backend's `targetSetKinds`. Withdrawal is
 * missing for wishes and assignments because an instance somebody wished for or holds cannot be
 * withdrawn at all.
 */
const SET_KINDS: Record<NotificationTargetSet, readonly NotificationKind[]> = {
	MY_ADVANCE_WISHES: ['MODULE_OFFERED', 'MODULE_WITHDRAWN', 'ADVANCE_WISH_RESOLVED'],
	MY_WISHES: ['WISH_WINDOW_CHANGED', 'ASSIGNMENTS_PUBLISHED'],
	MY_ASSIGNMENTS: ['ASSIGNMENTS_PUBLISHED', 'CONFIRMATION_DUE'],
	MY_COMPETENCES: ['MODULE_OFFERED', 'MODULE_WITHDRAWN'],
	MY_SUBJECT_GROUPS: ['MODULE_OFFERED', 'MODULE_WITHDRAWN', 'WISH_WINDOW_CHANGED'],
	MY_PROGRAMMES: ['MODULE_OFFERED', 'MODULE_WITHDRAWN', 'DEMAND_RELEASED', 'REVIEW_COMPLETED']
};

/** The sets the form offers for a kind. */
export function targetSetsFor(kind: NotificationKind): NotificationTargetSet[] {
	return (Object.keys(SET_KINDS) as NotificationTargetSet[]).filter((set) =>
		SET_KINDS[set].includes(kind)
	);
}

/**
 * Which concrete targets make sense for a kind. A phase or a publication is about a whole
 * semester; a door is a subject group's; a release a programme's; an offer all three.
 */
export function targetsFor(kind: NotificationKind): { programme: boolean; subjectGroup: boolean } {
	switch (kind) {
		case 'MODULE_OFFERED':
		case 'MODULE_WITHDRAWN':
		case 'ADVANCE_WISH_RESOLVED':
			return { programme: true, subjectGroup: true };
		case 'DEMAND_RELEASED':
		case 'REVIEW_COMPLETED':
			return { programme: true, subjectGroup: false };
		case 'WISH_WINDOW_CHANGED':
			return { programme: false, subjectGroup: true };
		default:
			return { programme: false, subjectGroup: false };
	}
}

/** The shape of a subscription as the pages read it. */
export type SubscriptionView = {
	kind: NotificationKind;
	semester?: string | null;
	targetSet?: NotificationTargetSet | null;
	module?: { id?: string; name: string; homeProgrammeCode: string } | null;
	programme?: { code: string } | null;
	subjectGroup?: { name: string } | null;
};

/** What a subscription follows, in a few words: „Softwareentwicklung II (IF)“, „meine Wünsche“. */
export function targetLabel(s: SubscriptionView): string {
	if (s.module) return `${s.module.name || 'Modul ohne Namen'} (${s.module.homeProgrammeCode})`;
	if (s.programme) return `Studiengang ${s.programme.code}`;
	if (s.subjectGroup) return `Fachgruppe ${s.subjectGroup.name}`;
	if (s.targetSet) return targetSetLabel(s.targetSet);
	return 'alle';
}

/** The semester a subscription is bound to, or that it applies to every one. */
export function semesterScopeLabel(semester: string | null | undefined): string {
	return semester ? semester : 'jedes Semester';
}

/** How a delivery is named. */
export function deliveryLabel(d: NotificationDelivery): string {
	return d === 'DAILY' ? 'täglich gesammelt' : 'sofort';
}

/** Whether a subscription is "tell me whenever this module is offered" — what the bell toggles. */
export function isModuleBell(s: SubscriptionView, moduleId: string): boolean {
	return (
		s.kind === 'MODULE_OFFERED' &&
		!s.semester &&
		!s.targetSet &&
		!s.programme &&
		!s.subjectGroup &&
		s.module?.id === moduleId
	);
}

/** An audience as the pages read it. */
export type AudienceView = {
	kind: AnnouncementAudienceKind;
	subjectGroup?: { id: string; name: string } | null;
	programme?: { code: string; title?: string } | null;
	semester?: string | null;
};

/** Who an announcement goes to, as a sentence fragment: „an die Fachgruppe Mathematik“. */
export function audienceLabel(a: AudienceView): string {
	switch (a.kind) {
		case 'SUBJECT_GROUP':
			return `an die Fachgruppe ${a.subjectGroup?.name ?? ''}`.trim();
		case 'PROGRAMME':
			return `an alle, die ${a.semester ? `im ${a.semester} ` : ''}in ${a.programme?.code ?? ''} lehren oder sich dafür eingetragen haben`;
		case 'COLLEAGUES':
			return 'an das Kollegium';
		case 'LEADS':
			return 'an alle Fachgruppen- und Studiengangsleitungen und das Dekanat';
		case 'ALL_ACCOUNTS':
			return 'an alle mit einem Tallox-Konto';
	}
	return '';
}

/** A stable value for an audience in a `<select>`, and back. */
export function audienceKey(a: AudienceView): string {
	switch (a.kind) {
		case 'SUBJECT_GROUP':
			return `SUBJECT_GROUP:${a.subjectGroup?.id ?? ''}`;
		case 'PROGRAMME':
			return `PROGRAMME:${a.programme?.code ?? ''}:${a.semester ?? ''}`;
		default:
			return a.kind;
	}
}

/** The input the backend takes for a key from `audienceKey`, or null for a malformed one. */
export function audienceInput(key: string): {
	kind: AnnouncementAudienceKind;
	subjectGroupId?: string;
	programme?: string;
	semester?: string;
} | null {
	const [kind, a, b] = key.split(':');
	switch (kind) {
		case 'SUBJECT_GROUP':
			return a ? { kind, subjectGroupId: a } : null;
		case 'PROGRAMME':
			return a && b ? { kind, programme: a, semester: b } : null;
		case 'COLLEAGUES':
		case 'LEADS':
		case 'ALL_ACCOUNTS':
			return { kind };
	}
	return null;
}
