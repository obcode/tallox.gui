import { describe, expect, it } from 'vitest';
import { cellLabels, columnLabels, shouldStack } from './stackedTable';

describe('columnLabels', () => {
	it('gives every column its head, repeated over a colspan', () => {
		expect(
			columnLabels([
				{ text: 'Modul', span: 1 },
				{ text: 'Zug', span: 2 },
				{ text: 'SWS', span: 1 }
			])
		).toEqual(['Modul', 'Zug', 'Zug', 'SWS']);
	});

	it('treats a span of zero as one, as the browser does', () => {
		expect(columnLabels([{ text: 'Modul', span: 0 }])).toEqual(['Modul']);
	});
});

describe('cellLabels', () => {
	const columns = ['Modul', 'Zug', 'SWS', 'Wer'];

	it('labels each cell by the column it starts in', () => {
		expect(cellLabels(columns, [1, 1, 1, 1])).toEqual(['Modul', 'Zug', 'SWS', 'Wer']);
	});

	// A part row whose first cell spans two columns: the next cell is the hours, not the track.
	it('skips the columns a spanning cell covers', () => {
		expect(cellLabels(columns, [2, 1, 1])).toEqual(['Modul', 'SWS', 'Wer']);
	});

	it('leaves a cell past the last head without a label', () => {
		expect(cellLabels(['Modul'], [1, 1])).toEqual(['Modul', '']);
	});
});

describe('shouldStack', () => {
	it('stacks a table wider than its box', () => {
		expect(shouldStack(935, 700, false)).toBe(true);
		expect(shouldStack(600, 700, false)).toBe(false);
	});

	// Rounding: a table exactly as wide as its box fits.
	it('allows a pixel of rounding', () => {
		expect(shouldStack(701, 700, false)).toBe(false);
	});

	// The scrollbar that appears with the cards narrows the box; going back needs a margin, or
	// the table flips between the two forms at the boundary.
	it('goes back to columns only with room to spare', () => {
		expect(shouldStack(690, 700, true)).toBe(true);
		expect(shouldStack(680, 700, true)).toBe(false);
	});
});
