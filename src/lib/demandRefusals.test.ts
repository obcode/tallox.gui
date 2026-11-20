import { describe, expect, it } from 'vitest';
import {
	refusalLine,
	refusalSummary,
	refusedModules,
	wishedRefusals,
	withDroppedWishes
} from './demandRefusals';

const wished = {
	moduleId: 'm1',
	moduleName: 'FWP-Platzhalter 1',
	track: '',
	code: 'INSTANCE_IN_USE',
	message: 'hierfür haben sich Kolleginnen oder Kollegen eingetragen',
	cause: 'WISHES'
};
const assigned = {
	moduleId: 'm2',
	moduleName: 'Softwareentwicklung II',
	track: 'B',
	code: 'INSTANCE_IN_USE',
	message: 'hier ist bereits jemand zugeteilt; zuerst die Zuteilung lösen',
	cause: 'ASSIGNMENT'
};
const group = { ...assigned, code: 'PART_ASSIGNED', message: 'dieser Teil ist besetzt' };

describe('wishedRefusals', () => {
	it('offers only cohorts held up by wishes', () => {
		expect(wishedRefusals([wished, assigned, group])).toEqual([wished]);
	});
	it('offers nothing where the backend told no cause', () => {
		expect(wishedRefusals([{ ...wished, cause: null }])).toEqual([]);
	});
});

describe('refusedModules', () => {
	it('lists a module once however many cohorts were refused', () => {
		expect(refusedModules([wished, { ...wished, track: 'B' }, assigned])).toHaveLength(2);
	});
});

describe('withDroppedWishes', () => {
	const entries = [
		{ moduleId: 'm1', tracks: [] },
		{ moduleId: 'm2', tracks: [] }
	];
	it('sets dropWishes on the ticked modules only', () => {
		expect(withDroppedWishes(entries, ['m1'])).toEqual([
			{ moduleId: 'm1', tracks: [], dropWishes: true },
			{ moduleId: 'm2', tracks: [] }
		]);
	});
	it('adds nothing for an id that is not in the plan', () => {
		expect(withDroppedWishes(entries, ['other'])).toEqual(entries);
	});
});

describe('refusal wording', () => {
	it('names module, cohort and reason', () => {
		expect(refusalLine(assigned)).toBe(
			'Softwareentwicklung II, Zug B: hier ist bereits jemand zugeteilt; zuerst die Zuteilung lösen'
		);
		expect(refusalLine(wished)).toBe(
			'FWP-Platzhalter 1: hierfür haben sich Kolleginnen oder Kollegen eingetragen'
		);
	});
	it('says nothing when nothing was refused', () => {
		expect(refusalSummary([])).toBe('');
	});
	it('never counts', () => {
		expect(refusalSummary([{ ...wished, moduleName: 'Platzhalter' }, assigned])).not.toMatch(/\d/);
	});
});
