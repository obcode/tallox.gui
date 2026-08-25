---
name: wish-page
description: Die Wunschseite — was sie nie zeigen darf, und drei Fehler, die erst der E2E-Lauf sichtbar gemacht hat
metadata:
  type: project
---

`/wuensche`, gebaut am 2026-08-25. Die Seite, für die
[[no-wish-aggregates]] geschrieben wurde — hier gilt die Regel zum ersten Mal echt.

## Was hier nie stehen darf

Kein Zähler, kein „hat Interesse"-Häkchen, keine Sortierung danach, keine Einfärbung. **Und
nicht „noch niemand hat sich eingetragen"** — eine leere Liste vor dem Stichtag heißt „Du darfst
es nicht sehen", nicht „es ist niemand da". `othersHint()` sagt genau das, und `wishes.test.ts`
behauptet, dass der Satz die verbotenen Formulierungen _nicht_ enthält.

Fremde Eintragungen werden gebaut, indem aus dem, was das Backend geliefert hat, die eigenen
Zeilen entfernt werden — **nie durch Zählen**. Was das Backend liefert, ist bereits gefiltert; eine
hier gebaute Zahl wäre falsch _und_ verräterisch, weil sie davon abhinge, wer schaut.

Die einzige Zahl auf der Seite ist „Meine Eintragungen (3)". Die ist unbedenklich: sie sagt nichts
über andere.

## Offen, bis das Semester abgeschlossen ist

Nicht nur in der Wunschphase (2026-08-25, mit der Fakultät). `wishesAreOpen()` ist „Phase ist
nicht FINAL" — und die Seite sagt, _welche_ Art von offen es gerade ist: in der Wunschphase wird
darum gebeten, davor und danach ist es eine erlaubte Korrektur. Ohne diesen Satz liest sich das
offene Formular während der Zuteilung wie ein Versehen.

Der geschlossene Fall sagt „dieses Semester ist abgeschlossen" und **nicht** „die Frist ist
vorbei" — es gibt nichts, was die lesende Person reparieren könnte, und ein Satz, der etwas
anderes nahelegt, schickt sie suchen.

## Die Fachgruppe ist Vorauswahl, keine Schranke

„Meine Fachgruppen" zuerst, alles Weitere darunter und erreichbar. Das Backend verweigert nichts —
FWP-Platzhalter, Lehre für andere Studiengänge und „ich erschließe mir ein Gebiet" sind real, und
die Reparatur für das Letzte ist der Beitritt zur Fachgruppe, nicht eine Ablehnung. Die Seite
sagt das auch so.

## Drei Fehler, die erst der E2E-Lauf zeigte

**`<option selected={…}>` macht das Feld reaktiv gesteuert.** Svelte wendet den Ausdruck bei jedem
Re-Render neu an: eine andere Priorität zu wählen sprang sofort auf den gespeicherten Wert zurück
— das Feld war schlicht nicht bedienbar. In keinem Unit-Test sichtbar, Markup und Daten sind
korrekt. Jetzt `WishForm.svelte` mit `bind:value` auf lokalem `$state`, per `untrack` einmalig
gesetzt, und die Komponente hängt in einem `{#key}` auf dem _gespeicherten_ Zustand: neu aufsetzen
genau dann, wenn sich das Gespeicherte geändert hat.

→ Ein `$effect`, der das Feld nachzieht, war der erste Versuch und ist die falsche Form: ein
Effekt, der das Feld schreibt, das er in Ruhe lassen soll, ist ein Rennen mit der tippenden Person.

**Eine Zusicherung, die zu früh zutrifft, wartet nicht.** `getByRole('table').last()` traf vor dem
Reload die _obere_ Tabelle, deren Zellen dieselben Wörter enthalten — der Rest des Tests lief
gegen den noch laufenden `invalidateAll`. Nach einem Schreibvorgang auf etwas warten, **das es
vorher nicht gab** (hier: die Überschrift „Meine Eintragungen (1)").

**Eine Fixture, die eine Berechtigung vergibt, braucht ein Subjekt, über das niemand sonst etwas
behauptet.** Die Wunsch-Fixture machte Vier zur Leitung von `E2F` — und ein Bedarfstest drei
Dateien weiter behauptet, dass sie genau das _nicht_ ist. Deshalb hat sie jetzt ihren eigenen
Studiengang `E2G`, ihr eigenes Semester und ihre eigene Instanz.

Verwandt: `demandResetSql()` löscht jetzt zuerst die Wünsche. `wish.instance_part_id` ist
`ON DELETE RESTRICT`, ein liegengebliebener Wunsch hätte den Reset eines fremden Specs mit einer
Fremdschlüsselmeldung scheitern lassen.

## Playwright-Notiz

Textzusicherungen über mehrzeiliges Markup als **String**, nicht als RegExp — nur String-Matching
normalisiert Leerraum. Siehe [[subject-group-pages]], dort steht dieselbe Falle.
