/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/**
 * How the teaching of a module is broken up, as the catalogue describes it.
 *
 * The template a module's split is proposed from, and nothing more: it does not say how the hours
 * divide and it does not say how many parallel groups there are. The first is stated once per
 * module in `ModuleComponent`; the second is decided per instance.
 */
export type CourseType =
  /** The catalogue declining to say, for a slot whose content varies. Also the value anything unrecognised becomes. */
  | 'DEPENDS_ON_SUBJECT'
  /** An exercise class on its own. */
  | 'EXERCISE'
  /** A laboratory on its own. */
  | 'LAB'
  /** A project. */
  | 'PROJECT'
  /** Independent work — a thesis, a study project. Usually carries no hours per week at all. */
  | 'SELF_STUDY'
  /** A seminar. */
  | 'SEMINAR'
  /** Seminar-style teaching on its own. */
  | 'SU'
  /** Seminar-style teaching with an exercise class. */
  | 'SU_WITH_EXERCISE'
  /** Seminar-style teaching with a laboratory. The largest group in the catalogue. */
  | 'SU_WITH_LAB';

/** One row of a demand table: this module, in these cohorts. */
export type DemandEntryInput = {
  /** The module this row is about. */
  moduleId: string | number;
  /**
   * The cohort year for every cohort of this module, or `null` to leave what is stored — and, for a
   * new instance, to take what the regulations say.
   */
  programmeSemester?: number | null | undefined;
  /**
   * The cohorts to offer. **An empty list is the row whose tick was taken away** and means the
   * module is not offered — its instances are withdrawn.
   *
   * That is the whole difference between "leave it alone" and "withdraw it": a module the call does
   * not mention at all is untouched.
   */
  tracks?: Array<DemandTrackInput>;
};

/** One cohort of a module, on the way in: a letter and a number of parallel groups. */
export type DemandTrackInput = {
  /**
   * How many parallel groups of the practical unit this cohort runs — laboratories, exercises, or
   * the seminar of a module that is nothing else.
   *
   * A module that is nothing but a lecture has no such unit, and there this figure has no effect
   * rather than being an error: a screen that sends the same number for every row must not fail on
   * the one it cannot apply to.
   */
  groups?: number;
  /**
   * The cohort letter — the A in IF3A — or empty for a module that runs once.
   *
   * Upper-cased and trimmed for you. One to three characters.
   */
  track?: string;
};

/**
 * Whether a module is compulsory or elective in a study programme.
 *
 * Three-valued rather than a boolean, because asked about a programme without naming a version of
 * its regulations the honest answer is sometimes neither. Measured over the whole catalogue, four
 * modules are compulsory under one version and elective under another — picking one silently would
 * be wrong for those four and unexplainable to whoever is looking at them.
 */
export type DutyStatus =
  /** Compulsory under every version of the regulations asked about. */
  | 'COMPULSORY'
  /** Elective under every version asked about. */
  | 'ELECTIVE'
  /** Compulsory under some versions and elective under others. */
  | 'MIXED';

/**
 * How often a module is offered.
 *
 * Useful as a filter: a module taught only in the summer is not a candidate for a winter
 * semester's demand, and 89 of them are. Three of the values say nothing about the term and
 * together are more than half the catalogue, so a term filter that hid them would remove most of
 * what somebody is looking for — see the note on `ModuleFilter.frequency`.
 */
export type Frequency =
  /**
   * Takes turns with other subjects of the same subject group. Which term it lands in is a
   * decision inside the group rather than a rule, so it is not a term restriction.
   */
  | 'ALTERNATING_WITHIN_SUBJECT_GROUP'
  /** Offered in both terms. */
  | 'EVERY_SEMESTER'
  /** Offered in summer terms only. */
  | 'EVERY_SUMMER_SEMESTER'
  /** Offered in winter terms only. */
  | 'EVERY_WINTER_SEMESTER'
  /** Offered when it is announced. The largest group in the catalogue. */
  | 'ON_ANNOUNCEMENT'
  /**
   * The catalogue says nothing, or says something this version of the software does not
   * recognise. The two are distinguished on the import page rather than here.
   */
  | 'UNKNOWN';

/**
 * One assignable unit of teaching.
 *
 * The same vocabulary describes a module's canonical split and the parts an actual offering runs,
 * because the second is made from the first. Two lists that had to agree without a compiler saying
 * so would drift.
 */
export type InstancePartKind =
  /** An exercise group. */
  | 'EXERCISE'
  /** A laboratory group. Usually the part that exists several times over. */
  | 'LAB'
  /** A lecture. The part that can be held once for several parallel cohorts. */
  | 'LECTURE'
  /** Anything the five above do not name. */
  | 'OTHER'
  /** A project group. */
  | 'PROJECT'
  /** A seminar group. */
  | 'SEMINAR';

/** One unit of a module's split, on the way in. */
export type ModuleComponentInput = {
  /** What kind of teaching this unit is. */
  kind: InstancePartKind;
  /** Hours per week for one unit of this kind. Greater than zero. */
  teachingHours: number;
};

/**
 * Which modules to list.
 *
 * An input type rather than separate arguments, unlike `people(search:, includeInactive:)`
 * elsewhere in this schema: six filters is past the point where positional arguments read, the set
 * will grow as subject groups and competences arrive, and an interface's form maps onto it field
 * for field.
 */
