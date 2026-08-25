import { describe, expect, it } from 'vitest';
import { buildSchema, GraphQLEnumType } from 'graphql';
import { readFileSync } from 'node:fs';
import type { ScopeArea } from '$lib/gql/__generated__/graphql';
import {
	AREA_HINTS,
	AREA_LABELS,
	CHOICE_LABELS,
	SELECTABLE_AREAS,
	UNREACHABLE_AREAS,
	areaFieldName,
	describeScopes,
	selectedScopes
} from './scopes';

/** Every area the backend knows, read from the committed schema rather than restated here. */
function schemaAreas(): string[] {
	const schema = buildSchema(readFileSync('schema.graphql', 'utf8'));
	const enumType = schema.getType('ScopeArea');
	if (!(enumType instanceof GraphQLEnumType)) throw new Error('ScopeArea is not an enum');
	return enumType.getValues().map((v) => v.name);
}

describe('the offered areas', () => {
	it('covers every area the schema knows, on one side or the other', () => {
		// The point of UNREACHABLE_AREAS. A new area in the backend fails this test until
		// somebody decides whether the dialogue should offer it — which is the moment to think
		// about it, rather than six months later when a colleague asks why it is missing.
		const decided = new Set<string>([...SELECTABLE_AREAS, ...Object.keys(UNREACHABLE_AREAS)]);

		for (const area of schemaAreas()) {
			expect(decided.has(area), `${area} is neither offered nor listed as unreachable`).toBe(true);
		}
	});

	it('does not both offer an area and call it unreachable', () => {
		for (const area of SELECTABLE_AREAS) {
			expect(UNREACHABLE_AREAS[area], area).toBeUndefined();
		}
	});

	it('gives a reason for every area it withholds', () => {
		// A control that is absent needs an explanation on the page, or its absence reads as an
		// oversight. The reason is rendered, so it has to exist.
		for (const [area, reason] of Object.entries(UNREACHABLE_AREAS)) {
			expect(reason, area).toBeTruthy();
		}
	});

	it('withholds PUBLIC, which no scope list can narrow away', () => {
		// A checkbox for it would do nothing whichever way it is set.
		expect(SELECTABLE_AREAS).not.toContain('PUBLIC');
	});

	it('translates every area and every choice', () => {
		for (const area of schemaAreas() as ScopeArea[]) {
			expect(AREA_LABELS[area], area).toBeTruthy();
			expect(AREA_HINTS[area], area).toBeTruthy();
		}
		for (const choice of ['none', 'READ', 'WRITE'] as const) {
			expect(CHOICE_LABELS[choice], choice).toBeTruthy();
		}
	});
});

describe('areaFieldName', () => {
	it('gives every area its own radio group', () => {
		const names = SELECTABLE_AREAS.map(areaFieldName);
		expect(new Set(names).size).toBe(names.length);
	});
});

describe('selectedScopes', () => {
	it('is empty when nothing was chosen', () => {
		// Empty means unrestricted to the backend. That is exactly why the page asks separately
		// whether to restrict at all — this function only reports what was ticked, and the
		// caller is the one that must not read "nothing" as "no limits".
		expect(selectedScopes({})).toEqual([]);
		expect(selectedScopes({ PROFILE: 'none', PLANNING: 'none' })).toEqual([]);
	});

	it('turns a choice into an area and a verb', () => {
		expect(selectedScopes({ PLANNING: 'READ' })).toEqual([{ area: 'PLANNING', verb: 'READ' }]);
		expect(selectedScopes({ PLANNING: 'WRITE' })).toEqual([{ area: 'PLANNING', verb: 'WRITE' }]);
	});

	it('keeps the order of SELECTABLE_AREAS, so the list reads like the form', () => {
		expect(selectedScopes({ PLANNING: 'READ', PROFILE: 'READ' })).toEqual([
			{ area: 'PROFILE', verb: 'READ' },
			{ area: 'PLANNING', verb: 'READ' }
		]);
	});

	it('ignores an area the dialogue does not offer', () => {
		// Can only come from a hand-written POST. The backend refuses what it does not accept
		// anyway; this is a form parser and not a second gate.
		expect(selectedScopes({ ADMIN: 'WRITE' })).toEqual([]);
	});

	it('never emits the same area twice', () => {
		// The backend refuses a repeated scope, and a radio group cannot produce one — but the
		// two facts are in different repositories, so the one that is cheap to assert is here.
		const scopes = selectedScopes({ PROFILE: 'READ', PLANNING: 'WRITE' });
		const keys = scopes.map((s) => `${s.area}:${s.verb}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('describeScopes', () => {
	it('says unbeschränkt for an empty list', () => {
		// The list of existing tokens has to be honest about this: every token minted before
		// scopes could be chosen carries an empty list and is unrestricted.
		expect(describeScopes([])).toBe('unbeschränkt');
	});

	it('reads a stored scope back in German', () => {
		expect(describeScopes(['PLANNING:READ'])).toBe('Planung (lesen)');
		expect(describeScopes(['PROFILE:WRITE'])).toBe('Eigenes Profil (lesen und ändern)');
	});

	it('lists several', () => {
		expect(describeScopes(['PROFILE:READ', 'PLANNING:WRITE'])).toBe(
			'Eigenes Profil (lesen), Planung (lesen und ändern)'
		);
	});

	it('shows a scope it does not know rather than dropping it', () => {
		// A token can carry a scope written by a newer server. Hiding it would tell the owner
		// their token is narrower than it is, which is the wrong direction to be wrong in.
		//
		// Each half falls back on its own: an unknown area stays raw while a known verb still
		// translates, because half a translation is more readable than none.
		//
		// WISHES stood here until the wish phase shipped and it became a real area — which is
		// exactly what "areas arrive with the fields that need them" looks like from this side.
		// Replaced rather than deleted: a token written by a newer server is the case this
		// covers, and it does not stop happening.
		expect(describeScopes(['ASSIGNMENTS:READ'])).toBe('ASSIGNMENTS (lesen)');
		expect(describeScopes(['PLANNING:APPROVE'])).toBe('Planung (APPROVE)');
		expect(describeScopes(['ASSIGNMENTS:APPROVE'])).toBe('ASSIGNMENTS (APPROVE)');
	});
});
