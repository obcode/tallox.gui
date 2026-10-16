/**
 * The SWS controlling: the teaching a semester costs, by the home programme of each module.
 *
 * The backend sums; this arranges. What is arranged here is what the spreadsheet did beside the
 * sums — the same semester a year earlier next to each programme, the difference, and which
 * programmes are this faculty's and which only lend it modules — and none of it is a rule, which
 * is why it may live in the interface.
 */

/** A programme as the controlling names it. */
export type ControllingProgramme = {
	code: string;
	title: string;
	planningStatus: string;
};

/** One home programme's load, in the shape `teachingLoad` answers. */
export type LoadInput = {
	homeProgramme: ControllingProgramme;
	teachingHours: number;
	ownHours: number;
	instanceCount: number;
	fwpInstanceCount: number;
	fwpHours: number;
	partsWithoutHours: number;
	shares: readonly {
		programme: { code: string; title: string };
		teachingHours: number;
		instanceCount: number;
	}[];
	/** The study year's quota and what follows from it, as the backend computes them. */
	yearlyQuota?: number | null;
	semesterQuota?: number | null;
	balance?: number | null;
};

/** Where a home programme's modules are taught outside it. */
export type LentShare = {
	code: string;
	title: string;
	teachingHours: number;
	instanceCount: number;
};

export type ControllingRow = {
	programme: ControllingProgramme;
	teachingHours: number;
	ownHours: number;
	/** Taught in other programmes' instances: the export. */
	lentHours: number;
	lent: LentShare[];
	instanceCount: number;
	fwpInstanceCount: number;
	fwpHours: number;
	partsWithoutHours: number;
	/** The same semester a year earlier, or null where there is nothing to compare with. */
	previousHours: number | null;
	/** This semester minus that one, or null. */
	delta: number | null;
};

export type Controlling = {
	/** The programmes this faculty plans, by code. */
	planned: ControllingRow[];
	/** Programmes the faculty does not plan whose modules are taught here anyway. */
	others: ControllingRow[];
	/** The sum over both, which is what the faculty spends. */
	total: Omit<ControllingRow, 'programme' | 'lent'>;
};

/**
 * The table, with the previous year beside each row.
 *
 * `previous` is null when the comparable semester could not be asked about at all; then every
 * comparison is null rather than zero — "no figure" and "nothing was taught" are different
 * statements, and a delta against an invented zero would read as growth.
 */
export function controllingTable(
	current: readonly LoadInput[],
	previous: readonly LoadInput[] | null
): Controlling {
	const before = new Map((previous ?? []).map((l) => [l.homeProgramme.code, l.teachingHours]));

	const rows = current.map((l): ControllingRow => {
		const lent = l.shares
			.filter((s) => s.programme.code !== l.homeProgramme.code)
			.map((s) => ({
				code: s.programme.code,
				title: s.programme.title,
				teachingHours: s.teachingHours,
				instanceCount: s.instanceCount
			}));
		const previousHours = previous === null ? null : (before.get(l.homeProgramme.code) ?? 0);
		return {
			programme: l.homeProgramme,
			teachingHours: l.teachingHours,
			ownHours: l.ownHours,
			lentHours: l.teachingHours - l.ownHours,
			lent,
			instanceCount: l.instanceCount,
			fwpInstanceCount: l.fwpInstanceCount,
			fwpHours: l.fwpHours,
			partsWithoutHours: l.partsWithoutHours,
			previousHours,
			delta: previousHours === null ? null : l.teachingHours - previousHours
		};
	});

	const byCode = (a: ControllingRow, b: ControllingRow) =>
		a.programme.code.localeCompare(b.programme.code);
	const planned = rows.filter((r) => r.programme.planningStatus === 'PLANNED').sort(byCode);
	const others = rows.filter((r) => r.programme.planningStatus !== 'PLANNED').sort(byCode);

	const sum = (f: (r: ControllingRow) => number) => rows.reduce((t, r) => t + f(r), 0);
	const previousTotal =
		previous === null ? null : previous.reduce((t, l) => t + l.teachingHours, 0);
	const teachingHours = sum((r) => r.teachingHours);

	return {
		planned,
		others,
		total: {
			teachingHours,
			ownHours: sum((r) => r.ownHours),
			lentHours: sum((r) => r.lentHours),
			instanceCount: sum((r) => r.instanceCount),
			fwpInstanceCount: sum((r) => r.fwpInstanceCount),
			fwpHours: sum((r) => r.fwpHours),
			partsWithoutHours: sum((r) => r.partsWithoutHours),
			previousHours: previousTotal,
			delta: previousTotal === null ? null : teachingHours - previousTotal
		}
	};
}

