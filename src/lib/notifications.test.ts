import { describe, expect, it } from 'vitest';
import {
	audienceInput,
	audienceKey,
	audienceLabel,
	isModuleBell,
	kindLabel,
	NOTIFICATION_KINDS,
	targetLabel,
	targetSetsFor,
	targetsFor
} from './notifications';

describe('notification labels', () => {
	it('names every kind', () => {
		for (const kind of NOTIFICATION_KINDS) {
			expect(kindLabel(kind)).not.toBe(kind);
		}
	});

	it('offers only sets the backend accepts for a kind', () => {
		expect(targetSetsFor('DEMAND_RELEASED')).toEqual(['MY_PROGRAMMES']);
		expect(targetSetsFor('PHASE_ADVANCED')).toEqual([]);
		// An instance somebody wished for cannot be withdrawn, so the set says nothing about it.
		expect(targetSetsFor('MODULE_WITHDRAWN')).not.toContain('MY_WISHES');
		expect(targetSetsFor('MODULE_WITHDRAWN')).not.toContain('MY_ASSIGNMENTS');
	});

	it('offers a programme or a subject group only where an event has one', () => {
		expect(targetsFor('WISH_WINDOW_CHANGED')).toEqual({ programme: false, subjectGroup: true });
		expect(targetsFor('DEMAND_RELEASED')).toEqual({ programme: true, subjectGroup: false });
		expect(targetsFor('WISHES_PUBLISHED')).toEqual({ programme: false, subjectGroup: false });
	});

	it('says what a subscription follows', () => {
		expect(targetLabel({ kind: 'MODULE_OFFERED' })).toBe('alle');
		expect(targetLabel({ kind: 'MODULE_OFFERED', targetSet: 'MY_COMPETENCES' })).toBe(
			'meine Kompetenzen'
		);
		expect(
			targetLabel({ kind: 'MODULE_OFFERED', module: { name: 'Analysis', homeProgrammeCode: 'IF' } })
		).toBe('Analysis (IF)');
	});

	it('recognises the bell and nothing narrower', () => {
		const bell = {
			kind: 'MODULE_OFFERED' as const,
			module: { id: 'm1', name: 'A', homeProgrammeCode: 'IF' }
		};
		expect(isModuleBell(bell, 'm1')).toBe(true);
		expect(isModuleBell(bell, 'm2')).toBe(false);
		expect(isModuleBell({ ...bell, semester: '2027-SS' }, 'm1')).toBe(false);
		expect(isModuleBell({ ...bell, kind: 'MODULE_WITHDRAWN' }, 'm1')).toBe(false);
	});
});

describe('audiences', () => {
	it('round-trips through the select value', () => {
		const audiences = [
			{ kind: 'SUBJECT_GROUP' as const, subjectGroup: { id: 'g1', name: 'Mathematik' } },
			{ kind: 'PROGRAMME' as const, programme: { code: 'IF' }, semester: '2027-SS' },
			{ kind: 'COLLEAGUES' as const },
			{ kind: 'LEADS' as const },
			{ kind: 'ALL_ACCOUNTS' as const }
		];
		expect(audiences.map((a) => audienceInput(audienceKey(a)))).toEqual([
			{ kind: 'SUBJECT_GROUP', subjectGroupId: 'g1' },
			{ kind: 'PROGRAMME', programme: 'IF', semester: '2027-SS' },
			{ kind: 'COLLEAGUES' },
			{ kind: 'LEADS' },
			{ kind: 'ALL_ACCOUNTS' }
		]);
	});

	it('refuses a malformed value instead of guessing', () => {
		expect(audienceInput('')).toBeNull();
		expect(audienceInput('SUBJECT_GROUP:')).toBeNull();
		expect(audienceInput('PROGRAMME:IF')).toBeNull();
		expect(audienceInput('EVERYBODY')).toBeNull();
	});

	it('says who an announcement goes to', () => {
		expect(
			audienceLabel({ kind: 'SUBJECT_GROUP', subjectGroup: { id: 'g', name: 'Mathematik' } })
		).toBe('an die Fachgruppe Mathematik');
		expect(audienceLabel({ kind: 'ALL_ACCOUNTS' })).toBe('an alle mit einem Tallox-Konto');
	});
});
