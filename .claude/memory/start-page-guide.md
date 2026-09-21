---
name: start-page-guide
description: Die Startseite erklärt den Ablauf als Schritte mit Rolle und Ort — die Daten liegen in $lib/guide.ts, verlinkt wird nur, was das Menü zeigt
metadata:
  type: project
---

Gebaut am 2026-09-21 auf Wunsch: „ganz konkret die Nutzung beschreiben — wer macht was, und wo".

## Wie es gebaut ist

- **`src/lib/guide.ts`** hält den Ablauf als Daten: zwei Abschnitte („Einmal einrichten",
  „Jedes Semester"), je Schritt Titel, Rollen (`who`, leer = alle), Orte (`where`, Routen aus der
  Navigation) und ein Absatz Text. Die Tabelle „Wer macht was" auf der Startseite entsteht aus
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
Administration an, die Leitung nur an Rolleninhaber:innen; **jedes Modul genau eine Fachgruppe**
(`module_subject_group`, PK `module_id`); Aufteilung durch die Leitung des Heimatstudiengangs;
Kopplung über Studiengänge ist Regelfall; Fertigmeldung ist Ansage, Wunschrunde ist Tür je
Fachgruppe; Veröffentlichungen sind unumkehrbar und Dekanatssache; `FINAL` schließt den Bedarf,
nicht die Zuteilung. Einziges Nicht-Erzwungenes ist als solches markiert: PBLVs zuletzt.

## Falle aus dem Lauf

Ein Text-Link auf der Startseite trägt denselben zugänglichen Namen wie der Menüeintrag
(„Fachgruppen"). `subject-groups.spec.ts` und `own-subject-groups.spec.ts` prüfen das Menü und trafen im Strict
Mode zwei — jetzt auf `getByRole('banner')` eingegrenzt. Der zweite fiel erst in der CI auf, weil
lokal nur ein Teil der Suiten lief: **vor dem Push die ganze E2E-Suite**, sie braucht eine Minute. **Merksatz: ein Test über das Menü sucht in der Kopfleiste,
nicht auf der Seite.**
