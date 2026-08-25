import { describe, expect, it } from 'vitest';
import {
	isPlausibleCode,
	personLabel,
	leadNames,
	mayLead,
	normaliseCode,
	openWorkSentence,
	splitByActivity
} from './subjectGroups';

describe('normaliseCode', () => {
	it('upper-cases and trims, the way the backend does before it stores', () => {
		expect(normaliseCode('  mathe-ml ')).toBe('MATHE-ML');
	});
});

describe('isPlausibleCode', () => {
	it('accepts what the schema accepts', () => {
		for (const code of ['MATHE', 'SWE', 'TI', 'MATHE-ML', 'M.2']) {
			expect(isPlausibleCode(code), code).toBe(true);
		}
	});

	it('rejects what the schema would refuse', () => {
		for (const code of ['', '1MATHE', '-X', 'ABCDEFGHIJKLMNOPQ']) {
			expect(isPlausibleCode(code), code).toBe(false);
		}
	});

	it('is only a pre-check — a plausible code can still be taken', () => {
		// The point of the test: passing here is not permission. The refusal path stays real.
		expect(isPlausibleCode('MATHE')).toBe(true);
	});
});

describe('splitByActivity', () => {
	it('keeps retired groups visible rather than filtering them away', () => {
		const { active, retired } = splitByActivity([
			{ code: 'SWE', active: true },
			{ code: 'MATHE', active: false },
			{ code: 'MATHE-ML', active: true }
		]);

		expect(active.map((g) => g.code)).toEqual(['MATHE-ML', 'SWE']);
		expect(retired.map((g) => g.code)).toEqual(['MATHE']);
	});
});

describe('leadNames', () => {
	it('names a group nobody has taken on', () => {
		expect(leadNames([])).toBe('noch niemand');
	});

	it('joins several', () => {
		expect(leadNames([{ name: 'Prof. Eins' }, { name: 'Prof. Zwei' }])).toBe(
			'Prof. Eins und Prof. Zwei'
		);
		expect(
			leadNames([{ name: 'Prof. Eins' }, { name: 'Prof. Zwei' }, { name: 'Prof. Drei' }])
		).toBe('Prof. Eins, Prof. Zwei und Prof. Drei');
	});
});

describe('openWorkSentence', () => {
	it('says what is left, in the singular where it is one', () => {
		expect(openWorkSentence(1, 0)).toBe('Offen: eine Fachgruppe ohne Leitung.');
		expect(openWorkSentence(0, 1)).toBe('Offen: ein Modul ohne Fachgruppe.');
		expect(openWorkSentence(2, 37)).toBe(
			'Offen: 2 Fachgruppen ohne Leitung, 37 Module ohne Fachgruppe.'
		);
	});

	it('says so when there is nothing left', () => {
		expect(openWorkSentence(0, 0)).toBe('Alles zugeordnet.');
	});
});

describe('mayLead', () => {
	it('needs the role — membership is not it', () => {
		expect(mayLead(['LECTURER'])).toBe(false);
		expect(mayLead(['LECTURER', 'SUBJECT_GROUP_LEAD'])).toBe(true);
	});
});

describe('personLabel', () => {
	it('prefers the surname-first spelling', () => {
		expect(
			personLabel({ sortName: 'Eins, Prof.', name: 'Prof. Eins', mail: 'e@example.org' })
		).toBe('Eins, Prof.');
	});

	it('falls back to the name where the examination office publishes no spelling', () => {
		expect(personLabel({ sortName: '', name: 'Prof. Eins', mail: 'e@example.org' })).toBe(
			'Prof. Eins'
		);
	});

	it('falls back to the address for somebody with no name at all', () => {
		// Not decoration: a checkbox whose label renders empty is a control with no accessible
		// name, which axe reports as critical and a screen reader announces as just "checkbox".
		expect(personLabel({ sortName: null, name: '', mail: 'dev@example.org' })).toBe(
			'dev@example.org'
		);
	});
});
