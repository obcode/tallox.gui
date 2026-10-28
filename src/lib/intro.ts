import type { Phase } from '$lib/gql/__generated__/graphql';
import type { GuideLink } from '$lib/guide';
import { concerns, HELP, type HelpEntry, type HelpStage } from '$lib/help';
import type { PlanningState } from '$lib/planning';

/**
 * The introduction: what Tallox is for, what it promises, and how a semester runs — told to
 * somebody who teaches and plans nothing.
 *
 * Data for the same reasons as `$lib/guide.ts` and `$lib/help.ts`. The links are checked against
 * the navigation and rendered only where the menu would show them; and the text is the corpus a
 * later assistant answers from, so it should exist once and in one place.
 *
 * It repeats nothing it can borrow. The how-tos are the help panel's entries for lecturers,
 * grouped by `stage`; the process for every role is `/ablauf`. What is written here is only what
 * neither of them says: the ideas, and each phase seen from somebody who teaches.
 *
 * Whatever changes in what a lecturer sees or may do changes here as well — and in the help and
 * the walk-through. That is the rule in the workspace `CLAUDE.md`, not a hope.
 */

export type IntroPromise = { title: string; text: string };

/**
 * The three rules that carry the project, said the way they matter to the colleagues they
 * protect rather than the way the policy implements them.
 */
export const PROMISES: readonly IntroPromise[] = [
	{
		title: 'Wünsche sind vertraulich, bis sie veröffentlicht werden',
		text: 'Bis das Dekanat die Wünsche eines Semesters veröffentlicht, sehen Deine Eintragungen nur Du, die zuständigen Leitungen von Studiengang und Fachgruppe und das Dekanat. Alle anderen sehen nichts davon, auch keine Anzahl und keine Markierung „hier gibt es schon Interesse“. Der Zweck: kein Windhundverfahren. Wer neu ist, soll sich für ein Fach eintragen können, ohne dass es wie ein Angriff auf jemanden wirkt, der es seit Jahren hält. Auch nach der Veröffentlichung bleiben die Notiz und der Zeitpunkt der Eintragung bei den Zuständigen; alle sehen nur, wer sich wo eingetragen hat.'
	},
	{
		title: 'Personaldaten bleiben bei denen, die sie sehen dürfen',
		text: 'Tallox hat eine offene Schnittstelle für eigene Auswertungen. Ein normales Token gibt, was Personen betrifft, nichts heraus: keine unveröffentlichten Wünsche anderer, keine gewünschten und eingeplanten SWS anderer, nicht die Liste „SWS im Kollegium“. Ein Token in einem Skript liest still und in großer Menge; eine Anmeldung im Browser ist einer Person zuzuordnen. Wer über die Schnittstelle planen will, etwa mit einem KI-Assistenten, legt ausdrücklich ein Planungs-Token an: Es kann so viel wie die Person im Browser, nicht mehr, gilt höchstens 90 Tage und steht jeden Tag im Zugriffsbericht. Die Verwaltung von Personen und Rollen, die Tokens selbst und das Zugriffsprotokoll erreicht kein Token.'
	},
	{
		title: 'Die Regeln stehen im Server, nicht in der Oberfläche',
		text: 'Was Du sehen und ändern darfst, entscheidet der Server, und zwar für die Oberfläche und die Schnittstelle gleich. Ein Knopf, der fehlt, ist nur die Folge davon. Es gibt keine Rolle, die alles sieht, auch die Administration liest vor der Veröffentlichung keine Wünsche. Muss sie doch hineinsehen, kann sie sich die Rolle Dekanat oder eine Leitung nur befristet geben, höchstens 30 Tage, und das steht jeden Tag im Zugriffsbericht.'
	}
];

export type IntroPhase = {
	phase: Phase;
	/** What happens in the faculty. */
	happens: string;
	/** What it means for somebody who teaches. */
	forYou: string;
	where: readonly GuideLink[];
};

