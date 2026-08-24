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
	writable: '0e2e0000-0000-4000-8000-000000000014',
	/**
	 * The module the demand test confirms the estimated split of.
	 *
	 * Its own row, like `writable`, and for the same reason: a test that writes to a fixture
	 * another test reads as "still a guess" passes alone and fails in a full run. Six hours, so
	 * that the proposal it confirms is the one the rule is about — four of lecture and two of
	 * laboratory, never three and three.
	 */
	confirmable: '0e2e0000-0000-4000-8000-000000000015',
	/**
	 * The module the demand test corrects the split of.
	 *
	 * Its own again: correcting one is a write, and a test that wrote to the module the other
	 * rows read would leave 3+1 behind the moment it failed halfway — which is how a suite starts
	 * asserting about the wreckage of its last run.
	 */
	correctable: '0e2e0000-0000-4000-8000-000000000016',
	/** The person the split module names as responsible. */
	teacher: '0e2e0000-0000-4000-8000-000000000021',
	/**
	 * A second study programme, and one module at home in it.
	 *
	 * For the case the demand page's escape hatch is about: a module that is in no catalogue of
	 * the programme being planned and has to be offered anyway. It has to be a *real* second
	 * programme rather than an unlisted module of the first, because what is being tested is
	 * that the permission hangs off the programme of the instance and not off the home of the
	 * module.
	 */
	otherProgramme: 'E2F',
	otherModule: '0e2e0000-0000-4000-8000-000000000031'
} as const;

/**
 * The semester the demand tests plan in.
 *
 * Far enough out that nobody's real planning is in it, and recorded by the seed so that it is
 * in the picker before anything has been declared. The list the backend offers is the calendar
 * window *plus* every semester somebody has decided something about — without the row, the
 * first test could not choose the semester it is about to plan.
 */
/**
 * The semesters the phase and publishing tests own.
 *
 * Their own, because both tests change a semester and one of them cannot be undone: publishing
 * ends the confidentiality window for good. Picking "the oldest unpublished one" instead worked
 * once per semester in the list, and a development database runs out of them — after which the
 * suite starts asserting about whatever is left.
 *
 * Reset by the seed on every run, the same way the split the module test writes is cleared.
 */
export const SEMESTERS = {
	/** Published by the publishing test, unpublished again by the next run's seed. */
	publishable: '2030-SS',
	/** Walked forwards and back by the phase test, and put back where it was by the seed. */
	phase: '2030-WS',
	/**
	 * The semester nobody has touched — the one the seed *removes* rather than creates.
	 *
	 * Planning the first thing in a semester with no row is the ordinary way this screen gets
	 * used, and it is the case that failed in production: the preview had no semester to point
	 * at. It stays a case only as long as the row keeps disappearing between runs.
	 */
	untouched: '2033-WS',
	/**
	 * Read by the test that checks a confidential semester shows no figure about its wishes.
	 *
	 * Its own, and unpublished by the seed, so that neither the publishing test nor a run that
	 * failed halfway can leave it published — at which point the assertion would be about a card
	 * that is no longer confidential.
	 */
	confidential: '2031-SS',
	/**
	 * The one the faculty is planning — the mark the migration set, and what the seed puts back.
	 *
	 * Every screen preselects it, so a run that left the mark somewhere else would change what
	 * `/bedarf` opens on and break tests that never mention a semester.
	 */
	planning: '2027-SS',
	/**
	 * The semester the "move the mark" test moves it to.
	 *
	 * Its own, and far enough out that nothing else asserts about it: the test's whole subject
	 * is that the mark leaves the semester it was on.
	 */
	settable: '2034-WS'
} as const;