export type ModuleFilter = {
  /**
   * Compulsory or elective. Requires `programme`, and is ignored without it — the answer is a
   * property of a module *in a programme*, not of a module.
   */
  duty?: DutyStatus | null | undefined;
  /**
   * Keep only modules with one of these frequencies.
   *
   * To find what could run in a winter semester, ask for `EVERY_WINTER_SEMESTER`,
   * `EVERY_SEMESTER`, `ALTERNATING_WITHIN_SUBJECT_GROUP`, `ON_ANNOUNCEMENT` and `UNKNOWN` — the
   * last three say nothing about the term and are together more than half the catalogue, so
   * leaving them out hides far more than it removes.
   */
  frequency?: Array<Frequency> | null | undefined;
  /** Include modules the examination office has retired. About a hundred of them. */
  includeInactive?: boolean | null | undefined;
  /**
   * Relevant for this study programme, by its short code.
   *
   * Two things at once, and the second half is not redundant: the module counts in one of the
   * programme's sets of regulations, **or** the programme is its home. Twenty-six active modules
   * are only reachable through the second half, ten of them in the faculty's largest programme —
   * and the first thing somebody does is look for a module they are responsible for.
   */
  programme?: string | null | undefined;
  /** Only the modules this person is responsible for, by teacher id. */
  responsible?: string | number | null | undefined;
  /** A substring of the name or of one of the module codes. Case-insensitive. */
  search?: string | null | undefined;
  /**
   * Narrow to one version of the regulations.
   *
   * No default, deliberately. Unfiltered, a programme's list is the union over every version it
   * has: a module dropped from the newest one is still being taught to the students of the older.
   */
  spo?: string | number | null | undefined;
  /**
   * Keep only modules whose split nobody has confirmed yet — where `splitIsEstimated` is true.
   *
   * The work list. Planning works without it, because the proposal stands in; what this filter
   * finds is where the software is guessing and a person has not yet agreed. A bounded, finishable
   * task rather than an open form.
   */
  withoutComponents?: boolean | null | undefined;
};

/**
 * Where a semester stands in the planning process.
 *
 * The phase is stored and switched deliberately, never derived from the calendar. Dates slip,
 * and a process that moves on because a Tuesday arrived is one nobody trusts — this way the
 * switch is an act somebody performs, visibly and at a moment everyone can point at.
 *
 * A semester moves **one step at a time**, forwards or backwards. Backwards is the correction:
 * reopening a plan is a normal thing for a faculty to do, and it should happen in the tool rather
 * than around it.
 */
export type Phase =
  /** The subject group leads fill the instances. */
  | 'ASSIGNMENT'
  /** The programme leads declare which instances have to be offered. */
  | 'DEMAND_PLANNING'
  /** The plan stands. Changes from here on are corrections, not planning. */
  | 'FINAL'
  /**
   * Lecturers register interest. Entries are confidential until they are published
   * — which is a separate decision, see `wishesPublishedAt`.
   */
  | 'WISHES';

/**
 * A role somebody holds. Everybody holds `LECTURER`; the others come on top of it.
 *
 * The values are English. The interface shows the German terms the faculty uses: Dozent:in,
 * Fachgruppenleitung, Studiengangsleitung, Dekanat.
 */
export type Role =
  /** Administers people, roles and tokens. Not a reader of unpublished wishes. */
  | 'ADMIN'
  /** Reads across programmes for the import/export statistics, keeps the teaching-load traffic light. */
  | 'DEANS_OFFICE'
  /** Teaches, keeps a profile and a competence profile, registers interest in instances. */
  | 'LECTURER'
  /** Declares the demand of one study programme: which instances are needed, and the catalogues. */
  | 'PROGRAMME_LEAD'
  /** Assigns the instances of one subject group. */
  | 'SUBJECT_GROUP_LEAD';

/**
 * The part of the API a scope refers to.
 *
 * Deliberately coarse: these are meant to be ticked in a dialog by somebody whose mind is on the
 * evaluation script they are about to write.
 */