/** The five phases, seen from a lecturer. In the order of `PHASE_ORDER`, which a test checks. */
export const PHASES: readonly IntroPhase[] = [
	{
		phase: 'DEMAND_PLANNING',
		happens:
			'Die Studiengangsleitungen legen fest, welche Instanzen im Semester angeboten werden: welches Modul, für welchen Studiengang, in wie vielen Zügen und mit wie vielen Praktikumsgruppen.',
		forYou:
			'Noch nichts Bestimmtes. Eine gute Zeit, einmal die eigenen Fachgruppen und Kompetenzen anzugeben, falls das noch fehlt; was fehlt, zeigt die Startseite unter „Dein Stand“. Die Wunsch-SWS für das Semester lassen sich auch schon jetzt angeben.',
		where: [
			{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' },
			{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' },
			{ href: '/wuensche', label: 'Wünsche' }
		]
	},
	{
		phase: 'WISHES',
		happens:
			'Das Kollegium bekundet Interesse an den Instanzen. Jede Fachgruppe sammelt in ihrer eigenen Wunschrunde; die ist offen, bis die Fachgruppenleitung sie schließt.',
		forYou:
			'Jetzt bist Du dran: an jeder Instanz, die Du halten würdest, „unbedingt“, „gerne“ oder „notfalls“ setzen, und wenn Du nur die Vorlesung oder nur ein Praktikum möchtest, das in die Notiz schreiben. Würdest Du von einem Modul nur einen der Züge übernehmen, egal welchen, trag Dich für alle ein und wähle unter dem Modulnamen „Davon übernehme ich: nur einen“. Über der Tabelle gibst Du an, wie viele SWS modulbehaftete Lehre Du in dem Semester übernehmen möchtest, als Bereich von–bis, bis zum Stichtag des Dekanats. Bis zur Veröffentlichung sieht das niemand außer den Zuständigen; danach sieht das ganze Kollegium die Bereiche unter „SWS im Kollegium“.',
		where: [{ href: '/wuensche', label: 'Wünsche' }]
	},
	{
		phase: 'ASSIGNMENT',
		happens:
			'Die Fachgruppenleitungen besetzen die Instanzen, Teil für Teil: wer die Vorlesung hält und wer welches Praktikum, im Regelfall eine Person für alle Teile eines Zuges. Dabei sehen sie die Wünsche, die Kompetenzen und, für die Mitglieder ihrer Fachgruppen, die gewünschten SWS und wie viel jemand schon eingeplant ist, auch in anderen Fachgruppen.',
		forYou:
			'Unter „Meine Lehre → Zuteilungen“ steht schon während der Zuteilung, was Dir zugeteilt ist, als Entwurf markiert, bis das Dekanat die Zuteilung veröffentlicht. Ändern kann sie sich auch danach noch, bis das Semester vorbei ist, etwa wenn jemand ausfällt.',
		where: [{ href: '/konto/zuteilungen', label: 'Meine Zuteilungen' }]
	},
	{
		phase: 'REVIEW',
		happens:
			'Die Studiengangsleitungen prüfen ihren Studiengang noch einmal gegen das SWS-Kontingent: Vorlesungen zusammenlegen, Gruppen streichen, Lücken schließen. Bis das Semester vorbei ist, bleibt alles änderbar, auch wenn kurz vor Beginn jemand ausfällt.',
		forYou:
			'Ist die Zuteilung veröffentlicht, steht unter „Zuteilung → Übersicht“, wer was hält. Deine eigene Lehre siehst Du weiter unter „Meine Zuteilungen“.',
		where: [
			{ href: '/konto/zuteilungen', label: 'Meine Zuteilungen' },
			{ href: '/zuteilung/uebersicht', label: 'Zuteilung, Übersicht' }
		]
	},
	{
		phase: 'FINAL',
		happens:
			'Das Semester ist vorbei. Der Plan ist das Protokoll dessen, was gelehrt wurde, und wird nicht mehr geändert.',
		forYou: 'Nichts mehr zu tun. Das nächste Semester wird schon geplant.',
		where: []
	}
];

/**
 * Whether a phase is where the planning semester stands, for the mark on the timeline.
 *
 * Nothing is marked while no planning semester has been named or the backend did not answer —
 * a mark on the first phase would claim something nobody decided.
 */
export function isCurrentPhase(phase: Phase, planning: PlanningState): boolean {
	return planning.kind === 'set' && planning.phase === phase;
}

export type IntroTerm = { term: string; text: string };

/** The words a lecturer meets on the first visit, and nothing a lead only needs. */
export const GLOSSARY: readonly IntroTerm[] = [
	{
		term: 'Instanz',
		text: 'Ein Modul in einem Semester, für einen Studiengang und einen Zug, etwa „IF2A, Softwareentwicklung II“. Geplant und gewünscht werden Instanzen, nicht Module.'
	},
	{
		term: 'Zug',
		text: 'Die Parallelkohorte eines Fachsemesters: IF2A und IF2B. Bei einzügigen Modulen gibt es keinen Buchstaben.'
	},
	{
		term: 'Teil',
		text: 'Vorlesung, Praktikum oder Seminar einer Instanz. Gewünscht wird die Instanz, zugeteilt wird der Teil, denn Vorlesung und Praktikum können von verschiedenen Personen gehalten werden.'
	},
	{
		term: 'SWS',
		text: 'Semesterwochenstunden. Gezählt wird, was eine Lehrperson für einen Teil gutgeschrieben bekommt, also jede Praktikumsgruppe einzeln. Ein 4-SWS-Modul mit einer Vorlesung und drei Praktikumsgruppen kostet die Fakultät deshalb mehr als 4 SWS je Zug.'
	},
	{
		term: 'Wunsch-SWS',
		text: 'Wie viele SWS modulbehaftete Lehre jemand in einem Semester übernehmen möchte, ohne Abschlussarbeiten, als Bereich von–bis. Zum Stichtag friert das Dekanat die Angaben ein, die Fakultätsleitung prüft sie, dann sieht sie das ganze Kollegium. Keine Ampel und kein Deputat: nur die eigene Angabe.'
	},
	{
		term: 'Fachgruppe',
		text: 'Die fachliche Gruppierung von Modulen und Personen, etwa Mathematik oder Softwarefächer. Ihre Leitung besetzt die Instanzen ihrer Module.'
	},
	{
		term: 'Kompetenz',
		text: 'Welche Module Du halten kannst, auch kurzfristig, und für welche Du Dich interessierst, Dich aber erst einarbeiten müsstest. Einmal angegeben, nicht jedes Semester.'
	},
	{
		term: 'PBLV',
		text: 'Praxisbegleitende Lehrveranstaltung. Nach Verabredung der Fakultät werden sie zuletzt vergeben, damit sie nicht als Lückenfüller enden.'
	}
];

export const STAGE_TITLES: Record<HelpStage, string> = {
	ONCE: 'Einmal',
	EACH_SEMESTER: 'Jedes Semester, in der Wunschphase',
	AFTERWARDS: 'Nach der Zuteilung'
};

const STAGES: readonly HelpStage[] = ['ONCE', 'EACH_SEMESTER', 'AFTERWARDS'];

/**
 * The how-tos for somebody who teaches: the help panel's entries for lecturers, grouped by when
 * the question comes up. Borrowed rather than written again, so the answer on this page and in
 * the panel cannot differ.
 */
export function howtos(): { stage: HelpStage; title: string; entries: HelpEntry[] }[] {
	const mine = HELP.filter((entry) => entry.stage && concerns(entry, ['LECTURER']));
	return STAGES.map((stage) => ({
		stage,
		title: STAGE_TITLES[stage],
		entries: mine.filter((entry) => entry.stage === stage)
	}));
}

/** The routes the introduction names, for the test that checks them against the navigation. */
export function introRoutes(): string[] {
	return [...new Set(PHASES.flatMap((p) => p.where.map((link) => link.href)))].filter(
		(href): href is NonNullable<typeof href> => !!href
	);
}
