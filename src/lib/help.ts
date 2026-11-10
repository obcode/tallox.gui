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
		question: 'Wie bekomme ich eine Mail, wenn ein Modul (wieder) angeboten wird?',
		answer:
			'Auf der Modulseite mit 🔔 „Benachrichtigen, wenn angeboten“. Die Mail kommt, sobald das Modul in einem Semester im Bedarf eines Studiengangs steht und dieser Studiengang seinen Bedarf freigegeben hat, und zwar in jedem Semester wieder, bis Du die Glocke ausschaltest. Ein Modul, das jemand nur probeweise anklickt, löst nichts aus: gemeldet wird, was zehn Minuten Bestand hat. Für mehrere Module auf einmal gibt es unter Mail die Abos für Deine Kompetenzen, Deine Fachgruppen oder einen Studiengang.',
		who: [],
		where: [
			{ href: '/module', label: 'Modulkatalog' },
			{ href: '/konto/benachrichtigungen', label: 'Mail' }
		],
		stage: 'ONCE'
	},
	{
		question: 'Wann schickt mir Tallox eine Mail, und was steht darin?',
		answer:
			'Nur wenn Du es abonniert hast — ohne Abo kommt nichts, auch nichts über Dich selbst. Gemeldet wird nur, was offiziell ist: eine Freigabe des Bedarfs, eine Wunschrunde, die öffnet oder schließt, eine Veröffentlichung, eine neue Phase, die Frist zum Bestätigen Deiner Zuteilungen. Mehreres auf einmal kommt gebündelt in einer Mail, auf Wunsch einmal am Morgen. Wer sich wofür interessiert, steht in keiner Mail, auch nicht als Anzahl. Die Mails gehen an die Adresse, mit der Du Dich über die HM-Anmeldung einloggst. Pausieren und abbestellen geht unter Mail.',
		who: [],
		where: [{ href: '/konto/benachrichtigungen', label: 'Mail' }],
		stage: 'ONCE'
	},
	{
		question:
			'Wie schreibe ich eine Rundmail an meine Fachgruppe oder an die Lehrenden meines Studiengangs?',
		answer:
			'Unter Mail über „Rundmails lesen und schreiben“. Die Fachgruppenleitung schreibt an die Mitglieder ihrer Fachgruppe, die Studiengangsleitung an alle, die im Semester in ihrem Studiengang zugeteilt sind oder sich eingetragen haben, das Dekanat an das ganze Kollegium, und alle Leitungen an alle Leitungen. Jede Person bekommt die Mail einzeln, Antworten gehen an Dich. „Vorschau“ zeigt die Mail, wie sie ankommt, und wie viele sie erreicht; erst danach lässt sie sich verschicken. Abonnieren muss die Rundmail niemand, abbestellen kann sie niemand. Verschicken geht nur im Browser, nicht über ein Token, und höchstens zehnmal am Tag.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE', 'ADMIN'],
		where: [{ href: '/konto/benachrichtigungen', label: 'Mail' }]
	},
	{
		question: 'Wie schließe ich die Wunschrunde meiner Fachgruppe, und wie öffne ich sie wieder?',
		answer:
			'Auf der Zuteilungsseite, je Fachgruppe und Semester. Offen ist sie von Anfang an: freischalten muss niemand etwas. Wer schließt, arbeitet ab dann mit dem, was eingetragen wurde. Wieder öffnen geht jederzeit. Das Dekanat kann die Wünsche eines Semesters erst veröffentlichen, wenn alle Fachgruppen mit Instanzen ihre Runde geschlossen haben; eine offene Runde hält die Veröffentlichung für alle auf. Wer nach der Veröffentlichung wieder öffnet, macht jede neue Eintragung sofort sichtbar; die Seite fragt deshalb noch einmal nach. Bitte nur in Absprache mit dem Dekanat.',
		who: ['SUBJECT_GROUP_LEAD'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wie sehe ich als Administration in unveröffentlichte Wünsche hinein?',
		answer:
			'Gar nicht mit der Administration allein: sie liest bewusst keine Wünsche. Wer hineinsehen muss, gibt sich unter Personen und Rollen die Rolle Dekanat oder eine Leitung, sich selbst aber nur mit „Befristet bis“, höchstens 30 Tage; ohne Datum lehnt Tallox das ab. Solange die Rolle gilt, steht sie jede Nacht im Zugriffsbericht. Anderen Personen lässt sich jede Rolle auch unbefristet geben — die Administrationsrolle sogar nur so: sie ist die Rolle, die alle anderen wieder hereinlässt, und lässt sich deshalb nicht befristen.',
		who: ['ADMIN'],
		where: [{ href: '/verwaltung/personen', label: 'Personen und Rollen' }]
	},
	{
		question: 'Wie gebe ich den Bedarf meines Studiengangs für Wünsche frei?',
		answer:
			'Auf der Bedarfsseite mit „Bedarf fertig, für Wünsche freigeben“. Erst danach können sich Dozierende auf die Module Deines Studiengangs eintragen; vorher erscheinen sie auf der Wunschseite nicht. Mit der Freigabe werden die Vormerkungen für Deinen Studiengang zu Wünschen auf jedem Zug des Moduls; wer ein Modul vorgemerkt hat, das Du nicht anbietest, sieht „nicht angeboten“. Die erste Freigabe eines Studiengangs schaltet das Semester von selbst in die Wunschphase; das Dekanat muss dafür nichts umschalten. Der Bedarf bleibt änderbar, und die Freigabe lässt sich zurücknehmen; das Semester bleibt dann in der Wunschphase. Dann kann sich niemand mehr neu eintragen, und was schon eingetragen ist, bleibt stehen, lässt sich aber erst nach erneuter Freigabe ändern. Im Studiengangs-Review heißt die entsprechende Ansage „Review fertig“; die sperrt nichts.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/bedarf', label: 'Bedarf' }]
	},
	{
		question: 'Kann ich nach der Wunschrunde noch Züge ergänzen oder zusammenlegen?',
		answer:
			'Ja, bis das Semester abgeschlossen ist. Wer einem Modul, das weiter angeboten wird, einen Zug wegnimmt, legt zusammen: die Wünsche für den wegfallenden Zug gehen auf einen verbleibenden über. Wer beide Züge gewünscht hat, behält einen Wunsch mit der stärkeren Stufe und beiden Notizen. Ist dem wegfallenden Zug schon jemand zugeteilt, wird zuerst die Zuteilung gelöst. Ein Modul ganz zu streichen geht erst, wenn niemand mehr dafür eingetragen ist.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/bedarf', label: 'Bedarf' }]
	},
	{
		question: 'Warum lässt sich für ein Modul keine Instanz anlegen?',
		answer:
			'Meist fehlt die SWS-Aufteilung: wie sich die SWS des Moduls auf Vorlesung, Praktikum und Übung verteilen. Das ZPA liefert sie nicht, deshalb trägt sie die Studiengangsleitung des Heimatstudiengangs, die Fachgruppenleitung des Moduls oder das Dekanat einmal auf der Modulseite ein. Fehlt sie, schlägt Tallox eine vor, die auf der Bedarfsseite bestätigt oder korrigiert wird. Abschlussarbeiten, die praktischen Studiensemester und das Bachelorseminar werden gar nicht geplant, weil Studierende sie direkt mit einer Lehrperson vereinbaren: Sie stehen nicht in der Bedarfstabelle, und in der Suche nach Modulen anderer Studiengänge steht an ihnen „wird nicht geplant“. Was davon schon früher im Bedarf stand, bleibt sichtbar und lässt sich herausnehmen.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [
			{ href: '/bedarf', label: 'Bedarf' },
			{ href: '/module', label: 'Modulkatalog' }
		]
	},
	{
		question:
			'Wie lege ich eine eigene Lehrveranstaltung oder einen FWP-Platzhalter an, und wer besetzt sie?',
		answer:
			'Auf der Bedarfsseite unter „Eigene Lehrveranstaltung oder FWP-Platzhalter anlegen“: für ein Fach, das nicht im ZPA steht, oder als Platzhalter, solange das konkrete FWP noch nicht feststeht. Drei FWP sind drei Züge eines Platzhalters. Angelegt und für das Semester angemeldet wird in einem Schritt. Unter „Fachgruppe“ lässt sich jede Fachgruppe wählen, nicht nur eine eigene: deren Leitung besetzt die Lehrveranstaltung dann auf der Zuteilungsseite und liest vor der Veröffentlichung die Wünsche darauf. Mit „noch keine“ steht sie bei der Zuteilung unter „ohne Fachgruppe“, und die Studiengangsleitung kann sie dort selbst besetzen. Ist die Fachgruppe falsch, korrigieren das die Fachgruppenleitungen oder das Dekanat im Modulkatalog; die Studiengangsleitung kann eine angelegte Lehrveranstaltung nicht mehr umhängen.',
		who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'DEANS_OFFICE'],
		where: [
			{ href: '/bedarf', label: 'Bedarf' },
			{ href: '/module', label: 'Modulkatalog' }
		]
	},
	{
		question: 'Welche Module stehen im Bedarf, und was zählt „Aufteilung(en) geschätzt“?',
		answer:
			'Im Bedarf steht, was einen Haken hat. „Anzeigen“ filtert nur, welche Module die Tabelle zeigt, und legt nichts an. Ein versehentlich gesetzter Haken lässt sich wieder entfernen. Der Hinweis „… Aufteilung(en) geschätzt“ über der Tabelle zählt nur Module mit Haken, deren SWS-Aufteilung noch ein Vorschlag von Tallox ist; ein Klick darauf zeigt alle Module mit geschätzter Aufteilung.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/bedarf', label: 'Bedarf' }]
	},
	{
		question:
			'Ich habe die SWS-Aufteilung geändert, aber der Bedarf zeigt noch die alten SWS. Warum?',
		answer:
			'Eine Instanz übernimmt die Aufteilung, wenn sie angelegt oder eine Gruppe ergänzt wird, und behält ihre SWS danach, auch wenn sich die Aufteilung später ändert. Die Bedarfsseite sagt das: in der Zeile steht „nicht übertragen“ mit beiden Zahlen, beim Bearbeiten neben „(gespeichert …)“. Wer die Aufteilung ändern darf (Studiengangsleitung des Heimatstudiengangs, Fachgruppenleitung des Moduls, Dekanat), überträgt sie mit „Vorschau: übertragen“ und dann „Jetzt übertragen“, oder auf der Modulseite unter „Bestehende Instanzen“. Nach „Aufteilung ändern“ auf der Bedarfsseite fragt Tallox von selbst. Übertragen wird auf alle Instanzen des Moduls in laufenden Semestern, in allen Studiengängen; von Hand geänderte SWS werden überschrieben, besetzte Teile nicht entfernt. Die Vorschau zeigt vorher, was sich ändert.',
		who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'DEANS_OFFICE'],
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
			'Das SWS-Controlling unter Statistik stellt die Lehre je Studiengang dem Kontingent des Studienjahres gegenüber. Gezählt wird, was die Lehre kostet: jede Praktikumsgruppe einzeln, eine gemeinsam gehaltene Vorlesung einmal. Über der Tabelle des Studienjahres zeigt ein Balken je Studiengang, wie viel Winter- und Sommersemester vom Kontingent verbrauchen.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/statistik', label: 'Statistik' }]
	},
	{
		question: 'Wie viele SWS deckt mein Studiengang über Lehraufträge?',
		answer:
			'Im SWS-Controlling unter Statistik steht unter „SWS gesamt“ je Studiengang „davon … Lehrbeauftragte“: die SWS der Teile, die Lehrbeauftragten zugeteilt sind. Eine Vorlesung für mehrere Züge zählt einmal, Teile, die eine andere Fakultät hält, zählen nicht. Die Zahl gibt es nur je Studiengang, nie je Person. Bis das Dekanat die Zuteilung veröffentlicht hat, sehen sie nur die Studiengangsleitung des Studiengangs und das Dekanat, danach alle, die die Statistik sehen.',
		who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/statistik', label: 'Statistik' }]
	},
	{
		question: 'Muss ich irgendwo auf „Speichern“ drücken?',
		answer:
			'Fast nie. Häkchen und Auswahlfelder werden gespeichert, sobald Du sie setzt, Textfelder, sobald Du das Feld verlässt. Wer gleich danach die Seite wechselt, verliert nichts: der Wechsel wartet, bis alles angekommen ist. Einen Knopf gibt es nur, wo etwas neu angelegt wird, etwa ein Token, ein Konto oder eine SWS-Aufteilung. Hast Du dort etwas eingetragen und verlässt die Seite, fragt Tallox, ob es gespeichert oder verworfen werden soll.',
		who: [],
		where: [
			{ href: '/wuensche', label: 'Wünsche' },
			{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' },
			{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' }
		],
		stage: 'ONCE'
	},
	{
		question: 'Was muss ich einmal einrichten?',
		answer:
			'Zwei Dinge, beide unter „Meine Lehre“: Deine Fachgruppen und danach Deine Kompetenzen, also welche Module Du halten kannst. Dazu kommt in jedem Semester die Angabe, wie viele SWS Du übernehmen möchtest. Was davon noch fehlt, zeigt die Startseite unter „Dein Stand“. Ist alles angegeben, steht dort nur noch „Alles angegeben“; mit einem neuen Planungssemester kommen die SWS wieder als offener Punkt dazu. Gespeichert wird dafür nichts eigenes: sie liest nur, was Du auf den Seiten eingetragen hast.',
		who: ['LECTURER'],
		where: [
			{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' },
			{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' },
			{ href: '/wuensche', label: 'Wünsche' }
		],
		stage: 'ONCE'
	},
	{
		question: 'Wo gebe ich an, in welchen Fächern ich arbeite?',
		answer:
			'Unter „Meine Lehre → Fachgruppen“, einmal und nicht jedes Semester. Jedes Häkchen ist sofort gespeichert. Das ist eine Aussage über Dich und gibt keine Leserechte: die Wunschseite zeigt Deine Fachgruppen zuerst, eintragen kannst Du Dich trotzdem überall. Zweierlei hängt aber daran: Kompetenzen gibst Du nur für Module Deiner Fachgruppen an, und deren Leitungen sehen Deine gewünschten SWS.',
		who: ['LECTURER'],
		where: [{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' }],
		stage: 'ONCE'
	},
	{
		question: 'Wie trage ich einen Wunsch ein, und wie ziehe ich ihn zurück?',
		answer:
			'Auf der Wunschseite das Semester wählen und an der Instanz eine Stufe setzen: „unbedingt“, „gerne“ oder „notfalls“, bei Bedarf mit Notiz. Die Stufe auf „—“ zu stellen zieht die Eintragung zurück. Das geht, sobald die Studiengangsleitung den Bedarf ihres Studiengangs für Wünsche freigegeben hat, und solange die Fachgruppe des Moduls ihre Wunschrunde nicht geschlossen hat und das Semester nicht abgeschlossen ist. Module eines Studiengangs ohne Freigabe stehen nicht in der Tabelle; welche Studiengänge fehlen, steht darüber. Welche Wunschrunden geschlossen sind, steht einmal über der Tabelle; die betroffenen Züge tragen die Marke „Wunschrunde geschlossen“.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question:
			'Ich weiß schon, was ich in einem späteren Semester halten möchte. Wie halte ich das fest?',
		answer:
			'Unter „Meine Lehre → Vormerkungen“: Studiengang, Semester (bis vier Jahre im Voraus) und Modul wählen, Stufe und gegebenenfalls Notiz und „höchstens so viele Züge“ angeben. Das geht, solange der Studiengang den Bedarf dieses Semesters noch nicht freigegeben hat, auch wenn noch offen ist, ob das Modul überhaupt angeboten wird. Mit der Freigabe wird die Vormerkung von selbst zum Wunsch auf jedem Zug des Moduls, mit Stufe und Notiz; ändern oder zurückziehen geht danach auf der Wunschseite. Bietet der Studiengang das Modul bei der Freigabe nicht an, steht an der Vormerkung „nicht angeboten“, und die Startseite sagt es Dir. Abschlussarbeiten, Praxissemester und das Bachelorseminar stehen nicht zur Wahl, weil sie nicht geplant werden. Eine Vormerkung ist kein Anspruch. Sehen können sie dieselben wie Deine Wünsche: bis zur Veröffentlichung nur Du, die Leitung des Studiengangs, die Leitung der Fachgruppe des Moduls und das Dekanat.',
		who: ['LECTURER'],
		where: [
			{ href: '/wuensche/vormerkungen', label: 'Vormerkungen' },
			{ href: '/wuensche', label: 'Wünsche' }
		],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wo sehe ich, wer sich Module meines Bereichs vorgemerkt hat?',
		answer:
			'Unter „Zuteilung → Vormerkungen“, je Semester: wer sich welches Modul für ein Semester vorgemerkt hat, dessen Bedarf noch nicht freigegeben ist, mit Stufe, Notiz und Stand. Du siehst die Vormerkungen für die Studiengänge und Fachgruppen, die Du leitest, das Dekanat alle; eine Anzahl zeigt Tallox nicht. Mit der Freigabe des Bedarfs werden die Vormerkungen zu Wünschen, die Du dann bei der Zuteilung siehst. Ein Anspruch entsteht aus einer Vormerkung nicht.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung/vormerkungen', label: 'Vormerkungen' }]
	},
	{
		question: 'Wer sieht meine Wünsche?',
		answer:
			'Bis zur Veröffentlichung nur Du, die Leitung des Studiengangs der Instanz, die Leitung der Fachgruppe des Moduls und das Dekanat. Alle anderen sehen nichts davon, auch keine Anzahl. Ab der Veröffentlichung durch das Dekanat sieht das ganze Kollegium, wer sich wo eingetragen hat, über die Schnittstelle auch mit Stufe. Deine Notiz und wann Du Dich eingetragen hast, lesen weiter nur die Zuständigen. Veröffentlicht wird erst, wenn alle Fachgruppen ihre Wunschrunde geschlossen haben.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wie sage ich, dass ich nur die Vorlesung oder nur ein Praktikum halten möchte?',
		answer:
			'In der Notiz zum Wunsch. Gewünscht wird die Instanz, also etwa ein Modul für einen Zug; wer welchen Teil hält, legt die Fachgruppenleitung erst bei der Zuteilung fest, weil das eine Absprache zwischen mehreren ist.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wie sage ich, dass ich nur einen von mehreren Zügen übernehme, egal welchen?',
		answer:
			'Trag Dich für jeden Zug ein, der in Frage kommt, jeweils mit eigener Stufe. Sobald es zwei sind, steht unter dem Modulnamen „Davon übernehme ich“: „nur einen“ heißt einer davon, egal welcher, bei drei Zügen geht auch „höchstens 2“. Die Fachgruppenleitung sieht das bei der Zuteilung neben Deinem Namen, nach der Veröffentlichung auch das Kollegium. In der SWS-Summe Deiner Eintragungen zählt dann nur der teuerste Zug. Ziehst Du alle Wünsche für das Modul zurück, verschwindet die Angabe mit.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wie biete ich an, einen Kurs als CiE (Courses in English) zu halten?',
		answer:
			'Beim Wunsch: Sobald eine Stufe gesetzt ist, steht darunter „als CiE anbieten“. Das ist ein Angebot und kein Vorrang bei der Zuteilung. Die Fachgruppenleitung sieht es neben Deinem Namen, nach der Veröffentlichung auch das Kollegium; vorher ist es so vertraulich wie der Wunsch. Ist Dir der Zug zugeteilt, setzt Du CiE unter „Meine Lehre → Zuteilungen“ selbst, bis das Semester abgeschlossen ist. Beides geht nur, wenn das Modulhandbuch Englisch nennt.',
		who: ['LECTURER'],
		where: [
			{ href: '/wuensche', label: 'Wünsche' },
			{ href: '/konto/zuteilungen', label: 'Meine Zuteilungen' }
		],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Lässt sich die Veröffentlichung der Wünsche oder der Zuteilung zurücknehmen?',
		answer:
			'Nein. Beide Veröffentlichungen schaltet das Dekanat auf der Semesterseite, und beide sind endgültig. Die Wünsche lassen sich erst veröffentlichen, wenn jede Fachgruppe mit Instanzen im Semester ihre Wunschrunde geschlossen hat; sonst nennt die Meldung die offenen. Module ohne Fachgruppe halten das nicht auf. Zuteilung und Bedarf bleiben aber auch danach änderbar, bis das Semester abgeschlossen ist. Die Phase lässt sich in beide Richtungen umschalten; in die Wunschphase wechselt das Semester schon von selbst, sobald der erste Studiengang seinen Bedarf für Wünsche freigibt.',
		who: ['DEANS_OFFICE'],
		where: [{ href: '/semester', label: 'Semester und Phasen' }]
	},
	{
		question: 'Wen kann ich bei der Zuteilung auswählen?',
		answer:
			'Alle Lehrenden. Die Auswahl je Zug ist gegliedert: oben unter „Gewünscht“ alle, die sich für diesen Zug eingetragen haben, mit Stufe und Notiz und gegebenenfalls „als CiE“ oder „nur einen der Züge“, dann „Kompetenz“ und „Fachgruppe“, darunter unter „Weitere Lehrende“ alle anderen. Ein Wunsch ist ein Hinweis, keine Voraussetzung. Ohne JavaScript im Browser stehen dort nur die ersten Gruppen; weitere Personen findet dann die Suche über der Tabelle.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wie weit ist meine Fachgruppe mit dem Besetzen?',
		answer:
			'Über der Tabelle der Zuteilungsseite steht der „Stand der Besetzung“: wie viele Teile und SWS besetzt sind, von allen, die gerade angezeigt werden. Er folgt der Auswahl darüber, also Fachgruppe, Abschluss, „nur CiE“ und Korb. Teile, die eine andere Fakultät hält, zählen nicht mit.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wie teile ich Lehrbeauftragte zu, die kein Tallox-Konto haben?',
		answer:
			'Auf der Zuteilungsseite wie alle anderen: sie stehen unter „Weitere Lehrende“ in der Auswahl, auch ohne Tallox-Konto. Ein Konto brauchen sie dafür nicht. Wen das ZPA als lehrbeauftragt führt, trägt in der Auswahl ein „LB“ vor dem Hinweis, auch wenn die Person schon zugeteilt ist. Der Haken „nur Lehrbeauftragte“ über der Tabelle zeigt nur die Züge, in denen Lehrbeauftragte einen Teil halten. Wer noch nicht im ZPA steht, legst Du zuerst unter Zuteilung → Lehrpersonen an.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wie lege ich Lehrbeauftragte an, die noch nicht im ZPA stehen?',
		answer:
			'Unter Zuteilung → Lehrpersonen mit Nachname, Vorname und Mailadresse; der Haken „Lehrbeauftragte“ ist vorausgewählt. Danach steht die Person in der Zuteilung unter „Weitere Lehrende“ zur Auswahl, und bei den Kompetenzen der Fachgruppe lassen sich Kompetenzen für sie eintragen. Ein Tallox-Konto bekommt sie dadurch nicht. Gibt es die Mailadresse schon, lehnt Tallox ab: dann wähle die Person in der Liste aus. Löschen lässt sich ein Eintrag nicht, nur aus den Listen nehmen und wieder aufnehmen. Sobald das ZPA jemanden mit derselben Mailadresse führt, übernimmt der nächtliche Abgleich den Eintrag; Zuteilungen und Kompetenzen bleiben, Name und Angaben kommen dann aus dem ZPA. Anlegen dürfen Fachgruppenleitungen, Studiengangsleitungen und das Dekanat.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung/lehrpersonen', label: 'Lehrpersonen' }]
	},
	{
		question: 'Wie sehe ich bei der Zuteilung nur die Bachelor- oder nur die Mastermodule?',
		answer:
			'Über der Tabelle unter „Abschluss“ Bachelor oder Master wählen. Unter „Gruppiert nach“ lässt sich die Tabelle außerdem nach Studiengang ordnen: ein Modul, das zwei Studiengänge anbieten, steht dann bei beiden, jeweils mit deren Zügen. Beides bleibt beim Wechsel der Fachgruppe erhalten. Wer nach Korb filtern oder sortieren will, findet das unter „Korb“ und „Sortierung“ daneben. Den Abschluss-Filter gibt es auch im Modulkatalog.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [
			{ href: '/zuteilung', label: 'Zuteilung' },
			{ href: '/module', label: 'Modulkatalog' }
		]
	},
	{
		question: 'Warum fehlt ein Studiengang, wenn ich nach Abschluss filtere?',
		answer:
			'Weil für ihn noch kein Abschluss eingetragen ist. Das ZPA liefert diese Angabe nicht, deshalb trägt sie das Dekanat einmal je Studiengang unter Verwaltung → Studiengänge ein. Bis dahin passt der Studiengang zu keinem der beiden Filter, und die Seite nennt ihn über der Tabelle.',
		who: [],
		where: [
			{ href: '/verwaltung/studiengaenge', label: 'Studiengänge' },
			{ href: '/zuteilung', label: 'Zuteilung' }
		]
	},
	{
		question: 'Wie kennzeichne ich einen Zug als Block, auf Englisch oder als CiE?',
		answer:
			'Je Zug auf der Zuteilungsseite und auf der Bedarfsseite. „Englisch“ sagt, in welcher Sprache der Zug läuft; ohne eigene Angabe gilt, was das ZPA für das Modul angibt, und das steht dann als „(Standard)“ daneben. „CiE“ (Courses in English) ist eine eigene Kennzeichnung, die nur von Hand gesetzt wird: ein Zug kann auf Englisch laufen, ohne als CiE angeboten zu werden. Setzen dürfen das die Fachgruppenleitung des Moduls, die Studiengangsleitung für ihren Studiengang und das Dekanat, bis das Semester abgeschlossen ist; CiE dürfen außerdem die Lehrenden setzen, die einen Teil des Zugs halten. „Englisch“ und „CiE“ lassen sich nur ankreuzen, wenn das Modulhandbuch Englisch als Unterrichtssprache oder als weitere mögliche Sprache nennt; sonst ist das Häkchen gesperrt. Alle drei erscheinen als Plakette in den Übersichten und als eigene Spalten im Semester-Export; mit „nur CiE“ über der Tabelle zeigen Bedarf und Zuteilung nur die als CiE gekennzeichneten Züge.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [
			{ href: '/zuteilung', label: 'Zuteilung' },
			{ href: '/bedarf', label: 'Bedarf' }
		]
	},
	{
		question: 'Wann werden praxisbegleitende Lehrveranstaltungen (PBLV) vergeben?',
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
		question: 'Wie sehe ich Tallox so, wie es Dozierende sehen?',
		answer:
			'Wer mehr als eine Rolle hat, findet unten im Fuß der Seite den Knopf „🎭 Rolle“. Dort eine der eigenen Rollen wählen, etwa „Dozierende“: Tallox zeigt dann Menü, Seiten und Daten so, als hättest Du nur diese Rolle, und oben steht eine gelbe Leiste „Vorschau“. Das geht nur in eine Richtung: Die Vorschau kann Rechte wegnehmen, nie welche dazugeben, und angeboten werden nur Rollen, die Du hast. Mit „Zurück zu meinen Rollen“ in der Leiste oder im Menü ist alles wieder wie vorher.',
		who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'DEANS_OFFICE', 'ADMIN'],
		where: [{ href: '/konto/rollen', label: 'Meine Rollen' }]
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
			'Zugang hat, wer in Tallox als Person eingetragen ist, nicht jede gültige Kennung. Lehrende aus der Liste des ZPA lässt die Administration per Schalter zu, alle anderen legt sie an.',
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
			'Unter „Meine Kompetenzen“, einmal und nicht jedes Semester. Die Fakultät bittet um mindestens drei Pflichtfächer, über alle Deine Fachgruppen zusammen: zwei in der einen und eins in der anderen reichen. Abschlussarbeiten, Praxissemester und das Bachelorseminar stehen nicht in der Liste und zählen nicht mit, weil sie nicht geplant werden. Hast Du für eines davon schon früher etwas angegeben, steht es mit „wird nicht geplant“ am Ende der Tabelle; zurücknehmen kannst Du es mit „—“. Das sehen nur Du, die zuständigen Leitungen und das Dekanat.',
		who: [],
		where: [{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' }],
		stage: 'ONCE'
	},
	{
		question: 'Wo sehe ich, was ich tatsächlich halte?',
		answer:
			'Unter „Meine Lehre → Zuteilungen“: jeder Teil, der Dir zugeteilt ist, je Semester mit der Summe der SWS. Solange die Zuteilung eines Semesters nicht veröffentlicht ist, steht dort „Entwurf“. Ändern kann sich die Zuteilung bis zum Ende des Semesters, auch nach der Veröffentlichung, etwa wenn jemand ausfällt. Je Zug kannst Du dort auch „CiE“ ankreuzen, wenn Du ihn als Course in English anbietest. Bittet das Dekanat darum, bestätigst Du dort Deine Zuteilungen mit „Passt so“.',
		who: ['LECTURER'],
		where: [{ href: '/konto/zuteilungen', label: 'Meine Zuteilungen' }],
		stage: 'AFTERWARDS'
	},
	{
		question: 'Wie bestätige ich meine Zuteilungen?',
		answer:
			'Unter „Meine Lehre → Zuteilungen“, je Semester mit „Passt so“: damit bestätigst Du alle Deine Zuteilungen des Semesters auf einmal. Das Dekanat bittet darum mit einem Prüftermin; bis dahin steht ein Hinweis auch auf der Startseite unter „Dein Stand“. Bestätigen geht auch vorher und nach dem Termin, unabhängig davon, ob die Zuteilung schon veröffentlicht ist. Ändert sich danach etwas an Deinen Zuteilungen, gilt Deine Bestätigung als „veraltet“, und Du wirst noch einmal gefragt. Passt etwas nicht, sprich die Leitung der Fachgruppe an; eine Begründung lässt sich in Tallox nicht eintragen.',
		who: ['LECTURER'],
		where: [{ href: '/konto/zuteilungen', label: 'Meine Zuteilungen' }],
		stage: 'AFTERWARDS'
	},
	{
		question: 'Wo sehe ich, wer die Zuteilung bestätigt hat?',
		answer:
			'In der Zuteilung, neben der Person, die einen Zug hält: „bestätigt“, „offen“ oder „veraltet“ (seit der Bestätigung hat sich an ihren Zuteilungen etwas geändert). Das steht dort, sobald das Dekanat einen Prüftermin gesetzt hat, und nur für Personen, deren Zuteilungen Du ohnehin siehst. Die Bestätigung gilt immer für alle Zuteilungen einer Person im Semester, auch die in anderen Fachgruppen. Im Semester-Export steht dasselbe in der Spalte „Bestätigt“. Lehrende ohne Tallox-Konto können nicht bestätigen; mit ihnen bleibt es bei der Absprache.',
		who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
		where: [{ href: '/zuteilung', label: 'Zuteilung' }]
	},
	{
		question: 'Wie bitte ich alle, ihre Zuteilungen zu bestätigen?',
		answer:
			'Unter „Semester und Phasen“ beim Semester das Datum unter „Zuteilungen bestätigen bis“ eintragen; es speichert sich selbst. Ab dann sehen alle mit Zuteilungen in dem Semester einen Hinweis auf der Startseite und unter „Meine Zuteilungen“, bis sie bestätigt haben oder der Termin vorbei ist. Der Termin sperrt nichts: bestätigen geht auch danach, und die Zuteilung bleibt bis zum Semesterende änderbar. Verschieben geht jederzeit; ein leeres Feld nimmt die Bitte zurück, die gegebenen Bestätigungen bleiben.',
		who: ['DEANS_OFFICE'],
		where: [{ href: '/semester', label: 'Semester und Phasen' }]
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
			'Auf der Wunschseite, über der Tabelle, je Semester: wie viele SWS modulbehaftete Lehre Du übernehmen möchtest, ohne Abschlussarbeiten, als Bereich von–bis oder als eine Zahl. Leer heißt „nicht angegeben“, 0 ist eine Angabe. Ändern kannst Du sie, bis das Dekanat sie zum Stichtag einfriert. Bis zur Veröffentlichung lesen sie nur Du, die Leitungen Deiner Fachgruppen und das Dekanat; danach sieht das ganze Kollegium den Bereich. Die Notiz daneben bleibt immer bei Dir, Deinen Fachgruppenleitungen und dem Dekanat. Darunter zeigt ein Balken, wie viel schon eingeplant ist, verglichen mit Deinem Bereich.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Wo sehe ich, wer wie viele SWS halten möchte?',
		answer:
			'Unter „Meine Lehre → SWS im Kollegium“: alle mit ihren Fachgruppen, dem Bereich, den sie halten möchten, und dem, was schon eingeplant ist, aufgeteilt nach Fachgruppe. So sieht man, ob man jemandem etwas wegnimmt, der es noch braucht. Die Bereiche sieht das ganze Kollegium, sobald das Dekanat sie veröffentlicht hat, und was eingeplant ist, sobald die Zuteilung veröffentlicht ist. Vorher siehst Du in der Liste nur Deine eigene Zeile; die Leitungen sehen die Mitglieder ihrer Fachgruppen, das Dekanat alle. Die Liste gibt es nur im Browser und über ein Planungs-Token mit voller Reichweite, nicht über ein normales Token. Der Balken je Zeile zeigt beides auf einen Blick: gefüllt ist, was eingeplant ist, der umrandete Bereich ist der Wunsch; daneben steht „unter Wunsch“, „im Wunschbereich“ oder „über Wunsch“. Alle Balken haben dieselbe Skala.',
		who: [],
		where: [{ href: '/wuensche/kollegium', label: 'SWS im Kollegium' }],
		stage: 'EACH_SEMESTER'
	},
	{
		question: 'Meine SWS-Angabe ist eingefroren, stimmt aber nicht mehr. Was nun?',
		answer:
			'Nach dem Einfrieren ändert nur noch das Dekanat eine Angabe, nach Absprache mit Dir. Die Fakultätsleitung geht die Angaben ohnehin auf Plausibilität durch und meldet sich bei groben Abweichungen. Eine Korrektur steht danach mit dem Namen der Person aus dem Dekanat neben Deiner Angabe; Deine Notiz bleibt.',
		who: ['LECTURER'],
		where: [{ href: '/wuensche', label: 'Wünsche' }]
	},
	{
		question: 'Wie sehe ich, ob jemand schon in einer anderen Fachgruppe verplant ist?',
		answer:
			'Beim Besetzen steht neben dem Namen von Mitgliedern Deiner Fachgruppen, wie viele SWS die Person halten möchte und wie viele schon eingeplant sind, über alle Fachgruppen. Für andere, für Lehrbeauftragte ohne Konto und für Studiengangsleitungen steht dort nichts, bis die Zuteilung veröffentlicht ist. Die Aufteilung je Fachgruppe zeigt „SWS im Kollegium“: Du siehst sie für die Mitglieder Deiner Fachgruppen schon während der Planung, ohne zu sehen, welche Module das sind. Dann weißt Du, mit welcher Leitung Du sprechen musst.',
		who: ['SUBJECT_GROUP_LEAD'],
		where: [
			{ href: '/zuteilung', label: 'Zuteilung' },
			{ href: '/wuensche/kollegium', label: 'SWS im Kollegium' }
		]
	},
	{
		question: 'Wie friere ich die Wunsch-SWS ein und veröffentliche sie?',
		answer:
			'Unter „Semester und Phasen“, je Semester. „Wunsch-SWS einfrieren“ setzt den Stichtag: Danach kann niemand die eigene Angabe mehr ändern. Unter „SWS im Kollegium“ korrigiert das Dekanat dann, was mit den Betroffenen abgesprochen ist. „Wunsch-SWS veröffentlichen“ macht die Bereiche für alle im Browser sichtbar, die Notizen nicht. Beides lässt sich nicht zurücknehmen und geht nur im Browser oder mit einem Planungs-Token mit voller Reichweite.',
		who: ['DEANS_OFFICE'],
		where: [
			{ href: '/semester', label: 'Semester und Phasen' },
			{ href: '/wuensche/kollegium', label: 'SWS im Kollegium' }
		]
	},
	{
		question: 'Wie kennzeichne ich ein Modul als PBLV?',
		answer:
			'Auf der Modulseite unter „Praxisbegleitende Lehrveranstaltung (PBLV)“. Das dürfen die Fachgruppenleitung des Moduls, die Studiengangsleitung seines Heimatstudiengangs und das Dekanat. Gekennzeichnete PBLVs stehen bei der Zuteilung am Ende.',
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
		question: 'Wie finde ich ein Modul im Modulkatalog?',
		answer:
			'Im Feld „Suchen“ über der Tabelle, nach Name oder Modulcode, ohne Rücksicht auf Groß- und Kleinschreibung. Die Wörter dürfen in beliebiger Reihenfolge und Form stehen: „Digitale Transformation“ findet auch „Grundlagen der Digitalen Transformation“. Ein Wortanfang findet alles, was ihn enthält, etwa „Datenb“ die Datenbanken — das gilt aber nur für die ganze Eingabe, nicht für ein Wort unter mehreren. Module, die das ZPA zurückgezogen hat, zeigt der Haken „zurückgezogene anzeigen“.',
		who: [],
		where: [{ href: '/module', label: 'Modulkatalog' }]
	},
	{
		question: 'Wie sehe ich nur die Module eines Korbs?',
		answer:
			'Auf der Bedarfsseite: Studiengang wählen, dann über der Tabelle unter „Korb“ den Korb der Prüfungsordnung auswählen — in der Übersicht wie beim Bearbeiten. Ein Modul in zwei Körben erscheint in beiden. Unter „Sortierung“ ordnet „nach Korb“ die Module innerhalb jedes Fachsemesters nach ihrem Korb statt nach dem Namen; ein Modul in zwei Körben steht dann einmal, beim ersten. In der Zuteilung und in ihrer Übersicht geht das genauso; dort stehen Züge mehrerer Studiengänge nebeneinander, deshalb nennt die Auswahl den Studiengang mit („IG · …“) und zeigt nur dessen Züge. Die Sortierung „nach Korb“ gibt es in der Zuteilung, sobald unter „Gruppiert nach“ „Studiengang“ gewählt ist; PBLVs bleiben dabei am Ende. Die Auswahl steht in der Adresse, ein Link darauf lässt sich weitergeben.',
		who: [],
		where: [
			{ href: '/bedarf', label: 'Bedarf' },
			{ href: '/zuteilung', label: 'Zuteilung' },
			{ href: '/zuteilung/uebersicht', label: 'Zuteilung, Übersicht' }
		]
	},
	{
		question: 'Kann ich über die Schnittstelle planen, etwa mit einem KI-Assistenten?',
		answer:
			'Ja, mit einem Planungs-Token. Unter „Tokens“ beim Anlegen „Volle Reichweite“ ankreuzen: Das Token kann dann alles, was Du im Browser kannst, also Bedarf erklären, Teile zuteilen und, wenn Deine Rolle es erlaubt, veröffentlichen, und es liest dabei, was Du im Browser liest, auch unveröffentlichte Wünsche in Deinem Bereich. Es gilt höchstens 90 Tage und steht im nächtlichen Zugriffsbericht. Ein normales Token ohne Häkchen ist für Auswertungen: Es plant nicht und liest fremde Wünsche erst nach der Veröffentlichung. Kein Token erreicht die Tokenverwaltung, Personen und Rollen oder das Zugriffsprotokoll. Was das Token liest, liest ein Assistent mit; deshalb ein eigenes Token je Aufgabe, so kurz wie möglich, und danach widerrufen.',
		who: [],
		where: [{ href: '/konto/tokens', label: 'Tokens' }]
	},
	{
		question: 'Wie sehe ich, ob ein Feld mit meinem Token antwortet?',
		answer:
			'In der Schema-Referenz (API-Dokumentation, verlinkt unter „Tokens“) steht an jedem Feld, welche Tür es braucht: „nur Browser“ antwortet keinem Token, „volle Reichweite“ nur dem Browser und einem Planungs-Token, und der Bereich daneben ist der, den das Token freigegeben haben muss. Dieselbe Schema-Datei hängt an jedem Release des Servers auf GitHub, für eigene Werkzeuge und Codegeneratoren. Wer sichergehen will, fragt das Feld in der Konsole auf derselben Seite mit dem Token ab.',
		who: [],
		where: [{ href: '/konto/tokens', label: 'Tokens' }]
	},
	{
		question: 'Wie lasse ich jemanden einer Partnerfakultät zu?',
		answer:
			'Unter Personen und Rollen: Konto anlegen, nur die Rolle Partnerfakultät ankreuzen, danach erscheinen die Studiengänge zum Ankreuzen, denen die Person folgen soll. Ohne Studiengang liest sie nichts. Die Liste „SWS im Kollegium“ bleibt für sie leer, ebenso die Lehrendenliste und die Namen hinter Fachgruppen- und Studiengangsleitung: sie liest die Struktur, nicht das Kollegium. Bekommt sie zusätzlich eine andere Rolle, gehört sie zum Kollegium und sieht, was das Kollegium sieht.',
		who: ['ADMIN'],
		where: [{ href: '/verwaltung/personen', label: 'Personen und Rollen' }]
	},
	{
		question: 'Wie gebe ich jemandem Einblick in die ganze Planung, ohne dass die Person mitplant?',
		answer:
			'Mit der Rolle Einsicht, etwa für jemanden, der ein Nachbarsystem baut. Unter Personen und Rollen zuerst „Befristet bis“ setzen (höchstens 180 Tage), dann nur die Rolle Einsicht ankreuzen; ohne Datum lehnt Tallox ab. Die Person liest Bedarf, Module, Statistik, Fachgruppen, den ZPA-Import und die veröffentlichte Zuteilung aller Studiengänge. Wünsche, Vormerkungen und die SWS-Angaben aus dem Kollegium sieht sie nie, auch nicht nach der Veröffentlichung, und eintragen kann sie nichts, auch keinen Abgleich anstoßen. Der tägliche Zugriffsbericht nennt die Rolle, solange sie gilt. Zum Verlängern die Rolle abnehmen und mit neuem Datum wieder vergeben. Bekommt die Person zusätzlich eine andere Rolle, gilt, was diese erlaubt.',
		who: ['ADMIN'],
		where: [{ href: '/verwaltung/personen', label: 'Personen und Rollen' }]
	},
	{
		question: 'Was sehe ich mit der Rolle Einsicht?',
		answer:
			'Die Planung so, wie sie ist: Bedarf, Module, Statistik und Fachgruppen aller Studiengänge, die veröffentlichte Zuteilung und den ZPA-Import. Nicht dabei sind Wünsche und Vormerkungen, gewünschte und eingeplante SWS aus dem Kollegium, auch nach der Veröffentlichung nicht: das sind Absprachen im Kollegium. Eintragen lässt sich nichts. Für eigene Auswertungen reicht ein normales Token unter „Tokens“; den ZPA-Import liest nur der Browser oder ein Planungs-Token. Die Rolle ist befristet und endet von selbst.',
		who: ['OBSERVER'],
		where: [{ href: '/konto/tokens', label: 'Tokens' }]
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