export type ScopeArea =
  /**
   * Running the installation: user and role administration, and the module import. Also
   * `@interactiveOnly`, for the same reason.
   *
   * The import is here rather than under `PLANNING` because what these fields expose is the
   * operation — did the nightly job run, what did it change, run it now, what did it make of the
   * untidy parts — and not the catalogue it produces. The catalogue itself is planning data and
   * lives under `PLANNING`. An area of its own was considered and rejected: every field it could
   * hold is unreachable through a token anyway, so it would be a promise in an enum that
   * colleagues can read via introspection and never use.
   *
   * Fields: `people`, `person`, `roleGrants`, `diagnoseAccess`, `teacherAccounts`,
   * `createPerson`, `renamePerson`, `setPersonRoles`, `setPersonActive`, `setPersonProgrammes`,
   * `setTeacherAdmitted`, `zpaSyncRuns`, `zpaSyncRun`, `zpaChanges`, `zpaCatalogueProjections`,
   * `syncZpaNow`, `projectZpaCatalogue`.
   */
  | 'ADMIN'
  /**
   * The planning process: which semesters exist, where each one stands, and — as they arrive —
   * the demand, the assignments and the statistics.
   *
   * The first area worth narrowing a token to. `PUBLIC` and `PROFILE` are you describing
   * yourself; `TOKENS` and `ADMIN` are unreachable through a token at all.
   *
   * Fields: `semesters`, `semester`, `programmes`, `programme`, `modules`, `module`, `teachers`,
   * `courseInstances`, `courseInstance`, `advanceSemesterPhase`, `publishWishes`,
   * `setModuleComponents`, `declareCourseInstance`, `duplicateCourseInstance`,
   * `changeCourseInstance`, `withdrawCourseInstance`, `addInstancePart`, `changeInstancePart`,
   * `removeInstancePart`, `shareInstancePartAcrossTracks`, `splitInstancePartAcrossTracks`,
   * `copyDemandFromSemester`, `planDemand`.
   */
  | 'PLANNING'
  /**
   * Your own identity and session: who you are, which roles you hold, and which of them you are
   * being judged by.
   *
   * Fields: `me`, `session`.
   */
  | 'PROFILE'
  /**
   * What answers without an identity. Useful for checking that a route and a credential work
   * when everything else is refused: if this answers and nothing else does, the problem is the
   * token and not the connection.
   *
   * **A scope list cannot take this away.** What is behind it answers without any credential, so
   * a token scoped away from it would reach less than an anonymous caller — and would lose the
   * one field that tells a broken credential from a broken route. Listing it is never necessary.
   *
   * Fields: `buildInfo`.
   */
  | 'PUBLIC'
  /**
   * Personal Access Token management. Not reachable through a token at all — those fields are
   * `@interactiveOnly`, so that a leaked token cannot mint its successors.
   *
   * Fields: `myTokens`, `createPersonalAccessToken`, `revokePersonalAccessToken`.
   */
  | 'TOKENS';

/** One `area: verb` pair, when creating a token. */
export type ScopeGrantInput = {
  /** Which part of the API. The fields belonging to each area are listed on `ScopeArea`. */
  area: ScopeArea;
  /** `READ` for queries, `WRITE` for mutations — and `WRITE` includes `READ` in the same area. */
  verb: ScopeVerb;
};

/** Whether a scope permits reading or changing. */
export type ScopeVerb =
  /** Queries. */
  | 'READ'
  /**
   * Mutations — and queries in the same area, because a token that may change
   * something and not look at it is not a capability anybody wants.
   */
  | 'WRITE';

/** What happened to one object in one run. */
export type ZpaChangeType =
  /** Seen for the first time. */
  | 'APPEARED'
  /** Already held, and its content differs. */
  | 'CHANGED'
  /**
   * A successful fetch no longer mentions it.
   *
   * Only ever recorded after a fetch that succeeded and returned something, so that one bad night
   * cannot retire a whole catalogue.
   */
  | 'DISAPPEARED'
  /** It had disappeared and is back. The same record, with the day it was first seen intact. */
  | 'REAPPEARED';

/** What kind of object the examination office's interface published. */
export type ZpaObjectKind =
  /**
   * A catalogue slot inside one version of a programme's examination regulations — compulsory or
   * elective, and possibly belonging to a specialisation.
   */
  | 'BASKET'
  /** A module in the catalogue, with its home programme, course type and credits. */
  | 'MODULE'
  /**
   * The association between a module, a set of examination regulations and a basket. The module
   * code and the earliest programme semester live here rather than on the module, because both
   * differ between the programmes a module appears in.
   */
  | 'MSBA'
  /** One version of one programme's examination regulations. */
  | 'SPO'
  /**
   * Somebody who teaches. The list a module's responsible person is named from — and, alone
   * among the five, an endpoint whose values are actually typed.
   *
   * Importing these grants nobody access: who may use this installation is a separate, curated
   * list.
   */
  | 'TEACHER';

/**
 * One decision the projection made about input the examination office left untidy.
 *
 * Every one of these is a decision with a reason, and none of them is a silent drop: a projection
 * that quietly discarded rows would be indistinguishable from a catalogue that never had them, and
 * the first person to notice would be a programme lead who cannot find a module they are
 * responsible for.
 */
export type ZpaProjectionFinding =
  /**
   * Not projected: the association points at regulations the source no longer publishes.
   *
   * The largest of these by far, and mostly historical. There is no path from such a row to a
   * programme, so it cannot become an entry in a module's list of where it counts.
   */
  | 'ASSOCIATION_WITH_UNKNOWN_REGULATIONS'
  /** The same, for how the teaching is broken up. */
  | 'COURSE_TYPE_UNMAPPED'
  /**
   * The one that is an alarm rather than a note, and it should always be absent.
   *
   * A module's entry per set of regulations is folded from up to four catalogue slots, and that
   * fold is only safe because the slots never disagree about compulsory-or-elective — measured at
   * zero conflicts across the whole catalogue. If this appears, the fold has been picking an
   * answer.
   */
  | 'DUTY_CONFLICT'
  /** Became `UNKNOWN`: a phrase for how often a module runs that this version does not recognise. */
  | 'FREQUENCY_UNMAPPED'
  /** Folded with the lower value: the catalogue slots of one set of regulations disagree about the earliest semester. */
  | 'MIN_SEMESTER_CONFLICT'
  /** Kept and flagged: the examination office has retired the module. */
  | 'MODULE_INACTIVE'
  /**
   * Not stored: the source names a responsible person the teacher list does not contain.
   *
   * About one module in thirty. Either a placeholder rather than a person, or the address of
   * somebody who is not in the list. The value stays in the cached payload; carrying it into the
   * catalogue would put a mail address in the tables about modules.
   */
  | 'MODULE_RESPONSIBLE_UNKNOWN'
  /** Skipped: the source names no home programme for the module, and every module has exactly one. */
  | 'MODULE_WITHOUT_HOME_PROGRAMME'
  /**
   * Kept with an empty name: the source's module records carry no name field, and this module
   * appears in no set of regulations to borrow one from.
   */
  | 'MODULE_WITHOUT_NAME'
  /** Skipped, with its modules: a programme code this system cannot store. */
  | 'PROGRAMME_CODE_MALFORMED'
  /**
   * Kept, and marked inactive: a programme named only by the modules that call it home.
   *
   * Its modules stay planable, which is why it is kept at all rather than treated as an error.
   */
  | 'PROGRAMME_WITHOUT_REGULATIONS'
  /**
   * Kept: somebody who teaches and for whom the source gives no address.
   *
   * The address is the link to somebody who signs in, so such a person can never be connected to
   * one — worth seeing, not worth refusing.
   */
  | 'TEACHER_WITHOUT_MAIL';

