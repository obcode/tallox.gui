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
	// Drei leads a subject group — the persona a scoped permission becomes visible on, and the
	// one a boolean role check gets wrong.
	'prof.drei@example.org': ['LECTURER', 'SUBJECT_GROUP_LEAD'],
	// Vier plans — she is the persona an exception becomes visible on.
	'prof.vier@example.org': ['LECTURER', 'PROGRAMME_LEAD'],
	// Fuenf is the dean's office — the only persona that may create a semester and switch its
	// phase. LECTURER on top because everybody in the planning holds it.
	'dekanat@example.org': ['LECTURER', 'DEANS_OFFICE'],
	// Sechs administers. LECTURER on top, because the role preview only offers a selection from
	// the HELD roles: "let me see what a lecturer sees" presupposes being one. That is not
	// awkwardness but the reason the preview cannot add anything.
	'admin@example.org': ['LECTURER', 'ADMIN'],
	// Neun holds a subject group leadership and is assigned no subject group — deliberately, and
	// permanently. An unscoped grant permits nothing here, so she is the persona that renders
	// the state a screen has to explain rather than show as an empty list.
	'prof.neun@example.org': ['LECTURER', 'SUBJECT_GROUP_LEAD'],
	// Zehn is a partner faculty and nothing else — the one account that reads less than an
	// ordinary one. Which programme it follows is the controlling spec's to seed.
	'partner.zehn@example.org': ['PARTNER_READER']
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

/**
 * What the wish tests work on.
 *
 * Its own semester **and** its own study programme, and both for the same reason: the demand
 * reset deletes every instance of the first programme, and an instance somebody has registered
 * interest in cannot be deleted at all. Sharing either would make the wish spec and the demand
 * spec fail each other in an order that is not in the report.
 *
 * The semester is seeded in the WISHES phase, because that is the only phase a wish may be
 * written in — the first closed cell the write matrix has ever had.
 */
export const WISHES = {
	semester: '2032-WS',
	/**
	 * A **third** study programme, and a module at home in it.
	 *
	 * Its own rather than the second one, and the reason is a collision this fixture caused the
	 * first time round: the demand spec asserts that Vier does *not* lead `otherProgramme`, and
	 * making her its lead here turned an unrelated test's "the button is disabled" into a failure
	 * three files away. A fixture that grants somebody a permission needs a subject nobody else is
	 * asserting about.
	 */
	programme: 'E2G',
	module: '0e2e0000-0000-4000-8000-000000000045',
	instance: '0e2e0000-0000-4000-8000-000000000041',
	lecture: '0e2e0000-0000-4000-8000-000000000042',
	lab: '0e2e0000-0000-4000-8000-000000000043',
	/**
	 * A **second** semester with the same module offered again.
	 *
	 * "Meine Eintragungen" spans every semester, so a fixture with one semester cannot tell a list
	 * that spans them from a list that happens to show the semester on screen. Both belong to this
	 * fixture's own programme, so no other spec's reset can take them away mid-run.
	 */
	laterSemester: '2033-SS',
	laterInstance: '0e2e0000-0000-4000-8000-000000000046',
	laterLecture: '0e2e0000-0000-4000-8000-000000000047',
	/** The subject group the wished-for module belongs to, so a lead has something to lead. */
	subjectGroup: '0e2e0000-0000-4000-8000-000000000044',
	subjectGroupCode: 'E2EFG'
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
		// The basket names the elective's line shows, and the compulsory one's does not.
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, baskets, source_rows,
		                              min_programme_semester)
		 VALUES ('${CATALOGUE.split}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-01'], ARRAY['E2E Pflichtkorb'], 1, 1),
		        ('${CATALOGUE.unsplit}', '${CATALOGUE.spo}', false, ARRAY['E2E-M-02'], ARRAY['E2E WPF-Korb'], 1, 2),
		        ('${CATALOGUE.confirmable}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-05'], ARRAY['E2E Pflichtkorb'], 1, 1),
		        ('${CATALOGUE.correctable}', '${CATALOGUE.spo}', true, ARRAY['E2E-M-06'], ARRAY['E2E Pflichtkorb'], 1, 2)
		 ON CONFLICT (module_id, spo_id) DO UPDATE SET baskets = EXCLUDED.baskets;`,

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
		// The foreign module needs a confirmed split too: without one no instance can be declared
		// of it, and the test that fetches it in is about the foreign path, not the confirmation.
		`INSERT INTO module_component (module_id, kind, teaching_hours, position)
		 VALUES ('${CATALOGUE.otherModule}', 'LECTURE', 2, 0), ('${CATALOGUE.otherModule}', 'LAB', 2, 1)
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
		// The wishes first, and this line is not defensive tidying: wish.course_instance_id is
		// ON DELETE RESTRICT, so a wish left behind by a failed run would make this reset fail —
		// in a spec that has nothing to do with wishes, with a message about a foreign key.
		//
		// It is also the only place in this file that deletes somebody's wish, which is right:
		// what a person registered is theirs, and only a fixture may take it away.
		`DELETE FROM wish WHERE course_instance_id IN
		   (SELECT id FROM course_instance WHERE programme_id = '${PROGRAMME_ID}'
		       OR module_id IN ('${CATALOGUE.split}', '${CATALOGUE.confirmable}',
		                        '${CATALOGUE.correctable}', '${CATALOGUE.otherModule}'));`,
		// Every declaration of this fixture's modules, whichever programme made it — not only this
		// programme's.
		//
		// That used to be the same set. It stopped being one when declaring a module another
		// programme already declared began holding the two together: a leftover row in E2F or E2H
		// now reaches into this fixture and turns "2 angelegt" into one creation and one coupling.
		// The reset has to own every declaration of the modules it plans with, or the assertions
		// depend on what the last run left behind.
		//
		// Deleted holder-first is not needed: instances of one module go in one statement, and the
		// composite key only refuses a delete that would strand a guest — which cannot happen when
		// the guest goes too.
		`DELETE FROM course_instance
		  WHERE programme_id = '${PROGRAMME_ID}'
		     OR module_id IN ('${CATALOGUE.split}', '${CATALOGUE.confirmable}',
		                      '${CATALOGUE.correctable}', '${CATALOGUE.otherModule}');`,
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
	return [
		...seedStatementsFor(Object.values(PERSONAS)),
		...catalogueStatements(),
		...wishStatements(),
		...assignmentStatements(),
		...degreeStatements(),
		...competenceStatements(),
		...setupStatements(),
		...filingStatements(),
		...dividedStatements(),
		...sortingStatements()
	].join('\n');
}

