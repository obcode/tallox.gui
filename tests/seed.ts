import { PERSONAS, type Persona } from './fixtures';

/**
 * The cast as SQL, for the start of an end-to-end run.
 *
 * Since the backend enforces identity, a person with no row in `person` is nobody: the proxy
 * header is resolved against the table, and without a match every request answers 401. That
 * used to be irrelevant because no page needed an identity — which is why this step did not
 * exist before.
 *
 * Generated from `PERSONAS` rather than kept as a file beside it: a second list with the same
 * addresses would be exactly the kind of duplicate that drifts apart when somebody adds a
 * person — and the failure would show up as a 401 in a test that is not about people at all.
 */

/** The roles a persona holds in an end-to-end run. Kept small: more only claims more. */
const ROLES: Record<string, readonly string[]> = {
	'prof.eins@example.org': ['LECTURER'],
	'prof.zwei@example.org': ['LECTURER'],
	// Vier plans — she is the persona an exception becomes visible on.
	'prof.vier@example.org': ['LECTURER', 'PROGRAMME_LEAD'],
	// Fuenf is the dean's office — the only persona that may create a semester and switch its
	// phase. LECTURER on top because everybody in the planning holds it.
	'dekanat@example.org': ['LECTURER', 'DEANS_OFFICE'],
	// Sechs administers. LECTURER on top, because the role preview only offers a selection from
	// the HELD roles: "let me see what a lecturer sees" presupposes being one. That is not
	// awkwardness but the reason the preview cannot add anything.
	'admin@example.org': ['LECTURER', 'ADMIN']
};

/** Doubles single quotes. The values are constants from this repository, but a string that
 *  travels into SQL unchecked is a habit and not an exception. */
function quote(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

export function seedStatementsFor(personas: readonly Persona[]): string[] {
	const statements: string[] = [];

	for (const persona of personas) {
		// ON CONFLICT DO NOTHING: the run starts against a database that may be left over from an
		// earlier one. A seed that fails the second time turns "database not fresh" into a test
		// failure that looks like an application failure.
		statements.push(
			`INSERT INTO person (id, mail, name) VALUES (gen_random_uuid(), ${quote(persona.mail)}, ${quote(persona.name)}) ON CONFLICT (mail) DO NOTHING;`
		);

		for (const role of ROLES[persona.mail] ?? ['LECTURER']) {
			statements.push(
				`INSERT INTO person_role (person_id, role) SELECT id, ${quote(role)} FROM person WHERE mail = ${quote(persona.mail)} ON CONFLICT DO NOTHING;`
			);
		}
	}

	return statements;
}

/**
 * A small catalogue, so the module pages have something to show.
 *
 * Its own programme with a code no real one uses, because a run happens against whatever
 * database is there — a developer's, with the whole imported catalogue in it, or a fresh one in
 * CI with none. Asserting against real modules would make the tests pass on one machine and
 * fail on the other, and asserting against counts would make them fail the week somebody
 * imports.
 *
 * The three modules are the three states the page has to distinguish, and every one of them is
 * a case that exists in the real catalogue in numbers:
 *
 *   · in the catalogue and split      — the ordinary row
 *   · in the catalogue and not split  — the work list; a module no instance can be made from
 *   · at home and in no regulations   — 26 active real modules, ten in the largest programme,
 *                                       invisible unless the list is a union
 *
 * Fixed ids rather than generated ones: a test that wants the third module has to be able to
 * name it, and a name is not unique enough to key on in a database that may also hold the real
 * catalogue.
 */
export const CATALOGUE = {
	programme: 'E2E',
	spo: '0e2e0000-0000-4000-8000-000000000001',
	split: '0e2e0000-0000-4000-8000-000000000011',
	unsplit: '0e2e0000-0000-4000-8000-000000000012',
	onlyAtHome: '0e2e0000-0000-4000-8000-000000000013',
	/**
	 * The module the write test states a split on.
	 *
	 * Its own row, and not `unsplit`, because a test that writes to a fixture two other tests
	 * read as "has no split" passes alone and fails in a full run — which is the worst way for a
	 * suite to fail, since the order that produced it is not in the report.
	 */
	writable: '0e2e0000-0000-4000-8000-000000000014'
} as const;

const PROGRAMME_ID = '0e2e0000-0000-4000-8000-000000000000';

export function catalogueStatements(): string[] {
	const p = quote(CATALOGUE.programme);

	return [
		`INSERT INTO programme (id, code, title) VALUES ('${PROGRAMME_ID}', ${p}, 'Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,

		`INSERT INTO spo (id, programme_id, version, valid_from, primuss_id)
		 SELECT '${CATALOGUE.spo}', id, 2025, '2025-10-01', '07-E2E-2025' FROM programme WHERE code = ${p}
		 ON CONFLICT (programme_id, version) DO NOTHING;`,

		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.split}', id, 'E2E Modul mit Aufteilung', 'SU_WITH_LAB',
		        'EVERY_WINTER_SEMESTER', 4, 5 FROM programme WHERE code = ${p}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.unsplit}', id, 'E2E Modul ohne Aufteilung', 'SU_WITH_EXERCISE',
		        'EVERY_SUMMER_SEMESTER', 4, 5 FROM programme WHERE code = ${p}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.onlyAtHome}', id, 'E2E Modul nur zu Hause', 'SEMINAR',
		        'ON_ANNOUNCEMENT', 2, 3 FROM programme WHERE code = ${p}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.writable}', id, 'E2E Modul zum Beschreiben', 'SU_WITH_EXERCISE',
		        'EVERY_SEMESTER', 4, 5 FROM programme WHERE code = ${p}
		 ON CONFLICT (id) DO NOTHING;`,

		// The split the write test leaves behind is cleared at the start of every run, so the
		// second run asserts the same thing the first one did.
		`DELETE FROM module_component WHERE module_id = '${CATALOGUE.writable}';`,

		// Two of the four count in the regulations; the others deliberately do not, which is
		// what makes the list a union rather than a lookup.
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, source_rows)
		 VALUES ('${CATALOGUE.split}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-01'], 1),
		        ('${CATALOGUE.unsplit}', '${CATALOGUE.spo}', false, ARRAY['E2E-M-02'], 1)
		 ON CONFLICT (module_id, spo_id) DO NOTHING;`,

		`INSERT INTO module_component (module_id, kind, teaching_hours, position)
		 VALUES ('${CATALOGUE.split}', 'LECTURE', 2, 0), ('${CATALOGUE.split}', 'LAB', 2, 1)
		 ON CONFLICT (module_id, position) DO NOTHING;`,

		// Vier leads it. Without this she holds PROGRAMME_LEAD and may plan nothing — which is
		// the correct behaviour and would make every write test assert the wrong refusal.
		`INSERT INTO person_programme_scope (person_id, role, programme_id)
		 SELECT p.id, 'PROGRAMME_LEAD', pr.id FROM person p, programme pr
		  WHERE p.mail = 'prof.vier@example.org' AND pr.code = ${p}
		 ON CONFLICT DO NOTHING;`
	];
}

/** The complete script, exactly as it goes to psql. */
export function seedSql(): string {
	return [...seedStatementsFor(Object.values(PERSONAS)), ...catalogueStatements()].join('\n');
}
