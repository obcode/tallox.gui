import { tick } from 'svelte';
import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { enhance } from '$app/forms';
import { PendingChanges, serializeFields } from '$lib/pendingChanges';

/**
 * Forms that save themselves, forms that ask before somebody leaves them, and the one register
 * both report to. The rules are in `$lib/pendingChanges`; this file wires a form element to them.
 *
 * Every action here **replaces `use:enhance`** on its form rather than sitting next to it. The
 * register has to see each submission leave and come back, and a page that added the action
 * but kept its own `use:enhance` would save without the register knowing — the gap this exists
 * to close.
 *
 * Module state, but browser-only: actions never run during server rendering, so nothing is ever
 * registered on the server and nothing can leak from one request into the next.
 */
export const pendingChanges = new PendingChanges<HTMLFormElement>();

export function fieldsOf(form: HTMLFormElement): string {
	return serializeFields(new FormData(form));
}

/**
 * Whether an event target is a field of this form.
 *
 * By `.form` rather than by nesting: the token form keeps its scope radios in a fieldset outside
 * the `<form>` element and joins them with `form="create-token"`. Their events never bubble
 * through the form, so the listeners sit on the document.
 */
function fieldOf(form: HTMLFormElement, target: EventTarget | null): target is Element {
	return (
		(target instanceof HTMLInputElement ||
			target instanceof HTMLSelectElement ||
			target instanceof HTMLTextAreaElement) &&
		target.form === form
	);
}

const succeeded = (result: ActionResult) => result.type === 'success' || result.type === 'redirect';

/**
 * Wraps a page's submit function so the register sees the submission leave and come back.
 *
 * Without one of its own, the form is updated the way it would be by plain `use:enhance` — except
 * self-saving forms, which are never reset: a reset puts every field back to the state it was
 * rendered with, which after a save is the state before it.
 */
function tracked(
	form: HTMLFormElement,
	reset: boolean,
	inner: SubmitFunction | undefined,
	after: () => void = () => {}
): SubmitFunction {
	return (input) => {
		pendingChanges.beginSubmit(form);
		let cancelled = false;
		const innerCallback = inner?.({
			...input,
			cancel: () => {
				cancelled = true;
				input.cancel();
			}
		});
		if (cancelled) {
			pendingChanges.endSubmit(form, false);
			return;
		}
		return async (options) => {
			let ok = false;
			try {
				const callback = await innerCallback;
				if (callback) await callback(options);
				else await options.update({ reset });
				ok = succeeded(options.result);
			} finally {
				// The page re-renders from the fresh load first; the baseline is what it shows then.
				await tick();
				pendingChanges.endSubmit(form, ok, fieldsOf(form));
				after();
			}
		};
	};
}

function listen(form: HTMLFormElement, handlers: Partial<Record<string, (e: Event) => void>>) {
	const doc = form.ownerDocument;
	const bound = Object.entries(handlers).map(([type, handler]) => {
		const listener = (e: Event) => {
			if (fieldOf(form, e.target)) handler!(e);
		};
		doc.addEventListener(type, listener);
		return () => doc.removeEventListener(type, listener);
	});
	return () => bound.forEach((off) => off());
}

export type AutosaveOptions = {
	/** The page's own submit function, in place of `use:enhance={…}`. */
	submit?: SubmitFunction;
	/** Which fields trigger a save. Default: all of them. */
	accepts?: (field: Element) => boolean;
	/** Collect changes for this long first (ms). Default: save at once. */
	delay?: number;
	/** What the dialog calls this form if a save is refused. */
	label?: string;
};

/**
 * The form saves itself: on `change` (a tick, a choice, a text field finished), and on leaving a
 * text field the browser did not see as typed into. `input` only remembers that something is
 * open — a round trip per keystroke would be wrong for a note.
 *
 * One submission at a time. Each carries the whole form, and an older one landing second would
 * write an older state over a newer one; a change during a save is sent right after it.
 *
 * Keep the submit button, inside `<noscript>`: without JavaScript it is the only way to send.
 */