/**
 * How a projection of the catalogue ended.
 *
 * Three values rather than the import's four. There is no `PARTIAL`: the whole projection is one
 * transaction, so either the catalogue moved or it did not.
 */
export type ZpaProjectionStatus =
  /** Nothing was written. The catalogue is exactly as it was. */
  | 'FAILED'
  /** Still going, or the process that started it did not finish. */
  | 'RUNNING'
  /** The catalogue was rebuilt. */
  | 'SUCCEEDED';

/** How an import run ended. */
export type ZpaSyncStatus =
  /** Nothing was applied. */
  | 'FAILED'
  /**
   * Some endpoints were applied and others failed.
   *
   * Not a failure: the ones that arrived are correctly up to date, and nothing belonging to an
   * endpoint that failed was retired.
   */
  | 'PARTIAL'
  /** Still going, or the process that started it did not finish. */
  | 'RUNNING'
  /** Every endpoint was fetched and applied. */
  | 'SUCCEEDED';

/** What started an import run. */
export type ZpaSyncTrigger =
  /** Somebody asked for it. */
  | 'MANUAL'
  /** The nightly job. */
  | 'SCHEDULE';

export type BuildInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type BuildInfoQuery = { buildInfo: { version: string, commit: string, builtAt: string } };

export type SessionQueryVariables = Exact<{ [key: string]: never; }>;


export type SessionQuery = { session: { narrowed: boolean, interactive: boolean, effectiveRoles: Array<Role>, grantedRoles: Array<Role>, person: { id: string, mail: string, name: string } | null } };

export type DemandTableQueryVariables = Exact<{
  semester: string;
  programme: string;
  previous: string;
  filter?: ModuleFilter | null | undefined;
  withDemand: boolean;
  withPrevious: boolean;
}>;


export type DemandTableQuery = { semesters: Array<{ code: string, phase: Phase }>, me: { programmes: Array<{ code: string, title: string }> } | null, programmes: Array<{ code: string, title: string, active: boolean }>, semester?: { code: string, phase: Phase, wishesPublishedAt: string | null }, modules?: Array<{ id: string, name: string, zpaId: string | null, active: boolean, contactHoursPerWeek: number | null, splitIsEstimated: boolean, plannable: boolean, practicalKind: InstancePartKind | null, dutyStatus: DutyStatus | null, programmeSemester: number | null, components: Array<{ kind: InstancePartKind, teachingHours: number }>, proposedComponents: Array<{ kind: InstancePartKind, teachingHours: number }> }>, courseInstances?: Array<{ id: string, track: string, programmeSemester: number | null, teachingHours: number, module: { id: string }, parts: Array<{ id: string, kind: InstancePartKind, teachingHours: number | null, sharedAcrossTracks: boolean }>, borrowedParts: Array<{ fromTrack: string, part: { id: string, kind: InstancePartKind, teachingHours: number | null } }> }>, previous?: Array<{ id: string, track: string, programmeSemester: number | null, teachingHours: number, module: { id: string }, parts: Array<{ id: string, kind: InstancePartKind, teachingHours: number | null, sharedAcrossTracks: boolean }>, borrowedParts: Array<{ fromTrack: string, part: { id: string, kind: InstancePartKind, teachingHours: number | null } }> }> };

export type PlanDemandMutationVariables = Exact<{
  semester: string;
  programme: string;
  entries: Array<DemandEntryInput> | DemandEntryInput;
  dryRun: boolean;
}>;


export type PlanDemandMutation = { planDemand: { dryRun: boolean, teachingHours: number, created: Array<{ moduleName: string, track: string }>, withdrawn: Array<{ moduleName: string, track: string }>, changed: Array<{ moduleName: string, track: string, trackBefore: string | null, groupsBefore: number | null, groupsAfter: number | null }>, refused: Array<{ moduleName: string, track: string, code: string, message: string }> } };

export type SharePartFromTableMutationVariables = Exact<{
  id: string | number;
}>;


export type SharePartFromTableMutation = { shareInstancePartAcrossTracks: { id: string } };

export type SplitPartFromTableMutationVariables = Exact<{
  id: string | number;
}>;


export type SplitPartFromTableMutation = { splitInstancePartAcrossTracks: { id: string } };

