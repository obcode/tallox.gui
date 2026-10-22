import type { Phase, Role } from '$lib/gql/__generated__/graphql';
import {
	ACCOUNT_ITEMS,
	NAV_ITEMS,
	navigationPages,
	visibleNavItems,
	type NavItem
} from '$lib/navigation';
import { isPartnerOnly } from '$lib/roles';
import type { PlanningState } from '$lib/planning';
import { PHASE_LABELS, semesterName } from '$lib/semester';

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
	/**
	 * When, in weeks of the semester that is running while the next one is planned. The faculty's
	 * rhythm, not a rule: no phase changes by the calendar, and nothing here is enforced.
	 */
	when?: string;
	/**
	 * When this step is what to do now, for the "Jetzt dran" card: the phases of the planning
	 * semester it belongs to, or `UNSET` while the dean's office has not named one.
	 *
	 * A pointer, not a rule. The demand stays writable through the wish and the assignment phase,
	 * and a subject group's wish round is open until its lead closes it — the phase is the
	 * faculty's beat, and this says what that beat asks for. Absent means never "due": the
	 * one-time setup, and the close, which happens at the end of the planned semester and would
	 * read like a prompt to do it early.
	 */
	due?: readonly DuePhase[];
};

/** A phase of the planning semester, or `UNSET` for "no planning semester has been named". */
export type DuePhase = Phase | 'UNSET';

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
				text: 'Ohne Eintrag kommt niemand hinein, auch nicht mit gültiger HM-Kennung. Lehrende aus der ZPA-Liste werden per Schalter zugelassen und haben damit die Rolle Dozierende. Studiengangsleitung gilt immer für bestimmte Studiengänge, Fachgruppenleitung für bestimmte Fachgruppen: eine Rolle ohne Zuordnung darf nichts, nicht alles. Kolleginnen und Kollegen der Partnerfakultäten (FK10, MUC.DAI, MUC.HEALTH, DPH) bekommen nur die Rolle Partnerfakultät und die Studiengänge, denen sie folgen: sie lesen Bedarf, Statistik und veröffentlichte Zuteilung dieser Studiengänge und tragen nichts ein.'
			},
			{
				title: 'Festlegen, welche Studiengänge die Fakultät plant',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/verwaltung/studiengaenge', label: 'Studiengänge' }],
				text: 'Der Modulkatalog aus dem ZPA kennt jeden Studiengang, den irgendeine SPO erwähnt. Was davon hier geplant wird und was ausgelaufen ist, entscheidet das Dekanat. Nur geplante Studiengänge tauchen in Auswahlen auf und lassen sich einer Studiengangsleitung zuordnen. Auf derselben Seite trägt das Dekanat einmal je Studiengang ein, ob er zum Bachelor oder zum Master führt; auch das steht nicht in den ZPA-Daten, und Zuteilung und Modulkatalog filtern danach.'
			},
			{
				title: 'Fachgruppen anlegen, Leitung und Mitglieder eintragen',
				who: ['ADMIN'],
				where: [{ href: '/verwaltung/fachgruppen', label: 'Fachgruppen' }],
				text: 'Mathematik, Softwarefächer, Technische Informatik: die fachliche Gruppierung von Modulen und Personen, unabhängig vom Semester. Die Leitung ist eine Berechtigung und wird nur an Personen mit der Rolle Fachgruppenleitung vergeben. Keine Fachgruppe ohne Leitung, die Seite zählt die offenen. Die Mitgliedschaft berechtigt zu nichts, alle können sie auch selbst pflegen.'
			},
			{
				title: 'Module den Fachgruppen zuordnen',
				who: ['ADMIN'],
				where: [{ href: '/module', label: 'Modulkatalog' }],
				text: 'Jedes Modul gehört genau einer Fachgruppe oder noch keiner. Im Katalog lassen sich viele Module auf einmal ankreuzen und zuordnen; ein einzelnes wird auf seiner Modulseite korrigiert. Ein Modul umzuhängen verschiebt es, es ist nie in zwei Gruppen. Über die Fachgruppe des Moduls ergibt sich, wer seine Instanzen besetzt und wer vor der Veröffentlichung die Wünsche darauf liest.'
			},
			{
				title: 'Die SWS-Aufteilung je Modul eintragen',
				who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'DEANS_OFFICE'],
				where: [{ href: '/module', label: 'Modulkatalog' }],
				text: 'Das ZPA nennt nur eine Zahl je Modul. Ob 4 SWS zwei Stunden Vorlesung und zwei Stunden Praktikum sind, weiß nur die Fakultät, deshalb trägt es die Studiengangsleitung des Heimatstudiengangs oder die Fachgruppenleitung des Moduls auf der Modulseite ein. Einmal je Modul, nicht jedes Semester. Ohne Aufteilung lässt sich keine Instanz anmelden. Fehlt sie, schlägt Tallox eine vor, die auf der Bedarfsseite bestätigt oder korrigiert wird.'
			},
			{
				title: 'Projektbasierte Lehrveranstaltungen kennzeichnen',
				who: ['PROGRAMME_LEAD', 'SUBJECT_GROUP_LEAD', 'DEANS_OFFICE'],
				where: [{ href: '/module', label: 'Modulkatalog' }],
				text: 'Welche Module PBLVs sind, sagt das ZPA nicht. Dieselben Personen wie bei der SWS-Aufteilung kennzeichnen sie auf der Modulseite, einmal je Modul. PBLVs tragen dann überall eine Marke und stehen bei der Zuteilung am Ende, weil sie zuletzt vergeben werden.'
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
				text: 'Welche Module Deiner Fachgruppen Du halten kannst, auch wenn es kurzfristig brennt, und für welche Du Dich interessierst, Dich aber erst einarbeiten müsstest. Die Fakultät bittet um mindestens drei Pflichtfächer je Fachgruppe. Einmal angeben, nicht jedes Semester. Das sehen nur Du, die zuständigen Leitungen und das Dekanat; die Fachgruppenleitung findet den Pool bei der Zuteilung.'
			}
		]
	},
	{
		title: 'Jedes Semester',
		intro:
			'Die Reihenfolge ist die des Prozesses. Bedarf, Wünsche und Zuteilung sind aber grundsätzlich immer möglich; die Studiengänge und Fachgruppen sind zu verschiedenen Zeiten dran. Geplant wird jeweils das nächste Semester, während das laufende beginnt; die Wochen neben den Schritten sind Wochen dieses laufenden Semesters. Das übernächste gleich mitzuplanen hat erfahrungsgemäß selten getragen.',
		steps: [
			{
				title: 'Das Planungssemester setzen',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/semester', label: 'Semester und Phasen' }],
				due: ['UNSET', 'FINAL'],
				when: 'Semesterwoche 1–2',
				text: 'Angelegt wird kein Semester, es ist da wie der nächste März. Das Dekanat sagt, welches gerade geplant wird; das ist dann überall vorausgewählt. Die Phase eines Semesters wird von Hand weitergeschaltet, nie aus dem Kalender abgeleitet.'
			},
			{
				title: 'Den Bedarf festlegen',
				who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
				where: [
					{ href: '/bedarf', label: 'Bedarf' },
					{ href: '/statistik', label: 'Statistik' }
				],
				due: ['DEMAND_PLANNING'],
				when: 'Semesterwoche 3–5',
				text: 'Geplant werden Instanzen, nicht Module: ein Modul in einem Semester für einen Studiengang und einen Zug (IF2A, IF2B). Die Studiengangsleitung hakt je Modul an, was angeboten wird, setzt Züge, Praktikumsgruppen und Fachsemester und schreibt bei Bedarf eine Notiz dazu. Das Vorjahr ist vorbelegt. Bietet ein anderer Studiengang dasselbe Modul an, wird es automatisch gemeinsam gehalten; dann zahlt der Studiengang, der die Veranstaltung hält. Wer eine eigene Variante will (etwa eine eigene Analysis), plant sie separat und zahlt sie selbst. Wie viele FWP sich ein Studiengang leisten kann, zeigt das SWS-Controlling unter Statistik: die Lehre je Studiengang gegen das Kontingent des Studienjahres. Welche Wahlpflichtmodule eines Korbs der Prüfungsordnung laufen, eigene wie fremde, steht dort unter „Wahlpflicht nach Korb“; auf der Bedarfsseite steht der Korb unter dem Modulnamen. Am Ende meldet sie „Bedarf ist fertig“; das ist eine Ansage, keine Sperre.'
			},
			{
				title: 'Interesse bekunden',
				who: [],
				where: [{ href: '/wuensche', label: 'Wünsche' }],
				due: ['WISHES'],
				when: 'Semesterwoche 6–7',
				text: 'Alle tragen an den Instanzen ein, was sie halten würden, mit Priorität und Notiz, und darüber, wie viele SWS modulbehaftete Lehre (ohne Abschlussarbeiten) sie in dem Semester übernehmen möchten, als Bereich von–bis. Die SWS-Angabe lesen bis zur Veröffentlichung nur die Leitungen der eigenen Fachgruppen und das Dekanat. Bis zur Veröffentlichung sieht das niemand sonst, auch nicht als Anzahl: niemand soll sich fragen müssen, ob ein Fach schon „besetzt“ ist. Die Leitung einer Fachgruppe öffnet und schließt die Wunschrunde ihrer Fachgruppe; wer schließt, arbeitet mit dem, was gesammelt wurde. Fällt dabei auf, dass im Bedarf ein Modul fehlt oder sich für eines niemand findet, ändert die Studiengangsleitung den Bedarf; er bleibt in der Wunschphase offen.'
			},
			{
				title: 'Die Wunsch-SWS einfrieren, prüfen und veröffentlichen',
				who: ['DEANS_OFFICE'],
				where: [
					{ href: '/semester', label: 'Semester und Phasen' },
					{ href: '/wuensche/kollegium', label: 'SWS im Kollegium' }
				],
				due: ['WISHES'],
				when: 'zum Stichtag des Dekanats, in der Regel mit der Wunschphase (Semesterwoche 6–7)',
				text: 'Zum Stichtag friert das Dekanat die SWS-Angaben des Semesters ein; danach ändert sie niemand mehr selbst. Die Fakultätsleitung geht sie auf Plausibilität durch und klärt grobe Abweichungen mit den Betroffenen; die Korrektur trägt das Dekanat unter „SWS im Kollegium“ ein. Dann veröffentlicht das Dekanat die Angaben: Das ganze Kollegium sieht, wer wie viel halten möchte, und auf dieser Grundlage wird geplant. Notizen bleiben vertraulich. Engpässe werden im Gespräch gelöst: Wer besetzt, bespricht mit der Fakultätsleitung, was offen ist und wer es inhaltlich übernehmen könnte. Einfrieren und Veröffentlichen lassen sich nicht zurücknehmen.'
			},
			{
				title: 'Die Wunschrunde der Fachgruppe schließen',
				who: ['SUBJECT_GROUP_LEAD'],
				where: [{ href: '/zuteilung', label: 'Zuteilung' }],
				due: ['WISHES'],
				when: 'Ende Semesterwoche 7',
				text: 'Die Wunschrunde jeder Fachgruppe ist offen, solange niemand sie schließt; eintragen kann man sich also, ohne dass vorher jemand etwas freischaltet. Die Fachgruppenleitung schließt sie auf der Zuteilungsseite, wenn gesammelt ist, und arbeitet ab dann mit dem, was eingetragen wurde. Wieder öffnen geht jederzeit, etwa wenn sich jemand verspätet meldet.'
			},
			{
				title: 'Die Wünsche veröffentlichen',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/semester', label: 'Semester und Phasen' }],
				due: ['WISHES'],
				when: 'Ende Semesterwoche 7',
				text: 'Ab dann sieht das ganze Kollegium alle Eintragungen des Semesters. Das lässt sich nicht zurücknehmen. Die Zuteilung schließt direkt an.'
			},
			{
				title: 'Die Instanzen besetzen',
				who: ['SUBJECT_GROUP_LEAD', 'PROGRAMME_LEAD', 'DEANS_OFFICE'],
				where: [{ href: '/zuteilung', label: 'Zuteilung' }],
				due: ['ASSIGNMENT'],
				when: 'Semesterwoche 8–9',
				text: 'Die Fachgruppenleitung besetzt die Instanzen ihrer Fachgruppe, im Regelfall eine Person für alle Teile eines Zuges; Vorlesung und Praktikum können getrennt vergeben werden, wo es so abgesprochen ist. Auch Lehrbeauftragte ohne Tallox-Konto sind zuteilbar. Eine Fachgruppe kann das gemeinsam in einem Termin durchgehen: gleichzeitiges Arbeiten ist sicher, weil jede Änderung die Zuteilung nennt, die man vor sich sah — wer einen veralteten Stand hat, bekommt einen Hinweis, statt jemandem die Entscheidung zu überschreiben. Der Zwischenstand bleibt vertraulich, bis das Dekanat die Zuteilung veröffentlicht. Neben dem Namen steht, wie viele SWS jemand halten möchte, sofern angegeben, und wie viele schon eingeplant sind, über alle Fachgruppen; die Aufteilung je Fachgruppe zeigt „SWS im Kollegium“, ohne die Module zu nennen. Verabredung der Fakultät, nicht vom Werkzeug erzwungen: projektbasierte Lehrveranstaltungen werden zuletzt vergeben; gekennzeichnete PBLVs stehen deshalb am Ende der Liste. Wer Bachelor- und Mastermodule getrennt besetzt, zeigt nur einen Abschluss an oder gruppiert die Tabelle nach Studiengang. Was jemandem zugeteilt ist, sieht die Person selbst unter „Meine Lehre → Zuteilungen“, bis zur Veröffentlichung als Entwurf. Nach der Veröffentlichung liest das ganze Kollegium unter „Zuteilung → Übersicht“, wer was hält. Auch jetzt lässt sich der Bedarf noch ändern, bis hin zu ganzen Modulen, die wegfallen oder dazukommen.'
			},
			{
				title: 'Studiengangs-Review',
				who: ['PROGRAMME_LEAD', 'DEANS_OFFICE'],
				where: [
					{ href: '/statistik', label: 'Statistik' },
					{ href: '/bedarf', label: 'Bedarf' }
				],
				due: ['REVIEW'],
				when: 'ab Semesterwoche 10, bis das geplante Semester beginnt',
				text: 'Wenn die Instanzen besetzt sind, schaltet das Dekanat das Semester auf „Studiengangs-Review“. Die Studiengangsleitung geht ihren Studiengang noch einmal durch und verantwortet gegenüber dem Dekanat, was er an SWS kostet: Wer drei Lehrbeauftragte gefunden hat, braucht den vollen Bedarf; wer selbst drei Züge übernimmt, legt Vorlesungen zusammen und streicht Gruppen. Bedarf, Zuschnitt und Zuteilung bleiben dafür änderbar, bis das Semester vorbei ist, auch wenn kurz vor Semesterbeginn jemand ausfällt. Die Wirkung zeigt das SWS-Controlling unter Statistik. Ist eine Vorlesung schon besetzt, die zusammengelegt werden soll, wird zuerst die Zuteilung gelöst. Am Ende meldet sie auf der Bedarfsseite „Review fertig“; auch das ist eine Ansage, keine Sperre.'
			},
			{
				title: 'Abschließen',
				who: ['DEANS_OFFICE'],
				where: [{ href: '/semester', label: 'Semester und Phasen' }],
				when: 'am Ende des geplanten Semesters, nicht schon nach Semesterwoche 9',
				text: 'Mit der Phase „Abgeschlossen“ ist das Semester vorbei, und der Plan ist das Protokoll dessen, was gelehrt wurde. Danach ändert niemand mehr etwas, weder Bedarf noch Zuteilung noch Wünsche. Zurückschalten auf „Studiengangs-Review“ geht, falls doch noch etwas korrigiert werden muss.'
			}
		]
	}
];

