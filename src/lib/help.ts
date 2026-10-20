import type { Role } from '$lib/gql/__generated__/graphql';
import { isActive } from '$lib/navigation';
import type { GuideLink } from '$lib/guide';

/**
 * Short answers to the questions that come up once a semester and are forgotten by the next.
 *
 * Data for the same reasons as `$lib/guide.ts`, and checked the same way: every `href` must be a
 * route the navigation knows, and the help panel links it only where the menu would. The guide
 * tells the process in order; these answer a question somebody already has, which is why they
 * are phrased as questions and sorted by the page they belong to rather than by the process.
 *
 * What an answer claims is a rule of the backend, as on the start page. Where it is an agreement
 * of the faculty that nothing enforces (laboratory-based courses last), it says so.
 */
export type HelpEntry = {
	question: string;
	answer: string;
	/** Whom it concerns. Empty means everybody with an account. */
	who: readonly Role[];
	/** Where it is done. The first entry is also the page the answer belongs to. */
	where: readonly GuideLink[];
	/**
	 * When in a lecturer's year the question comes up, for the how-tos on the introduction page.
	 * Only on entries that concern lecturers; absent means the introduction leaves it out.
	 */
	stage?: HelpStage;
};

/**
 * Once (and corrected afterwards), every semester while wishes are collected, and after the
 * assignment. The three moments a lecturer meets Tallox at all.
 */
export type HelpStage = 'ONCE' | 'EACH_SEMESTER' | 'AFTERWARDS';

