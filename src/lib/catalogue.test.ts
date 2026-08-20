import { describe, expect, it } from 'vitest';
import {
	ALL_PART_KINDS,
	COURSE_TYPE_LABELS,
	DUTY_LABELS,
	FINDING_LABELS,
	FREQUENCY_LABELS,
	PART_KIND_LABELS,
	componentMismatch,
	componentSummary,
	dutyBadge,
	findingIsAlarming,
	formatHours,
	moduleName,
	proposedComponents,
	spoLabel
} from './catalogue';

describe('moduleName', () => {
	it('uses the name when there is one', () => {
		expect(moduleName({ name: 'Algorithmen und Datenstrukturen' })).toBe(
			'Algorithmen und Datenstrukturen'
		);
	});

	// Seventeen modules of the real catalogue have no name, six of them active. An empty cell
	// would read as a fault in the page; the identifier makes them findable and says where the
	// gap is.
	it('names the module by its identifier when the catalogue gives it none', () => {
		expect(moduleName({ name: '', zpaId: '284' })).toBe('Modul ohne Namen (ZPA 284)');
		expect(moduleName({ name: '   ', zpaId: null })).toBe('Modul ohne Namen');
	});
});

describe('spoLabel', () => {
	it('marks a version that is still being entered', () => {
		expect(spoLabel({ version: 2025, primussId: '07-IF-2025' })).toBe('SPO 2025');
		// Without the mark, a filter set to it looks like a catalogue that lost most of itself:
		// an unfinished version holds a fraction of its eventual modules.
		expect(spoLabel({ version: 2026, primussId: null })).toBe('SPO 2026 (im Aufbau)');
		expect(spoLabel({ version: 2026, primussId: '' })).toBe('SPO 2026 (im Aufbau)');
	});
});

describe('formatHours', () => {
	it('drops the decimals most hours do not have', () => {
		expect(formatHours(2)).toBe('2');
		expect(formatHours(4)).toBe('4');
	});

	it('writes a half hour the way German does', () => {
		expect(formatHours(2.5)).toBe('2,5');
	});
});

describe('componentSummary', () => {
	it('reads as the sentence somebody would say', () => {
		expect(
			componentSummary([
				{ kind: 'LECTURE', teachingHours: 2 },
				{ kind: 'LAB', teachingHours: 2 }
			])
		).toBe('Vorlesung 2 + Praktikum 2 = 4 SWS');
	});

	it('is empty when nobody has stated the split', () => {
		expect(componentSummary([])).toBe('');
	});
});

describe('componentMismatch', () => {
	// A note, never a refusal. Twelve modules of the real catalogue carry no hours at all in the
	// source and several carry a figure that does not match what is taught — a hard rule would
	// make exactly those unplannable, which is where somebody most needs to enter the truth.
	it('says nothing when the split matches the catalogue', () => {
		expect(componentMismatch(4, 4)).toBeNull();
	});

	it('says nothing when there is nothing to compare', () => {
		expect(componentMismatch(null, 4)).toBeNull();
		expect(componentMismatch(4, null)).toBeNull();
		expect(componentMismatch(null, null)).toBeNull();
	});

	it('names both numbers when they differ', () => {
		const message = componentMismatch(6, 4);
		expect(message).toContain('6');
		expect(message).toContain('4');
	});

	// Hours are a numeric(4,2) on the wire and a float here; a sum of halves must not produce a
	// warning about a rounding error.
	it('tolerates the last bit of a floating point sum', () => {
		expect(componentMismatch(0.1 + 0.2 + 3.7, 4)).toBeNull();
	});
});

