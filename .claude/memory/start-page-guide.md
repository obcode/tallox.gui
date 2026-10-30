---
name: start-page-guide
description: Der Ablauf als Daten in $lib/guide.ts, die Einführung in $lib/intro.ts — seit 2026-10-17 unter /ablauf, die Startseite und die Hilfe-Leiste zeigen nur „Jetzt dran“ und Kurzanleitungen; verlinkt wird nur, was das Menü zeigt
metadata:
  type: project
---

Gebaut am 2026-09-21 auf Wunsch: „ganz konkret die Nutzung beschreiben — wer macht was, und wo".

## Umbau am 2026-10-17: Ablauf weg von der Startseite, „Jetzt dran“ und Hilfe-Leiste

Rückmeldung: die zwei Abschnitte mit allen Schritten plus Tabelle auf der Startseite
**erschlagen alle, die neu sind**. Und zwischen zwei Planungsrunden fällt vom How-to etwas hinten
runter — gefragt wird dann nicht, weil man nicht weiß, dass man fragen müsste.

- **`/ablauf`** trägt jetzt den ganzen Ablauf (bis 2026-10-23 auch „Wer macht was“), plus ein Badge
  „jetzt dran“ an den Schritten der aktuellen Phase (`isDue`). Nicht in der Navigation: erreichbar
  über die Hilfe-Leiste („Nachschlagen“) und die Karte „Jetzt dran“, verlinkt mit `resolve()`
  statt über `GuidePlaces`.
- **Startseite**: Einleitung, dann die Karte **„Jetzt dran für Dich“** (`DueNow.svelte`,
  Logik in `dueCard`/`dueNow` in `guide.ts`), dann die übrigen Kästen.
- **`due?: DuePhase[]`** je Semesterschritt: die Phase(n) des _Planungssemesters_, in der er dran
  ist; `UNSET` = kein Planungssemester gesetzt. Ein Zeiger, keine Regel — die Phase ist der Takt
  der Fakultät, gesperrt wird dadurch nichts. **„Abschließen“ hat bewusst kein `due`**: im Review
  angezeigt läse es sich wie „jetzt abschließen“, und die Anleitung warnt genau davor.
- **Neuer Schritt „Die Wunschrunde der Fachgruppe schließen“** (Fachgruppenleitung, Zuteilung,
  Wunschphase). Die Wunschrunde ist **offen, solange niemand sie schließt** (fehlende Zeile =
  offen, siehe Backend `planning-marks`) — der Text sagt das, damit niemand auf ein Öffnen wartet.
- **Phase im Layout**: `loadPlanningState()` (`$lib/server/planning.ts`) als eigene Query neben
  der Session, nicht als Feld darin — die Session unterscheidet „kein Konto“ von „Backend weg“,
  und diese Klassifikation darf nicht an einem zweiten Feld scheitern. Drei Zustände
  (`set`/`unset`/`unknown`), der Typ liegt in `$lib/planning.ts`, weil die Karte ihn rendert.
- **Hilfe-Leiste** (`HelpPanel.svelte`, Knopf ❓ neben „Feedback“, Text erst ab 2xl wegen der
  knappen Zeile bei xl): natives `<dialog class="modal modal-end">` mit „Jetzt dran“ und den
  **Kurzanleitungen aus `$lib/help.ts`** — Fragen mit Antwort, Rollen und Ort, gefiltert nach
  Rolle, die zur aktuellen Seite zuerst (`helpFor`). Gleiche Link-Prüfung wie der Ablauf.

**Falle aus dem Lauf:** Der Inhalt der geschlossenen Leiste stand versteckt im DOM jeder Seite,
und `getByText(/geändert/)` in `demand.spec.ts` traf plötzlich eine FAQ-Frage (Strict Mode). Der
Inhalt wird deshalb **nur gerendert, solange die Leiste offen ist** (`{#if open}`, `onclose`), und
`help.spec.ts` sichert das ab. Merksatz: was im Layout hängt, darf geschlossen keinen Text auf
die Seite legen.

