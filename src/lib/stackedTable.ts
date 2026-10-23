/**
 * Tables that become cards on a phone.
 *
 * Below `sm` a table of five columns does not fit, and an `overflow-x-auto` around it keeps the
 * page from scrolling but hides exactly the columns somebody came for — the person picker on the
 * assignment screen, the track columns of the wish table. `.table-stack` in app.css stacks the
 * cells of each row instead, and every cell says which column it is with a small label above it.
 *
 * The labels are the column heads, copied onto the cells by this action rather than written a
 * second time into every `<td>`: two copies of a head drift, and a table with a dozen columns would
 * carry a dozen strings per row. A cell that brings its own `data-label` keeps it — an empty one
 * says "no label here", for a cell whose column head does not describe it (the part rows of the
 * assignment table sit under "Modul" but name a part).
 *
 * Above `sm` nothing of this applies: the attribute is there, the CSS ignores it.
 */

/** The text of each column, by position, from the head cells and their `colspan`. */
export function columnLabels(heads: readonly { text: string; span: number }[]): string[] {
	const labels: string[] = [];
	for (const head of heads) {
		for (let i = 0; i < Math.max(1, head.span); i++) labels.push(head.text);
	}
	return labels;
}

/** The label each cell of a row gets, by the column it starts in. */
export function cellLabels(columns: readonly string[], spans: readonly number[]): string[] {
	const out: string[] = [];
	let column = 0;
	for (const span of spans) {
		out.push(columns[column] ?? '');
		column += Math.max(1, span);
	}
	return out;
}

function headText(th: HTMLTableCellElement): string {
	// The head's own words, without what is only there for screen readers or decoration.
	const clone = th.cloneNode(true) as HTMLElement;
	clone.querySelectorAll('.sr-only, [aria-hidden="true"]').forEach((n) => n.remove());
	return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function label(table: HTMLTableElement): void {
	const headRow = table.tHead?.rows[0];
	if (!headRow) return;
	const columns = columnLabels(
		[...headRow.cells].map((th) => ({ text: headText(th), span: th.colSpan }))
	);
	for (const body of [...table.tBodies, ...(table.tFoot ? [table.tFoot] : [])]) {
		for (const row of body.rows) {
			const cells = [...row.cells];
			const labels = cellLabels(
				columns,
				cells.map((c) => c.colSpan)
			);
			cells.forEach((cell, i) => {
				if (cell.dataset.stackOwn !== undefined) return;
				if (cell.hasAttribute('data-label') && cell.dataset.stackAuto === undefined) {
					cell.dataset.stackOwn = '';
					return;
				}
				cell.dataset.label = labels[i];
				cell.dataset.stackAuto = '';
			});
		}
	}
}

/** How much narrower than its box a stacked table must be before it goes back to columns. */
const HYSTERESIS = 16;

/**
 * Whether a table of this natural width belongs in cards in a box of this width.
 *
 * With a margin on the way back: a vertical scrollbar that comes and goes with the stacking
 * changes the box by its own width, and without the margin a table at the boundary would flip
 * between the two forms on every resize.
 */
export function shouldStack(natural: number, box: number, stackedNow: boolean): boolean {
	return stackedNow ? natural > box - HYSTERESIS : natural > box + 1;
}

/** Measures the table in columns and stacks it if they do not fit its box. */
function fit(table: HTMLTableElement): void {
	const box = table.parentElement;
	if (!box) return;
	const was = table.classList.contains('stacked');
	table.classList.remove('stacked');
	table.classList.add('measured');
	const natural = table.offsetWidth;
	table.classList.toggle('stacked', shouldStack(natural, box.clientWidth, was));
}

/**
 * `use:stackedTable` on a `<table class="table-stack">`. Labels the cells, and measures whether
 * the columns fit — now, whenever the box changes size, and whenever rows come or go, which
 * sorting, filtering and saving all do.
 */
export function stackedTable(table: HTMLTableElement) {
	label(table);
	fit(table);
	const observer = new MutationObserver(() => {
		label(table);
		fit(table);
	});
	observer.observe(table, { childList: true, subtree: true });
	const resize = new ResizeObserver(() => fit(table));
	if (table.parentElement) resize.observe(table.parentElement);
	return {
		destroy: () => {
			observer.disconnect();
			resize.disconnect();
		}
	};
}