export type ConfirmSplitMutationVariables = Exact<{
  moduleId: string | number;
  components: Array<ModuleComponentInput> | ModuleComponentInput;
}>;


export type ConfirmSplitMutation = { setModuleComponents: { id: string, splitIsEstimated: boolean } };

export type MyTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type MyTokensQuery = { myTokens: Array<{ id: string, description: string, createdAt: string, expiresAt: string, lastUsedAt: string | null, revokedAt: string | null, scopes: Array<string> }> | null };

export type CreatePersonalAccessTokenMutationVariables = Exact<{
  description: string;
  expiresInDays?: number | null | undefined;
  scopes?: Array<ScopeGrantInput> | ScopeGrantInput | null | undefined;
}>;


export type CreatePersonalAccessTokenMutation = { createPersonalAccessToken: { secret: string, token: { id: string, description: string, createdAt: string, expiresAt: string, lastUsedAt: string | null, revokedAt: string | null, scopes: Array<string> } } };

export type RevokePersonalAccessTokenMutationVariables = Exact<{
  id: string | number;
}>;


export type RevokePersonalAccessTokenMutation = { revokePersonalAccessToken: { id: string } };

export type CatalogueQueryVariables = Exact<{
  filter?: ModuleFilter | null | undefined;
  programme: string;
}>;


export type CatalogueQuery = { programmes: Array<{ code: string, title: string, active: boolean, spos: Array<{ id: string, version: number, primussId: string | null }> }>, modules: Array<{ id: string, name: string, zpaId: string | null, active: boolean, courseType: CourseType, frequency: Frequency, contactHoursPerWeek: number | null, credits: number | null, componentHours: number | null, dutyStatus: DutyStatus | null, inCatalogue: boolean, homeProgramme: { code: string }, responsible: { id: string, sortName: string } | null, components: Array<{ id: string, kind: InstancePartKind, teachingHours: number }> }> };

export type ModuleQueryVariables = Exact<{
  id: string | number;
}>;


export type ModuleQuery = { me: { roles: Array<Role>, programmes: Array<{ code: string }> } | null, module: { id: string, name: string, zpaId: string | null, active: boolean, official: boolean, retiredAt: string | null, courseType: CourseType, frequency: Frequency, contactHoursPerWeek: number | null, credits: number | null, componentHours: number | null, splitIsEstimated: boolean, homeProgramme: { code: string, title: string }, responsible: { id: string, name: string, sortName: string, mail: string | null, isProfessor: boolean, isLecturerOnContract: boolean, isHonoraryProfessor: boolean, isStaff: boolean, active: boolean, faculty: string | null, lastSemester: string | null, isUser: boolean } | null, components: Array<{ id: string, kind: InstancePartKind, teachingHours: number, position: number }>, proposedComponents: Array<{ kind: InstancePartKind, teachingHours: number }>, offerings: Array<{ isDuty: boolean, moduleCodes: Array<string>, focuses: Array<string>, minProgrammeSemester: number | null, spo: { id: string, version: number, validFrom: string | null, primussId: string | null, programme: { code: string } } }> } | null };

export type SetModuleComponentsMutationVariables = Exact<{
  moduleId: string | number;
  components: Array<ModuleComponentInput> | ModuleComponentInput;
}>;


export type SetModuleComponentsMutation = { setModuleComponents: { id: string, componentHours: number | null, components: Array<{ id: string, kind: InstancePartKind, teachingHours: number }> } };

export type SemestersQueryVariables = Exact<{ [key: string]: never; }>;


export type SemestersQuery = { semesters: Array<{ code: string, phase: Phase, reachablePhases: Array<Phase>, wishesPublishedAt: string | null }> };

export type AdvanceSemesterPhaseMutationVariables = Exact<{
  code: string;
  to: Phase;
}>;


export type AdvanceSemesterPhaseMutation = { advanceSemesterPhase: { code: string, phase: Phase } };

export type PublishWishesMutationVariables = Exact<{
  code: string;
}>;


export type PublishWishesMutation = { publishWishes: { code: string, wishesPublishedAt: string | null } };

export type DiagnoseAccessQueryVariables = Exact<{
  mail: string;
}>;


export type DiagnoseAccessQuery = { diagnoseAccess: { active: boolean, person: { id: string, mail: string, name: string, roles: Array<Role> }, grants: Array<{ role: Role, grantedAt: string, expiresAt: string | null, grantedBy: { mail: string, name: string } | null }>, decisions: Array<{ rule: string, allowed: boolean, reason: string }> } | null };

export type TeacherAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type TeacherAccountsQuery = { teacherAccounts: Array<{ teacher: { id: string, name: string, sortName: string, mail: string | null, isProfessor: boolean, isLecturerOnContract: boolean, isHonoraryProfessor: boolean, isStaff: boolean, active: boolean, faculty: string | null }, account: { id: string, mail: string, active: boolean, roles: Array<Role>, programmes: Array<{ code: string }> } | null }> | null, programmes: Array<{ code: string, title: string, active: boolean }> };

export type PeopleQueryVariables = Exact<{
  search?: string | null | undefined;
  includeInactive?: boolean | null | undefined;
}>;


export type PeopleQuery = { people: Array<{ id: string, mail: string, name: string, active: boolean, roles: Array<Role>, programmes: Array<{ code: string }> }> | null, programmes: Array<{ code: string, title: string, active: boolean }> };

