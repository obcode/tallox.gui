import { describe, expect, it } from 'vitest';
import {
	COMPETENCE_LEVELS,
	COMPETENCE_LEVEL_LABELS,
	belowMinimum,
	competenceByModule,
	competenceChanges,
	holderLabel,
	isCompetenceChoice,
	isTeacherRow,
	minimumHint,
	outsideStatements,
	poolsByModule,
	savedHint,
	sortModules,
	type CompetenceLike,
	type OwnCompetenceLike
} from './competences';

function own(
	id: string,
	moduleId: string,
	name: string,
	level: 'CAN_TEACH' | 'WOULD_LIKE' = 'CAN_TEACH',
	outside = false
): OwnCompetenceLike {
	return { id, level, note: '', outsideSubjectGroups: outside, module: { id: moduleId, name } };
}

function other(
	id: string,
	moduleId: string,
	name: string,
	level: 'CAN_TEACH' | 'WOULD_LIKE',
	holder: { personId?: string | null; teacherId?: string | null } = { personId: `p-${id}` },
	note = ''
): CompetenceLike {
	return { id, level, note, module: { id: moduleId }, holder: { ...holder, name } };
}

describe('levels', () => {
	it('labels every level and accepts the empty choice', () => {
		for (const level of COMPETENCE_LEVELS) {
			expect(COMPETENCE_LEVEL_LABELS[level]).toBeTruthy();
			expect(isCompetenceChoice(level)).toBe(true);
		}
		expect(isCompetenceChoice('')).toBe(true);
		expect(isCompetenceChoice('EXPERT')).toBe(false);
	});
});

describe('the minimum', () => {
	it('is a hint in both directions, and says how many are asked for', () => {
		expect(belowMinimum({ canTeachCompulsory: 2, minimum: 3 })).toBe(true);
		expect(belowMinimum({ canTeachCompulsory: 3, minimum: 3 })).toBe(false);
		expect(minimumHint({ canTeachCompulsory: 2, minimum: 3 })).toBe(
			'2 von mindestens 3 Pflichtfächern als „kann ich halten“ angegeben.'
		);
		expect(minimumHint({ canTeachCompulsory: 1, minimum: 3 })).toContain('1 von mindestens 3');
		expect(minimumHint({ canTeachCompulsory: 4, minimum: 3 })).toContain('sind erreicht');
	});

	it('never reads like a refusal', () => {
		for (const have of [0, 1, 2, 3, 5]) {
			const hint = minimumHint({ canTeachCompulsory: have, minimum: 3 });
			expect(hint).not.toMatch(/nicht (möglich|erlaubt|gespeichert)|muss|abgelehnt/i);
		}
	});
});

describe('sortModules', () => {
	it('puts compulsory modules first, then by name, and nameless ones last', () => {
		const sorted = sortModules([
			{ id: '1', name: 'Zahlentheorie', compulsory: false },
			{ id: '2', name: '', compulsory: true },
			{ id: '3', name: 'Analysis', compulsory: true },
			{ id: '4', name: 'Algebra', compulsory: false }
		]);
		expect(sorted.map((m) => m.id)).toEqual(['3', '2', '4', '1']);
	});
});

describe('outsideStatements', () => {
	it('keeps the statements no group table would show', () => {
		const mine = [
			own('a', 'm1', 'Analysis'),
			own('b', 'm2', 'Datenbanken', 'CAN_TEACH', true),
			own('c', 'm3', 'Compilerbau')
		];
		const outside = outsideStatements(mine, new Set(['m1', 'm2']));
		// m2 is flagged by the backend; m3 is simply not in any group on the page.
		expect(outside.map((c) => c.id)).toEqual(['c', 'b']);
	});
});

describe('competenceChanges', () => {
	const stored = [
		{ id: 'c1', moduleId: 'm1', level: 'CAN_TEACH' as const, note: '' },
		{ id: 'c2', moduleId: 'm2', level: 'WOULD_LIKE' as const, note: 'Übung' }
	];

	it('produces nothing for unchanged cells', () => {
		expect(
			competenceChanges(
				[
					{ moduleId: 'm1', level: 'CAN_TEACH', note: '' },
					{ moduleId: 'm2', level: 'WOULD_LIKE', note: 'Übung' },
					{ moduleId: 'm3', level: '', note: '' }
				],
				stored
			)
		).toEqual([]);
	});

	it('sets, changes and withdraws', () => {
		expect(
			competenceChanges(
				[
					{ moduleId: 'm1', level: '', note: '' },
					{ moduleId: 'm2', level: 'CAN_TEACH', note: 'Übung' },
					{ moduleId: 'm3', level: 'WOULD_LIKE', note: '' }
				],
				stored
			)
		).toEqual([
			{ kind: 'withdraw', moduleId: 'm1', competenceId: 'c1' },
			{ kind: 'set', moduleId: 'm2', level: 'CAN_TEACH', note: 'Übung' },
			{ kind: 'set', moduleId: 'm3', level: 'WOULD_LIKE', note: '' }
		]);
	});

	it('treats a changed note as a change', () => {
		expect(
			competenceChanges([{ moduleId: 'm1', level: 'CAN_TEACH', note: 'nur SoSe' }], stored)
		).toEqual([{ kind: 'set', moduleId: 'm1', level: 'CAN_TEACH', note: 'nur SoSe' }]);
	});
});

describe('savedHint', () => {
	it('counts the caller’s own changes', () => {
		expect(savedHint(0)).toBe('Es gab nichts zu speichern.');
		expect(savedHint(1)).toBe('Eine Änderung gespeichert.');
		expect(savedHint(4)).toBe('4 Änderungen gespeichert.');
	});
});

describe('pools', () => {
	it('splits by level and sorts by name', () => {
		const pools = poolsByModule([
			other('1', 'm1', 'Zwei', 'CAN_TEACH'),
			other('2', 'm1', 'Eins', 'CAN_TEACH'),
			other('3', 'm1', 'Drei', 'WOULD_LIKE'),
			other('4', 'm2', 'Vier', 'WOULD_LIKE')
		]);
		expect(pools.get('m1')?.canTeach.map((c) => c.holder.name)).toEqual(['Eins', 'Zwei']);
		expect(pools.get('m1')?.wouldLike.map((c) => c.holder.name)).toEqual(['Drei']);
		expect(pools.get('m2')?.canTeach).toEqual([]);
		expect(pools.has('m3')).toBe(false);
	});

	it('labels a holder with the note, and knows a teacher row', () => {
		expect(holderLabel(other('1', 'm1', 'Eins', 'CAN_TEACH', undefined, 'nur Übung'))).toBe(
			'Eins (nur Übung)'
		);
		expect(holderLabel(other('1', 'm1', 'Eins', 'CAN_TEACH'))).toBe('Eins');
		expect(isTeacherRow(other('1', 'm1', 'X', 'CAN_TEACH', { teacherId: 't1' }))).toBe(true);
		expect(isTeacherRow(other('1', 'm1', 'X', 'CAN_TEACH', { personId: 'p1' }))).toBe(false);
	});

	it('finds my own statement per module', () => {
		const byModule = competenceByModule([own('a', 'm1', 'Analysis')]);
		expect(byModule.get('m1')?.id).toBe('a');
		expect(byModule.get('m2')).toBeUndefined();
	});
});
