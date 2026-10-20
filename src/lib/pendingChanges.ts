/**
 * What on the current page has not reached the server yet.
 *
 * Two kinds of form, and the difference is the whole point:
 *
 * - **auto** — the form saves itself (a tick, a choice, a field left). What can be pending is a
 *   change that has not been submitted yet (a debounce, a queued second save) or a submission
 *   still on the wire. Leaving waits for both, silently: the person already did everything they
 *   had to.
 * - **ask** — the form only makes sense with an explicit act (a new token, a new account, a
 *   split that has to add up). Leaving with something typed into it asks: save, discard, stay.
 *
 * Reported on 2026-10-20: somebody ticked a subject group, which had a "Speichern" button,
 * switched to the competences page and found it not ticked. Nothing on the screen said the tick
 * was only in the browser. Since then every form registers here, and the layout's `LeaveGuard`
 * asks this register before any navigation.
 *
 * Kept free of the DOM and of SvelteKit so it can be tested on its own; the actions that wire a
 * form to it live in `$lib/saveOnLeave`.
 */

export type Mode = 'auto' | 'ask';

/** A form as the register sees it. `key` is whatever identifies it — in the browser, the element. */
export type Entry<K = unknown> = {
	key: K;
	mode: Mode;
	/** What the dialog calls it: "Neues Token", "SWS-Aufteilung". */
	label: string;
	/** Whether the dialog may offer to submit it. A batch with a default target may not. */
	canSave: boolean;
	/** Something was typed or chosen since the last submission. */
	touched: boolean;
	/** The serialised fields when nothing was pending: typing and deleting again is no change. */
	baseline: string;
	/** Submissions on the wire. */
	inFlight: number;
	/** Whether the last submission was refused or failed. */
	failed: boolean;
	/** A change that is known but not yet submitted — a debounce timer, a queued save. */
	waiting: () => boolean;
	/** Submit whatever `waiting` refers to, now. */
	flush: () => void;
};

export type Registration<K> = Partial<Omit<Entry<K>, 'key' | 'touched' | 'inFlight' | 'failed'>> & {
	mode: Mode;
};

/**
 * Serialises form fields so that two states can be compared.
 *
 * Order is kept: a form's fields come in document order, and a reordering is not a change anybody
 * can make. Files are compared by name only — no form here uploads one, and reading a file to
 * compare it would be the wrong kind of expensive.
 */
export function serializeFields(entries: Iterable<[string, FormDataEntryValue]>): string {
	const parts: string[] = [];
	for (const [name, value] of entries) {
		const text = typeof value === 'string' ? value : `file:${value.name}`;
		parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(text)}`);
	}
	return parts.join('&');
}

/**
 * Polls until `done()` holds or the time is up. Returns whether it held.
 *
 * Polling rather than promises threaded through every save, because three of the pages had their
 * own saving logic long before this register — a condition they can answer was the one thing all
 * of them could offer without being rewritten.
 */
export async function waitUntil(
	done: () => boolean,
	{
		timeoutMs = 15_000,
		intervalMs = 50,
		sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
	}: { timeoutMs?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<boolean> {
	for (let waited = 0; ; waited += intervalMs) {
		if (done()) return true;
		if (waited >= timeoutMs) return false;
		await sleep(intervalMs);
	}
}

export class PendingChanges<K = unknown> {
	private entries = new Map<K, Entry<K>>();

	/** Registers a form. Returns the function that removes it again. */
	register(key: K, registration: Registration<K>): () => void {
		this.entries.set(key, {
			key,
			label: '',
			canSave: true,
			baseline: '',
			waiting: () => false,
			flush: () => {},
			...registration,
			touched: false,
			inFlight: 0,
			failed: false
		});
		return () => {
			this.entries.delete(key);
		};
	}

	get(key: K): Entry<K> | undefined {
		return this.entries.get(key);
	}

	/** Somebody typed or chose something in this form. */
	touch(key: K): void {
		const entry = this.entries.get(key);
		if (entry) entry.touched = true;
	}

	/** A submission left. Whatever was touched is now on its way. */
	beginSubmit(key: K): void {
		const entry = this.entries.get(key);
		if (!entry) return;
		entry.touched = false;
		entry.inFlight++;
	}

	/**
	 * A submission came back. On success, `fields` is the new state nothing is pending against.
	 *
	 * On failure the baseline stays where it was, and the form counts as changed again: what was
	 * refused is still only in the browser, and leaving would lose it as surely as never saving.
	 */
	endSubmit(key: K, ok: boolean, fields?: string): void {
		const entry = this.entries.get(key);
		if (!entry) return;
		entry.inFlight = Math.max(0, entry.inFlight - 1);
		entry.failed = !ok;
		if (ok && fields !== undefined) entry.baseline = fields;
		if (!ok) entry.touched = true;
	}

	/**
	 * Whether this form holds something the server does not have.
	 *
	 * `fields` is the form's current serialisation. A touched form whose fields are back at the
	 * baseline is not dirty — somebody who typed a letter and deleted it changed nothing.
	 */
	isDirty(key: K, fields: string): boolean {
		const entry = this.entries.get(key);
		if (!entry) return false;
		return entry.touched && fields !== entry.baseline;
	}

	/** Self-saving forms with something still to send or still on the wire. */
	autoPending(): Entry<K>[] {
		return [...this.entries.values()].filter(
			(e) => e.mode === 'auto' && (e.inFlight > 0 || e.waiting() || e.touched)
		);
	}

	/** Explicit forms that hold changes, given a way to read each one's fields. */
	askDirty(fieldsOf: (key: K) => string): Entry<K>[] {
		return [...this.entries.values()].filter(
			(e) => e.mode === 'ask' && this.isDirty(e.key, fieldsOf(e.key))
		);
	}

	/** Any submission on the wire, of either kind. */
	inFlight(): boolean {
		return [...this.entries.values()].some((e) => e.inFlight > 0);
	}

	/** Sends everything self-saving forms are holding back. */
	flushAuto(): void {
		for (const entry of this.entries.values()) {
			if (entry.mode === 'auto' && entry.inFlight === 0 && (entry.waiting() || entry.touched)) {
				entry.flush();
			}
		}
	}

	/** Whether any registered form's last submission failed. */
	anyFailed(): boolean {
		return [...this.entries.values()].some((e) => e.failed);
	}

	/**
	 * Sends what is held back and waits until nothing is pending. Returns whether everything
	 * arrived: `false` after a refusal or when the time ran out, and then the page stays.
	 */
	async settle(options?: Parameters<typeof waitUntil>[1]): Promise<boolean> {
		// An earlier refusal gets one more try: it may have been a passing one, and the person
		// is asking to leave, not to look at it again.
		for (const entry of this.entries.values()) entry.failed = false;
		this.flushAuto();
		const arrived = await waitUntil(() => {
			if (this.inFlight()) return false;
			// Checked before flushing again: a refused form counts as touched, and sending it a
			// second time in the same breath would only be refused a second time.
			if (this.anyFailed()) return true;
			// A queued second save starts the moment the first one returns; catch it here.
			this.flushAuto();
			return this.autoPending().length === 0;
		}, options);
		return arrived && !this.anyFailed();
	}
}
