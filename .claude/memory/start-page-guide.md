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

- **`/ablauf`** trägt jetzt den ganzen Ablauf und „Wer macht was“, unverändert, plus ein Badge
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
Fachgruppe; Veröffentlichungen sind unumkehrbar und Dekanatssache; `FINAL` schließt den Bedarf,
nicht die Zuteilung. Einziges Nicht-Erzwungenes ist als solches markiert: PBLVs zuletzt.

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
