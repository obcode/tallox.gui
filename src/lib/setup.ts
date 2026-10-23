import type { Phase } from '$lib/gql/__generated__/graphql';
import type { GuideLink } from '$lib/guide';
import { belowMinimum } from '$lib/competences';
import { semesterName } from '$lib/semester';

/**
 * "Dein Stand": what a lecturer has not stated yet, on the start page.
 *
 * The introduction tells everybody the same; "Jetzt dran" knows the phase and the roles, not what
 * somebody has entered. This is the third thing — the own state, derived from the own rows and
 * from nothing else. Nothing is stored for it: no "set up" flag, which would go stale the day
 * somebody joins a second subject group, and no "has read the introduction", which would be a
 * record of behaviour (the question the access log raises, see `tallox.dev`). The introduction
 * stays a link rather than a box to tick.
 *
 * It points at the pages that already save themselves and asks for nothing on its own. Every
 * figure here is the person's own, so wish confidentiality is not touched — and nothing here is a
 * permission: the backend refuses nothing for an unticked item.
 */

export type SetupItemKey = 'SUBJECT_GROUPS' | 'COMPETENCES' | 'DESIRED_HOURS';

export type SetupItem = {
	key: SetupItemKey;
	title: string;
	done: boolean;
	/** One sentence: what is missing, or that it is there. */
	text: string;
	where: readonly GuideLink[];
};

export type SetupGroup = { title: string; items: SetupItem[] };

export type SetupCard = { groups: SetupGroup[]; done: number; total: number };

/** A subject group I am in, with whether each of its modules is compulsory. */
export type SetupSubjectGroup = {
	id: string;
	name: string;
	modules: readonly { compulsory: boolean }[];
};

export type SetupInput = {
	/** The effective roles. The card is a lecturer's; a lead or the dean's office holds it too. */
	roles: readonly string[];
	subjectGroups: readonly SetupSubjectGroup[];
	competenceStatus: readonly {
		subjectGroup: { id: string };
		canTeachCompulsory: number;
		minimum: number;
	}[];
	/** The planning semester and whether I have stated my hours for it; null while none is named. */
	semester: { code: string; phase: Phase; frozen: boolean; stated: boolean } | null;
};

/**
 * The phases in which the desired hours are worth a reminder. They can be entered until the dean's
 * office freezes them, but from the assignment on the planning has been done without them, and a
 * reminder would only be a reproach.
 */
const DESIRED_HOURS_PHASES: readonly Phase[] = ['DEMAND_PLANNING', 'WISHES'];

/**
 * How many compulsory modules a group can ask of me: the faculty's minimum, or fewer when the group
 * has fewer. The backend reports the flat minimum; a group of electives would otherwise leave the
 * item open for good.
 */
export function reachableMinimum(group: SetupSubjectGroup, minimum: number): number {
	return Math.min(minimum, group.modules.filter((m) => m.compulsory).length);
}

/** The groups below the minimum, as "Softwarefächer: 1 von 3". */
function competenceGaps(input: SetupInput): string[] {
	return input.subjectGroups.flatMap((group) => {
		const status = input.competenceStatus.find((s) => s.subjectGroup.id === group.id);
		const minimum = reachableMinimum(group, status?.minimum ?? 0);
		const have = status?.canTeachCompulsory ?? 0;
		return belowMinimum({ canTeachCompulsory: have, minimum })
			? [`${group.name}: ${have} von ${minimum}`]
			: [];
	});
}

function onceItems(input: SetupInput): SetupItem[] {
	const groups = input.subjectGroups.length;
	const gaps = competenceGaps(input);

	return [
		{
			key: 'SUBJECT_GROUPS',
			title: 'Fachgruppen angeben',
			done: groups > 0,
			text:
				groups > 0
					? `In ${groups === 1 ? 'einer Fachgruppe' : `${groups} Fachgruppen`} angegeben.`
					: 'In welchen Fächern Du arbeitest. Davon hängt ab, welche Module Du unter „Kompetenzen“ siehst.',
			where: [{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' }]
		},
		{
			key: 'COMPETENCES',
			title: 'Kompetenzen angeben',
			done: groups > 0 && gaps.length === 0,
			text:
				groups === 0
					? 'Geht, sobald Du Deine Fachgruppen angegeben hast.'
					: gaps.length > 0
						? `Die Fakultät bittet um mindestens drei Pflichtfächer je Fachgruppe als „kann ich halten“. Noch offen: ${gaps.join(', ')}.`
						: 'In jeder Deiner Fachgruppen sind genug Pflichtfächer angegeben.',
			where: [{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' }]
		}
	];
}

function semesterItems(input: SetupInput): SetupGroup | null {
	const semester = input.semester;
	if (!semester || semester.frozen || !DESIRED_HOURS_PHASES.includes(semester.phase)) return null;

	return {
		title: `Für ${semesterName(semester.code)}`,
		items: [
			{
				key: 'DESIRED_HOURS',
				title: 'Wunsch-SWS angeben',
				done: semester.stated,
				text: semester.stated
					? 'Angegeben. Ändern geht bis zum Stichtag des Dekanats.'
					: 'Wie viele SWS modulbehaftete Lehre Du in diesem Semester übernehmen möchtest, als Bereich von–bis, bis zum Stichtag des Dekanats.',
				where: [{ href: '/wuensche', label: 'Wünsche' }]
			}
		]
	};
}

/**
 * The card, or null when there is nothing to show: no lecturer, or everything stated.
 *
 * A group whose items are all done disappears, so that somebody who set up long ago sees one item
 * when a new planning semester asks for their hours — and nothing at all once they have stated
 * them. There is no "dismiss": that would be a state to store.
 */
export function setupCard(input: SetupInput): SetupCard | null {
	if (!input.roles.includes('LECTURER')) return null;

	const groups = [
		{ title: 'Einmal einrichten', items: onceItems(input) },
		semesterItems(input)
	].filter((group): group is SetupGroup => !!group && group.items.some((item) => !item.done));

	if (groups.length === 0) return null;

	const items = groups.flatMap((group) => group.items);
	return { groups, done: items.filter((item) => item.done).length, total: items.length };
}
