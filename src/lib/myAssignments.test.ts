import { describe, expect, it } from 'vitest';
import { teachingBySemester, type MyAssignmentLike } from './myAssignments';

function assignment(
	semester: string,
	module: string,
	hours: number | null,
	track = ''
): MyAssignmentLike {
	return {
		id: `${semester}-${module}-${track}`,
		note: '',
		part: { id: `p-${semester}-${module}-${track}`, kind: 'LECTURE', teachingHours: hours },
		instance: {
			id: `i-${semester}-${module}-${track}`,
			semester,
			track,
			programmeSemester: 2,
			programme: { code: 'IF' },
			module: { id: module, name: module }
		}
	};
}

describe('my teaching by semester', () => {
	// The semester somebody opens this for is the next one.
	it('groups by semester, newest first, and sums the hours', () => {
		const semesters = teachingBySemester(
			[
				assignment('2026-WS', 'Analysis', 4),
				assignment('2027-SS', 'Betriebssysteme', 2),
				assignment('2027-SS', 'Algorithmen', 2.5)
			],
			new Set(['2026-WS'])
		);
		expect(semesters.map((s) => s.code)).toEqual(['2027-SS', '2026-WS']);
		expect(semesters[0].teachingHours).toBe(4.5);
		expect(semesters[0].assignments.map((a) => a.instance.module.name)).toEqual([
			'Algorithmen',
			'Betriebssysteme'
		]);
	});

	// A draft marked as a draft costs nothing; a draft read as final is the question to prevent.
	it('marks a semester as a draft until its assignment is published', () => {
		const [summer, winter] = teachingBySemester(
			[assignment('2027-SS', 'A', 2), assignment('2026-WS', 'B', 2)],
			new Set(['2026-WS'])
		);
		expect(summer.published).toBe(false);
		expect(winter.published).toBe(true);
	});

	// Zero is a statement; "nobody has said" is a different one, and the sum says it is incomplete.
	it('counts the parts without hours instead of adding a zero silently', () => {
		const [only] = teachingBySemester(
			[assignment('2027-SS', 'A', null), assignment('2027-SS', 'B', 2)],
			new Set()
		);
		expect(only.teachingHours).toBe(2);
		expect(only.partsWithoutHours).toBe(1);
	});
});
