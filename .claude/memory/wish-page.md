---
name: wish-page
description: Die Wunschseite — die Confluence-Tabelle als Form, was sie nie zeigen darf, und die Fehler, die erst der E2E-Lauf sichtbar gemacht hat
metadata:
  type: project
---

`/wuensche`, gebaut am 2026-08-25, am 2026-08-26 auf die Tabellenform umgestellt. Die Seite, für
die [[no-wish-aggregates]] geschrieben wurde — hier gilt die Regel zum ersten Mal echt.

## Die Form ist die Confluence-Tabelle

**Eine Zeile je Modul und Studiengang, eine Spalte je Zug.** Genau die Ansicht, in der die
Fakultät bisher geplant hat und die alle kannten. Die erste Fassung hatte eine Zeile je
Instanz-**Teil**: ein Modul mit zwei Zügen und drei Praktikumsgruppen war acht Zeilen und acht
Formulare — die Version, die man auf halbem Weg liegen lässt.

Eine Zelle ist ein `<select>` mit vier Optionen (— / unbedingt / gerne / notfalls) und einem
Notizfeld, das erscheint, sobald etwas gewählt ist. **Die Notiz ist die Stelle für das, wofür
früher der Teil da war**: „nur die Vorlesung", „lieber Zug B". Wer welchen Teil hält, entscheidet
die Zuteilung; das ist eine Absprache zwischen mehreren und nichts, was eine Person allein angibt.
Das Backend zog am selben Tag nach — `wish` zeigt seither auf die `course_instance`.

**Ein Formular für die ganze Tabelle, ein Speichern.** So wurde die Papierversion auch benutzt:
runtergehen, drei Sachen eintragen, fertig. Die Action bekommt den Zustand _jeder_ Zelle und
bildet die Differenz gegen das Gespeicherte selbst — nicht gegen ein verstecktes Feld, das die
Seite vor zehn Minuten gerendert hat, denn das ist falsch, sobald zwei Tabs offen sind
(`wishChanges` in `src/lib/wishes.ts`, mit vitest). Und es funktioniert ohne JavaScript, was ein
Auswahlfeld, das sich selbst abschickt, nicht täte.

Nebenbei: `instanceRows`/`moduleRows` in `demand.ts` sind jetzt generisch über ein kleines
`RowModule` statt über `ModuleLike`. Sie lesen drei Felder; die größere Schranke zwang diese Seite,
Aufteilung und Planbarkeit eines Moduls abzufragen, um an ein Zug-Label zu kommen.

## Was hier nie stehen darf

Kein Zähler, kein „hat Interesse"-Häkchen, keine Sortierung danach, keine Einfärbung. **Und
nicht „noch niemand hat sich eingetragen"** — eine leere Liste vor dem Stichtag heißt „Du darfst
es nicht sehen", nicht „es ist niemand da". `othersHint()` sagt genau das, und `wishes.test.ts`
behauptet, dass der Satz die verbotenen Formulierungen _nicht_ enthält.

Fremde Eintragungen werden gebaut, indem aus dem, was das Backend geliefert hat, die eigenen
Zeilen entfernt werden — **nie durch Zählen**. Was das Backend liefert, ist bereits gefiltert; eine
hier gebaute Zahl wäre falsch _und_ verräterisch, weil sie davon abhinge, wer schaut.

Die einzigen Zahlen auf der Seite sind „Meine Eintragungen (3)" und „2 Änderungen gespeichert".
Beide sind unbedenklich: sie handeln von dem, was diese Person selbst getan hat.

## „Meine Eintragungen" steht oben und geht über alle Semester

Nach Semester gruppiert, chronologisch, mit „angezeigt" am aktuellen und einem „anzeigen"-Link an
den anderen. Wer im Sommersemester etwas einträgt und dann die Auswahl aufs Wintersemester
stellt, hat nichts zurückgezogen — eine Liste, die nur das gewählte Semester zeigt, behauptet
genau das.

