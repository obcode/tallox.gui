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
    "\n\tquery Demand($semester: String!, $programme: String!, $withDemand: Boolean!) {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t\tsemester(code: $semester) @include(if: $withDemand) {\n\t\t\tcode\n\t\t\tphase\n\t\t\twishesPublishedAt\n\t\t}\n\t\tcourseInstances(semester: $semester, programme: $programme) @include(if: $withDemand) {\n\t\t\tid\n\t\t\ttrack\n\t\t\tprogrammeSemester\n\t\t\tteachingHours\n\t\t\tmodule {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tzpaId\n\t\t\t\tcontactHoursPerWeek\n\t\t\t\tcomponentHours\n\t\t\t\tdutyStatus(programme: $programme)\n\t\t\t\tcomponents {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t\tparts {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tsharedAcrossTracks\n\t\t\t}\n\t\t\tborrowedParts {\n\t\t\t\tfromTrack\n\t\t\t\tpart {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.DemandDocument,
    "\n\tquery DeclarableModules($programme: String!) {\n\t\tdeclarable: modules(filter: { programme: $programme }) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t}\n\t}\n": typeof types.DeclarableModulesDocument,
    "\n\tmutation DeclareCourseInstance($input: DeclareCourseInstanceInput!) {\n\t\tdeclareCourseInstance(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DeclareCourseInstanceDocument,
    "\n\tmutation DuplicateCourseInstance($id: ID!, $track: String!, $sourceTrack: String) {\n\t\tduplicateCourseInstance(id: $id, track: $track, sourceTrack: $sourceTrack) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.DuplicateCourseInstanceDocument,
    "\n\tmutation ChangeCourseInstance($id: ID!, $track: String!, $programmeSemester: Int) {\n\t\tchangeCourseInstance(id: $id, track: $track, programmeSemester: $programmeSemester) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.ChangeCourseInstanceDocument,
    "\n\tmutation WithdrawCourseInstance($id: ID!) {\n\t\twithdrawCourseInstance(id: $id)\n\t}\n": typeof types.WithdrawCourseInstanceDocument,
    "\n\tmutation AddInstancePart($instanceId: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\taddInstancePart(instanceId: $instanceId, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.AddInstancePartDocument,
    "\n\tmutation ChangeInstancePart($id: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\tchangeInstancePart(id: $id, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.ChangeInstancePartDocument,
    "\n\tmutation RemoveInstancePart($id: ID!) {\n\t\tremoveInstancePart(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.RemoveInstancePartDocument,
    "\n\tmutation ShareInstancePartAcrossTracks($id: ID!) {\n\t\tshareInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.ShareInstancePartAcrossTracksDocument,
    "\n\tmutation SplitInstancePartAcrossTracks($id: ID!) {\n\t\tsplitInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.SplitInstancePartAcrossTracksDocument,
    "\n\tmutation CopyDemandFromSemester($from: String!, $to: String!, $programme: String!) {\n\t\tcopyDemandFromSemester(from: $from, to: $to, programme: $programme) {\n\t\t\tcreated\n\t\t\tskipped\n\t\t\tpartsCreated\n\t\t}\n\t}\n": typeof types.CopyDemandFromSemesterDocument,
    "\n\tquery MyTokens {\n\t\tmyTokens {\n\t\t\tid\n\t\t\tdescription\n\t\t\tcreatedAt\n\t\t\texpiresAt\n\t\t\tlastUsedAt\n\t\t\trevokedAt\n\t\t\tscopes\n\t\t}\n\t}\n": typeof types.MyTokensDocument,
    "\n\tmutation CreatePersonalAccessToken(\n\t\t$description: String!\n\t\t$expiresInDays: Int\n\t\t$scopes: [ScopeGrantInput!]\n\t) {\n\t\tcreatePersonalAccessToken(\n\t\t\tdescription: $description\n\t\t\texpiresInDays: $expiresInDays\n\t\t\tscopes: $scopes\n\t\t) {\n\t\t\tsecret\n\t\t\ttoken {\n\t\t\t\tid\n\t\t\t\tdescription\n\t\t\t\tcreatedAt\n\t\t\t\texpiresAt\n\t\t\t\tlastUsedAt\n\t\t\t\trevokedAt\n\t\t\t\tscopes\n\t\t\t}\n\t\t}\n\t}\n": typeof types.CreatePersonalAccessTokenDocument,
    "\n\tmutation RevokePersonalAccessToken($id: ID!) {\n\t\trevokePersonalAccessToken(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": typeof types.RevokePersonalAccessTokenDocument,
    "\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tsortName\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n": typeof types.CatalogueDocument,
    "\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tsortName\n\t\t\t\tmail\n\t\t\t\tisProfessor\n\t\t\t\tisLecturerOnContract\n\t\t\t\tisHonoraryProfessor\n\t\t\t\tisStaff\n\t\t\t\tactive\n\t\t\t\tfaculty\n\t\t\t\tlastSemester\n\t\t\t\tisUser\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": typeof types.ModuleDocument,
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
    "\n\tquery Demand($semester: String!, $programme: String!, $withDemand: Boolean!) {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t\tsemester(code: $semester) @include(if: $withDemand) {\n\t\t\tcode\n\t\t\tphase\n\t\t\twishesPublishedAt\n\t\t}\n\t\tcourseInstances(semester: $semester, programme: $programme) @include(if: $withDemand) {\n\t\t\tid\n\t\t\ttrack\n\t\t\tprogrammeSemester\n\t\t\tteachingHours\n\t\t\tmodule {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tzpaId\n\t\t\t\tcontactHoursPerWeek\n\t\t\t\tcomponentHours\n\t\t\t\tdutyStatus(programme: $programme)\n\t\t\t\tcomponents {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t\tparts {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tsharedAcrossTracks\n\t\t\t}\n\t\t\tborrowedParts {\n\t\t\t\tfromTrack\n\t\t\t\tpart {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.DemandDocument,
    "\n\tquery DeclarableModules($programme: String!) {\n\t\tdeclarable: modules(filter: { programme: $programme }) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t}\n\t}\n": types.DeclarableModulesDocument,
    "\n\tmutation DeclareCourseInstance($input: DeclareCourseInstanceInput!) {\n\t\tdeclareCourseInstance(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n": types.DeclareCourseInstanceDocument,
    "\n\tmutation DuplicateCourseInstance($id: ID!, $track: String!, $sourceTrack: String) {\n\t\tduplicateCourseInstance(id: $id, track: $track, sourceTrack: $sourceTrack) {\n\t\t\tid\n\t\t}\n\t}\n": types.DuplicateCourseInstanceDocument,
    "\n\tmutation ChangeCourseInstance($id: ID!, $track: String!, $programmeSemester: Int) {\n\t\tchangeCourseInstance(id: $id, track: $track, programmeSemester: $programmeSemester) {\n\t\t\tid\n\t\t}\n\t}\n": types.ChangeCourseInstanceDocument,
    "\n\tmutation WithdrawCourseInstance($id: ID!) {\n\t\twithdrawCourseInstance(id: $id)\n\t}\n": types.WithdrawCourseInstanceDocument,
    "\n\tmutation AddInstancePart($instanceId: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\taddInstancePart(instanceId: $instanceId, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n": types.AddInstancePartDocument,
    "\n\tmutation ChangeInstancePart($id: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\tchangeInstancePart(id: $id, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n": types.ChangeInstancePartDocument,
    "\n\tmutation RemoveInstancePart($id: ID!) {\n\t\tremoveInstancePart(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.RemoveInstancePartDocument,
    "\n\tmutation ShareInstancePartAcrossTracks($id: ID!) {\n\t\tshareInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.ShareInstancePartAcrossTracksDocument,
    "\n\tmutation SplitInstancePartAcrossTracks($id: ID!) {\n\t\tsplitInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.SplitInstancePartAcrossTracksDocument,
    "\n\tmutation CopyDemandFromSemester($from: String!, $to: String!, $programme: String!) {\n\t\tcopyDemandFromSemester(from: $from, to: $to, programme: $programme) {\n\t\t\tcreated\n\t\t\tskipped\n\t\t\tpartsCreated\n\t\t}\n\t}\n": types.CopyDemandFromSemesterDocument,
    "\n\tquery MyTokens {\n\t\tmyTokens {\n\t\t\tid\n\t\t\tdescription\n\t\t\tcreatedAt\n\t\t\texpiresAt\n\t\t\tlastUsedAt\n\t\t\trevokedAt\n\t\t\tscopes\n\t\t}\n\t}\n": types.MyTokensDocument,
    "\n\tmutation CreatePersonalAccessToken(\n\t\t$description: String!\n\t\t$expiresInDays: Int\n\t\t$scopes: [ScopeGrantInput!]\n\t) {\n\t\tcreatePersonalAccessToken(\n\t\t\tdescription: $description\n\t\t\texpiresInDays: $expiresInDays\n\t\t\tscopes: $scopes\n\t\t) {\n\t\t\tsecret\n\t\t\ttoken {\n\t\t\t\tid\n\t\t\t\tdescription\n\t\t\t\tcreatedAt\n\t\t\t\texpiresAt\n\t\t\t\tlastUsedAt\n\t\t\t\trevokedAt\n\t\t\t\tscopes\n\t\t\t}\n\t\t}\n\t}\n": types.CreatePersonalAccessTokenDocument,
    "\n\tmutation RevokePersonalAccessToken($id: ID!) {\n\t\trevokePersonalAccessToken(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n": types.RevokePersonalAccessTokenDocument,
    "\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tsortName\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n": types.CatalogueDocument,
    "\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tsortName\n\t\t\t\tmail\n\t\t\t\tisProfessor\n\t\t\t\tisLecturerOnContract\n\t\t\t\tisHonoraryProfessor\n\t\t\t\tisStaff\n\t\t\t\tactive\n\t\t\t\tfaculty\n\t\t\t\tlastSemester\n\t\t\t\tisUser\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n": types.ModuleDocument,
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
export function graphql(source: "\n\tquery Demand($semester: String!, $programme: String!, $withDemand: Boolean!) {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t\tsemester(code: $semester) @include(if: $withDemand) {\n\t\t\tcode\n\t\t\tphase\n\t\t\twishesPublishedAt\n\t\t}\n\t\tcourseInstances(semester: $semester, programme: $programme) @include(if: $withDemand) {\n\t\t\tid\n\t\t\ttrack\n\t\t\tprogrammeSemester\n\t\t\tteachingHours\n\t\t\tmodule {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tzpaId\n\t\t\t\tcontactHoursPerWeek\n\t\t\t\tcomponentHours\n\t\t\t\tdutyStatus(programme: $programme)\n\t\t\t\tcomponents {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t\tparts {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tsharedAcrossTracks\n\t\t\t}\n\t\t\tborrowedParts {\n\t\t\t\tfromTrack\n\t\t\t\tpart {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Demand($semester: String!, $programme: String!, $withDemand: Boolean!) {\n\t\tsemesters {\n\t\t\tcode\n\t\t\tphase\n\t\t}\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t}\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t}\n\t\tsemester(code: $semester) @include(if: $withDemand) {\n\t\t\tcode\n\t\t\tphase\n\t\t\twishesPublishedAt\n\t\t}\n\t\tcourseInstances(semester: $semester, programme: $programme) @include(if: $withDemand) {\n\t\t\tid\n\t\t\ttrack\n\t\t\tprogrammeSemester\n\t\t\tteachingHours\n\t\t\tmodule {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tzpaId\n\t\t\t\tcontactHoursPerWeek\n\t\t\t\tcomponentHours\n\t\t\t\tdutyStatus(programme: $programme)\n\t\t\t\tcomponents {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t\tparts {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tsharedAcrossTracks\n\t\t\t}\n\t\t\tborrowedParts {\n\t\t\t\tfromTrack\n\t\t\t\tpart {\n\t\t\t\t\tid\n\t\t\t\t\tkind\n\t\t\t\t\tteachingHours\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery DeclarableModules($programme: String!) {\n\t\tdeclarable: modules(filter: { programme: $programme }) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery DeclarableModules($programme: String!) {\n\t\tdeclarable: modules(filter: { programme: $programme }) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DeclareCourseInstance($input: DeclareCourseInstanceInput!) {\n\t\tdeclareCourseInstance(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation DeclareCourseInstance($input: DeclareCourseInstanceInput!) {\n\t\tdeclareCourseInstance(input: $input) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation DuplicateCourseInstance($id: ID!, $track: String!, $sourceTrack: String) {\n\t\tduplicateCourseInstance(id: $id, track: $track, sourceTrack: $sourceTrack) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation DuplicateCourseInstance($id: ID!, $track: String!, $sourceTrack: String) {\n\t\tduplicateCourseInstance(id: $id, track: $track, sourceTrack: $sourceTrack) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ChangeCourseInstance($id: ID!, $track: String!, $programmeSemester: Int) {\n\t\tchangeCourseInstance(id: $id, track: $track, programmeSemester: $programmeSemester) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation ChangeCourseInstance($id: ID!, $track: String!, $programmeSemester: Int) {\n\t\tchangeCourseInstance(id: $id, track: $track, programmeSemester: $programmeSemester) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation WithdrawCourseInstance($id: ID!) {\n\t\twithdrawCourseInstance(id: $id)\n\t}\n"): (typeof documents)["\n\tmutation WithdrawCourseInstance($id: ID!) {\n\t\twithdrawCourseInstance(id: $id)\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation AddInstancePart($instanceId: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\taddInstancePart(instanceId: $instanceId, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation AddInstancePart($instanceId: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\taddInstancePart(instanceId: $instanceId, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ChangeInstancePart($id: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\tchangeInstancePart(id: $id, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation ChangeInstancePart($id: ID!, $kind: InstancePartKind!, $teachingHours: Float) {\n\t\tchangeInstancePart(id: $id, kind: $kind, teachingHours: $teachingHours) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation RemoveInstancePart($id: ID!) {\n\t\tremoveInstancePart(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation RemoveInstancePart($id: ID!) {\n\t\tremoveInstancePart(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation ShareInstancePartAcrossTracks($id: ID!) {\n\t\tshareInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation ShareInstancePartAcrossTracks($id: ID!) {\n\t\tshareInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation SplitInstancePartAcrossTracks($id: ID!) {\n\t\tsplitInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation SplitInstancePartAcrossTracks($id: ID!) {\n\t\tsplitInstancePartAcrossTracks(id: $id) {\n\t\t\tid\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tmutation CopyDemandFromSemester($from: String!, $to: String!, $programme: String!) {\n\t\tcopyDemandFromSemester(from: $from, to: $to, programme: $programme) {\n\t\t\tcreated\n\t\t\tskipped\n\t\t\tpartsCreated\n\t\t}\n\t}\n"): (typeof documents)["\n\tmutation CopyDemandFromSemester($from: String!, $to: String!, $programme: String!) {\n\t\tcopyDemandFromSemester(from: $from, to: $to, programme: $programme) {\n\t\t\tcreated\n\t\t\tskipped\n\t\t\tpartsCreated\n\t\t}\n\t}\n"];
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
export function graphql(source: "\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tsortName\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Catalogue($filter: ModuleFilter, $programme: String!) {\n\t\tprogrammes {\n\t\t\tcode\n\t\t\ttitle\n\t\t\tactive\n\t\t\tspos {\n\t\t\t\tid\n\t\t\t\tversion\n\t\t\t\tprimussId\n\t\t\t}\n\t\t}\n\t\tmodules(filter: $filter) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tsortName\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t}\n\t\t\tdutyStatus(programme: $programme)\n\t\t\tinCatalogue(programme: $programme)\n\t\t}\n\t}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tsortName\n\t\t\t\tmail\n\t\t\t\tisProfessor\n\t\t\t\tisLecturerOnContract\n\t\t\t\tisHonoraryProfessor\n\t\t\t\tisStaff\n\t\t\t\tactive\n\t\t\t\tfaculty\n\t\t\t\tlastSemester\n\t\t\t\tisUser\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Module($id: ID!) {\n\t\tme {\n\t\t\tprogrammes {\n\t\t\t\tcode\n\t\t\t}\n\t\t\troles\n\t\t}\n\t\tmodule(id: $id) {\n\t\t\tid\n\t\t\tname\n\t\t\tzpaId\n\t\t\tactive\n\t\t\tofficial\n\t\t\tretiredAt\n\t\t\tcourseType\n\t\t\tfrequency\n\t\t\tcontactHoursPerWeek\n\t\t\tcredits\n\t\t\tcomponentHours\n\t\t\thomeProgramme {\n\t\t\t\tcode\n\t\t\t\ttitle\n\t\t\t}\n\t\t\tresponsible {\n\t\t\t\tid\n\t\t\t\tname\n\t\t\t\tsortName\n\t\t\t\tmail\n\t\t\t\tisProfessor\n\t\t\t\tisLecturerOnContract\n\t\t\t\tisHonoraryProfessor\n\t\t\t\tisStaff\n\t\t\t\tactive\n\t\t\t\tfaculty\n\t\t\t\tlastSemester\n\t\t\t\tisUser\n\t\t\t}\n\t\t\tcomponents {\n\t\t\t\tid\n\t\t\t\tkind\n\t\t\t\tteachingHours\n\t\t\t\tposition\n\t\t\t}\n\t\t\tofferings {\n\t\t\t\tisDuty\n\t\t\t\tmoduleCodes\n\t\t\t\tfocuses\n\t\t\t\tminProgrammeSemester\n\t\t\t\tspo {\n\t\t\t\t\tid\n\t\t\t\t\tversion\n\t\t\t\t\tvalidFrom\n\t\t\t\t\tprimussId\n\t\t\t\t\tprogramme {\n\t\t\t\t\t\tcode\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n"];
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