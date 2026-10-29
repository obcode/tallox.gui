import type { CodegenConfig } from '@graphql-codegen/cli';

// client-preset with a documents glob, not just schema types.
//
// A deliberate departure from the sibling project: there the codegen produces 4375 lines of
// types that exactly one file imports — the query results are effectively `any`. With the
// client-preset every `graphql(...)` document is typed, and `graphql-request` returns the
// matching result without anybody writing the type next to it by hand.
//
// The source is the committed schema.graphql, not the running backend: that way `pnpm codegen`
// works offline and in CI. It is the SDL attached to the tallox.go release named in schema.tag,
// refreshed with `pnpm run update-schema`.
//
// The two variables exist for one check only: the E2E job validates this application's
// documents against the schema of the backend commit it runs with, writing the output to a
// scratch directory. Codegen fails when a document asks for a field that schema does not have,
// which is the break the pinned copy alone would hide until a page came up empty.
const config: CodegenConfig = {
	schema: process.env.TALLOX_CODEGEN_SCHEMA ?? './schema.graphql',
	documents: ['src/**/*.{ts,svelte}', '!src/lib/gql/__generated__/**'],
	ignoreNoDocuments: true,
	generates: {
		[process.env.TALLOX_CODEGEN_OUT ?? './src/lib/gql/__generated__/']: {
			preset: 'client',
			config: {
				useTypeImports: true,
				// Without this mapping every custom scalar becomes `unknown`, and every place that
				// formats a moment needs a cast — which is exactly the assertion the codegen is
				// meant to replace. On the wire `Time` is an RFC 3339 string; a `Date` would be a
				// lie, because JSON has none.
				scalars: {
					Time: 'string',
					// A calendar day, `2026-10-01`. A string for the same reason `Time` is —
					// JSON has no date — and deliberately not JavaScript's `Date`, which would
					// turn a day into an instant and let the reader's timezone move it.
					Date: 'string'
				}
			}
		}
	}
};

export default config;