export const DEMAND = {
	semester: '2029-WS',
	/** What the table prefills from: the same term, one year earlier. */
	previous: '2028-WS',
	/** The instance the previous semester holds, so the prefill has something to propose. */
	previousInstance: '0e2e0000-0000-4000-8000-000000000031'
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

		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.confirmable}', id, 'E2E Modul zum Bestätigen', 'SU_WITH_LAB',
		        'EVERY_WINTER_SEMESTER', 6, 5 FROM programme WHERE code = ${p}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.correctable}', id, 'E2E Modul zum Ändern', 'SU_WITH_LAB',
		        'EVERY_WINTER_SEMESTER', 4, 5 FROM programme WHERE code = ${p}
		 ON CONFLICT (id) DO NOTHING;`,

		// The second programme and its module — the one the demand page fetches in from outside
		// its own catalogue. No offering row, deliberately: it counts in no set of regulations
		// of the programme being planned, which is what makes it foreign there.
		`INSERT INTO programme (code, title) VALUES (${quote(CATALOGUE.otherProgramme)},
		        'Zweiter Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${CATALOGUE.otherModule}', id, 'E2E Fremdmodul', 'SU_WITH_LAB',
		        'EVERY_SEMESTER', 4, 5 FROM programme WHERE code = ${quote(CATALOGUE.otherProgramme)}
		 ON CONFLICT (id) DO NOTHING;`,

		// The split the write test leaves behind is cleared at the start of every run, so the
		// second run asserts the same thing the first one did.
		`DELETE FROM module_component WHERE module_id = '${CATALOGUE.writable}';`,

		// Two of the four count in the regulations; the others deliberately do not, which is
		// what makes the list a union rather than a lookup.
		// The earliest semester each of them may be taken in: the demand table groups by it, and
		// a fixture that left it empty would only ever exercise the "no cohort year" heading.
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, source_rows,
		                              min_programme_semester)
		 VALUES ('${CATALOGUE.split}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-01'], 1, 1),
		        ('${CATALOGUE.unsplit}', '${CATALOGUE.spo}', false, ARRAY['E2E-M-02'], 1, 2),
		        ('${CATALOGUE.confirmable}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-05'], 1, 1),
		        ('${CATALOGUE.correctable}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-06'], 1, 2)
		 ON CONFLICT (module_id, spo_id) DO NOTHING;`,

		// Somebody who teaches, and the module that names them.
		//
		// A teacher is imported master data and not a user: this row grants nothing, and the
		// second module deliberately names nobody — about one real module in thirty does, either
		// because the source writes a placeholder or because it writes an address that is not in
		// the list.
		`INSERT INTO teacher (id, mail, full_name, short_name, is_professor, active, faculty,
		                      last_semester)
		 VALUES ('${CATALOGUE.teacher}', 'prof.zwei@example.org', 'Prof. Dr. Zwei', 'Zwei, Prof.',
		         true, true, 'FK07', '2026-WS')
		 ON CONFLICT (id) DO NOTHING;`,

		`UPDATE module SET responsible_teacher_id = '${CATALOGUE.teacher}'
		  WHERE id = '${CATALOGUE.split}';`,

		// The admission screen's own rows: one per state its filter can be in. Every one of them
		// grants nothing — a teacher is imported master data, and who may sign in is a decision
		// somebody makes on that screen.
		`INSERT INTO teacher (id, mail, full_name, short_name, is_professor,
		                      is_lecturer_on_contract, is_staff, active, faculty, last_semester)
		 VALUES ('${TEACHERS.admittable}', 'prof.sieben@example.org', 'Prof. Dr. Sieben',
		         'Sieben, Prof.', true, false, false, true, 'FK07', '2026-WS'),
		        ('${TEACHERS.spare}', 'prof.acht@example.org', 'Prof. Dr. Acht',
		         'Acht, Prof.', true, false, false, true, 'FK07', '2026-WS'),
		        ('${TEACHERS.elsewhere}', 'prof.neun@example.org', 'Prof. Dr. Neun',
		         'Neun, Prof.', true, false, false, true, 'FK99', '2026-WS'),
		        ('${TEACHERS.onContract}', 'lba.zehn@example.org', 'Zehn, M.Sc.',
		         'Zehn, M.Sc.', false, true, false, true, 'FK07', '2026-WS'),
		        ('${TEACHERS.former}', 'prof.elf@example.org', 'Prof. Dr. Elf',
		         'Elf, Prof.', true, false, false, false, 'FK07', '2025-SS'),
		        ('${TEACHERS.withoutMail}', NULL, 'Zwoelf, ohne Adresse',
		         'Zwoelf, ohne Adresse', true, false, true, true, 'FK07', '2026-WS')
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO module_component (module_id, kind, teaching_hours, position)
		 VALUES ('${CATALOGUE.split}', 'LECTURE', 2, 0), ('${CATALOGUE.split}', 'LAB', 2, 1)
		 ON CONFLICT (module_id, position) DO NOTHING;`,

		`INSERT INTO semester (code) VALUES (${quote(DEMAND.semester)}) ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO semester (code) VALUES (${quote(DEMAND.previous)}) ON CONFLICT (code) DO NOTHING;`,

		// The two the semester tests own, back in the state they expect to find. Publishing is
		// the one act in this system that cannot be walked back, so the only way a test can do it
		// twice is if something puts the row back first — and that something is the fixture,
		// never the application.
		`INSERT INTO semester (code) VALUES (${quote(SEMESTERS.publishable)})
		 ON CONFLICT (code) DO UPDATE SET wishes_published_at = NULL, phase = 'DEMAND_PLANNING';`,
		`INSERT INTO semester (code) VALUES (${quote(SEMESTERS.phase)})
		 ON CONFLICT (code) DO UPDATE SET phase = 'DEMAND_PLANNING';`,
		`INSERT INTO semester (code) VALUES (${quote(SEMESTERS.confidential)})
		 ON CONFLICT (code) DO UPDATE SET wishes_published_at = NULL;`,

		// The planning mark, back where the migration put it. Clear before mark, in that order:
		// at most one row may carry it, and the database enforces that with a partial unique
		// index — the two statements the other way round collide with it.
		`INSERT INTO semester (code) VALUES (${quote(SEMESTERS.planning)}) ON CONFLICT (code) DO NOTHING;`,
		// The one the mark is moved *to*. Recorded here rather than left to the calendar window,
		// because the window moves through the year and this test needs a card that is there.
		`INSERT INTO semester (code) VALUES (${quote(SEMESTERS.settable)}) ON CONFLICT (code) DO NOTHING;`,
		`UPDATE semester SET is_planning_semester = false
		  WHERE is_planning_semester AND code <> ${quote(SEMESTERS.planning)};`,
		`UPDATE semester SET is_planning_semester = true WHERE code = ${quote(SEMESTERS.planning)};`,

		// Everything the demand tests declared last time. Its parts go with it, and the run
		// starts from the same state as the first one did — the alternative is a suite that
		// passes once and then asserts about leftovers.
		`DELETE FROM course_instance WHERE programme_id = '${PROGRAMME_ID}';`,

		// Vier leads it. Without this she holds PROGRAMME_LEAD and may plan nothing — which is
		// the correct behaviour and would make every write test assert the wrong refusal.
		`INSERT INTO person_programme_scope (person_id, role, programme_id)
		 SELECT p.id, 'PROGRAMME_LEAD', pr.id FROM person p, programme pr
		  WHERE p.mail = 'prof.vier@example.org' AND pr.code = ${p}
		 ON CONFLICT DO NOTHING;`
	];
}