export const HELP: readonly HelpEntry[] = [
	{
		question: 'Wie schließe ich die Wunschrunde meiner Fachgruppe, und wie öffne ich sie wieder?',
		answer:
			'Auf der Zuteilungsseite, je Fachgruppe und Semester. Offen ist sie von Anfang an: freischalten muss niemand etwas. Wer schließt, arbeitet ab dann mit dem, was eingetragen wurde. Wieder öffnen geht jederzeit.',
		who: ['SUBJECT_GROUP_LEAD'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wie melde ich, dass der Bedarf meines Studiengangs steht?',
		answer:
			'Auf der Bedarfsseite mit „Bedarf ist fertig“. Das ist eine Ansage an die Fachgruppen, keine Sperre: der Bedarf bleibt änderbar, und die Meldung lässt sich zurücknehmen. Im Studiengangs-Review heißt die entsprechende Ansage „Review fertig“.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/bedarf', label: 'Bedarf' }]
	},
	{
		question: 'Warum lässt sich für ein Modul keine Instanz anlegen?',
		answer:
			'Meist fehlt die SWS-Aufteilung: wie sich die SWS des Moduls auf Vorlesung, Praktikum und Übung verteilen. Das Prüfungsamt liefert sie nicht, deshalb trägt sie die Studiengangsleitung des Heimatstudiengangs oder die Fachgruppenleitung des Moduls einmal auf der Modulseite ein. Fehlt sie, schlägt Tallox eine vor, die auf der Bedarfsseite bestätigt oder korrigiert wird.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [
			{ href: '/bedarf', label: 'Bedarf' },
			{ href: '/module', label: 'Modulkatalog' }
		]
	},
	{
		question: 'Wie halten zwei Studiengänge eine Vorlesung gemeinsam?',
		answer:
			'Bietet ein anderer Studiengang dasselbe Modul an, wird es automatisch gemeinsam gehalten, und es zahlt der Studiengang, der die Veranstaltung hält. Wer eine eigene Variante will, plant sie separat und zahlt sie selbst.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/bedarf', label: 'Bedarf' }]
	},
	{
		question: 'Wie viele FWP kann sich mein Studiengang leisten?',
		answer:
			'Das SWS-Controlling unter Statistik stellt die Lehre je Studiengang dem Kontingent des Studienjahres gegenüber. Gezählt wird, was die Lehre kostet: jede Praktikumsgruppe einzeln, eine gemeinsam gehaltene Vorlesung einmal.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/statistik', label: 'Statistik' }]
	},
	{
		question: 'Wo gebe ich an, in welchen Fächern ich arbeite?',
		answer:
			'Unter „Meine Lehre → Fachgruppen“, einmal und nicht jedes Semester. Das ist eine Aussage über Dich und keine Berechtigung: die Wunschseite zeigt Deine Fachgruppen zuerst, eintragen kannst Du Dich trotzdem überall.',
		who: [],
		where: [{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' }],
		stage: 'ONCE'
	},
	{
		question: 'Wie trage ich einen Wunsch ein, und wie ziehe ich ihn zurück?',
		answer:
			'Auf der Wunschseite das Semester wählen und an der Instanz eine Stufe setzen: „unbedingt“, „gerne“ oder „notfalls“, bei Bedarf mit Notiz. Die Stufe auf „—“ zu stellen zieht die Eintragung zurück. Das geht, solange die Fachgruppe des Moduls ihre Wunschrunde nicht geschlossen hat und das Semester nicht abgeschlossen ist.',
		who: [],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wer sieht meine Wünsche?',
		answer:
			'Bis zur Veröffentlichung nur Du, die Leitung des Studiengangs der Instanz, die Leitung der Fachgruppe des Moduls und das Dekanat. Alle anderen sehen nichts davon, auch keine Anzahl. Ab der Veröffentlichung durch das Dekanat sieht das ganze Kollegium alle Eintragungen des Semesters.',
		who: [],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wie sage ich, dass ich nur die Vorlesung oder nur ein Praktikum halten möchte?',
		answer:
			'In der Notiz zum Wunsch. Gewünscht wird die Instanz, also etwa ein Modul für einen Zug; wer welchen Teil hält, legt die Fachgruppenleitung erst bei der Zuteilung fest, weil das eine Absprache zwischen mehreren ist.',
		who: [],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Lässt sich die Veröffentlichung der Wünsche oder der Zuteilung zurücknehmen?',
		answer:
			'Nein. Beide Veröffentlichungen schaltet das Dekanat auf der Semesterseite, und beide sind endgültig. Die Phase dagegen lässt sich in beide Richtungen umschalten.',
		who: ['DEANS_OFFICE'],
		where: [{ href: '/semester', label: 'Semester und Phasen' }]
	},
	{
		question: 'Wie teile ich Lehrbeauftragte zu, die kein Tallox-Konto haben?',
		answer:
			'Auf der Zuteilungsseite wie alle anderen: zur Auswahl stehen auch Lehrende, die hier kein Konto haben. Ein Konto brauchen sie dafür nicht.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wann werden projektbasierte Lehrveranstaltungen vergeben?',
		answer:
			'Zuletzt, damit sie nicht als Lückenfüller vergeben werden. Das ist eine Verabredung der Fakultät; Tallox erzwingt es nicht.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Kann im Studiengangs-Review noch etwas geändert werden?',
		answer:
			'Ja, Bedarf, Zuschnitt und Zuteilung bleiben änderbar, bis das Semester abgeschlossen ist. Soll eine Vorlesung zusammengelegt werden, die schon besetzt ist, wird zuerst die Zuteilung gelöst.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [
			{ href: '/bedarf', label: 'Bedarf' },
			{ href: '/zuteilung', label: 'Zuteilung' }
		]
	},
	{
		question: 'Ich habe eine Leitungsrolle, sehe aber keine Studiengänge oder Fachgruppen.',
		answer:
			'Studiengangs- und Fachgruppenleitung gelten immer für bestimmte Studiengänge bzw. Fachgruppen. Ohne Zuordnung darf die Rolle nichts, nicht alles. Welche Zuordnung Du hast, steht unter „Meine Rollen“; ergänzen kann sie die Administration.',
		who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD'],
		where: [{ href: '/konto/rollen', label: 'Meine Rollen' }]
	},
	{
		question: 'Jemand hat eine HM-Kennung, kommt aber nicht hinein.',
		answer:
			'Zugang hat, wer in Tallox als Person eingetragen ist, nicht jede gültige Kennung. Lehrende aus der Liste des Prüfungsamts lässt die Administration per Schalter zu, alle anderen legt sie an.',
		who: [],
		where: [{ href: '/verwaltung/personen', label: 'Personen und Rollen' }]
	},
	{
		question: 'Warum sieht jemand etwas nicht, das ich sehe?',
		answer:
			'Die Diagnose beantwortet genau diese Frage: mit den Entscheidungen und ihren Gründen, nicht mit den Inhalten. Meist ist es eine fehlende Zuordnung zu Studiengang oder Fachgruppe, oder die Wünsche sind noch nicht veröffentlicht.',
		who: ['ADMIN'],
		where: [{ href: '/verwaltung/diagnose', label: 'Diagnose' }]
	},
	{
		question: 'Wo gebe ich an, welche Module ich halten kann?',
		answer:
			'Unter „Meine Kompetenzen“, einmal und nicht jedes Semester. Die Fakultät bittet um mindestens drei Pflichtfächer je Fachgruppe. Das sehen nur Du, die zuständigen Leitungen und das Dekanat.',
		who: [],
		where: [{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' }],
		stage: 'ONCE'
	},
	{
		question: 'Wo sehe ich, was ich tatsächlich halte?',
		answer:
			'Unter „Meine Lehre → Zuteilungen“: jeder Teil, der Dir zugeteilt ist, je Semester mit der Summe der SWS. Solange die Zuteilung eines Semesters nicht veröffentlicht ist, steht dort „Entwurf“ — die Fachgruppenleitung kann noch umplanen.',
		who: ['LECTURER'],
		where: [{ href: '/konto/zuteilungen', label: 'Meine Zuteilungen' }],
		stage: 'AFTERWARDS'
	},
	{
		question: 'Wer hält welche Veranstaltung?',
		answer:
			'Unter „Zuteilung → Übersicht“, nur zum Lesen: je Studiengang, Modul und Kohorte, wer welchen Teil hält. Sichtbar, sobald das Dekanat die Zuteilung des Semesters veröffentlicht hat; vorher ist sie ein Entwurf, und nur die eigenen Teile stehen unter „Meine Zuteilungen“.',
		who: [],
		where: [{ href: '/zuteilung/uebersicht', label: 'Zuteilung, Übersicht' }],
		stage: 'AFTERWARDS'
	},
	{
		question: 'Wo gebe ich an, wie viele SWS ich halten möchte?',
		answer:
			'Auf der Wunschseite, über der Tabelle, je Semester. Leer heißt „nicht angegeben“, 0 ist eine Angabe. Das lesen nur Du, die Leitungen Deiner Fachgruppen und das Dekanat; bei der Zuteilung steht es neben Deinem Namen.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wie kennzeichne ich ein Modul als PBLV?',
		answer:
			'Auf der Modulseite unter „Projektbasierte Lehrveranstaltung (PBLV)“. Das dürfen die Fachgruppenleitung des Moduls, die Studiengangsleitung seines Heimatstudiengangs und das Dekanat. Gekennzeichnete PBLVs stehen bei der Zuteilung am Ende.',
		who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/module', label: 'Modulkatalog' }]
	},
	{
		question: 'Welche Wahlpflichtmodule eines Korbs laufen in diesem Semester?',
		answer:
			'Unter Statistik, Abschnitt „Wahlpflicht nach Korb“, für den gewählten Studiengang: eigene und fremde Module, je Korb der Prüfungsordnung mit den SWS. Ein Modul in zwei Körben steht in beiden.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/statistik', label: 'Statistik' }]
	},
	{
		question: 'Wie lasse ich jemanden einer Partnerfakultät zu?',
		answer:
			'Unter Personen und Rollen: Konto anlegen, nur die Rolle Partnerfakultät vergeben, speichern, dann die Studiengänge ankreuzen, denen die Person folgt. Ohne Studiengang liest sie nichts. Bekommt sie zusätzlich eine andere Rolle, gehört sie zum Kollegium und sieht alles wie alle anderen.',
		who: ['ADMIN'],
		where: [{ href: '/verwaltung/personen', label: 'Personen und Rollen' }]
	}
];