**Phasenabhängiges in E2E nicht prüfen:** andere Specs verschieben das Planungssemester parallel.
Die Abbildung Phase → Schritte steht in `guide.test.ts`; E2E prüft nur, was in jeder Phase gilt.

Stufe 2 (Assistent über das Fakultätsmodell) ist geplant, aber nicht gebaut — Stand und offene
Fragen in der privaten Workspace-Notiz `help-assistant` (tallox.dev).

## Prozessbild (2026-10-23)

Gewünscht: „den Ablauf richtig schön graphisch“, und zwar auf `/ablauf`, nicht als Artifact oder
in Claude Design. Oben auf der Seite steht jetzt **„Das Semester im Überblick“**
(`ProcessChart.svelte`, Logik in **`$lib/processChart.ts`**): Phasen als Spalten, Rollen als
Bahnen, in jeder Zelle die Schritte mit ihrer Nummer als Sprunglink auf `#schritt-N` in der
Liste darunter.

- **Nur aus `GUIDE` abgeleitet**, kein zweites Bild von Hand. Spalte = erste Phase in `due`, die
  eine Phase des geplanten Semesters ist; „Planungssemester setzen“ (`UNSET`/`FINAL`) bekommt die
  eigene Spalte **„Auftakt“**, „Abschließen“ (bewusst ohne `due`) landet in `FINAL`. Bahn = erste
  Rolle in `who`; leer = „Alle“. ADMIN und Partner haben keine Bahn, `laneOf` wirft dann.
- **`oneWay: true`** an den drei unumkehrbaren Dekanatsschritten (Wunsch-SWS einfrieren und
  veröffentlichen, Wünsche veröffentlichen, Zuteilung veröffentlichen — die dritte erst seit
  2026-10-23 ein eigener Schritt), im Bild als Plakette „nicht umkehrbar“. Der Test
  verlangt, dass ihr Text „nicht zurücknehmen“ sagt.
- Ab `lg` richten sich die Bahnen über **`grid-rows-subgrid`** über die Spalten aus, die Köpfe sind
  Chevrons per `clip-path`. Darunter ist jede Phase eine eigene Karte, und die Rolle steht in
  der Zelle (bei `lg` bleibt sie als `sr-only` für Screenreader).
- **Kontrastfalle:** Der Kopf der aktuellen Phase war zuerst `bg-primary`. `primary` auf
  `primary-content` bei 14 px erreicht auf `winter` und `corporate` nur 4,13:1. Jetzt sind alle
  Köpfe `neutral`; die Plakette „hier stehen wir“ und die `border-primary`-Kästen markieren die
  Phase. Abgesichert durch den eigenen Block in `contrast.spec.ts` (alle Themes, 1440 px) und
  durch zwei axe-Läufe in `a11y.spec.ts` (1440 und 375 px).
- Tests: `processChart.test.ts` pinnt die Plätze und die Nummern; E2E `smoke.spec.ts` ›
  „draws the semester as phases and roles“, ohne Phasenabhängiges.

## Wie es gebaut ist

- **`src/lib/guide.ts`** hält den Ablauf als Daten (gerendert unter `/ablauf`): zwei Abschnitte („Einmal einrichten",
  „Jedes Semester"), je Schritt Titel, Rollen (`who`, leer = alle), Orte (`where`, Routen aus der
  Navigation) und ein Absatz Text. Die Tabelle „Wer macht was" auf `/ablauf` entsteht aus
  denselben Schritten — zwei Antworten auf „wer macht was" dürfen nicht auseinanderlaufen.
- **Verlinkt wird nur, was das Menü dieser Person zeigt** (`mayOpen` über `visibleNavItems`).
  Ein Schritt, der eine Dozentin in `/verwaltung/personen` schickt, ist ein Klick in eine
  Ablehnung; der Ort steht dann als Text, die Rolle daneben sagt ohnehin, wer es macht. Der
  Unit-Test prüft, dass jede Route der Anleitung in der Navigation existiert.
- Die Nummerierung läuft über beide Abschnitte durch (`sections` mit `start`), weil der Prozess
  eine Folge ist. Kein `{@const}` mit Seiteneffekt — das war der erste Versuch und funktioniert im
  Runes-Modus nicht.
