import { describe, expect, it } from 'vitest';
import { leadLine, moduleCountLabel, programmeTitle } from './startOverview';

describe('leadLine', () => {
	it('names nobody when nobody leads', () => {
		expect(leadLine([])).toBe('noch niemand');
	});

	it('joins several leads with "und"', () => {
		expect(
			leadLine([
				{ name: 'Prof. Eins', mail: 'prof.eins@example.org' },
				{ name: 'Prof. Zwei', mail: 'prof.zwei@example.org' },
				{ name: 'Prof. Drei', mail: 'prof.drei@example.org' }
			])
		).toBe('Prof. Eins, Prof. Zwei und Prof. Drei');
	});

	// The full name reads better in running text than the surname-first sort name.
	it('prefers the name to the sort name', () => {
		expect(
			leadLine([{ name: 'Prof. Eins', sortName: 'Eins', mail: 'prof.eins@example.org' }])
		).toBe('Prof. Eins');
	});

	it('falls back to the address for a lead without a name', () => {
		expect(leadLine([{ name: '', mail: 'prof.eins@example.org' }])).toBe('prof.eins@example.org');
	});
});

describe('programmeTitle', () => {
	it('uses the long name', () => {
		expect(programmeTitle({ code: 'IF', title: 'Informatik' })).toBe('Informatik');
	});

	it('falls back to the code while nobody has typed a name', () => {
		expect(programmeTitle({ code: 'IF', title: '  ' })).toBe('IF');
	});
});

describe('moduleCountLabel', () => {
	it.each([
		[0, '0 Module'],
		[1, '1 Modul'],
		[12, '12 Module']
	])('%i → %s', (n, label) => {
		expect(moduleCountLabel(n)).toBe(label);
	});
});
