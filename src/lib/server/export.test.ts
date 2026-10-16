import readXlsxFile from 'read-excel-file/node';
import { describe, expect, it } from 'vitest';
import { workbook } from './export';

describe('workbook', () => {
	it('writes a file a spreadsheet reads back, numbers as numbers', async () => {
		const file = await workbook([
			{
				name: 'Planung',
				header: ['Modul', 'SWS', 'Leer'],
				rows: [
					['Übung für Ä und ß', 1.5, null],
					['Analysis', 2, '']
				],
				widths: [20, 8, 8]
			},
			{ name: 'Hinweise', header: [], rows: [['Ein Satz.']], widths: [80] }
		]);

		const sheets = await readXlsxFile(file);
		expect(sheets.map((s) => s.sheet)).toEqual(['Planung', 'Hinweise']);
		expect(sheets[0].data[0]).toEqual(['Modul', 'SWS', 'Leer']);
		expect(sheets[0].data[1].slice(0, 2)).toEqual(['Übung für Ä und ß', 1.5]);
		expect(sheets[0].data[2][1]).toBe(2);
		expect(sheets[1].data[0][0]).toBe('Ein Satz.');
	});
});