/**
 * Everything the demand tests declared, removed.
 *
 * Run before that spec rather than only in the global setup, because a retry re-runs the whole
 * serial group without re-seeding: the second attempt would then start against the instances the
 * first one declared, and "the demand starts empty" would fail for a reason that has nothing to
 * do with what it asserts. A retry that fails differently from the original is worse than no
 * retry at all.
 *
 * The parts go with the instances — `instance_part` is ON DELETE CASCADE.
 */
export function demandResetSql(): string {
	return [
		`DELETE FROM course_instance WHERE programme_id = '${PROGRAMME_ID}';`,
		// The local courses the "enter your own" test creates. Deleted rather than deactivated,
		// unlike in the application: the name is their identity, so a run that left one behind
		// would meet MODULE_NAME_TAKEN instead of the thing it asserts. Their instances go first,
		// and both are gone by the line above.
		`DELETE FROM module_component WHERE module_id IN
		   (SELECT id FROM module WHERE source = 'LOCAL' AND home_programme_id = '${PROGRAMME_ID}');`,
		`DELETE FROM module WHERE source = 'LOCAL' AND home_programme_id = '${PROGRAMME_ID}';`,
		// The splits the confirming and the correcting tests state, so that the next run finds a
		// guess again — including after a run that failed halfway and restored nothing.
		`DELETE FROM module_component
		  WHERE module_id IN ('${CATALOGUE.confirmable}', '${CATALOGUE.correctable}');`,
		// And what the previous comparable semester held, so the table has something to prefill
		// from: one cohort, a lecture and two laboratory groups.
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${DEMAND.previousInstance}', s.id, '${CATALOGUE.split}', '${PROGRAMME_ID}', '', 1
		   FROM semester s WHERE s.code = ${quote(DEMAND.previous)};`,
		`INSERT INTO instance_part (course_instance_id, kind, position, teaching_hours)
		 VALUES ('${DEMAND.previousInstance}', 'LECTURE', 0, 2),
		        ('${DEMAND.previousInstance}', 'LAB', 1, 2),
		        ('${DEMAND.previousInstance}', 'LAB', 2, 2);`,

		// And the one semester that has to be untouched again. Guarded, because a row another
		// programme is planning in is not this fixture's to remove — and because the seed must
		// not fail on a database that has one.
		`DELETE FROM semester s WHERE s.code = ${quote(SEMESTERS.untouched)}
		   AND NOT EXISTS (SELECT 1 FROM course_instance ci WHERE ci.semester_id = s.id);`
	].join('\n');
}

/**
 * The people who teach, for the admission screen.
 *
 * Six rows, and each of them is one row of that screen's filter. Without them the list would be
 * the single professor the catalogue already needed, the pre-filter would have nothing to keep
 * out, and every assertion about it would pass for the wrong reason.
 *
 * Invented, like the rest of the cast. Both public repositories, and this is the list of who
 * teaches at a real faculty.
 */
export const TEACHERS = {
	/** FK07, professor, teaches, no account. What the switch is clicked on. */
	admittable: '0e2e0000-0000-4000-8000-000000000031',
	/** FK07, professor, teaches, no account — the second one, so a test may keep one untouched. */
	spare: '0e2e0000-0000-4000-8000-000000000032',
	/** Another faculty. The pre-filter keeps them out, and widening it brings them back. */
	elsewhere: '0e2e0000-0000-4000-8000-000000000033',
	/** Teaches on a contract. Kept out by the employment facet rather than by the faculty one. */
	onContract: '0e2e0000-0000-4000-8000-000000000034',
	/** The examination office no longer lists them as teaching. */
	former: '0e2e0000-0000-4000-8000-000000000035',
	/** No address at all. Can never be admitted, because the address is the whole link. */
	withoutMail: '0e2e0000-0000-4000-8000-000000000036'
} as const;

/** The addresses the admission tests admit, so that a run can start from "nobody admitted". */
export const ADMITTABLE_MAILS = ['prof.sieben@example.org', 'prof.acht@example.org'] as const;

/**
 * The accounts the admission tests create, removed again.
 *
 * Called before the admission spec, not after: a run that failed halfway leaves them behind, and
 * the next run has to be able to start anyway. Deleting a person is something the application
 * deliberately cannot do — the assignments stay in the history — which is exactly why the
 * fixture has to, and only for addresses no real person carries.
 */
export function admissionResetSql(): string {
	const list = ADMITTABLE_MAILS.map(quote).join(', ');
	return [
		`DELETE FROM person_programme_scope WHERE person_id IN
		   (SELECT id FROM person WHERE mail IN (${list}));`,
		`DELETE FROM person_role WHERE person_id IN
		   (SELECT id FROM person WHERE mail IN (${list}));`,
		`DELETE FROM person WHERE mail IN (${list});`
	].join('\n');
}

/** The complete script, exactly as it goes to psql. */
export function seedSql(): string {
	return [...seedStatementsFor(Object.values(PERSONAS)), ...catalogueStatements()].join('\n');
}
