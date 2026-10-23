import ts from 'typescript';

/**
 * Finds German in source comments. Comments are code and therefore English; German is only
 * what somebody reads in the browser. The labels, help texts and messages in the same files are
 * German on purpose, so the check has to see comments and nothing else — a line-based scan like
 * the wording test would flag every page.
 *
 * Deliberately a heuristic over function words, not over vocabulary: an English comment quoting
 * „Speichern“ or naming the Fachgruppe is correct, and a German sentence without a single
 * umlaut ("das ist fuer den Fall") is not.
 */

export type SourceComment = { line: number; text: string };

/** Every comment in a TypeScript file or a Svelte component, with the line it starts on. */
export function commentsOf(path: string, source: string): SourceComment[] {
	return grouped(
		path.endsWith('.svelte') ? svelteComments(source) : scriptComments(source, 0, source)
	);
}

/**
 * Line comments on consecutive lines are one comment, the way go/ast groups them in the
 * backend's check: otherwise a quotation wrapped across two `//` lines loses its closing mark,
 * and the German inside it is counted as the comment's own.
 */
function grouped(comments: SourceComment[]): SourceComment[] {
	const out: SourceComment[] = [];
	let end = -1;
	for (const c of comments) {
		const last = out.at(-1);
		if (last && c.text.startsWith('//') && last.text.startsWith('//') && c.line === end + 1) {
			last.text += '\n' + c.text;
		} else {
			out.push({ ...c });
		}
		end = c.line + (c.text.match(/\n/g)?.length ?? 0);
	}
	return out;
}

function lineAt(source: string, offset: number): number {
	let line = 1;
	for (let i = 0; i < offset; i++) if (source.charCodeAt(i) === 10) line++;
	return line;
}

/**
 * Comments of a script, found by parsing rather than by scanning: a template literal with an
 * expression in it is where a plain token scan loses track and starts reading string content as
 * code. Ranges are collected around every node and deduplicated, because one comment is both
 * the trailing trivia of one node and the leading trivia of the next.
 */
function scriptComments(code: string, offset: number, whole: string): SourceComment[] {
	const file = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, false);
	const seen = new Set<number>();
	const found: SourceComment[] = [];
	const collect = (ranges: ts.CommentRange[] | undefined) => {
		for (const range of ranges ?? []) {
			if (seen.has(range.pos)) continue;
			seen.add(range.pos);
			found.push({
				line: lineAt(whole, offset + range.pos),
				text: code.slice(range.pos, range.end)
			});
		}
	};
	const visit = (node: ts.Node) => {
		collect(ts.getLeadingCommentRanges(code, node.pos));
		collect(ts.getTrailingCommentRanges(code, node.end));
		ts.forEachChild(node, visit);
	};
	visit(file);
	collect(ts.getLeadingCommentRanges(code, file.endOfFileToken.pos));
	return found.sort((a, b) => a.line - b.line);
}

function svelteComments(source: string): SourceComment[] {
	const found: SourceComment[] = [];
	let markup = source;
	// Blank the blocks out of the markup instead of cutting them, so offsets keep their lines.
	const blank = (start: number, end: number) => {
		markup =
			markup.slice(0, start) + markup.slice(start, end).replace(/[^\n]/g, ' ') + markup.slice(end);
	};
	for (const block of source.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)) {
		const start = block.index + block[1].length;
		found.push(...scriptComments(block[2], start, source));
		blank(block.index, block.index + block[0].length);
	}
	for (const block of source.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/g)) {
		const start = block.index + block[1].length;
		for (const c of block[2].matchAll(/\/\*[\s\S]*?\*\//g)) {
			found.push({ line: lineAt(source, start + c.index), text: c[0] });
		}
		blank(block.index, block.index + block[0].length);
	}
	for (const c of markup.matchAll(/<!--[\s\S]*?-->/g)) {
		found.push({ line: lineAt(source, c.index), text: c[0] });
	}
	return found.sort((a, b) => a.line - b.line);
}

const GERMAN = new Set(
	`der die das den dem des und oder nicht wird werden wurde wäre würde ist sind ein eine
	einen einem einer eines für mit auf bei nur auch noch wenn weil dass sich sie er wir ich hier
	dort damit sonst aber denn doch schon kein keine keinen nach über unter zum zur vom im ins
	beim als wie wo wer welche welcher dieser diese dieses jede jeder alle kann muss soll darf
	hat haben steht stehen gibt geht nichts etwas immer nie jetzt dann ob bis seit ohne durch aus
	zu eben bleibt sonst gerade nämlich deshalb weshalb trotzdem wird bereits
	fuer ueber koennen muessen laesst waere wuerde haelt gehoert naechste`.split(/\s+/)
);

const ENGLISH = new Set(
	`the a an and or not is are be been to of in on for with that this these those it its if
	when because only also as by from at which who can must should would could does do has have
	was were but so than then there what into here why how one no every each where whether
	after before rather instead`.split(/\s+/)
);

/** Quoted text is what the interface says, or what somebody said — not the comment's language. */
function unquoted(text: string): string {
	return text
		.replace(/„[^“”"]*[“”"]/g, ' ')
		.replace(/"[^"\n]*"/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/«[^»]*»/g, ' ');
}

function stripMarkers(text: string): string {
	return text
		.replace(/^<!--|-->$/g, ' ')
		.replace(/^\/\*+|\*+\/$/g, ' ')
		.replace(/^\s*(?:\/\/+|\*|#)/gm, ' ');
}

/**
 * One sentence at a time, so that a comment starting in English and ending in German is caught:
 * a majority vote over the whole comment would let the English half carry the German one.
 */
export function germanSentences(comment: string): string[] {
	// Whitespace first: a quotation wrapped across two comment lines is still one quotation.
	return unquoted(stripMarkers(comment).replace(/\s+/g, ' '))
		.split(/(?<=[.!?:;—])\s+|\s+[—–]\s+/)
		.map((s) => s.trim())
		.filter((sentence) => isGerman(sentence));
}

export function isGerman(sentence: string): boolean {
	const words = sentence.toLowerCase().match(/\p{L}+/gu) ?? [];
	let german = 0;
	let english = 0;
	for (const word of words) {
		if (GERMAN.has(word)) german++;
		if (ENGLISH.has(word)) english++;
	}
	return german >= 2 && german > english;
}
