import type { AdvanceWishStatus, WishPriority } from '$lib/gql/__generated__/graphql';
import { semesterName } from '$lib/semester';
import { WISH_PRIORITIES, WISH_PRIORITY_LABELS } from '$lib/wishes';

/**
 * Advance wishes („Vormerkungen“): interest in a module for a semester whose demand is not settled.
 *
 * The backend turns one into a wish on every cohort once the programme releases its demand, and
 * reports `NOT_OFFERED` where the release has no cohort of the module. Nothing here decides who
 * sees what — the rows arrive filtered by the wish rule — and nothing here counts: a number of
 * advance wishes on a module is the confidential fact with the names taken out.
 */

export const ADVANCE_STATUS_LABELS: Record<AdvanceWishStatus, string> = {
	PENDING: 'wartet auf Freigabe',
	CONVERTED: 'als Wunsch übernommen',
	NOT_OFFERED: 'nicht angeboten'
};

/** The badge class per status. Semantic colours as backgrounds only, never as text. */
export const ADVANCE_STATUS_BADGES: Record<AdvanceWishStatus, string> = {
	PENDING: 'badge-ghost',
	CONVERTED: 'badge-success',
	NOT_OFFERED: 'badge-warning'
};

/** "höchstens einen Zug", "höchstens 2 Züge", or empty for no bound. */
export function maxTracksLabel(maxTracks: number | null | undefined): string {
	if (!maxTracks) return '';
	return maxTracks === 1 ? 'höchstens einen Zug' : `höchstens ${maxTracks} Züge`;
}

/** "unbedingt · höchstens einen Zug", or the level alone without a bound. */
export function advanceLevelLabel(
	priority: WishPriority,
	maxTracks: number | null | undefined
): string {
	const bound = maxTracksLabel(maxTracks);
	const level = WISH_PRIORITY_LABELS[priority];
	return bound ? `${level} · ${bound}` : level;
}

/** One sentence per status, for the row and for the help. */
export function advanceStatusHint(status: AdvanceWishStatus, programmeCode: string): string {
	switch (status) {
		case 'PENDING':
			return `Wird zum Wunsch, sobald die Studiengangsleitung von ${programmeCode} den Bedarf freigibt.`;
		case 'CONVERTED':
			return 'Steht jetzt als Wunsch auf jedem Zug des Moduls — ändern oder zurückziehen unter „Wünsche“.';
		case 'NOT_OFFERED':
			return `${programmeCode} hat den Bedarf freigegeben, ohne dieses Modul anzubieten. Wird es doch noch angeboten, wird die Vormerkung zum Wunsch.`;
		default:
			return '';
	}
}

/**
 * The semester a date falls in: summer from March to August, winter from September to February —
 * and January and February belong to the winter that began the year before.
 */
export function semesterAt(date: Date): string {
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	if (month >= 3 && month <= 8) return `${year}-SS`;
	return month >= 9 ? `${year}-WS` : `${year - 1}-WS`;
}

/** The semester after this one. */
export function nextSemester(code: string): string {
	const match = /^(\d{4})-(SS|WS)$/.exec(code);
	if (!match) return code;
	const year = Number(match[1]);
	return match[2] === 'SS' ? `${year}-WS` : `${year + 1}-SS`;
}

/** How far ahead the form offers: four years. The backend accepts ten. */
export const ADVANCE_HORIZON = 8;

/**
 * The semesters one may note something down for: the ones after the current, four years ahead.
 *
 * Not the current one — its demand is settled or being settled, and the wish itself is the thing
 * to enter. The backend refuses a released programme anyway; the list just does not invite it.
 */
export function advanceSemesters(today: Date, count = ADVANCE_HORIZON): string[] {
	const out: string[] = [];
	let code = semesterAt(today);
	for (let i = 0; i < count; i++) {
		code = nextSemester(code);
		out.push(code);
	}
	return out;
}

export type AdvanceWishLike = {
	id: string;
	semester: string;
	status: AdvanceWishStatus;
	programme: { code: string };
	module: { id: string; name: string };
};

/** Own advance wishes grouped by semester, in calendar order (the code sorts chronologically). */
export function advanceBySemester<T extends AdvanceWishLike>(
	rows: readonly T[]
): { semester: string; name: string; rows: T[] }[] {
	const groups = new Map<string, T[]>();
	for (const row of rows) {
		const list = groups.get(row.semester) ?? [];
		list.push(row);
		groups.set(row.semester, list);
	}
	return [...groups.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([semester, list]) => ({
			semester,
			name: semesterName(semester),
			rows: [...list].sort(
				(a, b) =>
					a.module.name.localeCompare(b.module.name, 'de') ||
					a.programme.code.localeCompare(b.programme.code, 'de')
			)
		}));
}

/**
 * The start page's line for own advance wishes the release left out: "not needed after all", the
 * notification the faculty asked for. Null when there is none. Only own rows go in here.
 */
export function notOfferedNotice(rows: readonly AdvanceWishLike[]): string | null {
	const missing = rows
		.filter((r) => r.status === 'NOT_OFFERED')
		.sort((a, b) => a.semester.localeCompare(b.semester));
	if (missing.length === 0) return null;
	const items = missing.map(
		(r) =>
			`${r.module.name || 'Modul ohne Namen'} (${r.programme.code}, ${semesterName(r.semester)})`
	);
	const list =
		items.length === 1
			? items[0]
			: `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
	return items.length === 1
		? `Nicht angeboten: ${list}. Die Studiengangsleitung hat den Bedarf ohne dieses Modul freigegeben.`
		: `Nicht angeboten: ${list}. Die Studiengangsleitungen haben den Bedarf ohne diese Module freigegeben.`;
}

export type AdvanceWishInput = {
	semester: string;
	programme: string;
	module: string;
	priority: WishPriority;
	note: string | null;
	maxTracks: number | null;
};

/**
 * Reads the form for a new or changed advance wish, or says in one sentence what is missing.
 * The backend checks the same; this only gives the sentence before a round trip.
 */
export function parseAdvanceForm(
	form: FormData
): { ok: true; value: AdvanceWishInput } | { ok: false; message: string } {
	const text = (key: string) => String(form.get(key) ?? '').trim();

	const semester = text('semester');
	if (!/^\d{4}-(SS|WS)$/.test(semester)) {
		return { ok: false, message: 'Bitte ein Semester wählen.' };
	}
	const programme = text('programme');
	if (programme === '') return { ok: false, message: 'Bitte einen Studiengang wählen.' };
	const module = text('module');
	if (module === '') return { ok: false, message: 'Bitte ein Modul wählen.' };

	const priority = text('priority') as WishPriority;
	if (!(WISH_PRIORITIES as readonly string[]).includes(priority)) {
		return { ok: false, message: 'Diese Priorität gibt es nicht.' };
	}

	const note = text('note');
	if (note.length > 500) {
		return { ok: false, message: 'Die Notiz ist auf 500 Zeichen begrenzt.' };
	}

	const rawLimit = text('maxTracks');
	let maxTracks: number | null = null;
	if (rawLimit !== '') {
		const parsed = Number(rawLimit);
		if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9) {
			return { ok: false, message: '„Höchstens“ geht von einem bis neun Zügen.' };
		}
		maxTracks = parsed;
	}

	return {
		ok: true,
		value: { semester, programme, module, priority, note: note === '' ? null : note, maxTracks }
	};
}