Dafür darf `myWishes` das Semester weglassen (`myWishes { … }`), `wishes(semester:)` nicht: der
Vertraulichkeitsfilter wird aus **einem** Veröffentlichungsdatum gebaut. Eigene Zeilen haben
diesen Zustand nicht, fremde schon. Steht als Regel im Schema-Kommentar des Feldes.

Folge für Playwright: `getByRole('table').last()` traf früher die eigene Übersicht und trifft
jetzt die Wunschtabelle. Die Übersicht wird über ihre `<article>`-Karte und `semesterName()` aus
der Anwendung gefunden — nicht über eine zweite Schreibweise von „Wintersemester 2032/33" im Test,
die bei zweistelliger Endung ins Leere greift und wie eine kaputte Seite aussieht.

## Gewählte Zellen sind eingefärbt — die eigenen, und nur die

`bg-primary` in 20 / 12 / 6 Prozent für unbedingt / gerne / notfalls. **Ein Farbton in drei
Stärken**, nicht drei Farben: eine Priorität ist eine Menge und kein Urteil, und
success/warning/error läse sich als gut, Vorsicht, schlecht — „notfalls" ist nichts davon, sondern
jemand, der eine Lücke füllen würde.

Zwei Regeln, die hier zusammenkommen:

- **Nie von fremden Eintragungen abhängig.** Die Farbe sagt, was _Du_ gewählt hast. Nach fremdem
  Interesse einzufärben wäre genau die Heatmap aus [[no-wish-aggregates]].
- **Semantische Farbe als Hintergrund, nie als Textfarbe** — die Regel aus der CLAUDE.md, hier zum
  x-ten Mal. `text-success` und Verwandte messen auf den hellen Themes 1,35:1 bis 3,5:1.

`tests/contrast.spec.ts` hat dafür einen eigenen Durchlauf über alle zwölf Themes bekommen, **mit
einem per SQL gesetzten Wunsch** — ohne den ist jede Zelle ungefärbt und der Durchlauf misst genau
die Paarung nicht, für die es ihn gibt.

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
korrekt. Jetzt `WishCell.svelte` mit `bind:value` auf lokalem `$state`, per `untrack` einmalig
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

Verwandt: `demandResetSql()` löscht jetzt zuerst die Wünsche. `wish.course_instance_id` ist
`ON DELETE RESTRICT`, ein liegengebliebener Wunsch hätte den Reset eines fremden Specs mit einer
Fremdschlüsselmeldung scheitern lassen.

## Ein Pflichtargument braucht keinen erfundenen Wert

Aus der laufenden Installation gemeldet: `/wuensche` ohne `?semester=` antwortete **403**.

`semester(code:)` ist ein Pflichtargument, also musste die nackte Seite einen Code erfinden — und
jeder erfundene Code ist einer, den das Backend beurteilt. Der Platzhalter lag außerhalb des
Zehn-Jahres-Fensters, das ganze Dokument wurde abgelehnt, und die Umleitung aufs Planungssemester
kam nie zum Zug.

Die Lösung stand längst auf der Bedarfsseite: die semesterabhängigen Felder mit
`@include(if: $withSemester)` erst dann anfragen, wenn es ein Semester gibt.

→ Und ein Semester, das jemand in die Adresse tippt, ist keine kaputte Seite: `403` liest sich als
„Du darfst hier nicht sein", gemeint ist „das ist kein Semester". Die Seite rendert jetzt Auswahl
plus Satz.

## Playwright-Notiz

Textzusicherungen über mehrzeiliges Markup als **String**, nicht als RegExp — nur String-Matching
normalisiert Leerraum. Siehe [[subject-group-pages]], dort steht dieselbe Falle.

Eine Zelle wird über ihren **zugänglichen Namen** gefunden (`Wunsch für IF2A · Modulname`), nie
über die Spaltennummer: die Zahl der Zug-Spalten hängt an den Daten, und ein Locator, der zählt,
zeigt nach einer Fixture-Änderung immer noch auf _ein_ Auswahlfeld — nur auf das falsche, und der
Test scheitert woanders.
