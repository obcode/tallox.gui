/**
 * What a save of the demand could not do, and the one refusal it can be told to overcome.
 *
 * Since tallox.go returns `cause` on every refusal of `planDemand`, the page names the module, the
 * cohort and the reason instead of „1 nicht möglich“. A cohort refused only because colleagues
 * registered interest in it can be withdrawn anyway with `dropWishes` — but only after a second,
 * explicit tick in the confirmation dialog, because the wishes lapse with it.
 *
 * The backend sends `cause` only to callers who may write the programme's demand, who may read
 * its wishes anyway; nothing here counts wishes or says whose they are.
 */

/** A refusal as the page receives it. */
export type RefusalLike = {
	moduleId: string;
	moduleName: string;
	track: string;
	code: string;
	message: string;
	cause?: string | null;
};

/** An entry of a plan, as much as this module touches. */
export type EntryLike = { moduleId: string | number; dropWishes?: boolean | null };

/** The refusals the dialog can offer to overcome: in use by wishes, and nothing else. */
export function wishedRefusals<R extends RefusalLike>(refused: readonly R[]): R[] {
	return refused.filter((r) => r.code === 'INSTANCE_IN_USE' && r.cause === 'WISHES');
}

/** The modules among the refusals, once each, in the order they came. */
export function refusedModules(refused: readonly RefusalLike[]): RefusalLike[] {
	const seen = new Set<string>();
	return refused.filter((r) => {
		if (seen.has(r.moduleId)) return false;
		seen.add(r.moduleId);
		return true;
	});
}

/**
 * The entries with `dropWishes` set for the modules the dialog's ticks named — and only for
 * those. An id that is not in the plan adds nothing: the payload is what was previewed.
 */
export function withDroppedWishes<E extends EntryLike>(
	entries: readonly E[],
	moduleIds: readonly string[]
): E[] {
	const drop = new Set(moduleIds);
	return entries.map((e) => (drop.has(String(e.moduleId)) ? { ...e, dropWishes: true } : e));
}

/** One refusal as a line: „Softwareentwicklung II, Zug B: hier ist bereits jemand zugeteilt …“. */
export function refusalLine(r: RefusalLike): string {
	const track = r.track ? `, Zug ${r.track}` : '';
	return `${r.moduleName}${track}: ${r.message}`;
}

/** The sentence after a save, for the toast: every refusal with its reason, or nothing. */
export function refusalSummary(refused: readonly RefusalLike[]): string {
	if (refused.length === 0) return '';
	return ` Nicht möglich — ${refused.map(refusalLine).join('; ')}.`;
}