/**
 * The competence fixture: a subject group with one compulsory and one elective module, a member
 * who states competences, the group's lead, and a lecturer on contract without an account.
 *
 * Its own programme, regulations, group and modules, for the reason the assignment fixture gives:
 * a fixture that gives somebody a row changes every page that lists their rows. The member is
 * **Neun**, the persona whose subject group leadership is unscoped — membership grants nothing, so
 * it does not touch the state she exists to show, and no other spec lists her rows.
 */
export const COMPETENCES = {
	programme: 'E2K',
	spo: '0e2e0000-0000-4000-8000-000000000061',
	subjectGroup: '0e2e0000-0000-4000-8000-000000000062',
	subjectGroupCode: 'E2EKOMP',
	compulsory: '0e2e0000-0000-4000-8000-000000000063',
	compulsoryName: 'E2E Pflichtmodul',
	elective: '0e2e0000-0000-4000-8000-000000000064',
	electiveName: 'E2E Wahlmodul',
	teacher: '0e2e0000-0000-4000-8000-000000000065',
	teacherName: 'Kompetenz Lehrbeauftragte',
	/**
	 * A cohort of the compulsory module in the assignment fixture's semester, so the assignment
	 * screen has a row whose candidate list the pool can show up in. Filtered by this group, so the
	 * assignment spec — which looks at its own group — never renders it.
	 */
	instance: '0e2e0000-0000-4000-8000-000000000066',
	lecture: '0e2e0000-0000-4000-8000-000000000067'
} as const;

export function competenceStatements(): string[] {
	const programme = quote(COMPETENCES.programme);
	return [
		// Whatever a run left: every statement on the two modules, and the member's memberships.
		`DELETE FROM competence WHERE module_id IN
		   ('${COMPETENCES.compulsory}', '${COMPETENCES.elective}');`,
		`DELETE FROM assignment WHERE instance_part_id = '${COMPETENCES.lecture}';`,
		`DELETE FROM course_instance WHERE id = '${COMPETENCES.instance}';`,

		`INSERT INTO programme (code, title) VALUES (${programme}, 'Kompetenz-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO spo (id, programme_id, version, valid_from, primuss_id)
		 SELECT '${COMPETENCES.spo}', id, 2025, '2025-10-01', '07-E2K-2025'
		   FROM programme WHERE code = ${programme}
		 ON CONFLICT (programme_id, version) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT m.id, p.id, m.name, 'SU_WITH_LAB', 'EVERY_SEMESTER', 4, 5
		   FROM programme p,
		        (VALUES ('${COMPETENCES.compulsory}'::uuid, ${quote(COMPETENCES.compulsoryName)}),
		                ('${COMPETENCES.elective}'::uuid, ${quote(COMPETENCES.electiveName)})) AS m(id, name)
		  WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		// Compulsory is "is_duty under some regulations" — the only thing that makes the first
		// module count towards the minimum and the second not.
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, source_rows,
		                              min_programme_semester)
		 VALUES ('${COMPETENCES.compulsory}', '${COMPETENCES.spo}', true, ARRAY['E2K-01'], 1, 1)
		 ON CONFLICT DO NOTHING;`,

		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${COMPETENCES.subjectGroup}', ${quote(COMPETENCES.subjectGroupCode)},
		         'Kompetenz-Testfachgruppe')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${COMPETENCES.compulsory}', '${COMPETENCES.subjectGroup}'),
		        ('${COMPETENCES.elective}', '${COMPETENCES.subjectGroup}')
		 ON CONFLICT (module_id) DO UPDATE SET subject_group_id = EXCLUDED.subject_group_id;`,

		// Neun is a member; Drei leads the group.
		`INSERT INTO person_subject_group (person_id, subject_group_id)
		 SELECT id, '${COMPETENCES.subjectGroup}' FROM person WHERE mail = 'prof.neun@example.org'
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO person_subject_group_scope (person_id, role, subject_group_id)
		 SELECT id, 'SUBJECT_GROUP_LEAD', '${COMPETENCES.subjectGroup}' FROM person
		  WHERE mail = 'prof.drei@example.org'
		 ON CONFLICT DO NOTHING;`,

		// Needs the assignment fixture's semester, which is seeded before this.
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${COMPETENCES.instance}', s.id, '${COMPETENCES.compulsory}', pr.id, 'A', 1
		   FROM semester s, programme pr
		  WHERE s.code = ${quote(ASSIGNMENTS.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
		 VALUES ('${COMPETENCES.lecture}', '${COMPETENCES.instance}', 'LECTURE', 0, 4);`,

		// A lecturer on contract without an address — nobody can sign in as her, so the lead
		// enters for her. Outside FK07, so the admission screen's pre-filter keeps her out of the
		// lists another spec counts.
		`INSERT INTO teacher (id, full_name, short_name, is_lecturer_on_contract, active, faculty)
		 VALUES ('${COMPETENCES.teacher}', ${quote(COMPETENCES.teacherName)},
		         'Lehrbeauftragte, Kompetenz', true, true, 'EXT')
		 ON CONFLICT (id) DO NOTHING;`
	];
}

