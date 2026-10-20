import { describe, expect, it } from 'vitest';
import {
	changedLines,
	instanceLabel,
	refusedLines,
	splitSummary,
	type SplitApplicationLike
} from './splitApplication';

const a = { semester: '2027-SS', track: 'A', programmeSemester: 2, programme: { code: 'PA' } };
const b = { semester: '2027-SS', track: '', programmeSemester: null, programme: { code: 'PB' } };

function report(over: Partial<SplitApplicationLike>): SplitApplicationLike {
	return { dryRun: true, unchanged: 0, changed: [], refused: [], ...over };
}

describe('instanceLabel', () => {
	it('puts the semester first and spells a missing cohort year', () => {
		expect(instanceLabel(a)).toBe('2027-SS · PA2A');
		expect(instanceLabel(b)).toBe('2027-SS · PB?');
	});
});

describe('changedLines', () => {
	it('shows the hours before and after, sorted by label', () => {
		const lines = changedLines(
			report({
				changed: [
					{ instance: b, teachingHoursBefore: 4, teachingHoursAfter: 5 },
					{ instance: a, teachingHoursBefore: 6, teachingHoursAfter: 5.5 }
				]
			})
		);
		expect(lines).toEqual([
			{ label: '2027-SS · PA2A', text: '6 → 5,5 SWS' },
			{ label: '2027-SS · PB?', text: '4 → 5 SWS' }
		]);
	});

	it('says so when only the arrangement changed', () => {
		const [line] = changedLines(
			report({ changed: [{ instance: a, teachingHoursBefore: 4, teachingHoursAfter: 4 }] })
		);
		expect(line.text).toBe('Teile neu geordnet, weiterhin 4 SWS');
	});
});

describe('refusedLines', () => {
	it('names the kind and passes the sentence through', () => {
		const lines = refusedLines(
			report({
				refused: [{ instance: b, kind: 'LAB', code: 'SPLIT_LEFT_TO_PROGRAMME', message: 'Satz.' }]
			})
		);
		expect(lines).toEqual([{ label: '2027-SS · PB? · Praktikum', text: 'Satz.' }]);
	});
});

describe('splitSummary', () => {
	it('speaks in the conditional after a dry run and in the past after a save', () => {
		const changed = [{ instance: a, teachingHoursBefore: 4, teachingHoursAfter: 5 }];
		expect(splitSummary(report({ changed, unchanged: 2 }))).toBe(
			'1 Instanz würde angepasst, 2 Instanzen folgen ihr schon.'
		);
		expect(splitSummary(report({ dryRun: false, changed: [...changed, ...changed] }))).toBe(
			'2 Instanzen angepasst.'
		);
	});

	it('distinguishes nothing to do from nothing there', () => {
		expect(splitSummary(report({ unchanged: 3 }))).toBe(
			'Alle 3 Instanzen folgen der Aufteilung schon.'
		);
		expect(splitSummary(report({ unchanged: 1 }))).toBe('Die Instanz folgt der Aufteilung schon.');
		expect(splitSummary(report({}))).toBe(
			'Von diesem Modul gibt es keine Instanz in einem laufenden Semester.'
		);
	});
});
