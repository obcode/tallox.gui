import writeXlsxFile from 'write-excel-file/node';
import type { ExportSheet } from '$lib/export';

/**
 * The sheets as an `.xlsx` file.
 *
 * Numbers go in as numbers and empty cells as nothing, so a sum in the spreadsheet is the sum and
 * not a text concatenation that happens to look right. The header row is bold and stays in view
 * while scrolling — the planning sheet has hundreds of rows, and thirteen columns nobody can name
 * after the first screen.
 */
export function workbook(sheets: readonly ExportSheet[]): Promise<Buffer> {
	// Inferred rather than annotated: the library's `Sheet` is generic over its file content, and
	// naming that type here collides with the DOM's `Blob` under this tsconfig.
	const out = sheets.map((s) => ({
		sheet: s.name,
		columns: s.widths.map((width) => ({ width })),
		stickyRowsCount: s.header.length > 0 ? 1 : 0,
		data: [
			...(s.header.length > 0
				? [s.header.map((h) => ({ value: h, fontWeight: 'bold' as const }))]
				: []),
			...s.rows
		]
	}));
	return writeXlsxFile(out).toBuffer();
}