/**
 * The setup fixture: a subject group of its own with one compulsory and one elective module, for
 * the newcomer to join. One compulsory module on purpose — fewer than the faculty's three, so the
 * card has to cap the minimum to be completable at all. Under the competence fixture's
 * regulations, which are seeded just before; nobody leads the group, which no spec counts.
 */
export const SETUP = {
	subjectGroup: '0e2e0000-0000-4000-8000-0000000000e1',
	subjectGroupName: 'Einrichtungs-Testfachgruppe',
	compulsory: '0e2e0000-0000-4000-8000-0000000000e2',
	compulsoryName: 'E2E Einrichtungsmodul',
	elective: '0e2e0000-0000-4000-8000-0000000000e3'
} as const;

export function setupStatements(): string[] {
	const programme = quote(COMPETENCES.programme);
	return [
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT m.id, p.id, m.name, 'SU_WITH_LAB', 'EVERY_SEMESTER', 4, 5
		   FROM programme p,
		        (VALUES ('${SETUP.compulsory}'::uuid, ${quote(SETUP.compulsoryName)}),
		                ('${SETUP.elective}'::uuid, 'E2E Einrichtungs-Wahlmodul')) AS m(id, name)
		  WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO module_offering (module_id, spo_id, is_duty, module_codes, source_rows,
		                              min_programme_semester)
		 VALUES ('${SETUP.compulsory}', '${COMPETENCES.spo}', true, ARRAY['E2K-11'], 1, 1)
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${SETUP.subjectGroup}', 'E2EEINR', ${quote(SETUP.subjectGroupName)})
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${SETUP.compulsory}', '${SETUP.subjectGroup}'),
		        ('${SETUP.elective}', '${SETUP.subjectGroup}')
		 ON CONFLICT (module_id) DO UPDATE SET subject_group_id = EXCLUDED.subject_group_id;`
	];
}

/**
 * The assignment fixture: a semester in the assignment phase, one cohort with three parts.
 *
 * Its own programme, subject group, semester and module — not the wish fixture's. The reason is
 * the collision the wish fixture ran into and wrote down: a fixture that grants somebody a
 * permission needs a subject nobody else is asserting about. Here it is doubly so, because the
 * *phase* is part of what this fixture asserts: the wish screen needs its semester in WISHES and
 * this one needs its own in ASSIGNMENT, and one semester cannot be both.
 *
 * Three parts rather than two, so that "Praktikum 1" and "Praktikum 2" exist and the numbering
 * rule has something to be right about.
 *
 * The dean's office has registered interest, so the candidate list has the thing that makes this screen
 * worth having: the wish is next to the row it is about. Why that persona and not Eins is argued
 * at the statement itself.
 */
export const ASSIGNMENTS = {
	semester: '2033-SS',
	programme: 'E2Z',
	subjectGroup: '0e2e0000-0000-4000-8000-000000000051',
	subjectGroupCode: 'E2EZFG',
	module: '0e2e0000-0000-4000-8000-000000000052',
	instance: '0e2e0000-0000-4000-8000-000000000053',
	lecture: '0e2e0000-0000-4000-8000-000000000054',
	labOne: '0e2e0000-0000-4000-8000-000000000055',
	labTwo: '0e2e0000-0000-4000-8000-000000000056',
	moduleName: 'E2E Zuteilungsmodul'
} as const;

export function assignmentStatements(): string[] {
	const programme = quote(ASSIGNMENTS.programme);

	return [
		// Whatever a failed run left, innermost first: an assignment holds its part with
		// ON DELETE RESTRICT and a wish holds its instance the same way.
		`DELETE FROM assignment WHERE instance_part_id IN
		   ('${ASSIGNMENTS.lecture}', '${ASSIGNMENTS.labOne}', '${ASSIGNMENTS.labTwo}');`,
		`DELETE FROM wish WHERE course_instance_id = '${ASSIGNMENTS.instance}';`,
		`DELETE FROM course_instance WHERE id = '${ASSIGNMENTS.instance}';`,
		// The wish window too, and it is easy to forget because it is not reachable from the
		// instance: it hangs off the semester and the subject group, so nothing above cascades to
		// it. A run that shut the round and stopped left every later run starting from shut.
		`DELETE FROM wish_window WHERE subject_group_id = '${ASSIGNMENTS.subjectGroup}';`,
		`DELETE FROM demand_completion WHERE programme_id IN
		   (SELECT id FROM programme WHERE code = ${quote(ASSIGNMENTS.programme)});`,

		`INSERT INTO semester (code, phase) VALUES (${quote(ASSIGNMENTS.semester)}, 'ASSIGNMENT')
		 ON CONFLICT (code) DO UPDATE
		    SET phase = 'ASSIGNMENT', assignments_published_at = NULL, wishes_published_at = NULL;`,

		`INSERT INTO programme (code, title) VALUES (${programme}, 'Zuteilungs-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${ASSIGNMENTS.module}', id, ${quote(ASSIGNMENTS.moduleName)}, 'SU_WITH_LAB',
		        'EVERY_SEMESTER', 6, 5 FROM programme WHERE code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${ASSIGNMENTS.subjectGroup}', ${quote(ASSIGNMENTS.subjectGroupCode)},
		         'Zuteilungs-Testfachgruppe')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${ASSIGNMENTS.module}', '${ASSIGNMENTS.subjectGroup}')
		 ON CONFLICT (module_id) DO UPDATE SET subject_group_id = EXCLUDED.subject_group_id;`,

		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${ASSIGNMENTS.instance}', s.id, '${ASSIGNMENTS.module}', pr.id, 'A', 2
		   FROM semester s, programme pr
		  WHERE s.code = ${quote(ASSIGNMENTS.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
		 VALUES ('${ASSIGNMENTS.lecture}', '${ASSIGNMENTS.instance}', 'LECTURE', 0, 4),
		        ('${ASSIGNMENTS.labOne}', '${ASSIGNMENTS.instance}', 'LAB', 1, 2),
		        ('${ASSIGNMENTS.labTwo}', '${ASSIGNMENTS.instance}', 'LAB', 2, 2);`,

		// Drei leads this subject group and is the persona this screen is for: permitted inside
		// it, and nowhere else.
		`INSERT INTO person_subject_group_scope (person_id, role, subject_group_id)
		 SELECT p.id, 'SUBJECT_GROUP_LEAD', '${ASSIGNMENTS.subjectGroup}' FROM person p
		  WHERE p.mail = 'prof.drei@example.org'
		 ON CONFLICT DO NOTHING;`,

		// Somebody would like to teach it. The candidate list reads this, which is the point of
		// the screen: the decision is taken from the wishes rather than beside them.
		//
		// **Fuenf and not Eins**, and that is a collision this fixture caused the first time
		// round. "Meine Eintragungen" on the wish screen spans *every* semester, so a wish given
		// to Eins here added a summary block to a page three files away and moved the table the
		// wish spec locates by position. The rule the wish fixture already wrote down — a fixture
		// that grants a permission needs a subject nobody else asserts about — turns out to hold
		// for wishes as well: a fixture that gives somebody a row changes every page that lists
		// their rows.
		`INSERT INTO wish (course_instance_id, person_id, priority, note)
		 SELECT '${ASSIGNMENTS.instance}', p.id, 1, 'gerne die Vorlesung' FROM person p
		  WHERE p.mail = 'dekanat@example.org'
		 ON CONFLICT DO NOTHING;`
	];
}

