import { buildSchema, GraphQLEnumType, GraphQLObjectType, GraphQLScalarType } from 'graphql';
import type { GraphQLNamedType } from 'graphql';

/**
 * The API reference built from the schema rather than from prose.
 *
 * A hand-maintained field list is wrong from the day it is written — and nobody notices,
 * because documentation does not go red. `schema.graphql` is the committed copy of the backend
 * schema (`pnpm run update-schema`), exactly what `pnpm codegen` reads too: the reference
 * cannot diverge from the typed documents.
 *
 * **What the reference cannot show:** where a directive was applied. GraphQL introspection
 * reports the *definition* of a directive but never its usages — `schema.graphql` comes out of
 * introspection and therefore does not know either. That affects both of the backend's
 * directives, and both work around it with prose, because descriptions do travel:
 *
 * - `@interactiveOnly` and `@fullReach` are spelled out in the description of each affected
 *   field.
 * - `@scope` does it from the other end, at the area: every `ScopeArea` value lists its
 *   fields. In the backend `TestScopeAreasListTheirFields` keeps those lists current.
 *
 * The console on the documentation page is the second answer: anybody who wants to be sure
 * queries the field with a token and sees `null`, `FULL_REACH_REQUIRED` or `INSUFFICIENT_SCOPE`.
 */

export type FieldArg = {
	name: string;
	type: string;
	description: string | null;
	defaultValue: string | null;
};

export type SchemaField = {
	name: string;
	type: string;
	description: string | null;
	args: FieldArg[];
	deprecationReason: string | null;
};

export type SchemaType = {
	name: string;
	kind: 'object' | 'enum' | 'scalar';
	description: string | null;
	/** Object types only. */
	fields: SchemaField[];
	/** Enums only. */
	values: { name: string; description: string | null }[];
};

export type SchemaDoc = {
	/** Query, Mutation and Subscription — in that order, as far as they exist. */
	roots: SchemaType[];
	/** Everything else, alphabetically. */
	types: SchemaType[];
};

/**
 * Builds the reference from an SDL text.
 *
 * Takes the text as a parameter instead of reading it itself: that way the function is
 * checkable without a filesystem, and the page decides where the schema comes from.
 */
export function buildSchemaDoc(sdl: string): SchemaDoc {
	const schema = buildSchema(sdl);

	const rootNames = [
		schema.getQueryType()?.name,
		schema.getMutationType()?.name,
		schema.getSubscriptionType()?.name
	].filter((name): name is string => !!name);

	const roots: SchemaType[] = [];
	const types: SchemaType[] = [];

	for (const type of Object.values(schema.getTypeMap())) {
		// Introspection types (`__Schema`, `__Type`, …) are tooling, not application.
		if (type.name.startsWith('__')) continue;

		const described = describe(type);
		if (!described) continue;

		if (rootNames.includes(type.name)) roots.push(described);
		else types.push(described);
	}

	roots.sort((a, b) => rootNames.indexOf(a.name) - rootNames.indexOf(b.name));
	types.sort((a, b) => a.name.localeCompare(b.name));

	return { roots, types };
}

function describe(type: GraphQLNamedType): SchemaType | null {
	if (type instanceof GraphQLObjectType) {
		return {
			name: type.name,
			kind: 'object',
			description: type.description ?? null,
			fields: Object.values(type.getFields()).map((field) => ({
				name: field.name,
				type: field.type.toString(),
				description: field.description ?? null,
				deprecationReason: field.deprecationReason ?? null,
				args: field.args.map((arg) => ({
					name: arg.name,
					type: arg.type.toString(),
					description: arg.description ?? null,
					defaultValue: arg.defaultValue === undefined ? null : JSON.stringify(arg.defaultValue)
				}))
			})),
			values: []
		};
	}

	if (type instanceof GraphQLEnumType) {
		return {
			name: type.name,
			kind: 'enum',
			description: type.description ?? null,
			fields: [],
			values: type.getValues().map((value) => ({
				name: value.name,
				description: value.description ?? null
			}))
		};
	}

	if (type instanceof GraphQLScalarType) {
		// The built-in scalars explain themselves and would only be in the way. Custom ones —
		// Time, and perhaps more later — carry a description somebody wrote.
		const builtin = ['String', 'Int', 'Float', 'Boolean', 'ID'];
		if (builtin.includes(type.name)) return null;

		return {
			name: type.name,
			kind: 'scalar',
			description: type.description ?? null,
			fields: [],
			values: []
		};
	}

	return null;
}

/**
 * One paragraph of a description, in the shape it is displayed.
 *
 * `code` keeps its line breaks, `text` is rewrapped.
 */
export type DescriptionBlock = { kind: 'text' | 'code'; text: string };

/**
 * Rewraps a description.
 *
 * The descriptions in the schema are source code: they are hard-wrapped at just under 100
 * characters because they are read in a `.graphqls` file. Introspection passes those line
 * breaks through verbatim — so they sit in `schema.graphql` and therefore here. On a page that
 * produces lines ending mid-sentence, at a position that has nothing to do with the width of
 * the browser.
 *
 * Simply removing every break would be wrong: the blank line between two paragraphs is a
 * statement, and without it a structured explanation becomes a wall of text. So: paragraphs
 * stay, the hard breaks inside a paragraph go.
 *
 * Indented paragraphs are left as they are. Today's schema has none — but an example call or a
 * small table inside a description is foreseeable, and putting those through a reflow makes
 * them unreadable.
 */
export function describeBlocks(description: string | null | undefined): DescriptionBlock[] {
	if (!description) return [];

	return description
		.replace(/\r\n/g, '\n')
		.split(/\n[ \t]*\n/)
		.map((paragraph) => paragraph.replace(/\s+$/, ''))
		.filter((paragraph) => paragraph.trim() !== '')
		.map((paragraph) => {
			const indented = paragraph.split('\n').some((line) => /^[ \t]{2,}\S/.test(line));
			if (indented) return { kind: 'code' as const, text: paragraph };

			return {
				kind: 'text' as const,
				text: paragraph.split('\n').join(' ').replace(/ {2,}/g, ' ')
			};
		});
}

/**
 * A piece of running text, either plain or marked up as code.
 */
export type InlineSegment = { code: boolean; text: string };

/**
 * Splits a paragraph at the backticks.
 *
 * GraphQL descriptions are Markdown by specification, and the schema uses that: `null`,
 * `@interactiveOnly`, `/api/graphql`. Displayed verbatim the backticks appear as characters on
 * the page and look like a formatting error — which, strictly speaking, is what they are.
 *
 * Split into segments rather than turned into HTML: the descriptions come from another
 * repository, and an `{@html}` carrying foreign text is an invitation one does not extend. This
 * way every segment stays a text node that Svelte escapes.
 *
 * Deliberately no more Markdown than that. Bold and italic barely occur in these descriptions,
 * and half a hand-written Markdown implementation is the beginning of a whole one.
 */
export function inlineSegments(text: string): InlineSegment[] {
	const segments: InlineSegment[] = [];

	// An odd number of backticks means the last one does not open anything. split() returns the
	// parts alternately, so that falls out correctly by itself.
	text.split('`').forEach((part, index) => {
		if (part === '') return;
		segments.push({ code: index % 2 === 1, text: part });
	});

	return segments;
}

/**
 * An anchor for the jump links. Letters and digits only, so it fits into a URL and does not
 * collide with a CSS selector.
 */
export function anchorFor(typeName: string): string {
	return `typ-${typeName.replace(/[^A-Za-z0-9]/g, '')}`;
}
