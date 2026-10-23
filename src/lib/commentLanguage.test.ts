import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentsOf, germanSentences, isGerman } from './commentLanguage';

/**
 * Comments are English without exception; German is only what somebody reads in the browser.
 * Said three times on one day in August, after the whole of src/ had been commented in German
 * and a new module had followed the files around it — so the rule is checked here rather than
 * remembered. Quoting a label („Speichern“) or naming a domain term in an English sentence is
 * fine and is what the heuristic leaves alone.
 */
const ROOT = join(process.cwd(), 'src');
const SKIP = new Set(['__generated__']);

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : sources(path);
		return /\.(ts|svelte|css)$/.test(entry.name) && !entry.name.startsWith('commentLanguage.')
			? [path]
			: [];
	});
}

describe('comment language', () => {
	it('finds no German comments in src/', () => {
		const files = sources(ROOT);
		expect(files.length).toBeGreaterThan(50);
		const findings = files.flatMap((file) =>
			commentsOf(file, readFileSync(file, 'utf8')).flatMap(({ line, text }) =>
				germanSentences(text).map(
					(sentence) => `${relative(process.cwd(), file)}:${line} ${sentence}`
				)
			)
		);
		expect(findings, findings.join('\n')).toEqual([]);
	});

	it.each([
		// The two that switched language halfway through.
		[
			'Named for what a token actually reaches here: über ein Token sieht auch eine Leitung nur',
			true
		],
		['No default, deliberately: ungefiltert ist die Vereinigung über alle Fassungen.', true],
		['Der Zustand des Speicherns steht über der Seite, nicht in ihr.', true],
		['das ist fuer den Fall, dass niemand da ist', true],
		// Quoting the interface, or the faculty, is not writing German.
		['The heading says „Jetzt dran“ and links to the step.', false],
		['A module split such as "SU mit Übung" is entered once per module.', false],
		['Keeps the Fachgruppe in the URL so the tab survives a reload.', false],
		['`Dozierende`, not `Dozierender`.', false],
		['die', false]
	])('classifies %s', (text, german) => {
		expect(germanSentences(text).length > 0).toBe(german);
	});

	it('reads only comments, not the German around them', () => {
		const component = [
			'<script lang="ts">',
			'\t// Der Zähler steht oben, nicht in der Liste.',
			"\tconst label = 'Das ist nicht der Kommentar und bleibt deutsch';",
			'\tconst t = `${label} // auch das ist kein Kommentar`;',
			'</script>',
			'',
			'<!-- Hier steht die Begründung für die Tabelle. -->',
			'<p>Hier steht, was die Nutzenden lesen, und das ist deutsch.</p>',
			'<style>',
			'\t/* Die Farbe kommt aus dem Theme. */',
			'</style>'
		].join('\n');
		const comments = commentsOf('x.svelte', component);
		expect(comments.map((c) => c.line)).toEqual([2, 7, 10]);
		expect(comments.every((c) => germanSentences(c.text).length > 0)).toBe(true);
	});

	it('reads comments in plain TypeScript, on their own lines', () => {
		const source = ['/** A doc comment. */', 'export const x = 1; // trailing', ''].join('\n');
		expect(commentsOf('x.ts', source)).toEqual([
			{ line: 1, text: '/** A doc comment. */' },
			{ line: 2, text: '// trailing' }
		]);
	});

	it('reads a quotation wrapped across two line comments as one', () => {
		const source = [
			'// A refusal that says "Das hat nicht',
			'// geklappt" and nothing else is unanswerable.',
			'const x = 1;'
		].join('\n');
		const comments = commentsOf('x.ts', source);
		expect(comments).toHaveLength(1);
		expect(germanSentences(comments[0].text)).toEqual([]);
	});

	it('needs more German than English in a sentence', () => {
		expect(isGerman('the wish and the instance')).toBe(false);
		expect(isGerman('nur die Vorlesung')).toBe(true);
	});
});