/** A difference as it is read: with its sign, and nothing for none. */
export function deltaLabel(delta: number | null, format: (n: number) => string): string {
	if (delta === null) return '–';
	if (delta === 0) return '±0';
	return delta > 0 ? `+${format(delta)}` : `−${format(-delta)}`;
}

/** One programme measured against its quota. */
export type QuotaRow = {
	programme: ControllingProgramme;
	/** What the dean's office entered for the study year, or null: nothing entered. */
	yearlyQuota: number | null;
	/** Half of it, the share this semester may spend. */
	semesterQuota: number | null;
	teachingHours: number;
	/** semesterQuota minus teachingHours, or null without a quota. */
	balance: number | null;
};

/**
 * The quota table: every programme this faculty plans, and any other one that has a quota.
 *
 * The balance is the backend's — a script reading the API must get the same number as this page —
 * so nothing is computed here but the selection and the order. A planned programme without a
 * quota stays in the list with no figure: it is the row somebody still has to fill in.
 */
export function quotaTable(current: readonly LoadInput[]): QuotaRow[] {
	return current
		.filter((l) => l.homeProgramme.planningStatus === 'PLANNED' || l.yearlyQuota != null)
		.map((l) => ({
			programme: l.homeProgramme,
			yearlyQuota: l.yearlyQuota ?? null,
			semesterQuota: l.semesterQuota ?? null,
			teachingHours: l.teachingHours,
			balance: l.balance ?? null
		}))
		.sort((a, b) => a.programme.code.localeCompare(b.programme.code));
}

/**
 * The badge a balance gets: a programme spending more than it has is the one thing on this page
 * that asks for a conversation.
 *
 * Background colours only, as everywhere: `text-error` on a light theme is unreadable.
 */
export function balanceBadge(balance: number | null): string {
	if (balance === null) return 'badge badge-ghost badge-sm';
	if (balance < 0) return 'badge badge-error badge-sm';
	return 'badge badge-success badge-sm';
}

/** An instance a programme takes from elsewhere, in the shape the page asks for it. */
export type ImportInput = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	teachingHours: number;
	/** Set when another programme holds this cohort's teaching; it costs nothing once accepted. */
	coveredBy?: { acceptedAt?: string | null } | null;
	module: {
		name: string;
		zpaId?: string | null;
		kind: string;
		homeProgramme: { code: string; title: string };
		dutyStatus?: string | null;
	};
};

/** The imports of one home programme. */
export type ImportGroup = {
	home: { code: string; title: string };
	instances: ImportInput[];
	teachingHours: number;
};

/**
 * What a programme takes from elsewhere, grouped by the programme each module is home to.
 *
 * The question a programme lead asked: which electives of a basket are actually offered — and
 * they are mostly someone else's modules, which is exactly why they are not on anybody's radar.
 * The hours are the hours of the instances; they count at the home programme in the table above,
 * not here, and the page says so.
 */
export function importGroups(instances: readonly ImportInput[]): ImportGroup[] {
	const groups = new Map<string, ImportGroup>();
	for (const i of instances) {
		const home = i.module.homeProgramme;
		let group = groups.get(home.code);
		if (!group) {
			group = { home, instances: [], teachingHours: 0 };
			groups.set(home.code, group);
		}
		group.instances.push(i);
		group.teachingHours += i.teachingHours;
	}
	return [...groups.values()].sort((a, b) => a.home.code.localeCompare(b.home.code));
}

/**
 * The study year a semester belongs to, named after the year its winter starts in: 2026-WS and
 * 2027-SS are both 2026.
 *
 * Only to choose which year a form edits and to name it; the backend applies the same rule to the
 * figures and refuses a year out of reach. Null for a code that is not one.
 */
export function studyYearOf(code: string): number | null {
	const match = /^(\d{4})-(SS|WS)$/.exec(code);
	if (!match) return null;
	const year = Number(match[1]);
	return match[2] === 'SS' ? year - 1 : year;
}

/** How a study year is named in the faculty: `2026/27`. */
export function studyYearLabel(year: number): string {
	return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
}
