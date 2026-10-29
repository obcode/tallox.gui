import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anchorFor, buildSchemaDoc, describeBlocks, inlineSegments } from './schemaDoc';

const SDL = `
"""The entry point."""
type Query {
	"The calling person."
	me: Person
	"The calling person's tokens."
	myTokens: [PersonalAccessToken!]
}

type Mutation {
	"Creates a token."
	createPersonalAccessToken(
		"What it is for."
		description: String!
		expiresInDays: Int
	): PersonalAccessToken!
}

"""A person."""
type Person {
	id: ID!
	roles: [Role!]!
	alt: String @deprecated(reason: "Called id now.")
}

type PersonalAccessToken {
	id: ID!
	createdAt: Time!
}

"""A role."""
enum Role {
	"Somebody who teaches."
	LECTURER
	ADMIN
}

"""A moment in time."""
scalar Time
`;

describe('buildSchemaDoc', () => {
	const doc = buildSchemaDoc(SDL);

	it('puts Query and Mutation first', () => {
		// The root types are what somebody is looking for: what can I query, what can I change.
		// Sorted alphabetically, Mutation would sit between two data types.
		expect(doc.roots.map((t) => t.name)).toEqual(['Query', 'Mutation']);
	});

	it('sorts the rest alphabetically', () => {
		const names = doc.types.map((t) => t.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it('leaves out introspection types', () => {
		const all = [...doc.roots, ...doc.types].map((t) => t.name);
		expect(all.some((name) => name.startsWith('__'))).toBe(false);
	});

	it('leaves out the built-in scalars but not the custom ones', () => {
		// String and Int explain themselves; Time carries a description somebody wrote, and is
		// therefore exactly the kind of thing that needs explaining.
		const names = doc.types.map((t) => t.name);
		expect(names).not.toContain('String');
		expect(names).not.toContain('Boolean');
		expect(names).toContain('Time');
	});

	it('carries descriptions of types, fields and arguments', () => {
		// The descriptions are the actual content of the reference — without them it is just a
		// list of names, which introspection gives you anyway.
		const query = doc.roots.find((t) => t.name === 'Query');
		expect(query?.description).toBe('The entry point.');
		expect(query?.fields.find((f) => f.name === 'me')?.description).toBe('The calling person.');

		const mutation = doc.roots.find((t) => t.name === 'Mutation');
		const create = mutation?.fields.find((f) => f.name === 'createPersonalAccessToken');
		expect(create?.args.find((a) => a.name === 'description')?.description).toBe('What it is for.');
	});

	it('keeps the nullability in the type name', () => {
		// `[PersonalAccessToken!]` against `[PersonalAccessToken!]!` is not a subtlety here: the
		// nullable list is how @interactiveOnly answers without failing the query. Anybody
		// reading the reference has to see the difference.
		const query = doc.roots.find((t) => t.name === 'Query');
		expect(query?.fields.find((f) => f.name === 'myTokens')?.type).toBe('[PersonalAccessToken!]');
		expect(query?.fields.find((f) => f.name === 'me')?.type).toBe('Person');
	});

	it('names deprecated fields as such', () => {
		const person = doc.types.find((t) => t.name === 'Person');
		expect(person?.fields.find((f) => f.name === 'alt')?.deprecationReason).toBe('Called id now.');
	});

	it('lists enum values with their descriptions', () => {
		const role = doc.types.find((t) => t.name === 'Role');
		expect(role?.kind).toBe('enum');
		expect(role?.values.map((v) => v.name)).toEqual(['LECTURER', 'ADMIN']);
		expect(role?.values[0].description).toBe('Somebody who teaches.');
	});
});

describe('the real schema', () => {
	// Against the committed file rather than only against a sample: it is the source both for
	// the reference and for `pnpm codegen`. If it changes in a way that would leave the
	// reference empty, that should show up here and not on the page.
	const doc = buildSchemaDoc(readFileSync('schema.graphql', 'utf8'));

	it('has a Query type with fields', () => {
		expect(doc.roots[0].name).toBe('Query');
		expect(doc.roots[0].fields.length).toBeGreaterThan(0);
	});

	it('describes every root field', () => {
		// A field with no description is a line in the reference that explains nothing. That is
		// to be fixed in the backend schema, not here.
		for (const root of doc.roots) {
			for (const field of root.fields) {
				expect(field.description, `${root.name}.${field.name} has no description`).toBeTruthy();
			}
		}
	});
});

describe('field access', () => {
	const ACCESS_SDL = `
directive @interactiveOnly on FIELD_DEFINITION
directive @fullReach on FIELD_DEFINITION
directive @scope(area: ScopeArea!, verb: ScopeVerb!) on FIELD_DEFINITION

enum ScopeArea { TOKENS PLANNING }
enum ScopeVerb { READ WRITE }

type Query {
	"Tokens."
	myTokens: [ID!] @interactiveOnly @scope(area: TOKENS, verb: READ)
	"Planning."
	plan: ID! @fullReach @scope(area: PLANNING, verb: WRITE)
	"Open."
	open: ID
}
`;
	const fields = buildSchemaDoc(ACCESS_SDL).roots[0].fields;
	const access = (name: string) => fields.find((f) => f.name === name)?.access;

	it('reads the directives applied to a field', () => {
		expect(access('myTokens')).toEqual({
			interactiveOnly: true,
			fullReach: false,
			scope: { area: 'TOKENS', verb: 'READ' }
		});
		expect(access('plan')).toEqual({
			interactiveOnly: false,
			fullReach: true,
			scope: { area: 'PLANNING', verb: 'WRITE' }
		});
	});

	it('reports a field without directives as open', () => {
		expect(access('open')).toEqual({ interactiveOnly: false, fullReach: false, scope: null });
	});

	it('finds every kind of directive in the committed schema', () => {
		// The committed file must be the release SDL, not introspection output: introspection
		// drops every usage, and the reference would quietly show no door at all.
		const doc = buildSchemaDoc(readFileSync('schema.graphql', 'utf8'));
		const all = [...doc.roots, ...doc.types].flatMap((t) => t.fields.map((f) => f.access));
		expect(all.some((a) => a.interactiveOnly)).toBe(true);
		expect(all.some((a) => a.fullReach)).toBe(true);
		expect(all.some((a) => a.scope !== null)).toBe(true);
	});
});

describe('anchorFor', () => {
	it('produces a jump target without special characters', () => {
		expect(anchorFor('PersonalAccessToken')).toBe('typ-PersonalAccessToken');
		expect(anchorFor('Foo Bar!')).toBe('typ-FooBar');
	});
});

describe('describeBlocks', () => {
	it('turns hard breaks back into running text', () => {
		// The actual finding: the descriptions are wrapped at just under 100 characters in the
		// schema, because they are source code there. On a page the line therefore ended
		// mid-sentence, at a position that has nothing to do with the width of the browser.
		const blocks = describeBlocks(
			'Nullable on purpose, and the null is the interesting part: through a\n' +
				'Personal Access Token this field answers null rather than failing.'
		);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].text).toBe(
			'Nullable on purpose, and the null is the interesting part: through a ' +
				'Personal Access Token this field answers null rather than failing.'
		);
		expect(blocks[0].text).not.toContain('\n');
	});

	it('keeps paragraphs as paragraphs', () => {
		// The blank line is a statement: without it a structured explanation becomes a wall of
		// text, and that would be the overcorrection to the original defect.
		const blocks = describeBlocks('First paragraph.\nstill the first.\n\nSecond paragraph.');

		expect(blocks.map((b) => b.text)).toEqual([
			'First paragraph. still the first.',
			'Second paragraph.'
		]);
	});

	it('leaves indented blocks alone', () => {
		// There are none in the schema today. But an example call in a description is
		// foreseeable, and put through a reflow it would be unreadable.
		const blocks = describeBlocks(
			'Call:\n\n    curl -H "Authorization: Bearer …" \\\n      https://…'
		);

		expect(blocks[0]).toEqual({ kind: 'text', text: 'Call:' });
		expect(blocks[1].kind).toBe('code');
		expect(blocks[1].text).toContain('\n');
	});

	it('copes with missing and empty descriptions', () => {
		expect(describeBlocks(null)).toEqual([]);
		expect(describeBlocks(undefined)).toEqual([]);
		expect(describeBlocks('   \n\n  ')).toEqual([]);
	});

	it('tidies up Windows line endings and double spaces', () => {
		expect(describeBlocks('One line\r\nand another')[0].text).toBe('One line and another');
	});

	it('reflows every description of the real schema with no break left over', () => {
		// Against the committed file: if somebody in the backend writes a description with a
		// structure this handles wrongly, it should show up.
		const doc = buildSchemaDoc(readFileSync('schema.graphql', 'utf8'));

		for (const type of [...doc.roots, ...doc.types]) {
			for (const block of describeBlocks(type.description)) {
				if (block.kind === 'text') expect(block.text).not.toContain('\n');
			}
			for (const field of type.fields) {
				for (const block of describeBlocks(field.description)) {
					if (block.kind === 'text') expect(block.text).not.toContain('\n');
				}
			}
		}
	});
});

describe('inlineSegments', () => {
	it('marks backtick sections up as code', () => {
		// GraphQL descriptions are Markdown, and the schema uses that: `null`,
		// `@interactiveOnly`, `/api/graphql`. Displayed verbatim the backticks look like a
		// formatting error.
		expect(inlineSegments('answers `null` rather than failing')).toEqual([
			{ code: false, text: 'answers ' },
			{ code: true, text: 'null' },
			{ code: false, text: ' rather than failing' }
		]);
	});

	it('copes with a single backtick', () => {
		// An unpaired backtick is a typo in the schema, not a reason to lose the rest of the
		// paragraph.
		expect(inlineSegments('a ` single one')).toEqual([
			{ code: false, text: 'a ' },
			{ code: true, text: ' single one' }
		]);
	});

	it('returns text without backticks unchanged', () => {
		expect(inlineSegments('a perfectly ordinary sentence')).toEqual([
			{ code: false, text: 'a perfectly ordinary sentence' }
		]);
	});
});
