---
name: seminar-topics
description: Thema je Zug in der GUI — Feld in Bedarf und Zuteilung, Seminar als eigene Zeile in Wunschtabelle und Übersicht, und warum der #each-Schlüssel sich dafür ändern musste
metadata:
  type: project
---

Gebaut am 2026-10-20 auf `feat/seminar-topics`, Gegenstück zu `go/instance-topic`. Anlass:
Die WI plant bis zu 14 Seminare als Züge des einen ZPA-Sammelmoduls.

## Bis zu 26 Züge

`MAX_TRACKS = 26` in `$lib/demand`, neben `trackLetters`. Früher stand dort zweimal die Zahl 8
direkt in `bedarf/+page.svelte`. Der Wert folgt `MaxTracksPerModule` im Backend.

## Schreiben: dasselbe Muster wie Block/Englisch

`topic0:<id>` (versteckter Ausgangswert) neben `topic:<id>`. `topicChanges(form)` liefert nur
Züge, deren Feld getrimmt abweicht. Leer heißt „Thema entfernen“. Ein Feld, das nicht gesendet
wurde (disabled), ändert nichts. Die Bedarfsseite schreibt das Thema in der `plan`-Action vor
dem Plan, die Zuteilung in `save` mit der Ablehnung unter `topic:<id>`. Angezeigt wird das Feld
nur, wenn das Modul mehrere Züge hat oder schon ein Thema trägt, damit die gewöhnliche Zeile
kein leeres Feld mehr hat.

## Lesen: ein Seminar ist eine eigene Zeile

`moduleRows` gruppiert sonst nach Studiengang und Modul. **Ein Zug mit Thema bekommt eine eigene
`ModuleRow` mit `topic`.** In der Wunschtabelle steht er in Spalte A (`trackColumns`/`cohortIn`
in `$lib/wishes`). Als Spalten hätten 14 Seminare die ganze Tabelle auf 14 Zug-Spalten
verbreitert, nur wegen einer einzigen Zeile.

**Fallstrick:** Die `#each`-Schlüssel in `DemandOverview.svelte` und `wuensche/+page.svelte`
waren `programme.code + module.id`. Mit Seminar-Zeilen wären sie doppelt, und Svelte bricht dann
zur Laufzeit ab. Deshalb gibt es jetzt `moduleRowKey(row)`. Wer über `moduleRows` iteriert, muss
diesen Schlüssel nehmen.

`withTopic(label, topic)` → `WI3A · Design Thinking`. Benutzt wird es in den Kohorten-Gruppen
der Zuteilung, in der Lückenliste, in `wishRowLabel` und in der WishCell. Der Export hat eine
eigene Spalte „Thema“ hinter „Modul“.

## E2E

`demand.spec.ts` › „an umbrella seminar names each of its cohorts“. Die Tabelle speichert 600 ms
nach dem Verlassen eines Felds. Der Test wartet deshalb auf die POST-Antwort von `?/plan` und
nicht auf einen Text: „angelegt“ steht vom Anlegen der Züge noch auf dem Schirm.

Lokal gegen einen zweiten Stack (Backend :8091, Preview :4174) schlägt `contrast.spec.ts`
komplett fehl, weil das Theme-Cookie fest für `http://localhost:4173` gesetzt wird. Das ist
kein Befund.
