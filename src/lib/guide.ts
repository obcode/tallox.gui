import type { Role } from '$lib/gql/__generated__/graphql';
import { ACCOUNT_ITEMS, NAV_ITEMS, visibleNavItems, type NavItem } from '$lib/navigation';

/**
 * The planning process, step by step, as the start page tells it.
 *
 * Data rather than markup, for two reasons. The links in it have to agree with the navigation:
 * a step that points at a page the menu hides from this person is a click into a refusal, so
 * every `href` here is looked up in the navigation and rendered as a link only where the menu
 * would show it — and a test asserts that every `href` exists there at all. And the roles named
 * beside each step are the same five the administration hands out, spelled the way `roles.ts`
 * spells them, so that "who does this" on the start page and "what am I giving this person" in
 * the administration read the same.
 *
 * What it says is the process as the backend enforces it, not as a slide describes it. Where the
 * faculty has agreed on something the tool does not enforce — laboratory-based courses are
 * assigned last — the text says so.
 */

/** A place a step happens. `href` is a route the navigation knows; `label` is what is read. */
export type GuideLink = {
	href: NavItem['href'];
	label: string;
};

export type GuideStep = {
	title: string;
	/** Who does it. Empty means everybody with an account. */
	who: readonly Role[];
	/** Where, as links into the application. */
	where: readonly GuideLink[];
	/** What happens, and the rules worth knowing before it does. */
	text: string;
};

export type GuideSection = {
	title: string;
	intro: string;
	steps: readonly GuideStep[];
};

