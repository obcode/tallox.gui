---
name: planning-marks-ui
description: Wo die Fertigmeldung und die Wunschphase geschaltet werden, und die Action-URL-Falle
metadata:
  type: project
---

Gebaut am 2026-08-28, zusammen mit dem Backend-Umbau (siehe `go/planning-marks`). Die Planung
öffnet und schließt nicht mehr semesterweit, sondern je Studiengang (Ansage) und je Fachgruppe
(Tür).

## Wo die Schalter sitzen

**Beide dort, wo die Person ohnehin arbeitet, wenn sie die Entscheidung trifft.**

- **„Bedarf ist fertig"** auf `/bedarf`, neben dem Bearbeiten-Umschalter. Nur wenn ein
  Studiengang gewählt ist; abgeschaltet statt versteckt, wenn die Person ihn nicht leitet — nach
  derselben Regel wie der Bearbeiten-Knopf.
- **„Wunschphase schließen/öffnen"** auf `/zuteilung`, über der Tabelle. Füllen und Schließen
  sind zwei Akte derselben Person, meistens in dieser Reihenfolge, also gehört der Schalter auf
  den Bildschirm, auf dem sie füllt.

Beide sind **eigene Formulare mit eigener Action**, nicht Teil des Speicherns: die Tabelle
speichert ein Bündel kleiner Entscheidungen, dies ist eine Entscheidung über die Runde selbst —
und ein versehentlicher Klick soll nicht bei jedem automatischen Speichern mitreisen.

## Was die Wunschseite anzeigt

- Zeilen einer Fachgruppe mit **geschlossener** Runde: Auswahlfeld abgeschaltet, darunter der
  Satz, **wer sie wieder öffnen kann**. Das ist der Punkt der Trennung von der Phase — eine
  geschlossene Tür ist ein Schalter der Fachgruppenleitung, ein abgeschlossenes Semester ist das
  Ende des Prozesses und niemandes Schalter.
- Zeilen eines Studiengangs **ohne** Fertigmeldung: Badge „Bedarf noch in Arbeit". Eine
  Orientierung, keine Warnung — sich dort einzutragen ist erlaubt und oft sinnvoll. Der Test
  behauptet, dass der Satz kein „warte" enthält.
- Ist gemeldet, steht **nichts** — eine Marke auf jeder Zeile wäre Rauschen genau auf den Zeilen,
  die zählen.

`closedSubjectGroups()` liest die Fensterliste als **Ausnahmen**: wer nicht drin ist, ist offen.
Andersherum gelesen schlösse es die ganze Fakultät, deshalb ist es eine benannte Funktion mit
Test und keine Inline-Bedingung.

## Zwei Fallen, beide an derselben Stelle

**`action="?/name"` ersetzt den Query-String der Seite.** Zweimal getroffen, an zwei Tagen:

1. Beim Speichern der Zuteilungstabelle las die Action `url.searchParams` — und bekam nichts.
   Die Seite sah richtig aus und speicherte nichts. Behebung: das Semester reist als verstecktes
   Feld im Rumpf, so wie es die Wunschseite immer schon tat.
2. Beim Fenster-Schalter reichte das nicht. Er hat **kein `use:enhance`**, also navigiert der
   Browser wirklich nach `?/window` — und landet danach ohne `semester` und ohne `fachgruppe`
   auf dem Planungssemester. Behebung: die Parameter stehen **zusätzlich in der Action-URL**
   (`?/window&semester=…&fachgruppe=…`), und der Rumpf trägt sie weiter für die Action selbst.

Merksatz: wer ein Formular ohne `use:enhance` absendet, muss die Adresse mitgeben, die er danach
sehen will.

**Was für den ganzen Bildschirm gilt, gehört an seinen Kopf.** Der Satz „Dieses Semester ist
abgeschlossen" stand kurzzeitig zweimal — einmal als Phasenhinweis oben, einmal je Zeile — und
ein E2E-Test fand ihn als zwei Elemente. `rowClosedReason` nennt seither nur noch den Grund, der
sich **je Zeile unterscheidet**: die Fachgruppe. Zwei Module in derselben Tabelle können in
verschiedenen Fachgruppen liegen, ein Semester haben sie gemeinsam.

## Fixture-Reset

`assignmentStatements()` räumt `wish_window` und `demand_completion` mit ab. Beide hängen am
Semester und an der Fachgruppe, **nicht** an der Instanz — es kaskadiert also nichts dorthin, und
ein Lauf, der die Runde schloss und abbrach, ließ jeden späteren Lauf geschlossen starten.

Siehe auch [[wish-page]], [[assignment-page]], [[no-wish-aggregates]].
