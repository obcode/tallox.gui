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
