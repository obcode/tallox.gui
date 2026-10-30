import type { Phase } from '$lib/gql/__generated__/graphql';
import type { GuideLink } from '$lib/guide';
import { belowMinimum, type CompetenceTotalLike } from '$lib/competences';
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

export type SetupCard =
	| { complete: false; groups: SetupGroup[]; done: number; total: number }
	/** Nothing open: one line instead of an empty list, so the card is still there to find. */
	| { complete: true; summary: string; where: readonly GuideLink[] };

/** A subject group I am in. */
export type SetupSubjectGroup = { id: string; name: string };

export type SetupInput = {
	/** The effective roles. The card is a lecturer's; a lead or the dean's office holds it too. */
	roles: readonly string[];
	subjectGroups: readonly SetupSubjectGroup[];
	/**
	 * My count over all my subject groups and the minimum, which the backend already caps at the
	 * compulsory modules my groups have — so a group of electives does not leave the item open.
	 */
	competenceTotal: CompetenceTotalLike;
	/** The planning semester and whether I have stated my hours for it; null while none is named. */
	semester: { code: string; phase: Phase; frozen: boolean; stated: boolean } | null;
};

/**
 * The phases in which the desired hours are worth a reminder. They can be entered until the dean's
 * office freezes them, but from the assignment on the planning has been done without them, and a
 * reminder would only be a reproach.
 */
const DESIRED_HOURS_PHASES: readonly Phase[] = ['DEMAND_PLANNING', 'WISHES'];

function onceItems(input: SetupInput): SetupItem[] {
	const groups = input.subjectGroups.length;
	const total = input.competenceTotal;
	const below = belowMinimum(total);

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
			done: groups > 0 && !below,
			text:
				groups === 0
					? 'Geht, sobald Du Deine Fachgruppen angegeben hast.'
					: below
						? `Die Fakultät bittet um mindestens drei Pflichtfächer als „kann ich halten“, über alle Deine Fachgruppen zusammen. Bisher ${total.canTeachCompulsory} von ${total.minimum}.`
						: 'Genug Pflichtfächer angegeben.',
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
 * The card, or null for somebody who is not a lecturer.
 *
 * A group whose items are all done disappears, so that somebody who set up long ago sees one item
 * when a new planning semester asks for their hours. With nothing open the card shrinks to one
 * line rather than vanishing: a card that is sometimes there and sometimes not reads as broken,
 * and "done" has to look different from "did not load". There is no "dismiss": that would be a
 * state to store.
 */
export function setupCard(input: SetupInput): SetupCard | null {
	if (!input.roles.includes('LECTURER')) return null;

	const semester = semesterItems(input);
	const groups = [{ title: 'Einmal angeben', items: onceItems(input) }, semester].filter(
		(group): group is SetupGroup => !!group && group.items.some((item) => !item.done)
	);

	if (groups.length === 0) {
		const where = [...onceItems(input), ...(semester?.items ?? [])].flatMap((item) => item.where);
		return {
			complete: true,
			summary: semester
				? `Fachgruppen, Kompetenzen und Deine Wunsch-SWS ${semester.title.replace(/^Für/, 'für das')} sind angegeben.`
				: 'Fachgruppen und Kompetenzen sind angegeben.',
			where
		};
	}

	const items = groups.flatMap((group) => group.items);
	return {
		complete: false,
		groups,
		done: items.filter((item) => item.done).length,
		total: items.length
	};
}
