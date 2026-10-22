---
name: desired-hours-ui
description: Wunsch-SWS in der GUI — von/bis auf /wuensche, Übersicht /wuensche/kollegium, Einfrieren/Veröffentlichen auf /semester, und warum selbstspeichernde Felder eigenen Text halten
metadata:
  type: project
---

Gebaut am 2026-10-22 zum Backend-Umbau ([[desired-hours]] und [[assigned-load]] in `go/`).
Anlass war die Mail der Dekanin: Wunsch-SWS als Min/Max, Stichtag, Prüfung durch die FKL,
danach für alle sichtbar. Ampel vorerst nicht.

**Seiten**

- `/wuensche`: Abschnitt „Wie viel möchtest Du halten?“ mit von/bis und Notiz, dazu ein Badge
  offen/eingefroren/veröffentlicht (`desiredHoursStage`) und „Bereits eingeplant“ (die eigene
  Zeile aus `assignedTeachingHours`). Wenn das Dekanat korrigiert hat: „Nach Absprache geändert
  durch …“.
- `/wuensche/kollegium` („SWS im Kollegium“, Tab unter _Meine Lehre_, `/wuensche` ist dort
  `exact`): Tabelle mit Person, Fachgruppen, möchte, eingeplant (Summe plus Aufteilung je
  Fachgruppe). Lecturer sehen vor der Veröffentlichung nur einen Satz statt einer Tabelle leerer
  Zellen. Leitungen und Dekanat sehen die Tabelle von Anfang an, weil sie etwas lesen dürfen.
  Das Dekanat korrigiert dort nach dem Einfrieren direkt in der Zeile (`?/correct`).
- `/semester`: „Wunsch-SWS einfrieren …“ und danach „… veröffentlichen …“, beide hinter
  `<details>` wie das Veröffentlichen der Wünsche, weil sie sich nicht zurücknehmen lassen.
- `/zuteilung`: `candidateLabel` ergibt „Eins (gerne, möchte 6–10 SWS, 8 eingeplant)“.

Logik in `src/lib/desiredHours.ts` (Parser, Label, Stage, Filter, Sortierschlüssel). „Nicht
sichtbar“ und „nicht angegeben“ sind beide `stated: false`. Sortieren nach „möchte“ kann daher
nur ordnen, was ohnehin lesbar ist.

**Die Falle: selbstspeichernde Felder und das Neuladen.** `autosave` speichert beim Verlassen
eines Feldes, danach lädt die Seite neu. Mit `value={data…}` setzt das Neuladen die Felder auf den
gespeicherten Stand. Bei zwei Feldern wird so „bis“ überschrieben, während man es tippt: „von“
allein wird als von = bis gespeichert. Auch eine frühere Speicherung, die später ankommt,
überschreibt, was man inzwischen getippt hat. `untrack()` im Template-Attribut hilft **nicht**
(geprüft, der Wert wird trotzdem neu gesetzt). Gelöst in `DesiredRangeFields.svelte`: Die
Felder halten eigenen `$state` und übernehmen einen neuen Stand nur, wenn sie weder fokussiert
noch seit dem letzten Stand bearbeitet sind. Je Semester werden sie über `{#key}` neu angelegt.
Für das nächste Formular mit mehreren Textfeldern und `autosave` gilt dasselbe.

**E2E** in `tests/wishes.spec.ts` (seriell, eigenes Semester `WISHES.semester`). `reset()`
setzt auch die beiden Marken zurück, denn der CHECK verlangt: nicht veröffentlicht ohne
eingefroren. Tests, die mehrere Felder nacheinander verlassen, warten vor einem
`gotoRendered` auf `networkidle`, sonst kommt die letzte Speicherung nach dem Neuladen an.

**Der geschlossene `LeaveGuard`-Dialog steht immer im DOM**, außerhalb von `<main>`, mit „Noch
nicht gespeichert“. `getByText` sucht ohne Groß/Klein, als Teilstring und auch in versteckten
Elementen. Meldungen der Seite sucht man deshalb in `page.locator('main')`. Vier Specs scheiterten
daran und sind am 2026-10-22 so repariert (GUI `9398ade`).