export type CreatePersonMutationVariables = Exact<{
  mail: string;
  name?: string | null | undefined;
}>;


export type CreatePersonMutation = { createPerson: { id: string, mail: string } };

export type SetPersonRolesMutationVariables = Exact<{
  id: string | number;
  roles: Array<Role> | Role;
  expiresAt?: string | null | undefined;
}>;


export type SetPersonRolesMutation = { setPersonRoles: { id: string, roles: Array<Role> } };

export type SetPersonProgrammesMutationVariables = Exact<{
  id: string | number;
  programmes: Array<string> | string;
}>;


export type SetPersonProgrammesMutation = { setPersonProgrammes: { id: string, programmes: Array<{ code: string }> } };

export type SetPersonActiveMutationVariables = Exact<{
  id: string | number;
  active: boolean;
}>;


export type SetPersonActiveMutation = { setPersonActive: { id: string } };

export type SetTeacherAdmittedMutationVariables = Exact<{
  teacherId: string | number;
  admitted: boolean;
}>;


export type SetTeacherAdmittedMutation = { setTeacherAdmitted: { teacher: { id: string }, account: { id: string, roles: Array<Role> } | null } };

export type ZpaSyncRunsQueryVariables = Exact<{ [key: string]: never; }>;


export type ZpaSyncRunsQuery = { zpaSyncRuns: Array<{ id: string, trigger: ZpaSyncTrigger, startedBy: string | null, startedAt: string, finishedAt: string | null, status: ZpaSyncStatus, fetched: number, appeared: number, changed: number, disappeared: number, error: string | null, kinds: Array<{ kind: ZpaObjectKind, status: ZpaSyncStatus, fetched: number, error: string | null }> }> };

export type ZpaChangesQueryVariables = Exact<{
  runId: string | number;
}>;


export type ZpaChangesQuery = { zpaChanges: Array<{ id: string, kind: ZpaObjectKind, zpaId: string, label: string | null, change: ZpaChangeType, changedKeys: Array<string>, detectedAt: string }> };

export type ZpaCatalogueProjectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ZpaCatalogueProjectionsQuery = { zpaCatalogueProjections: Array<{ id: string, runId: string | null, startedAt: string, finishedAt: string | null, status: ZpaProjectionStatus, programmesWritten: number, modulesWritten: number, offeringsWritten: number, offeringsRemoved: number, error: string | null, notes: Array<{ finding: ZpaProjectionFinding, count: number, sample: Array<string> }> }> };

export type ProjectZpaCatalogueMutationVariables = Exact<{ [key: string]: never; }>;


export type ProjectZpaCatalogueMutation = { projectZpaCatalogue: { id: string, status: ZpaProjectionStatus } };

export type SyncZpaNowMutationVariables = Exact<{ [key: string]: never; }>;


export type SyncZpaNowMutation = { syncZpaNow: { id: string, status: ZpaSyncStatus } };


