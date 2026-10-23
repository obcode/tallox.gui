/**
 * The SWS controlling: the teaching a semester costs, by the programme that holds it.
 *
 * Whoever holds the teaching pays for it — the backend's rule since 2026-10-16, so DC's own
 * Analysis costs DC although the module is IF's, and a cohort that joins another programme's
 * event costs nothing. The backend sums; this arranges: the same semester a year earlier beside
 * each programme, the difference, and which programmes are this faculty's — and none of it is a
 * rule, which is why it may live in the interface.
 */

/** A programme as the controlling names it. */
export type ControllingProgramme = {
	code: string;
	title: string;
	planningStatus: string;
};

/** One programme's load, in the shape `teachingLoad` answers: what its instances cost. */
export type LoadInput = {
	programme: ControllingProgramme;
	teachingHours: number;
	ownHours: number;
	instanceCount: number;
	fwpInstanceCount: number;
	fwpHours: number;
	partsWithoutHours: number;
	/**
	 * What other faculties teach in the programme's instances — beside the load, never in it. Absent
	 * from a server that predates it, which reads as none.
	 */
	externalHours?: number;
	/** Split by the home programme of the modules. */
	shares: readonly {
		homeProgramme: { code: string; title: string };
		teachingHours: number;
		instanceCount: number;
	}[];
	/** The study year's quota and what follows from it, as the backend computes them. */
	yearlyQuota?: number | null;
	semesterQuota?: number | null;
	balance?: number | null;
};

/** Modules of another programme that this one teaches in its own instances. */
export type ForeignShare = {
	code: string;
	title: string;
	teachingHours: number;
	instanceCount: number;
};