/**
 * Every navigation entry the guide may link to. Pages, not areas: "Meine Lehre" is not a
 * destination, its three tabs are.
 */
const KNOWN_ITEMS: readonly NavItem[] = navigationPages([...NAV_ITEMS, ...ACCOUNT_ITEMS]);

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

/**
 * The steps that are due now for somebody with these roles: what the "Jetzt dran" card shows.
 *
 * `phase` is the planning semester's, or null when the dean's office has not named one — which
 * is a state of its own and has its own step. A step nobody in particular does is everybody's.
 * No roles at all (the backend did not answer) means nothing is due, rather than the steps for
 * everybody: a card that tells somebody to enter wishes while the page cannot load the wishes
 * is worse than no card.
 */
export function dueNow(phase: Phase | null, roles: readonly string[]): GuideStep[] {
	if (roles.length === 0) return [];
	const now: DuePhase = phase ?? 'UNSET';
	return GUIDE.flatMap((section) => section.steps).filter(
		(step) =>
			step.due?.includes(now) &&
			// A step nobody in particular does is every colleague's — not a partner faculty's,
			// which states nothing here.
			((step.who.length === 0 && !isPartnerOnly(roles)) ||
				step.who.some((role) => roles.includes(role)))
	);
}

/**
 * Whether a step belongs to where the planning semester stands, whoever does it — the mark on the
 * walk-through. The card asks the narrower question of `dueNow`, for these roles only.
 */