/**
 * The degree fixture: one module, one subject group, three programmes — a bachelor's, a master's
 * and one nobody has recorded a degree for — each with a cohort of the module in the assignment
 * fixture's semester.
 *
 * Its own subject group and module rather than more cohorts on the assignment fixture: that spec
 * finds its dropdowns by the module's name, and a second cohort would make every one of those
 * locators ambiguous. The three programmes are what the filter and the grouping by programme are
 * about; the unrecorded one is what the notice is about.
 *
 * Seeded after the assignment fixture, whose semester it uses.
 */
export const DEGREES = {
	semester: ASSIGNMENTS.semester,
	bachelor: 'E2B',
	master: 'E2M',
	unrecorded: 'E2O',
	subjectGroup: '0e2e0000-0000-4000-8000-0000000000d1',
	subjectGroupCode: 'E2EDFG',
	module: '0e2e0000-0000-4000-8000-0000000000d2',
	instances: {
		E2B: '0e2e0000-0000-4000-8000-0000000000d3',
		E2M: '0e2e0000-0000-4000-8000-0000000000d4',
		E2O: '0e2e0000-0000-4000-8000-0000000000d5'
	},
	parts: {
		E2B: '0e2e0000-0000-4000-8000-0000000000d6',
		E2M: '0e2e0000-0000-4000-8000-0000000000d7',
		E2O: '0e2e0000-0000-4000-8000-0000000000d8'
	},
	moduleName: 'E2E Abschlussmodul'
} as const;