export function autosave(form: HTMLFormElement, options: AutosaveOptions = {}) {
	let opts = options;
	let queued = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function submitNow() {
		clearTimeout(timer);
		timer = undefined;
		if ((pendingChanges.get(form)?.inFlight ?? 0) > 0) {
			queued = true;
			return;
		}
		queued = false;
		// requestSubmit validates first and sends nothing for an invalid form — silently. Say so,
		// and count it as refused, or leaving would wait for a save that never starts.
		if (!form.checkValidity()) {
			form.reportValidity();
			pendingChanges.beginSubmit(form);
			pendingChanges.endSubmit(form, false);
			return;
		}
		form.requestSubmit();
	}

	function schedule() {
		if (!opts.delay) return submitNow();
		clearTimeout(timer);
		timer = setTimeout(submitNow, opts.delay);
	}

	const accepts = (field: Element) => opts.accepts?.(field) ?? true;

	const unregister = pendingChanges.register(form, {
		mode: 'auto',
		label: opts.label ?? '',
		baseline: fieldsOf(form),
		waiting: () => queued || timer !== undefined,
		flush: submitNow
	});
	const unlisten = listen(form, {
		input: (e) => {
			if (accepts(e.target as Element)) pendingChanges.touch(form);
		},
		change: (e) => {
			if (accepts(e.target as Element)) schedule();
		},
		focusout: (e) => {
			if (accepts(e.target as Element) && pendingChanges.get(form)?.touched) schedule();
		}
	});
	const enhanced = enhance(
		form,
		tracked(form, false, opts.submit, () => {
			if (queued) submitNow();
		})
	);

	return {
		update(next: AutosaveOptions = {}) {
			opts = next;
		},
		destroy() {
			clearTimeout(timer);
			enhanced.destroy();
			unlisten();
			unregister();
		}
	};
}

export type AskOptions = {
	/** What the dialog calls this form: „Neues Token“. */
	label: string;
	/** The page's own submit function, in place of `use:enhance={…}`. */
	submit?: SubmitFunction;
	/**
	 * Whether the dialog may offer to submit it. `false` where sending is a decision of its own —
	 * a batch whose target is whatever the drop-down happens to show.
	 */
	canSave?: boolean;
};

/**
 * The form is sent by a button, on purpose — and leaving it with something typed in asks first.
 *
 * For forms where saving every change would be wrong: creating something (a token, an account,
 * a module) needs all of its fields at once, and a split of hours has to add up before it means
 * anything.
 */
export function askBeforeLeave(form: HTMLFormElement, options: AskOptions) {
	let opts = options;
	const unregister = pendingChanges.register(form, {
		mode: 'ask',
		label: opts.label,
		canSave: opts.canSave ?? true,
		baseline: fieldsOf(form)
	});
	const touch = () => pendingChanges.touch(form);
	const unlisten = listen(form, { input: touch, change: touch });
	const enhanced = enhance(form, tracked(form, true, opts.submit));

	return {
		update(next: AskOptions) {
			opts = next;
			const entry = pendingChanges.get(form);
			if (entry) {
				entry.label = next.label;
				entry.canSave = next.canSave ?? true;
			}
		},
		destroy() {
			enhanced.destroy();
			unlisten();
			unregister();
		}
	};
}

export type TrackOptions = {
	submit: SubmitFunction;
	/** Whether the page holds a change it has not sent yet. */
	waiting: () => boolean;
	/** Send it now. */
	flush: () => void;
};

/**
 * For the pages that saved themselves before this register existed — wishes, competences,
 * assignment, demand. Each has its own trigger logic, tuned to its table; this only lets the
 * register see what they hold back and what is on the wire, so leaving can wait for it.
 */
export function trackSaves(form: HTMLFormElement, options: TrackOptions) {
	let opts = options;
	const unregister = pendingChanges.register(form, {
		mode: 'auto',
		baseline: fieldsOf(form),
		waiting: () => opts.waiting(),
		flush: () => opts.flush()
	});
	const enhanced = enhance(form, (input) => tracked(form, false, opts.submit)(input));

	return {
		update(next: TrackOptions) {
			opts = next;
		},
		destroy() {
			enhanced.destroy();
			unregister();
		}
	};
}