export function isDue(step: GuideStep, planning: PlanningState): boolean {
	if (planning.kind === 'unknown') return false;
	return step.due?.includes(planning.kind === 'set' ? planning.phase : 'UNSET') ?? false;
}

/** How many due steps the card lists before it points at the full walk-through instead. */
export const DUE_NOW_LIMIT = 3;

/** What the "Jetzt dran" card says: a heading about the semester, the steps, or a sentence. */
export type DueCard = {
	/** "Sommersemester 2027 · Wunschphase", or null when there is nothing to name. */
	heading: string | null;
	steps: GuideStep[];
	/** Due steps beyond the limit, which the card counts and links to rather than lists. */
	more: number;
	/** The sentence in place of the steps when none are due, or null when there are steps. */
	note: string | null;
};

/**
 * The "Jetzt dran" card, decided outside the markup so that every state can be tested.
 *
 * Four cases, and each says something different: steps are due; nothing is due for these roles
 * in this phase; no planning semester has been named (the dean's office then has a step, everybody
 * else waits); the backend did not answer, where the card claims nothing at all.
 */
export function dueCard(planning: PlanningState, roles: readonly string[]): DueCard {
	if (planning.kind === 'unknown' || roles.length === 0) {
		return {
			heading: null,
			steps: [],
			more: 0,
			note: 'Der Stand des Planungssemesters lässt sich gerade nicht abrufen.'
		};
	}

	const phase = planning.kind === 'set' ? planning.phase : null;
	const all = dueNow(phase, roles);
	const heading =
		planning.kind === 'set'
			? `${semesterName(planning.code)} · ${PHASE_LABELS[planning.phase]}`
			: 'Noch kein Planungssemester';

	let note: string | null = null;
	if (all.length === 0) {
		note =
			planning.kind === 'set'
				? `In der Phase „${PHASE_LABELS[planning.phase]}“ ist für Deine Rollen gerade nichts Bestimmtes dran.`
				: 'Das Dekanat hat noch nicht gesagt, welches Semester geplant wird. Bis dahin ist nichts Semesterbezogenes dran.';
	}

	return {
		heading,
		steps: all.slice(0, DUE_NOW_LIMIT),
		more: Math.max(0, all.length - DUE_NOW_LIMIT),
		note
	};
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