- Die Einzelseiten (Bedarf, Wünsche, Zuteilung, Modulkatalog, Semester, Fachgruppen) tragen je
  einen Absatz „wer, und wohin weiter", mit Links zueinander.

## Was der Text behauptet, und wo es steht

Jede Aussage ist eine Regel des Backends, nicht einer Folie: Zugang ist die Tabelle `person`;
Studiengangs- und Fachgruppenleitung sind gescopt, leer heißt nichts; Fachgruppen legt die
Administration an, die Leitung nur an Personen mit der Rolle; **jedes Modul genau eine Fachgruppe**
(`module_subject_group`, PK `module_id`); Aufteilung durch die Leitung des Heimatstudiengangs oder der Fachgruppe des Moduls (seit 2026-10-17);
Kopplung über Studiengänge ist Regelfall; Fertigmeldung ist Ansage, Wunschrunde ist Tür je
Fachgruppe; Veröffentlichungen sind unumkehrbar und Dekanatssache, schließen aber nichts; `FINAL` schließt alles
(Bedarf, Wünsche, Wunsch-SWS, Zuteilung — Schreibmatrix in `policy/write.go`). Einziges Nicht-Erzwungenes ist als solches markiert: PBLVs zuletzt.

## Falle aus dem Lauf

Ein Text-Link auf der Startseite trägt denselben zugänglichen Namen wie der Menüeintrag
(„Fachgruppen"). `subject-groups.spec.ts` und `own-subject-groups.spec.ts` prüfen das Menü und trafen im Strict
Mode zwei — jetzt auf `getByRole('banner')` eingegrenzt. Der zweite fiel erst in der CI auf, weil
lokal nur ein Teil der Suiten lief: **vor dem Push die ganze E2E-Suite**, sie braucht eine Minute. **Merksatz: ein Test über das Menü sucht in der Kopfleiste,
nicht auf der Seite.**

## Zeitrahmen (2026-10-15)

Die Schritte „Jedes Semester" tragen ein `when` in **Wochen des laufenden Semesters** — geplant
wird das nächste, während das laufende beginnt: Planungssemester Wo 1–2, Bedarf 3–5, Wünsche 6–7,
Veröffentlichen Ende 7, Zuteilung 8–9, Abschluss danach. Herkunft: Rückmeldung der
Fachgruppenleitung Mathematik aus den letzten Excel-Planungen. Rhythmus der Fakultät, **nicht
erzwungen** — keine Phase schaltet nach Kalender. Der Unit-Test verlangt `when` genau für die
Semesterschritte. Dazu zwei Sätze, die aus derselben Rückmeldung kommen: der Bedarf bleibt in
Wunsch- und Zuteilungsphase änderbar (Schreibmatrix `DEMAND` in `WISHES`/`ASSIGNMENT`), und nur
das nächste Semester planen, weil das übernächste selten trägt.

## „Wer leitet was“ (2026-10-20)

Unter „Jetzt dran“ stehen jetzt alle Studiengänge und Fachgruppen mit ihren Leitungen. Bei den
Fachgruppen lassen sich die Module per `<details>` aufklappen. Die Startseite hat dafür erstmals
ein eigenes `+page.server.ts` mit einer Anfrage, `StartOverview`. Schlägt sie fehl, fällt der
Abschnitt weg und die Startseite bleibt stehen. Ohne Konto antwortet ohnehin das Root-Layout.

`Programme.leads` ist dafür im Backend neu und für jedes Konto lesbar, siehe `go/programme-leads.md`.
Die Abschnittsüberschriften „Studiengänge“ und „Fachgruppen“ sind `h3` und keine Links, sie
kollidieren also nicht mit den Menütests. Der Link zur eigenen Auswahl heißt „Meine
Fachgruppen“. E2E: `smoke.spec.ts` › „shows who leads which programme and subject group“.

## Einführung für Dozierende (2026-10-20)

Für die Klausurtagung am 27./28.10. gewünscht: „direkt mit Tallox, keine Folien, und nachträglich
nachlesbar“, Zielgruppe die Dozierenden. **`/einfuehrung`**, Inhalt als Daten in
**`$lib/intro.ts`**:

- `PROMISES`: die drei tragenden Regeln in Alltagssprache.
- `PHASES`: je Phase „was passiert“ und „für Dich“, Marke „hier stehen wir“ über `isCurrentPhase`.
- `GLOSSARY`.

**Die Anleitungen sind nicht neu geschrieben**: `howtos()` nimmt die Einträge aus `help.ts`, die
Dozierende betreffen und ein `stage` (`ONCE` / `EACH_SEMESTER` / `AFTERWARDS`) tragen. Eine
fehlende Anleitung kommt also als Eintrag nach `help.ts` und steht dann in der Leiste und auf der
Einführung. Dazugekommen sind „in welchen Fächern ich arbeite“ und „Wunsch eintragen und
zurückziehen“. Die Wunschrunde ist eine Tür: geschlossen lehnt der Server Eintragen _und_
Zurückziehen ab (`ErrWishWindowClosed`).

Verlinkt von der Startseite („Neu hier?“), von der Hilfe-Leiste und von `/ablauf`.

Tests:

- `intro.test.ts`: Phasenreihenfolge gegen `PHASE_ORDER`, Routen, „auch keine Anzahl“, `stage`
  nur an Einträgen für Dozierende, Marke für `set`, `unset` und `unknown`.
- E2E `smoke.spec.ts` › „the introduction“, ohne Phasenabhängiges.
- Falle: „auch keine Anzahl“ steht auch in einer aufgeklappten Hilfeantwort. Deshalb im Bereich
  der Versprechen suchen, nicht in `main`.

Pflegeregel: [[help-maintenance]] (in `tallox.dev`).

## „Dein Stand“ (2026-10-23)

Frage: „Sollen wir für normale Dozierende einen Onboarding-Assistenten bauen?“ Entschieden:
**kein Wizard, sondern eine Karte** unter „Jetzt dran“ (`SetupChecklist.svelte`, Logik in
**`$lib/setup.ts`**), fertig für die Klausurtagung, damit das Kollegium dort gleich einrichtet.

- **Die Lücke war Zustand, nicht Inhalt.** Die Idee steht in `/einfuehrung`, das Setzen auf den
  eigenen Seiten. Keine Seite sagte: „bei Dir fehlt X“. Ein Wizard hätte die Formulare
  (Auto-Save, `CompetenceRow`) ein zweites Mal gebraucht und wäre nach einem Durchlauf tot.
- **Abgeleitet, nichts gespeichert.** Kein „eingerichtet“-Flag (veraltet, sobald jemand einer
  zweiten Fachgruppe beitritt), kein Wegklicken, und **kein „Einführung gelesen“** — das wären
  Verhaltensdaten, dieselbe Mitbestimmungsfrage wie beim Zugriffsprotokoll. Die Einführung
  bleibt ein Link.
- Zwei Gruppen: **„Einmal angeben“** (Fachgruppen; Kompetenzen bis zum Minimum, gesperrt ohne
  Fachgruppe) und **„Für <Semester>“** (Wunsch-SWS). Eine erledigte Gruppe verschwindet. Die
  Wunsch-SWS kommen also mit jedem neuen Planungssemester zurück, aber nur in
  `DEMAND_PLANNING`/`WISHES` und solange nicht eingefroren.
- **Minimum insgesamt, nicht je Fachgruppe** (seit 2026-10-30, Meldung aus dem Kollegium): die
  Karte liest `myCompetenceTotal` — Zahl über alle eigenen Fachgruppen, `minimum` schon im Backend
  auf die vorhandenen Pflichtmodule gedeckelt (vorher `reachableMinimum` hier, je Gruppe). Die
  Kompetenzseite zeigt die Gesamtzahl oben und je Gruppe nur „Davon in dieser Fachgruppe: n“; die
  Leitungsseite nur die Zahl ihrer Gruppe, ohne Warnung — ob jemand die drei erreicht, zählt Zeilen
  anderer Gruppen (Olivers Entscheidung, siehe `go/competences.md`).
- Nur mit `LECTURER` in den effektiven Rollen. Eigene Query `OwnSetup` im `+page.server.ts`,
  schlägt sie fehl, fällt nur die Karte weg.
- Tests: `setup.test.ts`; E2E `setup.spec.ts` mit der neuen Persona **Elf** (`newcomer`, eigene
  Fixture-Fachgruppe `SETUP` mit einem Pflichtfach). Phasenabhängiges nur im Unit-Test.
- **Falle:** der Link in der Karte hieß zuerst „Einführung“ und machte `smoke.spec.ts` (Strict
  Mode, `getByRole('main')`) rot. Jetzt „Einführung in Tallox“.

## Textabgleich (2026-10-23)

Auf Wunsch „passt alles zusammen?“ Hilfe, Ablauf, Einführung, Nav-`hint`s und Seitenabsätze gegen
das Backend gelesen. Korrigiert:

- **Veröffentlicht heißt nicht endgültig.** Mehrere Stellen lasen sich so, als ließe sich eine
  veröffentlichte Zuteilung nicht mehr ändern („bis zur Veröffentlichung kann sich das noch
  ändern“). Die Schreibmatrix hält aber alles offen bis `FINAL`. Jetzt sagen Hilfe, Einführung
  und „Meine Zuteilungen“ das auch so.
- **„Die Zuteilung veröffentlichen“** ist ein eigener Schritt (`oneWay`, `due` Zuteilung/Review).
  Vorher war sie unumkehrbar, stand aber nicht im Ablauf und war im Bild nicht markiert.
- **Module einsortieren:** dürfen Fachgruppenleitung (unsortierte aufnehmen, eigene freigeben),
  Dekanat und Administration (`MayFileModule`). Ablauf, Katalog und Bedarfsseite nannten nur
  die Administration.
- **SWS-Aufteilung:** darf auch das Dekanat (`MayWriteModuleSplit`).
- Wunschrunde „öffnet und schließt“ → „offen, bis die Leitung sie schließt“. Glossar „Kompetenz“
  mit „Einarbeitung“ wie auf der Seite. Nav-`hint` „Fachgruppen“ war „Vorauswahl für
  Kompetenzen“, gezeigt werden dort aber nur Module der eigenen Gruppen.

## Gekürzt (2026-10-23)

Auf Wunsch „was kann noch eingespart werden“:

- Startseite ohne die Kästen **„Anmeldung“** und **„Backend“**. Die Identität zeigt die Kopfleiste,
  die Server-Version (oder „—“) der Footer. `identity.spec.ts` hatte die Weitergabe über den
  Anmeldekasten geprüft, der nur den eingehenden Header zeigte. Jetzt prüft er den Namen aus
  `me` auf „Meine Rollen“. Das ist ein stärkerer Beleg.
- Einleitung auf einen Satz plus „Neu hier?“. Der API-Kasten ist auf einen Satz mit zwei Links
  gekürzt; Inhalt und Grenzen stehen in `/einfuehrung` und `/api-doku`.
- `/ablauf` ohne die Tabelle **„Wer macht was“**: Sie wiederholte das Prozessbild. Der Hinweis
  auf „Meine Rollen“ steht jetzt im Kopfabsatz.
- Die Gruppe der Karte „Dein Stand“ heißt **„Einmal angeben“**, nicht „Einmal einrichten“. Sonst
  trägt sie dieselbe Überschrift wie der Ablauf-Abschnitt, den `smoke.spec.ts` auf der Startseite
  ausschließt. Der Test war nur grün, weil Eins schon alles angegeben hat.

## „Alles angegeben“ statt Verschwinden (2026-10-23)

Oliver hatte schon alles angegeben und fand die Karte nicht. Das war so gebaut, sah aber aus
wie ein Fehler. Jetzt schrumpft die Karte bei vollständigem Stand auf eine Zeile mit der Marke
„Alles angegeben“, dem Stand und den Links zum Ändern (`SetupCard` mit `complete: true`). `null`
gibt es nur noch für Konten ohne `LECTURER`. So unterscheidet sich „fertig“ von „Abfrage
fehlgeschlagen“, denn dann fehlt die Karte weiterhin.