describe('proposedComponents', () => {
	it('splits a course with a laboratory evenly', () => {
		expect(proposedComponents('SU_WITH_LAB', 4)).toEqual([
			{ kind: 'LECTURE', teachingHours: 2 },
			{ kind: 'LAB', teachingHours: 2 }
		]);
	});

	it('gives an odd total its larger half to the lecture', () => {
		expect(proposedComponents('SU_WITH_EXERCISE', 5)).toEqual([
			{ kind: 'LECTURE', teachingHours: 3 },
			{ kind: 'EXERCISE', teachingHours: 2 }
		]);
	});

	it('proposes one part for a course type that names one', () => {
		expect(proposedComponents('SEMINAR', 4)).toEqual([{ kind: 'SEMINAR', teachingHours: 4 }]);
		expect(proposedComponents('LAB', 4)).toEqual([{ kind: 'LAB', teachingHours: 4 }]);
	});

	// Twelve modules of the real catalogue carry no hours. An empty form is a more honest
	// starting point than a row of zeroes, which somebody would save without reading.
	it('proposes nothing when the catalogue states no hours', () => {
		expect(proposedComponents('SU_WITH_LAB', null)).toEqual([]);
		expect(proposedComponents('SU_WITH_LAB', 0)).toEqual([]);
	});

	it('never proposes a total other than what the catalogue states', () => {
		for (const hours of [1, 2, 3, 4, 5, 6, 7, 8]) {
			for (const type of ['SU_WITH_LAB', 'SU_WITH_EXERCISE', 'SU', 'SEMINAR'] as const) {
				const sum = proposedComponents(type, hours).reduce((t, c) => t + c.teachingHours, 0);
				expect(sum).toBe(hours);
			}
		}
	});
});

describe('the duty status', () => {
	// Two values are not enough. Measured against the real catalogue, 74 modules are compulsory
	// in one programme and elective in another, and three within a single programme differ
	// between versions of its regulations — a reader told only "Pflicht" has been told something
	// false.
	it('says out loud that MIXED is not simply compulsory', () => {
		expect(DUTY_LABELS.MIXED).not.toBe(DUTY_LABELS.COMPULSORY);
		expect(DUTY_LABELS.MIXED).toContain('nicht in allen');
	});

	// Not a fault in the data, so not a warning colour. Colouring it as one would teach people
	// that this column has errors in it.
	it('colours MIXED as a distinction rather than a problem', () => {
		expect(dutyBadge('MIXED')).not.toBe('badge-error');
		expect(dutyBadge('MIXED')).not.toBe('badge-warning');
		expect(dutyBadge('MIXED')).not.toBe(dutyBadge('COMPULSORY'));
	});

	it('has a badge for the absent case', () => {
		expect(dutyBadge(null)).toBeTruthy();
		expect(dutyBadge(undefined)).toBeTruthy();
	});
});

describe('the projection findings', () => {
	// Exactly one of them is a problem, and that is the point of the distinction: the others are
	// decisions the projection took on purpose and reports so nobody wonders where the rows
	// went. Colouring them all as faults would train people to ignore the colour.
	it('marks only the one that means the fold is picking answers', () => {
		const alarming = Object.keys(FINDING_LABELS).filter((f) =>
			findingIsAlarming(f as keyof typeof FINDING_LABELS)
		);
		expect(alarming).toEqual(['DUTY_CONFLICT']);
	});

	it('says what happened to the objects, not only what was wrong with them', () => {
		expect(FINDING_LABELS.MODULE_WITHOUT_NAME).toContain('übernommen');
		expect(FINDING_LABELS.MODULE_WITHOUT_HOME_PROGRAMME).toContain('nicht übernommen');
		expect(FINDING_LABELS.PROGRAMME_WITHOUT_REGULATIONS).toContain('inaktiv');
	});
});

describe('the vocabularies', () => {
	// A missing entry renders as `undefined` in a table cell, which looks like a bug in the page
	// rather than a gap in a translation table.
	it('translate every value the schema can send', () => {
		for (const labels of [FREQUENCY_LABELS, COURSE_TYPE_LABELS, PART_KIND_LABELS, DUTY_LABELS]) {
			for (const [key, value] of Object.entries(labels)) {
				expect(value, key).toBeTruthy();
			}
		}
	});

	it('offer every kind of teachable unit in the editor', () => {
		expect([...ALL_PART_KINDS].sort()).toEqual(Object.keys(PART_KIND_LABELS).sort());
	});
});
