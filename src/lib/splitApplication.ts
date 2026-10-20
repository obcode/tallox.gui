import { PART_KIND_LABELS, formatHours } from '$lib/catalogue';
import { cohortLabel } from '$lib/demand';
import type { InstancePartKind } from '$lib/gql/__generated__/graphql';

/**
 * Carrying a corrected split over to the instances that already exist — the report, as lines.
 *
 * An instance keeps the parts it was declared or copied with. A split corrected afterwards
 * reaches none of them until somebody carries it over, and before that the demand page and the
 * controlling disagree about the same cohort. The backend does the work and reports it; this
 * turns the report into what the module page shows.
 */

type InstanceLike = {
	semester: string;
	track: string;
	programmeSemester?: number | null;
	programme: { code: string };
};

export type SplitApplicationLike = {
	dryRun: boolean;
	unchanged: number;
	changed: readonly {
		instance: InstanceLike;
		teachingHoursBefore: number;
		teachingHoursAfter: number;
	}[];
	refused: readonly {
		instance: InstanceLike;
		kind: InstancePartKind;
		code: string;
		message: string;
	}[];
};

export type SplitLine = { label: string; text: string };

/** `2027-SS · IF2A` — the semester first, because one module runs in several. */
export function instanceLabel(instance: InstanceLike): string {
	return `${instance.semester} · ${cohortLabel(instance.programme.code, instance.programmeSemester, instance.track)}`;
}

function sortLines(lines: SplitLine[]): SplitLine[] {
	return lines.sort((a, b) => a.label.localeCompare(b.label));
}

/** One line per changed instance: `6 → 5 SWS`, or that only the arrangement changed. */
export function changedLines(report: SplitApplicationLike): SplitLine[] {
	return sortLines(
		report.changed.map((c) => ({
			label: instanceLabel(c.instance),
			text:
				c.teachingHoursBefore === c.teachingHoursAfter
					? `Teile neu geordnet, weiterhin ${formatHours(c.teachingHoursAfter)} SWS`
					: `${formatHours(c.teachingHoursBefore)} → ${formatHours(c.teachingHoursAfter)} SWS`
		}))
	);
}

/** One line per part kind that stays as it is, with the backend's sentence. */
export function refusedLines(report: SplitApplicationLike): SplitLine[] {
	return sortLines(
		report.refused.map((r) => ({
			label: `${instanceLabel(r.instance)} · ${PART_KIND_LABELS[r.kind]}`,
			text: r.message
		}))
	);
}

function instances(n: number): string {
	return n === 1 ? '1 Instanz' : `${n} Instanzen`;
}

/**
 * The headline. After a dry run in the conditional — nothing has happened yet, and a sentence in
 * the past tense would be read as a save.
 */
export function splitSummary(report: SplitApplicationLike): string {
	const changed = report.changed.length;
	const unchanged = report.unchanged;
	if (changed === 0 && report.refused.length === 0) {
		if (unchanged === 0)
			return 'Von diesem Modul gibt es keine Instanz in einem laufenden Semester.';
		return unchanged === 1
			? 'Die Instanz folgt der Aufteilung schon.'
			: `Alle ${instances(unchanged)} folgen der Aufteilung schon.`;
	}
	const parts: string[] = [];
	if (changed > 0) {
		parts.push(
			report.dryRun
				? `${instances(changed)} würde${changed === 1 ? '' : 'n'} angepasst`
				: `${instances(changed)} angepasst`
		);
	}
	if (unchanged > 0) {
		parts.push(`${instances(unchanged)} ${unchanged === 1 ? 'folgt' : 'folgen'} ihr schon`);
	}
	return parts.length > 0 ? `${parts.join(', ')}.` : '';
}
