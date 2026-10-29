import type { InstancePartKind } from '$lib/gql/__generated__/graphql';
import { compareFirstBaskets, firstOf, type CohortOrder } from '$lib/basket';
import { cohortLabel } from '$lib/demand';

/** An instance as the overview asks for it. */
export type OverviewInstance = {
	id: string;
	track: string;
	programmeSemester?: number | null;
	programme: { code: string; title: string };
	module: { id: string; name: string; projectBased?: boolean };
	/** The module's baskets in this cohort's programme; see `$lib/basket`. */
	baskets?: readonly string[] | null;
	parts: {
		id: string;
		kind: InstancePartKind;
		teachingHours?: number | null;
		taughtBy?: string | null;
	}[];
	/** Set when another programme's cohort holds this one's teaching. */
	coveredBy?: {
		acceptedAt?: string | null;
		instance: { track: string; programmeSemester?: number | null; programme: { code: string } };
	} | null;
};

/** An assignment as the overview asks for it. */
export type OverviewAssignment = { part: { id: string }; assignee: { name: string } };

/** One line of the overview: one part of one cohort, and who holds it. */
export type OverviewRow = {
	partId: string;
	kind: InstancePartKind;
	teachingHours?: number | null;
	/** Who holds it; null where nobody does yet. */
	assignee: string | null;
	/** The other faculty that teaches it, where it is not ours. */
	taughtBy: string | null;
};

/** One cohort of one module. */
export type OverviewCohort = {
	instanceId: string;
	label: string;
	/** The cohort that holds this one's teaching, where it is held together with another. */
	heldWith: string | null;
	rows: OverviewRow[];
};

/** One module in one programme, with its cohorts. */
export type OverviewModule = {
	id: string;
	name: string;
	projectBased: boolean;
	/** The basket the module sorts under with the order „nach Korb“, or null for none. */
	basket: string | null;
	cohorts: OverviewCohort[];
};

/** One study programme. */
export type OverviewProgramme = {
	code: string;
	title: string;
	modules: OverviewModule[];
};

/**
 * Who holds what, as a read-only table: programme, module, cohort, part, person.
 *
 * Only ever rendered once the semester's assignment is published. Before that, what an ordinary
 * account may read is its own rows, and the demand is public — so every other part would show as
 * "nicht besetzt", which is a statement about the plan that is not true. The page says it is not
 * published instead, and this function is not called.
 *
 * Sorted the way somebody reads it: programmes by code, modules by name, cohorts by label. With
 * the order `basket` the modules of each programme sort by their first basket before the name,
 * modules without a basket last — the overview is cut by programme already, so the order always
 * has one programme's regulations to go by.
 */
export function assignmentOverview(
	instances: readonly OverviewInstance[],
	assignments: readonly OverviewAssignment[],
	order: CohortOrder = 'name'
): OverviewProgramme[] {
	const holder = new Map(assignments.map((a) => [a.part.id, a.assignee.name]));
	const programmes = new Map<string, OverviewProgramme>();

	for (const instance of instances) {
		const p = instance.programme;
		let programme = programmes.get(p.code);
		if (!programme) {
			programme = { code: p.code, title: p.title, modules: [] };
			programmes.set(p.code, programme);
		}
		let module = programme.modules.find((m) => m.id === instance.module.id);
		if (!module) {
			module = {
				id: instance.module.id,
				name: instance.module.name,
				projectBased: instance.module.projectBased ?? false,
				basket: firstOf(instance.baskets),
				cohorts: []
			};
			programme.modules.push(module);
		}
		const host = instance.coveredBy?.acceptedAt ? instance.coveredBy.instance : null;
		module.cohorts.push({
			instanceId: instance.id,
			label: cohortLabel(p.code, instance.programmeSemester, instance.track),
			heldWith: host ? cohortLabel(host.programme.code, host.programmeSemester, host.track) : null,
			rows: instance.parts.map((part) => ({
				partId: part.id,
				kind: part.kind,
				teachingHours: part.teachingHours,
				assignee: holder.get(part.id) ?? null,
				taughtBy: part.taughtBy ?? null
			}))
		});
	}

	const out = [...programmes.values()].sort((a, b) => a.code.localeCompare(b.code));
	for (const programme of out) {
		programme.modules.sort(
			(a, b) =>
				(order === 'basket' ? compareFirstBaskets(a.basket, b.basket) : 0) ||
				a.name.localeCompare(b.name, 'de')
		);
		for (const module of programme.modules) {
			module.cohorts.sort((a, b) => a.label.localeCompare(b.label, 'de', { numeric: true }));
		}
	}
	return out;
}