export function degreeStatements(): string[] {
	const programmes = [
		{ code: DEGREES.bachelor, title: 'Bachelor-Teststudiengang', degree: "'BACHELOR'" },
		{ code: DEGREES.master, title: 'Master-Teststudiengang', degree: "'MASTER'" },
		{ code: DEGREES.unrecorded, title: 'Teststudiengang ohne Abschluss', degree: 'NULL' }
	] as const;
	const instances = Object.values(DEGREES.instances)
		.map((id) => `'${id}'`)
		.join(', ');

	return [
		// Whatever a failed run left, innermost first: an assignment holds its part.
		`DELETE FROM assignment WHERE instance_part_id IN
		   (SELECT id FROM instance_part WHERE course_instance_id IN (${instances}));`,
		`DELETE FROM course_instance WHERE id IN (${instances});`,

		// The degree is set on every run, not only on the first: the programmes spec records and
		// takes back degrees, and a run it stopped half-way must not leave this fixture changed.
		...programmes.map(
			(p) =>
				`INSERT INTO programme (code, title, degree)
				 VALUES (${quote(p.code)}, ${quote(p.title)}, ${p.degree})
				 ON CONFLICT (code) DO UPDATE SET degree = EXCLUDED.degree;`
		),
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${DEGREES.module}', id, ${quote(DEGREES.moduleName)}, 'SU',
		        'EVERY_SEMESTER', 4, 5 FROM programme WHERE code = ${quote(DEGREES.bachelor)}
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${DEGREES.subjectGroup}', ${quote(DEGREES.subjectGroupCode)},
		         'Abschluss-Testfachgruppe')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${DEGREES.module}', '${DEGREES.subjectGroup}')
		 ON CONFLICT (module_id) DO UPDATE SET subject_group_id = EXCLUDED.subject_group_id;`,

		...programmes.flatMap((p) => [
			`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
			                              programme_semester)
			 SELECT '${DEGREES.instances[p.code]}', s.id, '${DEGREES.module}', pr.id, '', 1
			   FROM semester s, programme pr
			  WHERE s.code = ${quote(DEGREES.semester)} AND pr.code = ${quote(p.code)};`,
			`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
			 VALUES ('${DEGREES.parts[p.code]}', '${DEGREES.instances[p.code]}', 'LECTURE', 0, 4);`
		])
	];
}

/**
 * The wish fixture: a semester in the wish phase, holding one instance with two parts.
 *
 * On the **second** study programme, so that the demand reset — which deletes every instance of
 * the first — cannot reach it. An instance somebody has registered interest in cannot be deleted
 * at all, so sharing a programme would make the two specs fail each other.
 *
 * The two leads are the point of the fixture rather than decoration: Vier leads the programme the
 * instance belongs to, Drei leads the subject group its module is in. They are the two orthogonal
 * ways to be responsible for a wish, and the spec asserts each of them separately.
 */
export function wishStatements(): string[] {
	const programme = quote(WISHES.programme);

	return [
		// Whatever a failed run left. The wishes first — course_instance_id is ON DELETE RESTRICT,
		// so the instance below cannot go while one stands.
		`DELETE FROM wish WHERE course_instance_id IN
		   ('${WISHES.instance}', '${WISHES.laterInstance}');`,
		`DELETE FROM course_instance WHERE id IN
		   ('${WISHES.instance}', '${WISHES.laterInstance}');`,

		`INSERT INTO semester (code, phase) VALUES (${quote(WISHES.semester)}, 'WISHES')
		 ON CONFLICT (code) DO UPDATE SET phase = 'WISHES', wishes_published_at = NULL;`,
		`INSERT INTO semester (code, phase) VALUES (${quote(WISHES.laterSemester)}, 'WISHES')
		 ON CONFLICT (code) DO UPDATE SET phase = 'WISHES', wishes_published_at = NULL;`,

		`INSERT INTO programme (code, title) VALUES (${programme}, 'Wunsch-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${WISHES.module}', id, 'E2E Fachmodul', 'SU_WITH_LAB',
		        'EVERY_SEMESTER', 4, 5 FROM programme WHERE code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${WISHES.subjectGroup}', ${quote(WISHES.subjectGroupCode)}, 'Testfachgruppe')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${WISHES.module}', '${WISHES.subjectGroup}')
		 ON CONFLICT (module_id) DO UPDATE SET subject_group_id = EXCLUDED.subject_group_id;`,

		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${WISHES.instance}', s.id, '${WISHES.module}', pr.id, '', 3
		   FROM semester s, programme pr
		  WHERE s.code = ${quote(WISHES.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
		 VALUES ('${WISHES.lecture}', '${WISHES.instance}', 'LECTURE', 0, 2),
		        ('${WISHES.lab}', '${WISHES.instance}', 'LAB', 1, 2);`,

		// The same module, offered again a year later. What "über alle Semester" is about.
		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${WISHES.laterInstance}', s.id, '${WISHES.module}', pr.id, '', 3
		   FROM semester s, programme pr
		  WHERE s.code = ${quote(WISHES.laterSemester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
		 VALUES ('${WISHES.laterLecture}', '${WISHES.laterInstance}', 'LECTURE', 0, 2);`,

		// Vier leads the programme this instance belongs to; Drei leads the subject group its
		// module is in. Two orthogonal ways to be responsible for the same wish.
		`INSERT INTO person_programme_scope (person_id, role, programme_id)
		 SELECT p.id, 'PROGRAMME_LEAD', pr.id FROM person p, programme pr
		  WHERE p.mail = 'prof.vier@example.org' AND pr.code = ${programme}
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO person_subject_group_scope (person_id, role, subject_group_id)
		 SELECT p.id, 'SUBJECT_GROUP_LEAD', '${WISHES.subjectGroup}' FROM person p
		  WHERE p.mail = 'prof.drei@example.org'
		 ON CONFLICT DO NOTHING;`,
		// Eins works in that subject group, so the wish screen has something under "my subjects".
		`INSERT INTO person_subject_group (person_id, subject_group_id)
		 SELECT p.id, '${WISHES.subjectGroup}' FROM person p
		  WHERE p.mail = 'prof.eins@example.org'
		 ON CONFLICT DO NOTHING;`
	];
}

/**
 * The filing fixture: a subject group lead filing modules into her own group and releasing them.
 *
 * Three modules, one for each answer the rule gives a lead — one in no group (she may pull it
 * in), one in her group (she may release it), one in a colleague's group (she may do nothing to
 * it). Drei leads `own`; nobody leads `foreign`, which is enough: what makes it foreign is that
 * she does not.
 *
 * Its own programme, groups and modules, for the reason the assignment fixture gives. The module
 * names start with `E2F` so that they sort after the catalogue fixture's `E2E …` modules: the
 * subject group spec files whichever module its work list offers first, and that must not be one
 * of these.
 */
export const FILING = {
	programme: 'E2F',
	ownGroup: '0e2e0000-0000-4000-8000-000000000071',
	ownGroupCode: 'E2FEIGEN',
	ownGroupName: 'E2F Eigene Fachgruppe',
	foreignGroup: '0e2e0000-0000-4000-8000-000000000072',
	foreignGroupCode: 'E2FFREMD',
	foreignGroupName: 'E2F Fremde Fachgruppe',
	unfiled: '0e2e0000-0000-4000-8000-000000000073',
	unfiledName: 'E2F Modul ohne Fachgruppe',
	own: '0e2e0000-0000-4000-8000-000000000074',
	ownName: 'E2F Modul der eigenen Fachgruppe',
	foreign: '0e2e0000-0000-4000-8000-000000000075',
	foreignName: 'E2F Modul einer fremden Fachgruppe',
	/**
	 * The module the subject group lead states the split of. Its own row and never refiled, so
	 * the filing tests can move the other three while the split test writes this one.
	 */
	splittable: '0e2e0000-0000-4000-8000-000000000076',
	splittableName: 'E2F Modul zum Aufteilen',
	/** In the same group and never written: the row on which "eintragen" has to be a link. */
	linkable: '0e2e0000-0000-4000-8000-000000000077',
	linkableName: 'E2F Modul mit offener Aufteilung'
} as const;

export function filingStatements(): string[] {
	const programme = quote(FILING.programme);
	return [
		`INSERT INTO programme (code, title) VALUES (${programme}, 'Einsortier-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT m.id, p.id, m.name, 'SU_WITH_LAB', 'EVERY_SEMESTER', 4, 5
		   FROM programme p,
		        (VALUES ('${FILING.unfiled}'::uuid, ${quote(FILING.unfiledName)}),
		                ('${FILING.own}'::uuid, ${quote(FILING.ownName)}),
		                ('${FILING.foreign}'::uuid, ${quote(FILING.foreignName)}),
		                ('${FILING.splittable}'::uuid, ${quote(FILING.splittableName)}),
		                ('${FILING.linkable}'::uuid, ${quote(FILING.linkableName)})) AS m(id, name)
		  WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${FILING.ownGroup}', ${quote(FILING.ownGroupCode)}, ${quote(FILING.ownGroupName)}),
		        ('${FILING.foreignGroup}', ${quote(FILING.foreignGroupCode)}, ${quote(FILING.foreignGroupName)})
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO person_subject_group_scope (person_id, role, subject_group_id)
		 SELECT id, 'SUBJECT_GROUP_LEAD', '${FILING.ownGroup}' FROM person
		  WHERE mail = 'prof.drei@example.org'
		 ON CONFLICT DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${FILING.splittable}', '${FILING.ownGroup}'), ('${FILING.linkable}', '${FILING.ownGroup}')
		 ON CONFLICT DO NOTHING;`,
		// The split the subject group lead states is cleared at the start of every run, so the
		// second run asserts the same thing the first one did.
		`DELETE FROM module_component WHERE module_id = '${FILING.splittable}';`,
		filingResetSql()
	];
}

/** Puts the three modules back where the fixture says they are. The spec runs it before each test. */
export function filingResetSql(): string {
	return `DELETE FROM module_subject_group
	         WHERE module_id IN ('${FILING.unfiled}', '${FILING.own}', '${FILING.foreign}');
	        INSERT INTO module_subject_group (module_id, subject_group_id)
	        VALUES ('${FILING.own}', '${FILING.ownGroup}'),
	               ('${FILING.foreign}', '${FILING.foreignGroup}');`;
}

/**
 * The fixture for dividing a part: one cohort of 4 + 4 hours, and one another faculty teaches
 * entirely.
 *
 * Its own programme, subject group and modules, for the reason the assignment fixture gives: a
 * fixture that gives somebody a row changes every page that lists their rows. The semester is the
 * assignment fixture's, because the phase it needs is the same, and the tab is a different one.
 */
export const DIVIDED = {
	semester: ASSIGNMENTS.semester,
	programme: 'E2T',
	subjectGroup: '0e2e0000-0000-4000-8000-000000000081',
	subjectGroupCode: 'E2EAFG',
	module: '0e2e0000-0000-4000-8000-000000000082',
	moduleName: 'E2E Aufteilungsmodul',
	instance: '0e2e0000-0000-4000-8000-000000000083',
	lecture: '0e2e0000-0000-4000-8000-000000000084',
	lab: '0e2e0000-0000-4000-8000-000000000085',
	elsewhereModule: '0e2e0000-0000-4000-8000-000000000086',
	elsewhereName: 'E2E Modul der Nachbarfakultät',
	elsewhereInstance: '0e2e0000-0000-4000-8000-000000000087',
	elsewherePart: '0e2e0000-0000-4000-8000-000000000088'
} as const;

export function dividedStatements(): string[] {
	const programme = quote(DIVIDED.programme);
	const instances = `'${DIVIDED.instance}', '${DIVIDED.elsewhereInstance}'`;
	return [
		// Whatever a run left: assignments on any part of the two cohorts, pieces included, then
		// the cohorts, whose parts cascade.
		`DELETE FROM assignment WHERE instance_part_id IN
		   (SELECT id FROM instance_part WHERE course_instance_id IN (${instances}));`,
		`DELETE FROM wish WHERE course_instance_id IN (${instances});`,
		`DELETE FROM course_instance WHERE id IN (${instances});`,

		`INSERT INTO semester (code, phase) VALUES (${quote(DIVIDED.semester)}, 'ASSIGNMENT')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO programme (code, title) VALUES (${programme}, 'Aufteilungs-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT m.id, p.id, m.name, 'SU_WITH_LAB', 'EVERY_SEMESTER', 4, 5
		   FROM programme p,
		        (VALUES ('${DIVIDED.module}'::uuid, ${quote(DIVIDED.moduleName)}),
		                ('${DIVIDED.elsewhereModule}'::uuid, ${quote(DIVIDED.elsewhereName)}))
		          AS m(id, name)
		  WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO subject_group (id, code, name)
		 VALUES ('${DIVIDED.subjectGroup}', ${quote(DIVIDED.subjectGroupCode)},
		         'Aufteilungs-Testfachgruppe')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module_subject_group (module_id, subject_group_id)
		 VALUES ('${DIVIDED.module}', '${DIVIDED.subjectGroup}'),
		        ('${DIVIDED.elsewhereModule}', '${DIVIDED.subjectGroup}')
		 ON CONFLICT (module_id) DO UPDATE SET subject_group_id = EXCLUDED.subject_group_id;`,

		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT c.id, s.id, c.module, pr.id, '', 3
		   FROM semester s, programme pr,
		        (VALUES ('${DIVIDED.instance}'::uuid, '${DIVIDED.module}'::uuid),
		                ('${DIVIDED.elsewhereInstance}'::uuid, '${DIVIDED.elsewhereModule}'::uuid))
		          AS c(id, module)
		  WHERE s.code = ${quote(DIVIDED.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours, taught_by)
		 VALUES ('${DIVIDED.lecture}', '${DIVIDED.instance}', 'LECTURE', 0, 4, NULL),
		        ('${DIVIDED.lab}', '${DIVIDED.instance}', 'LAB', 1, 4, NULL),
		        ('${DIVIDED.elsewherePart}', '${DIVIDED.elsewhereInstance}', 'LECTURE', 0, 2, 'FK 06');`,

		`INSERT INTO person_subject_group_scope (person_id, role, subject_group_id)
		 SELECT id, 'SUBJECT_GROUP_LEAD', '${DIVIDED.subjectGroup}' FROM person
		  WHERE mail = 'prof.drei@example.org'
		 ON CONFLICT DO NOTHING;`,
		// A candidate for the cohort's dropdown. Fuenf, for the reason the assignment fixture
		// gives: nobody asserts about Fuenf's own entries.
		`INSERT INTO wish (course_instance_id, person_id, priority, note)
		 SELECT '${DIVIDED.instance}', p.id, 1, '' FROM person p
		  WHERE p.mail = 'dekanat@example.org'
		 ON CONFLICT DO NOTHING;`
	];
}

/**
 * The split fixture: a module whose split is about to be corrected, with one cohort that holds the
 * old one — a lecture of 2 and two laboratory groups of 2. Its own programme and ids, so nothing
 * else on the page or in another spec moves when the split does.
 */
export const SPLIT = {
	semester: ASSIGNMENTS.semester,
	programme: 'E2W',
	module: '0e2e0000-0000-4000-8000-0000000000c1',
	moduleName: 'E2E Aufteilung übertragen',
	instance: '0e2e0000-0000-4000-8000-0000000000c2'
} as const;

export function splitStatements(): string[] {
	const programme = quote(SPLIT.programme);
	return [
		`DELETE FROM course_instance WHERE id = '${SPLIT.instance}';`,
		`DELETE FROM module_component WHERE module_id = '${SPLIT.module}';`,

		`INSERT INTO semester (code, phase) VALUES (${quote(SPLIT.semester)}, 'ASSIGNMENT')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO programme (code, title) VALUES (${programme}, 'Aufteilungsübertrag-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${SPLIT.module}', p.id, ${quote(SPLIT.moduleName)}, 'SU_WITH_LAB', 'EVERY_SEMESTER', 4, 5
		   FROM programme p WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO module_component (module_id, kind, teaching_hours, position)
		 VALUES ('${SPLIT.module}', 'LECTURE', 2, 0), ('${SPLIT.module}', 'LAB', 2, 1);`,

		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${SPLIT.instance}', s.id, '${SPLIT.module}', pr.id, '', 2
		   FROM semester s, programme pr
		  WHERE s.code = ${quote(SPLIT.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (course_instance_id, kind, position, teaching_hours)
		 VALUES ('${SPLIT.instance}', 'LECTURE', 0, 2),
		        ('${SPLIT.instance}', 'LAB', 1, 2),
		        ('${SPLIT.instance}', 'LAB', 2, 2);`
	];
}

/**
 * A split corrected after the instance was declared, seen from the demand page.
 *
 * The reported case: lecture 2 + lab 2 in the split, while the instance still holds lecture 2 and
 * two labs of 4 from an earlier split — 10 SWS stored, 6 by the split. Its own programme, module
 * and ids, so that nothing the module page's split test does can meet it; Vier leads the
 * programme, which is the person the gap was reported by.
 */
export const DEMAND_SPLIT = {
	semester: ASSIGNMENTS.semester,
	programme: 'E2A',
	module: '0e2e0000-0000-4000-8000-0000000000f1',
	moduleName: 'E2E Aufteilung im Bedarf nachgezogen',
	instance: '0e2e0000-0000-4000-8000-0000000000f2'
} as const;

export function demandSplitStatements(): string[] {
	const programme = quote(DEMAND_SPLIT.programme);
	return [
		`DELETE FROM course_instance WHERE id = '${DEMAND_SPLIT.instance}';`,
		`DELETE FROM module_component WHERE module_id = '${DEMAND_SPLIT.module}';`,

		`INSERT INTO semester (code, phase) VALUES (${quote(DEMAND_SPLIT.semester)}, 'ASSIGNMENT')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO programme (code, title) VALUES (${programme}, 'Bedarfsaufteilung-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${DEMAND_SPLIT.module}', p.id, ${quote(DEMAND_SPLIT.moduleName)}, 'SU_WITH_LAB',
		        'EVERY_SEMESTER', 4, 5
		   FROM programme p WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		`INSERT INTO module_component (module_id, kind, teaching_hours, position)
		 VALUES ('${DEMAND_SPLIT.module}', 'LECTURE', 2, 0), ('${DEMAND_SPLIT.module}', 'LAB', 2, 1);`,

		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT '${DEMAND_SPLIT.instance}', s.id, '${DEMAND_SPLIT.module}', pr.id, '', 2
		   FROM semester s, programme pr
		  WHERE s.code = ${quote(DEMAND_SPLIT.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (course_instance_id, kind, position, teaching_hours)
		 VALUES ('${DEMAND_SPLIT.instance}', 'LECTURE', 0, 2),
		        ('${DEMAND_SPLIT.instance}', 'LAB', 1, 4),
		        ('${DEMAND_SPLIT.instance}', 'LAB', 2, 4);`,

		`INSERT INTO person_programme_scope (person_id, role, programme_id)
		 SELECT p.id, 'PROGRAMME_LEAD', pr.id FROM person p, programme pr
		  WHERE p.mail = 'prof.vier@example.org' AND pr.code = ${programme}
		 ON CONFLICT DO NOTHING;`
	];
}

/**
 * A module over two semesters: 8 SWS in the catalogue as SU mit Übung, taught 2 + 2 in each
 * semester. No split yet, so the page proposes one — and what it proposes depends on the mark.
 */
export const TWO_SEMESTERS = {
	programme: 'E2V',
	module: '0e2e0000-0000-4000-8000-0000000000c3',
	moduleName: 'E2E Modul über zwei Semester'
} as const;

export function twoSemesterStatements(): string[] {
	const programme = quote(TWO_SEMESTERS.programme);
	return [
		`DELETE FROM module_component WHERE module_id = '${TWO_SEMESTERS.module}';`,
		`INSERT INTO programme (code, title) VALUES (${programme}, 'Zwei-Semester-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT '${TWO_SEMESTERS.module}', p.id, ${quote(TWO_SEMESTERS.moduleName)},
		        'SU_WITH_EXERCISE', 'EVERY_SEMESTER', 8, 10
		   FROM programme p WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,
		`UPDATE module SET semester_span = 1 WHERE id = '${TWO_SEMESTERS.module}';`
	];
}

/**
 * The sorting fixture: two modules on the wish screen, so a column head has an order to change.
 *
 * Its own semester and programme, for the reason the assignment fixture gives — the wish fixture
 * has exactly one module, and its spec asserts that. Alpha comes first in the page's own order and
 * costs less; Omega comes last and costs more, so every sort visibly turns the two round.
 *
 * Eins registers for Omega in the spec, and Zwei must not be able to tell from the order.
 */
export const SORTING = {
	semester: '2035-SS',
	programme: 'E2S',
	alpha: '0e2e0000-0000-4000-8000-000000000091',
	alphaName: 'E2S Alpha',
	omega: '0e2e0000-0000-4000-8000-000000000092',
	omegaName: 'E2S Omega',
	alphaInstance: '0e2e0000-0000-4000-8000-000000000093',
	omegaInstance: '0e2e0000-0000-4000-8000-000000000094',
	alphaPart: '0e2e0000-0000-4000-8000-000000000095',
	omegaPart: '0e2e0000-0000-4000-8000-000000000096'
} as const;

export function sortingStatements(): string[] {
	const programme = quote(SORTING.programme);
	const instances = `'${SORTING.alphaInstance}', '${SORTING.omegaInstance}'`;
	return [
		`DELETE FROM wish WHERE course_instance_id IN (${instances});`,
		`DELETE FROM course_instance WHERE id IN (${instances});`,

		`INSERT INTO semester (code, phase) VALUES (${quote(SORTING.semester)}, 'WISHES')
		 ON CONFLICT (code) DO UPDATE SET phase = 'WISHES', wishes_published_at = NULL;`,
		`INSERT INTO programme (code, title) VALUES (${programme}, 'Sortier-Teststudiengang')
		 ON CONFLICT (code) DO NOTHING;`,
		`INSERT INTO module (id, home_programme_id, name, course_type, frequency,
		                     contact_hours_per_week, credits)
		 SELECT m.id, p.id, m.name, 'SU_WITH_LAB', 'EVERY_SEMESTER', 4, 5
		   FROM programme p,
		        (VALUES ('${SORTING.alpha}'::uuid, ${quote(SORTING.alphaName)}),
		                ('${SORTING.omega}'::uuid, ${quote(SORTING.omegaName)}))
		          AS m(id, name)
		  WHERE p.code = ${programme}
		 ON CONFLICT (id) DO NOTHING;`,

		`INSERT INTO course_instance (id, semester_id, module_id, programme_id, track,
		                              programme_semester)
		 SELECT c.id, s.id, c.module, pr.id, '', 3
		   FROM semester s, programme pr,
		        (VALUES ('${SORTING.alphaInstance}'::uuid, '${SORTING.alpha}'::uuid),
		                ('${SORTING.omegaInstance}'::uuid, '${SORTING.omega}'::uuid))
		          AS c(id, module)
		  WHERE s.code = ${quote(SORTING.semester)} AND pr.code = ${programme};`,
		`INSERT INTO instance_part (id, course_instance_id, kind, position, teaching_hours)
		 VALUES ('${SORTING.alphaPart}', '${SORTING.alphaInstance}', 'LECTURE', 0, 2),
		        ('${SORTING.omegaPart}', '${SORTING.omegaInstance}', 'LECTURE', 0, 4);`
	];
}
