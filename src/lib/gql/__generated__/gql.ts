/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n\tquery BuildInfo {\n\t\tbuildInfo {\n\t\t\tversion\n\t\t\tcommit\n\t\t\tbuiltAt\n\t\t}\n\t}\n": typeof types.BuildInfoDocument,
    "\n\tquery Session {\n\t\tsession {\n\t\t\tnarrowed\n\t\t\tinteractive\n\t\t\teffectiveRoles\n\t\t\tgrantedRoles\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SessionDocument,
    "\n\tquery MyTokens {\n\t\tmyTokens {\n\t\t\tid\n\t\t\tdescription\n\t\t\tcreatedAt\n\t\t\texpiresAt\n\t\t\tlastUsedAt\n\t\t\trevokedAt\n\t\t\tscopes\n\t\t}\n\t}\n": typeof types.MyTokensDocument,
    "\n\tmutation CreatePersonalAccessToken(\n\t\t$description: String!\n\t\t$expiresInDays: Int\n\t\t$scopes: [ScopeGrantInput!]\n\t) {\n\t\tcreatePersonalAccessToken(\n\t\t\tdescription: $description\n\t\t\texpiresInDays: $expiresInDays\n\t\t\tscopes: $scopes\n\t\t) {\n\t\t\tsecret\n\t\t\ttoken {\n\t\t\t\tid\n\t\t\t\tdescription\n\t\t\t\tcreatedAt\n\t\t\t\texpiresAt\n\t\t\t\tlastUsedAt\n\t\t\t\trevokedAt\n\t\t\t\tscopes\n\t\t\t}\n\t\t}\n\t}\n": typeof types.CreatePersonalAccessTokenDocument,
    "\n\tmutation RevokePersonalAccessToken($id: ID!) {\n\t\trevokePersonalAccessToken(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.RevokePersonalAccessTokenDocument,
    "\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n": typeof types.CatalogueDocument,
    "\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ModuleDocument,
    "\n\tmutation SetModuleComponents($moduleId: ID!, $components: [ModuleComponentInput!]!) {\n\t\tsetModuleComponents(moduleId: $moduleId, components: $components) {\n\t\t\tid\n\t\t\tcomponentHours\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SetModuleComponentsDocument,
    "\n\tquery Semesters {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t\treachablePhases\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n": typeof types.SemestersDocument,
    "\n\tmutation AdvanceSemesterPhase($code: String!, $to: Phase!) {\n\t\tadvanceSemesterPhase(code: $code, to: $to) {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t}\n": typeof types.AdvanceSemesterPhaseDocument,
    "\n\tmutation PublishWishes($code: String!) {\n\t\tpublishWishes(code: $code) {\n\t\t\tcode\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n": typeof types.PublishWishesDocument,
    "\n\tquery DiagnoseAccess($mail: String!) {\n\t\tdiagnoseAccess(mail: $mail) {\n\t\t\tactive\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t\troles\n\t\t\t}\n\t\t\tgrants {\n\t\t\t\trole\n\t\t\t\tgrantedAt\n\t\t\t\texpiresAt\n\t\t\t\tgrantedBy {\n\t\t\t\t\tmail\n\t\t\t\t\tname\n\t\t\t\t}\n\t\t\t}\n\t\t\tdecisions {\n\t\t\t\trule\n\t\t\t\tallowed\n\t\t\t\treason\n\t\t\t}\n\t\t}\n\t}\n": typeof types.DiagnoseAccessDocument,
    "\n\tquery People($search: String, $includeInactive: Boolean) {\n\t\tpeople(search: $search, includeInactive: $includeInactive) {\n\t\t\tid\n\t\t\tmail\n\t\t\tname\n\t\t\troles\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t}\n": typeof types.PeopleDocument,
    "\n\tmutation CreatePerson($mail: String!, $name: String) {\n\t\tcreatePerson(mail: $mail, name: $name) {\n\t\t\tid\n\t\t\tmail\n\t\t}\n\t}\n": typeof types.CreatePersonDocument,
    "\n\tmutation SetPersonRoles($id: ID!, $roles: [Role!]!, $expiresAt: Time) {\n\t\tsetPersonRoles(id: $id, roles: $roles, expiresAt: $expiresAt) {\n\t\t\tid\n\t\t\troles\n\t\t}\n\t}\n": typeof types.SetPersonRolesDocument,
    "\n\tmutation SetPersonProgrammes($id: ID!, $programmes: [String!]!) {\n\t\tsetPersonProgrammes(id: $id, programmes: $programmes) {\n\t\t\tid\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t}\n": typeof types.SetPersonProgrammesDocument,
    "\n\tmutation SetPersonActive($id: ID!, $active: Boolean!) {\n\t\tsetPersonActive(id: $id, active: $active) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.SetPersonActiveDocument,
    "\n\tquery ZpaSyncRuns {\n\t\tzpaSyncRuns(limit: 20) {\n\t\t\tid\n\t\t\ttrigger\n\t\t\tstartedBy\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tfetched\n\t\t\tappeared\n\t\t\tchanged\n\t\t\tdisappeared\n\t\t\terror\n\t\t\tkinds {\n\t\t\t\tkind\n\t\t\t\tstatus\n\t\t\t\tfetched\n\t\t\t\terror\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ZpaSyncRunsDocument,
    "\n\tquery ZpaChanges($runId: ID!) {\n\t\tzpaChanges(runId: $runId) {\n\t\t\tid\n\t\t\tkind\n\t\t\tzpaId\n\t\t\tlabel\n\t\t\tchange\n\t\t\tchangedKeys\n\t\t\tdetectedAt\n\t\t}\n\t}\n": typeof types.ZpaChangesDocument,
    "\n\tquery ZpaCatalogueProjections {\n\t\tzpaCatalogueProjections(limit: 10) {\n\t\t\tid\n\t\t\trunId\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tprogrammesWritten\n\t\t\tmodulesWritten\n\t\t\tofferingsWritten\n\t\t\tofferingsRemoved\n\t\t\terror\n\t\t\tnotes {\n\t\t\t\tfinding\n\t\t\t\tcount\n\t\t\t\tsample\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ZpaCatalogueProjectionsDocument,
    "\n\tmutation ProjectZpaCatalogue {\n\t\tprojectZpaCatalogue {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n": typeof types.ProjectZpaCatalogueDocument,
    "\n\tmutation SyncZpaNow {\n\t\tsyncZpaNow {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n": typeof types.SyncZpaNowDocument,
};
const documents: Documents = {
    "\n\tquery BuildInfo {\n\t\tbuildInfo {\n\t\t\tversion\n\t\t\tcommit\n\t\t\tbuiltAt\n\t\t}\n\t}\n": types.BuildInfoDocument,
    "\n\tquery Session {\n\t\tsession {\n\t\t\tnarrowed\n\t\t\tinteractive\n\t\t\teffectiveRoles\n\t\t\tgrantedRoles\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n": types.SessionDocument,
    "\n\tquery MyTokens {\n\t\tmyTokens {\n\t\t\tid\n\t\t\tdescription\n\t\t\tcreatedAt\n\t\t\texpiresAt\n\t\t\tlastUsedAt\n\t\t\trevokedAt\n\t\t\tscopes\n\t\t}\n\t}\n": types.MyTokensDocument,
    "\n\tmutation CreatePersonalAccessToken(\n\t\t$description: String!\n\t\t$expiresInDays: Int\n\t\t$scopes: [ScopeGrantInput!]\n\t) {\n\t\tcreatePersonalAccessToken(\n\t\t\tdescription: $description\n\t\t\texpiresInDays: $expiresInDays\n\t\t\tscopes: $scopes\n\t\t) {\n\t\t\tsecret\n\t\t\ttoken {\n\t\t\t\tid\n\t\t\t\tdescription\n\t\t\t\tcreatedAt\n\t\t\t\texpiresAt\n\t\t\t\tlastUsedAt\n\t\t\t\trevokedAt\n\t\t\t\tscopes\n\t\t\t}\n\t\t}\n\t}\n": types.CreatePersonalAccessTokenDocument,
    "\n\tmutation RevokePersonalAccessToken($id: ID!) {\n\t\trevokePersonalAccessToken(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.RevokePersonalAccessTokenDocument,
    "\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n": types.CatalogueDocument,
    "\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.ModuleDocument,
    "\n\tmutation SetModuleComponents($moduleId: ID!, $components: [ModuleComponentInput!]!) {\n\t\tsetModuleComponents(moduleId: $moduleId, components: $components) {\n\t\t\tid\n\t\t\tcomponentHours\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t}\n\t}\n": types.SetModuleComponentsDocument,
    "\n\tquery Semesters {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t\treachablePhases\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n": types.SemestersDocument,
    "\n\tmutation AdvanceSemesterPhase($code: String!, $to: Phase!) {\n\t\tadvanceSemesterPhase(code: $code, to: $to) {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t}\n": types.AdvanceSemesterPhaseDocument,
    "\n\tmutation PublishWishes($code: String!) {\n\t\tpublishWishes(code: $code) {\n\t\t\tcode\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n": types.PublishWishesDocument,
    "\n\tquery DiagnoseAccess($mail: String!) {\n\t\tdiagnoseAccess(mail: $mail) {\n\t\t\tactive\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t\troles\n\t\t\t}\n\t\t\tgrants {\n\t\t\t\trole\n\t\t\t\tgrantedAt\n\t\t\t\texpiresAt\n\t\t\t\tgrantedBy {\n\t\t\t\t\tmail\n\t\t\t\t\tname\n\t\t\t\t}\n\t\t\t}\n\t\t\tdecisions {\n\t\t\t\trule\n\t\t\t\tallowed\n\t\t\t\treason\n\t\t\t}\n\t\t}\n\t}\n": types.DiagnoseAccessDocument,
    "\n\tquery People($search: String, $includeInactive: Boolean) {\n\t\tpeople(search: $search, includeInactive: $includeInactive) {\n\t\t\tid\n\t\t\tmail\n\t\t\tname\n\t\t\troles\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t}\n": types.PeopleDocument,
    "\n\tmutation CreatePerson($mail: String!, $name: String) {\n\t\tcreatePerson(mail: $mail, name: $name) {\n\t\t\tid\n\t\t\tmail\n\t\t}\n\t}\n": types.CreatePersonDocument,
    "\n\tmutation SetPersonRoles($id: ID!, $roles: [Role!]!, $expiresAt: Time) {\n\t\tsetPersonRoles(id: $id, roles: $roles, expiresAt: $expiresAt) {\n\t\t\tid\n\t\t\troles\n\t\t}\n\t}\n": types.SetPersonRolesDocument,
    "\n\tmutation SetPersonProgrammes($id: ID!, $programmes: [String!]!) {\n\t\tsetPersonProgrammes(id: $id, programmes: $programmes) {\n\t\t\tid\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t}\n": types.SetPersonProgrammesDocument,
    "\n\tmutation SetPersonActive($id: ID!, $active: Boolean!) {\n\t\tsetPersonActive(id: $id, active: $active) {\n\t\t\tid\n\t\t}\n\t}\n": types.SetPersonActiveDocument,
    "\n\tquery ZpaSyncRuns {\n\t\tzpaSyncRuns(limit: 20) {\n\t\t\tid\n\t\t\ttrigger\n\t\t\tstartedBy\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tfetched\n\t\t\tappeared\n\t\t\tchanged\n\t\t\tdisappeared\n\t\t\terror\n\t\t\tkinds {\n\t\t\t\tkind\n\t\t\t\tstatus\n\t\t\t\tfetched\n\t\t\t\terror\n\t\t\t}\n\t\t}\n\t}\n": types.ZpaSyncRunsDocument,
    "\n\tquery ZpaChanges($runId: ID!) {\n\t\tzpaChanges(runId: $runId) {\n\t\t\tid\n\t\t\tkind\n\t\t\tzpaId\n\t\t\tlabel\n\t\t\tchange\n\t\t\tchangedKeys\n\t\t\tdetectedAt\n\t\t}\n\t}\n": types.ZpaChangesDocument,
    "\n\tquery ZpaCatalogueProjections {\n\t\tzpaCatalogueProjections(limit: 10) {\n\t\t\tid\n\t\t\trunId\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tprogrammesWritten\n\t\t\tmodulesWritten\n\t\t\tofferingsWritten\n\t\t\tofferingsRemoved\n\t\t\terror\n\t\t\tnotes {\n\t\t\t\tfinding\n\t\t\t\tcount\n\t\t\t\tsample\n\t\t\t}\n\t\t}\n\t}\n": types.ZpaCatalogueProjectionsDocument,
    "\n\tmutation ProjectZpaCatalogue {\n\t\tprojectZpaCatalogue {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n": types.ProjectZpaCatalogueDocument,
    "\n\tmutation SyncZpaNow {\n\t\tsyncZpaNow {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n": types.SyncZpaNowDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery BuildInfo {\n\t\tbuildInfo {\n\t\t\tversion\n\t\t\tcommit\n\t\t\tbuiltAt\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery BuildInfo {\n\t\tbuildInfo {\n\t\t\tversion\n\t\t\tcommit\n\t\t\tbuiltAt\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery Session {\n\t\tsession {\n\t\t\tnarrowed\n\t\t\tinteractive\n\t\t\teffectiveRoles\n\t\t\tgrantedRoles\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Session {\n\t\tsession {\n\t\t\tnarrowed\n\t\t\tinteractive\n\t\t\teffectiveRoles\n\t\t\tgrantedRoles\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery MyTokens {\n\t\tmyTokens {\n\t\t\tid\n\t\t\tdescription\n\t\t\tcreatedAt\n\t\t\texpiresAt\n\t\t\tlastUsedAt\n\t\t\trevokedAt\n\t\t\tscopes\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery MyTokens {\n\t\tmyTokens {\n\t\t\tid\n\t\t\tdescription\n\t\t\tcreatedAt\n\t\t\texpiresAt\n\t\t\tlastUsedAt\n\t\t\trevokedAt\n\t\t\tscopes\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreatePersonalAccessToken(\n\t\t$description: String!\n\t\t$expiresInDays: Int\n\t\t$scopes: [ScopeGrantInput!]\n\t) {\n\t\tcreatePersonalAccessToken(\n\t\t\tdescription: $description\n\t\t\texpiresInDays: $expiresInDays\n\t\t\tscopes: $scopes\n\t\t) {\n\t\t\tsecret\n\t\t\ttoken {\n\t\t\t\tid\n\t\t\t\tdescription\n\t\t\t\tcreatedAt\n\t\t\t\texpiresAt\n\t\t\t\tlastUsedAt\n\t\t\t\trevokedAt\n\t\t\t\tscopes\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation CreatePersonalAccessToken(\n\t\t$description: String!\n\t\t$expiresInDays: Int\n\t\t$scopes: [ScopeGrantInput!]\n\t) {\n\t\tcreatePersonalAccessToken(\n\t\t\tdescription: $description\n\t\t\texpiresInDays: $expiresInDays\n\t\t\tscopes: $scopes\n\t\t) {\n\t\t\tsecret\n\t\t\ttoken {\n\t\t\t\tid\n\t\t\t\tdescription\n\t\t\t\tcreatedAt\n\t\t\t\texpiresAt\n\t\t\t\tlastUsedAt\n\t\t\t\trevokedAt\n\t\t\t\tscopes\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation RevokePersonalAccessToken($id: ID!) {\n\t\trevokePersonalAccessToken(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation RevokePersonalAccessToken($id: ID!) {\n\t\trevokePersonalAccessToken(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SetModuleComponents($moduleId: ID!, $components: [ModuleComponentInput!]!) {\n\t\tsetModuleComponents(moduleId: $moduleId, components: $components) {\n\t\t\tid\n\t\t\tcomponentHours\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation SetModuleComponents($moduleId: ID!, $components: [ModuleComponentInput!]!) {\n\t\tsetModuleComponents(moduleId: $moduleId, components: $components) {\n\t\t\tid\n\t\t\tcomponentHours\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery Semesters {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t\treachablePhases\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Semesters {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t\treachablePhases\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation AdvanceSemesterPhase($code: String!, $to: Phase!) {\n\t\tadvanceSemesterPhase(code: $code, to: $to) {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation AdvanceSemesterPhase($code: String!, $to: Phase!) {\n\t\tadvanceSemesterPhase(code: $code, to: $to) {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation PublishWishes($code: String!) {\n\t\tpublishWishes(code: $code) {\n\t\t\tcode\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation PublishWishes($code: String!) {\n\t\tpublishWishes(code: $code) {\n\t\t\tcode\n\t\t\twishesPublishedAt\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery DiagnoseAccess($mail: String!) {\n\t\tdiagnoseAccess(mail: $mail) {\n\t\t\tactive\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t\troles\n\t\t\t}\n\t\t\tgrants {\n\t\t\t\trole\n\t\t\t\tgrantedAt\n\t\t\t\texpiresAt\n\t\t\t\tgrantedBy {\n\t\t\t\t\tmail\n\t\t\t\t\tname\n\t\t\t\t}\n\t\t\t}\n\t\t\tdecisions {\n\t\t\t\trule\n\t\t\t\tallowed\n\t\t\t\treason\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery DiagnoseAccess($mail: String!) {\n\t\tdiagnoseAccess(mail: $mail) {\n\t\t\tactive\n\t\t\tperson {\n\t\t\t\tid\n\t\t\t\tmail\n\t\t\t\tname\n\t\t\t\troles\n\t\t\t}\n\t\t\tgrants {\n\t\t\t\trole\n\t\t\t\tgrantedAt\n\t\t\t\texpiresAt\n\t\t\t\tgrantedBy {\n\t\t\t\t\tmail\n\t\t\t\t\tname\n\t\t\t\t}\n\t\t\t}\n\t\t\tdecisions {\n\t\t\t\trule\n\t\t\t\tallowed\n\t\t\t\treason\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery People($search: String, $includeInactive: Boolean) {\n\t\tpeople(search: $search, includeInactive: $includeInactive) {\n\t\t\tid\n\t\t\tmail\n\t\t\tname\n\t\t\troles\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery People($search: String, $includeInactive: Boolean) {\n\t\tpeople(search: $search, includeInactive: $includeInactive) {\n\t\t\tid\n\t\t\tmail\n\t\t\tname\n\t\t\troles\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CreatePerson($mail: String!, $name: String) {\n\t\tcreatePerson(mail: $mail, name: $name) {\n\t\t\tid\n\t\t\tmail\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation CreatePerson($mail: String!, $name: String) {\n\t\tcreatePerson(mail: $mail, name: $name) {\n\t\t\tid\n\t\t\tmail\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SetPersonRoles($id: ID!, $roles: [Role!]!, $expiresAt: Time) {\n\t\tsetPersonRoles(id: $id, roles: $roles, expiresAt: $expiresAt) {\n\t\t\tid\n\t\t\troles\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation SetPersonRoles($id: ID!, $roles: [Role!]!, $expiresAt: Time) {\n\t\tsetPersonRoles(id: $id, roles: $roles, expiresAt: $expiresAt) {\n\t\t\tid\n\t\t\troles\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SetPersonProgrammes($id: ID!, $programmes: [String!]!) {\n\t\tsetPersonProgrammes(id: $id, programmes: $programmes) {\n\t\t\tid\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation SetPersonProgrammes($id: ID!, $programmes: [String!]!) {\n\t\tsetPersonProgrammes(id: $id, programmes: $programmes) {\n\t\t\tid\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SetPersonActive($id: ID!, $active: Boolean!) {\n\t\tsetPersonActive(id: $id, active: $active) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation SetPersonActive($id: ID!, $active: Boolean!) {\n\t\tsetPersonActive(id: $id, active: $active) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ZpaSyncRuns {\n\t\tzpaSyncRuns(limit: 20) {\n\t\t\tid\n\t\t\ttrigger\n\t\t\tstartedBy\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tfetched\n\t\t\tappeared\n\t\t\tchanged\n\t\t\tdisappeared\n\t\t\terror\n\t\t\tkinds {\n\t\t\t\tkind\n\t\t\t\tstatus\n\t\t\t\tfetched\n\t\t\t\terror\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery ZpaSyncRuns {\n\t\tzpaSyncRuns(limit: 20) {\n\t\t\tid\n\t\t\ttrigger\n\t\t\tstartedBy\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tfetched\n\t\t\tappeared\n\t\t\tchanged\n\t\t\tdisappeared\n\t\t\terror\n\t\t\tkinds {\n\t\t\t\tkind\n\t\t\t\tstatus\n\t\t\t\tfetched\n\t\t\t\terror\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ZpaChanges($runId: ID!) {\n\t\tzpaChanges(runId: $runId) {\n\t\t\tid\n\t\t\tkind\n\t\t\tzpaId\n\t\t\tlabel\n\t\t\tchange\n\t\t\tchangedKeys\n\t\t\tdetectedAt\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery ZpaChanges($runId: ID!) {\n\t\tzpaChanges(runId: $runId) {\n\t\t\tid\n\t\t\tkind\n\t\t\tzpaId\n\t\t\tlabel\n\t\t\tchange\n\t\t\tchangedKeys\n\t\t\tdetectedAt\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery ZpaCatalogueProjections {\n\t\tzpaCatalogueProjections(limit: 10) {\n\t\t\tid\n\t\t\trunId\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tprogrammesWritten\n\t\t\tmodulesWritten\n\t\t\tofferingsWritten\n\t\t\tofferingsRemoved\n\t\t\terror\n\t\t\tnotes {\n\t\t\t\tfinding\n\t\t\t\tcount\n\t\t\t\tsample\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery ZpaCatalogueProjections {\n\t\tzpaCatalogueProjections(limit: 10) {\n\t\t\tid\n\t\t\trunId\n\t\t\tstartedAt\n\t\t\tfinishedAt\n\t\t\tstatus\n\t\t\tprogrammesWritten\n\t\t\tmodulesWritten\n\t\t\tofferingsWritten\n\t\t\tofferingsRemoved\n\t\t\terror\n\t\t\tnotes {\n\t\t\t\tfinding\n\t\t\t\tcount\n\t\t\t\tsample\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ProjectZpaCatalogue {\n\t\tprojectZpaCatalogue {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation ProjectZpaCatalogue {\n\t\tprojectZpaCatalogue {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SyncZpaNow {\n\t\tsyncZpaNow {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation SyncZpaNow {\n\t\tsyncZpaNow {\n\t\t\tid\n\t\t\tstatus\n\t\t}\n\t}\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;