/** Whether an entry concerns somebody with these roles. */
export function concerns(entry: HelpEntry, roles: readonly string[]): boolean {
	return entry.who.length === 0 || entry.who.some((role) => roles.includes(role));
}

/**
 * The entries for this person on this page: first the ones about the page they are on, then the
 * rest that concerns them.
 *
 * "About the page" is any of the entry's places, matched the way the navigation marks an entry
 * active, so `/bedarf/sws` still counts as the demand page. Nothing that concerns somebody is
 * hidden — a question about the assignment is still worth finding on the start page.
 */
export function helpFor(
	roles: readonly string[],
	pathname: string
): { here: HelpEntry[]; more: HelpEntry[] } {
	const mine = HELP.filter((entry) => concerns(entry, roles));
	const isHere = (entry: HelpEntry) =>
		entry.where.some((link) =>
			isActive({ emoji: '', label: '', hint: '', href: link.href }, pathname)
		);
	return { here: mine.filter(isHere), more: mine.filter((entry) => !isHere(entry)) };
}

/** The routes the help names, for the test that checks them against the navigation. */
export function helpRoutes(): string[] {
	return [...new Set(HELP.flatMap((entry) => entry.where.map((link) => link.href)))].filter(
		(href): href is NonNullable<typeof href> => !!href
	);
}
