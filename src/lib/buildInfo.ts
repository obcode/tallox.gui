import type { BuildInfoQuery } from '#lib/gql/__generated__/graphql.ts';

/**
 * The backend's version stamp, as the footer shows it.
 *
 * Derived from the generated query type rather than written by hand, so it cannot diverge from
 * the schema. And it lives here rather than in `#lib/server/` because a component imports it —
 * everything under `#lib/server/` is off limits to client code.
 */
export type ServerBuildInfo = BuildInfoQuery['buildInfo'];