export const BuildInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buildInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"builtAt"}}]}}]}}]} as unknown as DocumentNode<BuildInfoQuery, BuildInfoQueryVariables>;
export const SessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"narrowed"}},{"kind":"Field","name":{"kind":"Name","value":"interactive"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveRoles"}},{"kind":"Field","name":{"kind":"Name","value":"grantedRoles"}},{"kind":"Field","name":{"kind":"Name","value":"person"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<SessionQuery, SessionQueryVariables>;
export const DemandTableDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DemandTable"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"semester"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"programme"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"previous"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ModuleFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"withDemand"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"withPrevious"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"semesters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}},{"kind":"Field","name":{"kind":"Name","value":"semester"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"semester"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withDemand"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}},{"kind":"Field","name":{"kind":"Name","value":"wishesPublishedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withDemand"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"zpaId"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"contactHoursPerWeek"}},{"kind":"Field","name":{"kind":"Name","value":"splitIsEstimated"}},{"kind":"Field","name":{"kind":"Name","value":"plannable"}},{"kind":"Field","name":{"kind":"Name","value":"practicalKind"}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}},{"kind":"Field","name":{"kind":"Name","value":"proposedComponents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dutyStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}}]},{"kind":"Field","name":{"kind":"Name","value":"programmeSemester"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}}]}]}},{"kind":"Field","name":{"kind":"Name","value":"courseInstances"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"semester"},"value":{"kind":"Variable","name":{"kind":"Name","value":"semester"}}},{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withDemand"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"track"}},{"kind":"Field","name":{"kind":"Name","value":"programmeSemester"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}},{"kind":"Field","name":{"kind":"Name","value":"module"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}},{"kind":"Field","name":{"kind":"Name","value":"sharedAcrossTracks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"borrowedParts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fromTrack"}},{"kind":"Field","name":{"kind":"Name","value":"part"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"previous"},"name":{"kind":"Name","value":"courseInstances"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"semester"},"value":{"kind":"Variable","name":{"kind":"Name","value":"previous"}}},{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withPrevious"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"track"}},{"kind":"Field","name":{"kind":"Name","value":"programmeSemester"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}},{"kind":"Field","name":{"kind":"Name","value":"module"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}},{"kind":"Field","name":{"kind":"Name","value":"sharedAcrossTracks"}}]}},{"kind":"Field","name":{"kind":"Name","value":"borrowedParts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fromTrack"}},{"kind":"Field","name":{"kind":"Name","value":"part"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}}]}}]}}]}}]} as unknown as DocumentNode<DemandTableQuery, DemandTableQueryVariables>;
export const PlanDemandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PlanDemand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"semester"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"programme"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entries"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DemandEntryInput"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dryRun"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"planDemand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"semester"},"value":{"kind":"Variable","name":{"kind":"Name","value":"semester"}}},{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}},{"kind":"Argument","name":{"kind":"Name","value":"entries"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entries"}}},{"kind":"Argument","name":{"kind":"Name","value":"dryRun"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dryRun"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dryRun"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}},{"kind":"Field","name":{"kind":"Name","value":"created"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moduleName"}},{"kind":"Field","name":{"kind":"Name","value":"track"}}]}},{"kind":"Field","name":{"kind":"Name","value":"withdrawn"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moduleName"}},{"kind":"Field","name":{"kind":"Name","value":"track"}}]}},{"kind":"Field","name":{"kind":"Name","value":"changed"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moduleName"}},{"kind":"Field","name":{"kind":"Name","value":"track"}},{"kind":"Field","name":{"kind":"Name","value":"trackBefore"}},{"kind":"Field","name":{"kind":"Name","value":"groupsBefore"}},{"kind":"Field","name":{"kind":"Name","value":"groupsAfter"}}]}},{"kind":"Field","name":{"kind":"Name","value":"refused"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"moduleName"}},{"kind":"Field","name":{"kind":"Name","value":"track"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<PlanDemandMutation, PlanDemandMutationVariables>;
export const SharePartFromTableDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharePartFromTable"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareInstancePartAcrossTracks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SharePartFromTableMutation, SharePartFromTableMutationVariables>;
export const SplitPartFromTableDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SplitPartFromTable"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"splitInstancePartAcrossTracks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SplitPartFromTableMutation, SplitPartFromTableMutationVariables>;
export const ConfirmSplitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfirmSplit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"moduleId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"components"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModuleComponentInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setModuleComponents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"moduleId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"moduleId"}}},{"kind":"Argument","name":{"kind":"Name","value":"components"},"value":{"kind":"Variable","name":{"kind":"Name","value":"components"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"splitIsEstimated"}}]}}]}}]} as unknown as DocumentNode<ConfirmSplitMutation, ConfirmSplitMutationVariables>;
export const MyTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}},{"kind":"Field","name":{"kind":"Name","value":"revokedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]}}]} as unknown as DocumentNode<MyTokensQuery, MyTokensQueryVariables>;
export const CreatePersonalAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePersonalAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresInDays"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ScopeGrantInput"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPersonalAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresInDays"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresInDays"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secret"}},{"kind":"Field","name":{"kind":"Name","value":"token"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}},{"kind":"Field","name":{"kind":"Name","value":"revokedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]}}]}}]} as unknown as DocumentNode<CreatePersonalAccessTokenMutation, CreatePersonalAccessTokenMutationVariables>;
export const RevokePersonalAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokePersonalAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokePersonalAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokePersonalAccessTokenMutation, RevokePersonalAccessTokenMutationVariables>;
export const CatalogueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Catalogue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ModuleFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"programme"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"spos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"primussId"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"zpaId"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"courseType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"contactHoursPerWeek"}},{"kind":"Field","name":{"kind":"Name","value":"credits"}},{"kind":"Field","name":{"kind":"Name","value":"componentHours"}},{"kind":"Field","name":{"kind":"Name","value":"homeProgramme"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"Field","name":{"kind":"Name","value":"responsible"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sortName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dutyStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}}]},{"kind":"Field","name":{"kind":"Name","value":"inCatalogue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"programme"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programme"}}}]}]}}]}}]} as unknown as DocumentNode<CatalogueQuery, CatalogueQueryVariables>;
export const ModuleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Module"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}},{"kind":"Field","name":{"kind":"Name","value":"module"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"zpaId"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"official"}},{"kind":"Field","name":{"kind":"Name","value":"retiredAt"}},{"kind":"Field","name":{"kind":"Name","value":"courseType"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"contactHoursPerWeek"}},{"kind":"Field","name":{"kind":"Name","value":"credits"}},{"kind":"Field","name":{"kind":"Name","value":"componentHours"}},{"kind":"Field","name":{"kind":"Name","value":"homeProgramme"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"responsible"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sortName"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"isProfessor"}},{"kind":"Field","name":{"kind":"Name","value":"isLecturerOnContract"}},{"kind":"Field","name":{"kind":"Name","value":"isHonoraryProfessor"}},{"kind":"Field","name":{"kind":"Name","value":"isStaff"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"faculty"}},{"kind":"Field","name":{"kind":"Name","value":"lastSemester"}},{"kind":"Field","name":{"kind":"Name","value":"isUser"}}]}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}},{"kind":"Field","name":{"kind":"Name","value":"splitIsEstimated"}},{"kind":"Field","name":{"kind":"Name","value":"proposedComponents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}},{"kind":"Field","name":{"kind":"Name","value":"offerings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isDuty"}},{"kind":"Field","name":{"kind":"Name","value":"moduleCodes"}},{"kind":"Field","name":{"kind":"Name","value":"focuses"}},{"kind":"Field","name":{"kind":"Name","value":"minProgrammeSemester"}},{"kind":"Field","name":{"kind":"Name","value":"spo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"validFrom"}},{"kind":"Field","name":{"kind":"Name","value":"primussId"}},{"kind":"Field","name":{"kind":"Name","value":"programme"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<ModuleQuery, ModuleQueryVariables>;
export const SetModuleComponentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetModuleComponents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"moduleId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"components"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModuleComponentInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setModuleComponents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"moduleId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"moduleId"}}},{"kind":"Argument","name":{"kind":"Name","value":"components"},"value":{"kind":"Variable","name":{"kind":"Name","value":"components"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"componentHours"}},{"kind":"Field","name":{"kind":"Name","value":"components"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"teachingHours"}}]}}]}}]}}]} as unknown as DocumentNode<SetModuleComponentsMutation, SetModuleComponentsMutationVariables>;
export const SemestersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Semesters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"semesters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}},{"kind":"Field","name":{"kind":"Name","value":"reachablePhases"}},{"kind":"Field","name":{"kind":"Name","value":"wishesPublishedAt"}}]}}]}}]} as unknown as DocumentNode<SemestersQuery, SemestersQueryVariables>;
export const AdvanceSemesterPhaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdvanceSemesterPhase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Phase"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"advanceSemesterPhase"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}}]}}]}}]} as unknown as DocumentNode<AdvanceSemesterPhaseMutation, AdvanceSemesterPhaseMutationVariables>;
export const PublishWishesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishWishes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishWishes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"wishesPublishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishWishesMutation, PublishWishesMutationVariables>;
export const DiagnoseAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiagnoseAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mail"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"diagnoseAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mail"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mail"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"person"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"grantedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"decisions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}}]}}]}}]}}]} as unknown as DocumentNode<DiagnoseAccessQuery, DiagnoseAccessQueryVariables>;
export const TeacherAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeacherAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacherAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sortName"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"isProfessor"}},{"kind":"Field","name":{"kind":"Name","value":"isLecturerOnContract"}},{"kind":"Field","name":{"kind":"Name","value":"isHonoraryProfessor"}},{"kind":"Field","name":{"kind":"Name","value":"isStaff"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"faculty"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}}]} as unknown as DocumentNode<TeacherAccountsQuery, TeacherAccountsQueryVariables>;
export const PeopleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"People"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeInactive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"people"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"includeInactive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeInactive"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}}]}}]} as unknown as DocumentNode<PeopleQuery, PeopleQueryVariables>;
export const CreatePersonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePerson"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mail"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPerson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mail"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mail"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}}]}}]}}]} as unknown as DocumentNode<CreatePersonMutation, CreatePersonMutationVariables>;
export const SetPersonRolesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPersonRoles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roles"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Role"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Time"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPersonRoles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"roles"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roles"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresAt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<SetPersonRolesMutation, SetPersonRolesMutationVariables>;
export const SetPersonProgrammesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPersonProgrammes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"programmes"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPersonProgrammes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"programmes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"programmes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"programmes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]}}]} as unknown as DocumentNode<SetPersonProgrammesMutation, SetPersonProgrammesMutationVariables>;
export const SetPersonActiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPersonActive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"active"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPersonActive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"active"},"value":{"kind":"Variable","name":{"kind":"Name","value":"active"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetPersonActiveMutation, SetPersonActiveMutationVariables>;
export const SetTeacherAdmittedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetTeacherAdmitted"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teacherId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"admitted"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setTeacherAdmitted"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teacherId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teacherId"}}},{"kind":"Argument","name":{"kind":"Name","value":"admitted"},"value":{"kind":"Variable","name":{"kind":"Name","value":"admitted"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teacher"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]}}]} as unknown as DocumentNode<SetTeacherAdmittedMutation, SetTeacherAdmittedMutationVariables>;
export const ZpaSyncRunsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZpaSyncRuns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zpaSyncRuns"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"20"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trigger"}},{"kind":"Field","name":{"kind":"Name","value":"startedBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fetched"}},{"kind":"Field","name":{"kind":"Name","value":"appeared"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"disappeared"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"kinds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fetched"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]}}]} as unknown as DocumentNode<ZpaSyncRunsQuery, ZpaSyncRunsQueryVariables>;
export const ZpaChangesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZpaChanges"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"runId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zpaChanges"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"runId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"runId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"zpaId"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"change"}},{"kind":"Field","name":{"kind":"Name","value":"changedKeys"}},{"kind":"Field","name":{"kind":"Name","value":"detectedAt"}}]}}]}}]} as unknown as DocumentNode<ZpaChangesQuery, ZpaChangesQueryVariables>;
export const ZpaCatalogueProjectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZpaCatalogueProjections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zpaCatalogueProjections"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"runId"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"programmesWritten"}},{"kind":"Field","name":{"kind":"Name","value":"modulesWritten"}},{"kind":"Field","name":{"kind":"Name","value":"offeringsWritten"}},{"kind":"Field","name":{"kind":"Name","value":"offeringsRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"finding"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"sample"}}]}}]}}]}}]} as unknown as DocumentNode<ZpaCatalogueProjectionsQuery, ZpaCatalogueProjectionsQueryVariables>;
export const ProjectZpaCatalogueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectZpaCatalogue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectZpaCatalogue"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ProjectZpaCatalogueMutation, ProjectZpaCatalogueMutationVariables>;
export const SyncZpaNowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncZpaNow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncZpaNow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SyncZpaNowMutation, SyncZpaNowMutationVariables>;