import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The faculty writes gender-neutral German without typographic marks: "Dozierende", "das
 * Kollegium", "alle" — never "Dozent:in", "Kolleg*innen", "jede:r" or "er oder sie". Whoever
 * adds a sentence will reach for the form they are used to, so the rule is checked here rather
 * than remembered. Comments are scanned too: the German examples in them are the ones that get
 * copied into the next label.
 */
const FORBIDDEN: { name: string; pattern: RegExp }[] = [
	{ name: 'gender mark before -in/-innen', pattern: /\p{L}[:*_/](?:in|innen)\b/u },
	{ name: 'binnen-I', pattern: /\p{Ll}Innen\b/u },
	{
		name: 'gender mark on an article or pronoun',
		pattern: /\b(?:jede|eine|keine|ein|kein|die|der|des|dem|den)[:*_/](?:r|n|s|m)\b/iu
	},
	{
		name: 'paired pronoun',
		pattern: /\b(?:er oder sie|sie oder er|ihm oder ihr|ihr oder ihm)\b/iu
	},
	// The generic masculine about a person — "bevor er sich einträgt" about anybody at all. Narrow,
	// because "er" is also the Studiengang or the Vorschlag of the sentence before; the reflexive
	// after a conjunction is the shape the person-sentences take. The same pattern as the backend's
	// internal/arch/wording_test.go.
	{
		name: 'generic masculine',
		pattern: /\b(?:bevor|ob|wenn|dass|weil|damit|sobald|sodass) er sich\b/iu
	},
	// The interface says "Du". Narrow on purpose: "Sie wird einmal eingetragen" is the pronoun, and
	// "Ihre Leitung" after a subject group is its leadership — neither is addressing the reader.
	{
		name: 'formal address',
		pattern:
			/\b(?:[Ss]ind|[Ll]eiten|[Kk]önnen|[Dd]ürfen|[Hh]aben|[Mm]öchten|[Mm]üssen|[Ll]esen|[Tt]reten) Sie\b|\b(?:die|denen|wenn|ob) Sie\b|\b(?:mit|bei|von) Ihnen\b|\bIhre[nrms]? (?:Studiengang|Studiengänge|Studiengangs|Fachgruppe|Fachgruppen|Studiengangsleitung|Fachgruppenleitung)\b/u
	}
];

const ROOT = join(process.cwd(), 'src');
const SKIP = new Set(['__generated__']);

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : sources(path);
		return /\.(ts|svelte|html)$/.test(entry.name) && !entry.name.endsWith('wording.test.ts')
			? [path]
			: [];
	});
}

describe('German wording', () => {
	it('uses neutral forms instead of gender marks', () => {
		const findings = sources(ROOT).flatMap((file) =>
			readFileSync(file, 'utf8')
				.split('\n')
				.flatMap((line, i) =>
					FORBIDDEN.filter(({ pattern }) => pattern.test(line)).map(
						({ name }) => `${relative(process.cwd(), file)}:${i + 1} ${name}: ${line.trim()}`
					)
				)
		);
		expect(findings, findings.join('\n')).toEqual([]);
	});

	it.each([
		['Dozent:in', true],
		['Kolleg*innen', true],
		['Kolleg/innen', true],
		['KollegInnen', true],
		['jede:r', true],
		['was er oder sie tut', true],
		['Dozierende', false],
		['das Kollegium', false],
		['class="sm:inline"', false],
		['<div in:fade>', false],
		['Diesen Studiengang leiten Sie nicht.', true],
		['gemeinsam mit Ihnen anbieten', true],
		['Ihre Studiengangsleitung ist noch keinem Studiengang zugeordnet', true],
		['Treten Sie zuerst der Fachgruppe bei.', true],
		['in eine Fachgruppe, die Sie leiten', true],
		['Sie wird einmal eingetragen', false],
		['Ihre Leitung besetzt die Instanzen ihrer Module', false],
		['ob ein Fach besetzt ist, bevor er sich einträgt', true],
		['bevor man sich einträgt', false],
		['Wer hier steht, hat eine HM-Kennung', false],
		['ob er zum Bachelor oder zum Master führt', false]
	])('classifies %s', (text, forbidden) => {
		expect(FORBIDDEN.some(({ pattern }) => pattern.test(text))).toBe(forbidden);
	});
});
