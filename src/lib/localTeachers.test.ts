import { describe, expect, it } from 'vitest';
import { localTeachers, namesOf, parseLocalTeacherForm } from './localTeachers';

function form(fields: Record<string, string>): FormData {
	const data = new FormData();
	for (const [k, v] of Object.entries(fields)) data.set(k, v);
	return data;
}

describe('parseLocalTeacherForm', () => {
	it('reads a complete form, trimmed', () => {
		expect(
			parseLocalTeacherForm(
				form({
					surname: ' Neu ',
					givenName: 'Lehrauftrag',
					mail: ' lb.neun@example.org ',
					isLecturerOnContract: 'on'
				})
			)
		).toEqual({
			input: {
				surname: 'Neu',
				givenName: 'Lehrauftrag',
				mail: 'lb.neun@example.org',
				isLecturerOnContract: true,
				active: true
			}
		});
	});

	it('reads an unticked box as false and „off“ as taken out of the lists', () => {
		const parsed = parseLocalTeacherForm(
			form({ surname: 'Neu', mail: 'lb.neun@example.org', active: 'off' })
		);
		expect(parsed).toMatchObject({ input: { isLecturerOnContract: false, active: false } });
	});

	it('asks for a surname', () => {
		expect(parseLocalTeacherForm(form({ surname: ' ', mail: 'lb.neun@example.org' }))).toEqual({
			message: 'Bitte einen Nachnamen angeben.'
		});
	});

	it('asks for an address that looks like one', () => {
		for (const mail of ['', 'kein-at', 'zwei @example.org', '@example.org']) {
			expect(parseLocalTeacherForm(form({ surname: 'Neu', mail }))).toEqual({
				message: 'Bitte eine gültige Mailadresse angeben.'
			});
		}
	});
});

describe('namesOf', () => {
	it('splits the sort name at the first comma', () => {
		expect(namesOf('Neu, Lehrauftrag')).toEqual({ surname: 'Neu', givenName: 'Lehrauftrag' });
	});

	it('keeps a name without a given name whole', () => {
		expect(namesOf('Neu')).toEqual({ surname: 'Neu', givenName: '' });
	});
});

describe('localTeachers', () => {
	it('keeps the rows entered by hand, active ones first, then by name', () => {
		const rows = [
			{ id: 'zpa', enteredByHand: false, active: true, sortName: 'Aaa' },
			{ id: 'out', enteredByHand: true, active: false, sortName: 'Aaa' },
			{ id: 'b', enteredByHand: true, active: true, sortName: 'Bbb' },
			{ id: 'a', enteredByHand: true, active: true, sortName: 'Äaa' }
		];
		expect(localTeachers(rows).map((r) => r.id)).toEqual(['a', 'b', 'out']);
	});
});
