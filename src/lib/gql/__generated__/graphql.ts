/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
   * operation — did the nightly job run, what did it change, run it now — and not the catalogue
   * it produces. When the modules themselves become readable they will be planning data and will
   * say so. An area of its own was considered and rejected: every field it could hold is
   * unreachable through a token anyway, so it would be a promise in an enum that colleagues can
   * read via introspection and never use.
   *
   * Fields: `people`, `person`, `roleGrants`, `diagnoseAccess`, `createPerson`, `renamePerson`,
   * `setPersonRoles`, `setPersonActive`, `zpaSyncRuns`, `zpaSyncRun`, `zpaChanges`, `syncZpaNow`.
   */
  | 'ADMIN'
  /**
   * The planning process: which semesters exist, where each one stands, and — as they arrive —
   * the demand, the assignments and the statistics.
   *
   * The first area worth narrowing a token to. `PUBLIC` and `PROFILE` are you describing
   * yourself; `TOKENS` and `ADMIN` are unreachable through a token at all.
   *
   * Fields: `semesters`, `semester`, `createSemester`, `advanceSemesterPhase`, `publishWishes`.
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
  | 'SPO';

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

export type SemestersQueryVariables = Exact<{ [key: string]: never; }>;


export type SemestersQuery = { semesters: Array<{ id: string, code: string, phase: Phase, reachablePhases: Array<Phase>, wishesPublishedAt: string | null }> };

export type CreateSemesterMutationVariables = Exact<{
  code: string;
}>;


export type CreateSemesterMutation = { createSemester: { id: string, code: string } };

export type AdvanceSemesterPhaseMutationVariables = Exact<{
  id: string | number;
  to: Phase;
}>;


export type AdvanceSemesterPhaseMutation = { advanceSemesterPhase: { id: string, phase: Phase } };

export type PublishWishesMutationVariables = Exact<{
  id: string | number;
}>;


export type PublishWishesMutation = { publishWishes: { id: string, wishesPublishedAt: string | null } };

export type DiagnoseAccessQueryVariables = Exact<{
  mail: string;
}>;


export type DiagnoseAccessQuery = { diagnoseAccess: { active: boolean, person: { id: string, mail: string, name: string, roles: Array<Role> }, grants: Array<{ role: Role, grantedAt: string, expiresAt: string | null, grantedBy: { mail: string, name: string } | null }>, decisions: Array<{ rule: string, allowed: boolean, reason: string }> } | null };

export type PeopleQueryVariables = Exact<{
  search?: string | null | undefined;
  includeInactive?: boolean | null | undefined;
}>;


export type PeopleQuery = { people: Array<{ id: string, mail: string, name: string, roles: Array<Role> }> | null };

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

export type SetPersonActiveMutationVariables = Exact<{
  id: string | number;
  active: boolean;
}>;


export type SetPersonActiveMutation = { setPersonActive: { id: string } };

export type ZpaSyncRunsQueryVariables = Exact<{ [key: string]: never; }>;


export type ZpaSyncRunsQuery = { zpaSyncRuns: Array<{ id: string, trigger: ZpaSyncTrigger, startedBy: string | null, startedAt: string, finishedAt: string | null, status: ZpaSyncStatus, fetched: number, appeared: number, changed: number, disappeared: number, error: string | null, kinds: Array<{ kind: ZpaObjectKind, status: ZpaSyncStatus, fetched: number, error: string | null }> }> };

export type ZpaChangesQueryVariables = Exact<{
  runId: string | number;
}>;


export type ZpaChangesQuery = { zpaChanges: Array<{ id: string, kind: ZpaObjectKind, zpaId: string, label: string | null, change: ZpaChangeType, changedKeys: Array<string>, detectedAt: string }> };

export type SyncZpaNowMutationVariables = Exact<{ [key: string]: never; }>;


export type SyncZpaNowMutation = { syncZpaNow: { id: string, status: ZpaSyncStatus } };


export const BuildInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buildInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"builtAt"}}]}}]}}]} as unknown as DocumentNode<BuildInfoQuery, BuildInfoQueryVariables>;
export const SessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"narrowed"}},{"kind":"Field","name":{"kind":"Name","value":"interactive"}},{"kind":"Field","name":{"kind":"Name","value":"effectiveRoles"}},{"kind":"Field","name":{"kind":"Name","value":"grantedRoles"}},{"kind":"Field","name":{"kind":"Name","value":"person"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<SessionQuery, SessionQueryVariables>;
export const MyTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}},{"kind":"Field","name":{"kind":"Name","value":"revokedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]}}]} as unknown as DocumentNode<MyTokensQuery, MyTokensQueryVariables>;
export const CreatePersonalAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePersonalAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresInDays"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ScopeGrantInput"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPersonalAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresInDays"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresInDays"}}},{"kind":"Argument","name":{"kind":"Name","value":"scopes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"scopes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secret"}},{"kind":"Field","name":{"kind":"Name","value":"token"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}},{"kind":"Field","name":{"kind":"Name","value":"revokedAt"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}}]}}]}}]}}]} as unknown as DocumentNode<CreatePersonalAccessTokenMutation, CreatePersonalAccessTokenMutationVariables>;
export const RevokePersonalAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokePersonalAccessToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokePersonalAccessToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<RevokePersonalAccessTokenMutation, RevokePersonalAccessTokenMutationVariables>;
export const SemestersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Semesters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"semesters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}},{"kind":"Field","name":{"kind":"Name","value":"reachablePhases"}},{"kind":"Field","name":{"kind":"Name","value":"wishesPublishedAt"}}]}}]}}]} as unknown as DocumentNode<SemestersQuery, SemestersQueryVariables>;
export const CreateSemesterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSemester"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSemester"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]}}]} as unknown as DocumentNode<CreateSemesterMutation, CreateSemesterMutationVariables>;
export const AdvanceSemesterPhaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdvanceSemesterPhase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Phase"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"advanceSemesterPhase"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"to"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}}]}}]}}]} as unknown as DocumentNode<AdvanceSemesterPhaseMutation, AdvanceSemesterPhaseMutationVariables>;
export const PublishWishesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PublishWishes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishWishes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wishesPublishedAt"}}]}}]}}]} as unknown as DocumentNode<PublishWishesMutation, PublishWishesMutationVariables>;
export const DiagnoseAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiagnoseAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mail"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"diagnoseAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mail"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mail"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"person"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}},{"kind":"Field","name":{"kind":"Name","value":"grants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"grantedAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"grantedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"decisions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}}]}}]}}]}}]} as unknown as DocumentNode<DiagnoseAccessQuery, DiagnoseAccessQueryVariables>;
export const PeopleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"People"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeInactive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"people"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"includeInactive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeInactive"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<PeopleQuery, PeopleQueryVariables>;
export const CreatePersonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePerson"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mail"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPerson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mail"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mail"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"mail"}}]}}]}}]} as unknown as DocumentNode<CreatePersonMutation, CreatePersonMutationVariables>;
export const SetPersonRolesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPersonRoles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"roles"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Role"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Time"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPersonRoles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"roles"},"value":{"kind":"Variable","name":{"kind":"Name","value":"roles"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresAt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresAt"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}}]}}]}}]} as unknown as DocumentNode<SetPersonRolesMutation, SetPersonRolesMutationVariables>;
export const SetPersonActiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetPersonActive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"active"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setPersonActive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"active"},"value":{"kind":"Variable","name":{"kind":"Name","value":"active"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<SetPersonActiveMutation, SetPersonActiveMutationVariables>;
export const ZpaSyncRunsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZpaSyncRuns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zpaSyncRuns"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"20"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trigger"}},{"kind":"Field","name":{"kind":"Name","value":"startedBy"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fetched"}},{"kind":"Field","name":{"kind":"Name","value":"appeared"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"disappeared"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"kinds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"fetched"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]}}]} as unknown as DocumentNode<ZpaSyncRunsQuery, ZpaSyncRunsQueryVariables>;
export const ZpaChangesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZpaChanges"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"runId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zpaChanges"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"runId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"runId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"zpaId"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"change"}},{"kind":"Field","name":{"kind":"Name","value":"changedKeys"}},{"kind":"Field","name":{"kind":"Name","value":"detectedAt"}}]}}]}}]} as unknown as DocumentNode<ZpaChangesQuery, ZpaChangesQueryVariables>;
export const SyncZpaNowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncZpaNow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncZpaNow"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SyncZpaNowMutation, SyncZpaNowMutationVariables>;