export type ControllingRow = {
	programme: ControllingProgramme;
	teachingHours: number;
	ownHours: number;
	/** Spent on other programmes' modules in its own instances: the import. */
	foreignHours: number;
	foreign: ForeignShare[];
	instanceCount: number;
	fwpInstanceCount: number;
	fwpHours: number;
	partsWithoutHours: number;
	/** Taught by other faculties in the programme's instances, and not in `teachingHours`. */
	externalHours: number;
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
	total: Omit<ControllingRow, 'programme' | 'foreign'>;
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
	const before = new Map((previous ?? []).map((l) => [l.programme.code, l.teachingHours]));

	const rows = current.map((l): ControllingRow => {
		const foreign = l.shares
			.filter((s) => s.homeProgramme.code !== l.programme.code)
			.map((s) => ({
				code: s.homeProgramme.code,
				title: s.homeProgramme.title,
				teachingHours: s.teachingHours,
				instanceCount: s.instanceCount
			}));
		const previousHours = previous === null ? null : (before.get(l.programme.code) ?? 0);
		return {
			programme: l.programme,
			teachingHours: l.teachingHours,
			ownHours: l.ownHours,
			foreignHours: l.teachingHours - l.ownHours,
			foreign,
			instanceCount: l.instanceCount,
			fwpInstanceCount: l.fwpInstanceCount,
			fwpHours: l.fwpHours,
			partsWithoutHours: l.partsWithoutHours,
			externalHours: l.externalHours ?? 0,
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
			foreignHours: sum((r) => r.foreignHours),
			instanceCount: sum((r) => r.instanceCount),
			fwpInstanceCount: sum((r) => r.fwpInstanceCount),
			fwpHours: sum((r) => r.fwpHours),
			partsWithoutHours: sum((r) => r.partsWithoutHours),
			externalHours: sum((r) => r.externalHours),
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
		.filter((l) => l.programme.planningStatus === 'PLANNED' || l.yearlyQuota != null)
		.map((l) => ({
			programme: l.programme,
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
 * The hours are the hours of the instances: one with parts of its own counts at the programme
 * that holds it, a covered one costs nothing here and counts at its host.
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

/** An instance of a programme, with the baskets its module sits in there. */
export type BasketInput = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	teachingHours: number;
	coveredBy?: { acceptedAt?: string | null } | null;
	module: {
		name: string;
		zpaId?: string | null;
		kind: string;
		dutyStatus?: string | null;
		baskets: string[];
	};
};

/** The electives of one basket, or of none (`basket` null) for the ones the catalogue files nowhere. */
export type BasketGroup = {
	basket: string | null;
	instances: (BasketInput & { alsoIn: string[] })[];
	teachingHours: number;
};

/**
 * A programme's electives this semester, grouped by the basket of its regulations they sit in.
 *
 * Compulsory modules are left out: the question is "which of this basket's electives run", and a
 * compulsory module answers a different one. A module in two baskets is listed in both — that is
 * where a programme lead looks for it — and says so with `alsoIn`, so that adding up the groups by
 * hand visibly counts it twice. Electives without a basket (a local module, a placeholder) come
 * last, under `null`, rather than vanishing.
 */
export function basketGroups(instances: readonly BasketInput[]): BasketGroup[] {
	const groups = new Map<string | null, BasketGroup>();
	const add = (basket: string | null, i: BasketInput, alsoIn: string[]) => {
		let group = groups.get(basket);
		if (!group) {
			group = { basket, instances: [], teachingHours: 0 };
			groups.set(basket, group);
		}
		group.instances.push({ ...i, alsoIn });
		group.teachingHours += i.teachingHours;
	};
	for (const i of instances) {
		if (i.module.dutyStatus === 'COMPULSORY') continue;
		const baskets = i.module.baskets;
		if (baskets.length === 0) {
			add(null, i, []);
			continue;
		}
		for (const b of baskets) {
			add(
				b,
				i,
				baskets.filter((other) => other !== b)
			);
		}
	}
	return [...groups.values()].sort((a, b) =>
		a.basket === null ? 1 : b.basket === null ? -1 : a.basket.localeCompare(b.basket, 'de')
	);
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

/** One programme's study year, in the shape `studyYearLoad` answers. */
export type StudyYearInput = {
	programme: ControllingProgramme;
	yearlyQuota?: number | null;
	winterHours: number;
	summerHours: number;
	remaining?: number | null;
	partsWithoutHours: number;
};

export type StudyYearRow = {
	programme: ControllingProgramme;
	yearlyQuota: number | null;
	winterHours: number;
	summerHours: number;
	/** The quota minus both semesters, the backend's figure; null without a quota. */
	remaining: number | null;
	partsWithoutHours: number;
	/** Whether the programme has announced its review of the selected semester as done. */
	reviewed: boolean;
};

/**
 * The study-year table: every programme this faculty plans, and any other one with a quota, by
 * code — the same selection as the quota table, so the two never disagree about who is listed.
 */
export function studyYearTable(
	rows: readonly StudyYearInput[],
	reviewed: ReadonlySet<string> = new Set()
): StudyYearRow[] {
	return rows
		.filter((r) => r.programme.planningStatus === 'PLANNED' || r.yearlyQuota != null)
		.map((r) => ({
			programme: r.programme,
			yearlyQuota: r.yearlyQuota ?? null,
			winterHours: r.winterHours,
			summerHours: r.summerHours,
			remaining: r.remaining ?? null,
			partsWithoutHours: r.partsWithoutHours,
			reviewed: reviewed.has(r.programme.code)
		}))
		.sort((a, b) => a.programme.code.localeCompare(b.programme.code));
}

/** The two semesters of a study year, in order: `2026` is `2026-WS` and `2027-SS`. */
export function studyYearSemesters(year: number): { winter: string; summer: string } {
	return { winter: `${year}-WS`, summer: `${year + 1}-SS` };
}

/**
 * What a semester may spend, said for its term: a winter half the year, a summer what the winter
 * left. The figure itself is the backend's; this only says which rule produced it.
 */
export function semesterQuotaRule(code: string): string {
	return code.endsWith('-SS')
		? 'Ein Sommersemester darf verbrauchen, was das Wintersemester desselben Studienjahres vom Kontingent übrig gelassen hat — das Wintersemester ist verbraucht.'
		: 'Ein Wintersemester darf die Hälfte des Kontingents verbrauchen, weil das Sommersemester noch kommt.';
}

/** One programme's study year as a bar: the two semesters as shares of the quota. */
export type QuotaUsage = {
	/** Shares of the bar in percent, 0–100 each; together never more than 100. */
	winter: number;
	summer: number;
	/** Both semesters against the quota, in percent, unclamped: 130 means 30 over. */
	used: number;
	over: boolean;
};

/**
 * How much of its quota a programme's study year uses, for the bar above the table.
 *
 * The bar is the quota: a programme within it fills part of the track, one over it fills the
 * whole track, and both segments shrink in proportion so the split between the semesters stays
 * readable. How far over is in `used` and in the text, not in a bar running off the edge. No
 * quota, or a quota of zero, has no bar at all — there is nothing to measure against.
 */
export function quotaUsage(row: StudyYearRow): QuotaUsage | null {
	if (row.yearlyQuota === null || row.yearlyQuota <= 0) return null;
	const spent = row.winterHours + row.summerHours;
	const used = (spent / row.yearlyQuota) * 100;
	const scale = spent > row.yearlyQuota ? 100 / spent : 100 / row.yearlyQuota;
	return {
		winter: row.winterHours * scale,
		summer: row.summerHours * scale,
		used,
		over: spent > row.yearlyQuota
	};
}