export const GUIDE: readonly GuideSection[] = [
	{
		title: 'Einmal einrichten',
		intro:
			'Diese Schritte hängen an keinem Semester. Sie werden einmal gemacht und danach nur noch korrigiert.',
		steps: [
			{
				title: 'Personen zulassen und Rollen vergeben',
				who: ['ADMIN'],
				where: [{ href: '/verwaltung/personen', label: 'Personen und Rollen' }],
				text: 'Ohne Eintrag kommt niemand hinein, auch nicht mit gültiger HM-Kennung. Lehrende aus der ZPA-Liste werden per Schalter zugelassen und sind damit Dozent:in. Studiengangsleitung gilt immer für bestimmte Studiengänge, Fachgruppenleitung für bestimmte Fachgruppen: eine Rolle ohne Zuordnung darf nichts, nicht alles.'
			},
			{
				title: 'Festlegen, welche Studiengänge die Fakultät plant',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/verwaltung/studiengaenge', label: 'Studiengänge' }],
				text: 'Der Modulkatalog des Prüfungsamts kennt jeden Studiengang, den irgendeine SPO erwähnt. Was davon hier geplant wird und was ausgelaufen ist, entscheidet das Dekanat. Nur geplante Studiengänge tauchen in Auswahlen auf und lassen sich einer Studiengangsleitung zuordnen.'
			},
			{
				title: 'Fachgruppen anlegen, Leitung und Mitglieder eintragen',
				who: ['ADMIN'],
				where: [{ href: '/verwaltung/fachgruppen', label: 'Fachgruppen' }],
				text: 'Mathematik, Softwarefächer, Technische Informatik: die fachliche Gruppierung von Modulen und Personen, unabhängig vom Semester. Die Leitung ist eine Berechtigung und wird nur an Personen mit der Rolle Fachgruppenleitung vergeben. Keine Fachgruppe ohne Leitung, die Seite zählt die offenen. Die Mitgliedschaft berechtigt zu nichts, jede:r kann sie auch selbst pflegen.'
			},
			{
				title: 'Module den Fachgruppen zuordnen',
				who: ['ADMIN'],
				where: [{ href: '/module', label: 'Modulkatalog' }],
				text: 'Jedes Modul gehört genau einer Fachgruppe oder noch keiner. Im Katalog lassen sich viele Module auf einmal ankreuzen und zuordnen; ein einzelnes wird auf seiner Modulseite korrigiert. Ein Modul umzuhängen verschiebt es, es ist nie in zwei Gruppen. Über die Fachgruppe des Moduls ergibt sich, wer seine Instanzen besetzt und wer vor der Veröffentlichung die Wünsche darauf liest.'
			},
			{
				title: 'Die SWS-Aufteilung je Modul eintragen',
				who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
				where: [{ href: '/module', label: 'Modulkatalog' }],
				text: 'Das ZPA nennt nur eine Zahl je Modul. Ob 4 SWS zwei Stunden Vorlesung und zwei Stunden Praktikum sind, weiß nur die Fakultät, deshalb trägt es die Studiengangsleitung des Heimatstudiengangs auf der Modulseite ein. Einmal je Modul, nicht jedes Semester. Ohne Aufteilung lässt sich keine Instanz anmelden. Fehlt sie, schlägt Tallox eine vor, die auf der Bedarfsseite bestätigt oder korrigiert wird.'
			},
			{
				title: 'Die eigenen Fachgruppen wählen',
				who: [],
				where: [{ href: '/konto/fachgruppen', label: 'Meine Fachgruppen' }],
				text: 'In welchen Fächern Du arbeitest. Eine Aussage über Dich, keine Berechtigung, deshalb trägst Du sie selbst ein. Die Wunschseite zeigt Deine Fachgruppen zuerst; eintragen kannst Du Dich trotzdem überall.'
			},
			{
				title: 'Die eigenen Kompetenzen angeben',
				who: [],
				where: [{ href: '/konto/kompetenzen', label: 'Meine Kompetenzen' }],
				text: 'Welche Module Deiner Fachgruppen Du halten kannst, auch wenn es kurzfristig brennt, und welche Du gern halten würdest. Die Fakultät bittet um mindestens drei Pflichtfächer je Fachgruppe. Einmal angeben, nicht jedes Semester. Das sehen nur Du, die zuständigen Leitungen und das Dekanat; die Fachgruppenleitung findet den Pool bei der Zuteilung.'
			}
		]
	},
	{
		title: 'Jedes Semester',
		intro:
			'Die Reihenfolge ist die des Prozesses. Bedarf, Wünsche und Zuteilung sind aber grundsätzlich immer möglich; die Studiengänge und Fachgruppen sind zu verschiedenen Zeiten dran.',
		steps: [
			{
				title: 'Das Planungssemester setzen',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/semester', label: 'Semester und Phasen' }],
				text: 'Angelegt wird kein Semester, es ist da wie der nächste März. Das Dekanat sagt, welches gerade geplant wird; das ist dann überall vorausgewählt. Die Phase eines Semesters wird von Hand weitergeschaltet, nie aus dem Kalender abgeleitet.'
			},
			{
				title: 'Den Bedarf festlegen',
				who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
				where: [{ href: '/bedarf', label: 'Bedarf' }],
				text: 'Geplant werden Instanzen, nicht Module: ein Modul in einem Semester für einen Studiengang und einen Zug (IF2A, IF2B). Die Studiengangsleitung hakt je Modul an, was angeboten wird, setzt Züge, Praktikumsgruppen und Fachsemester und schreibt bei Bedarf eine Notiz dazu. Das Vorjahr ist vorbelegt. Bietet ein anderer Studiengang dasselbe Modul an, wird es automatisch gemeinsam gehalten. Am Ende meldet sie „Bedarf ist fertig“; das ist eine Ansage, keine Sperre.'
			},
			{
				title: 'Interesse bekunden',
				who: [],
				where: [{ href: '/wuensche', label: 'Wünsche' }],
				text: 'Jede:r trägt an den Instanzen ein, was er oder sie halten würde, mit Priorität und Notiz. Bis zur Veröffentlichung sieht das niemand sonst, auch nicht als Anzahl: niemand soll sich fragen müssen, ob ein Fach schon „besetzt“ ist. Die Leitung einer Fachgruppe öffnet und schließt die Wunschrunde ihrer Fachgruppe; wer schließt, arbeitet mit dem, was gesammelt wurde.'
			},
			{
				title: 'Die Wünsche veröffentlichen',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/semester', label: 'Semester und Phasen' }],
				text: 'Ab dann sieht jede:r alle Eintragungen des Semesters. Das lässt sich nicht zurücknehmen.'
			},
			{
				title: 'Die Instanzen besetzen',
				who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
				where: [{ href: '/zuteilung', label: 'Zuteilung' }],
				text: 'Die Fachgruppenleitung besetzt die Instanzen ihrer Fachgruppe, im Regelfall eine Person für alle Teile eines Zuges; Vorlesung und Praktikum können getrennt vergeben werden, wo es so abgesprochen ist. Auch Lehrbeauftragte ohne Tallox-Konto sind zuteilbar. Eine Fachgruppe kann das gemeinsam in einem Termin durchgehen: gleichzeitiges Arbeiten ist sicher, weil jede Änderung die Zuteilung nennt, die man vor sich sah — wer einen veralteten Stand hat, bekommt einen Hinweis, statt jemandem die Entscheidung zu überschreiben. Der Zwischenstand bleibt vertraulich, bis das Dekanat die Zuteilung veröffentlicht. Verabredung der Fakultät, nicht vom Werkzeug erzwungen: projektbasierte Lehrveranstaltungen werden zuletzt vergeben.'
			},
			{
				title: 'Abschließen',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/semester', label: 'Semester und Phasen' }],
				text: 'Mit der Phase „final“ steht der Plan. Der Bedarf ist dann geschlossen; die Zuteilung bleibt änderbar, weil eine Vertretung im November die Lehre ändert.'
			}
		]
	}
];

/** Every navigation entry the guide may link to. */
const KNOWN_ITEMS: readonly NavItem[] = [...NAV_ITEMS, ...ACCOUNT_ITEMS];

/**
 * Whether the navigation would show this route to somebody with these roles.
 *
 * The guide links only where the menu links: a step that sends a lecturer to the administration
 * is a click into a refusal, and the sentence beside it already says who does it. A route the
 * navigation does not know at all is a mistake in the guide and is not linked either.
 */
export function mayOpen(href: NavItem['href'], roles: readonly string[]): boolean {
	if (!href) return false;
	return visibleNavItems(KNOWN_ITEMS, roles).some((item) => item.href === href);
}

/** The routes the guide names, for the test that checks them against the navigation. */
export function guideRoutes(): string[] {
	const out = new Set<string>();
	for (const section of GUIDE) {
		for (const step of section.steps) {
			for (const link of step.where) {
				if (link.href) out.add(link.href);
			}
		}
	}
	return [...out];
}

/** Does the navigation know this route? */
export function isNavigationRoute(href: string): boolean {
	return KNOWN_ITEMS.some((item) => item.href === href);
}
