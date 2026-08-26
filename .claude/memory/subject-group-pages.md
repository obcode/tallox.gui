---
name: subject-group-pages
description: Die Fachgruppen-Seiten — warum Mitgliedschaft und Leitung getrennt aussehen müssen, und zwei Befunde aus dem ersten E2E-Lauf
metadata:
  type: project
---

Zwei Seiten für die zwei Hälften dessen, was eine Fachgruppe ist (2026-08-25):
`/verwaltung/fachgruppen` legt sie an und besetzt sie, `/module` ordnet Module zu.

**Zuordnen geht an zwei Stellen, und das ist Absicht (2026-08-26).** `/module` ist die
Oktober-Arbeitsliste — 506 Module, ankreuzen, stapelweise zuordnen. `/module/[id]` ist die
Korrektur, die jemand macht, während er auf _ein_ Modul schaut und merkt, dass es falsch einsortiert
ist; ihn dafür in eine gefilterte Liste zu schicken, ist der Weg, auf dem aus einer Korrektur etwas
wird, das niemand macht. Beide rufen **dieselbe** Mutation `setModulesSubjectGroup`, die Einzelseite
mit einer Liste von einem: „genau eine Fachgruppe, Verschieben in einem Schritt" ist eine Regel
jener Mutation, und ein zweiter Weg hinein wäre eine zweite Stelle, an der sie schiefgeht.

## Mitgliedschaft und Leitung müssen verschieden aussehen

Beides sind zwei Listen von Kolleg:innen und bedeuten völlig Verschiedenes:

- **Mitgliedschaft** bestimmt, was die Wunschseite zuerst anbietet, und berechtigt zu **nichts**.
- **Leitung** entscheidet, wer die Instanzen der Fachgruppe besetzt und — sobald es Wünsche gibt —
  wer die unveröffentlichten liest.

Deshalb steht der Unterschied als Satz auf der Seite und nicht nur in zwei Überschriften. Als
Leitung werden nur Personen mit der Rolle angeboten; das ist doppelt kosmetisch (Backend und
Fremdschlüssel verweigern es ohnehin) und trotzdem richtig: eine Auswahl, die immer scheitert,
bringt Leuten bei, Fehlermeldungen zu ignorieren.

## Zwei Seiten, zwei Zuständigkeiten (2026-08-26)

`/verwaltung/fachgruppen` ist die Organisation der Fakultät — anlegen, Leitung, Mitglieder.
`/konto/fachgruppen` ist **die eigene Mitgliedschaft**, im Kontobereich, ohne Rolle: Mitgliedschaft
berechtigt zu nichts, also ist die Aussage „in diesen Fächern arbeite ich" die der Person selbst.
Müsste man sie beantragen, wäre die Vorauswahl auf der Wunschseite eine Schranke.

Die Seite zeigt zu jeder Gruppe **ihre Module**, weil „ist das mein Fach?" am Kürzel nicht
ablesbar ist. Die **Leitung** steht dort nur zum Lesen — sie ist ein Grant und bleibt in der
Verwaltung; ein Test behauptet, dass die Seite keinen Weg dorthin anbietet.

Zwei Menüeinträge heißen jetzt ähnlich („Fachgruppen" / „Meine Fachgruppen"): in Tests **exakt**
benennen, sonst bricht der Strict Mode.

## Formulare, die einen Zustand zeigen, dürfen nicht zurückgesetzt werden

Aus der laufenden Installation gemeldet (2026-08-26): nach dem Speichern von Mitgliedern waren die
Haken falsch.

`use:enhance` ruft nach erfolgreichem Speichern `form.reset()`, und ein Reset stellt jedes Feld auf
seinen **Default** — den Stand beim Rendern, nicht den gerade gespeicherten. Einmal speichern sieht
richtig aus, weil beide übereinstimmen; beim zweiten Mal erscheint der erste Render wieder.

Solche Formulare bekommen `update({ reset: false })`. Ein Reset heißt „Felder für die nächste
Eingabe leeren", und ein Formular, das einen _Zustand_ zeigt, ist keine Eingabe. Dazu — wie beim
Wunschformular, siehe [[wish-page]] — lokaler `$state` mit `bind:checked` statt `checked={…}`, und
die Komponente hängt in einem `{#key}` auf der gespeicherten Menge.

Der Test muss den gemeldeten Weg gehen: ankreuzen, speichern, **noch einmal** ankreuzen und
speichern, abwählen, speichern, neu laden. Keine Zusicherung nach dem ersten Speichern hätte es
gefunden.

## Ein Satz, der eine leere Menge erklärt, darf nicht in dem Block stehen, den sie wegfallen lässt

Der Hinweis „Du bist noch keiner Fachgruppe zugeordnet" stand auf der Wunschseite in einem
Abschnitt, der bei leerer Menge gar nicht gerendert wurde — also genau dann nicht, wenn er galt.
Wer in keiner Fachgruppe war, sah nur „Alle weiteren Module" und erfuhr nie, dass es eine
Vorauswahl gäbe.

## Zwei Befunde aus dem ersten E2E-Lauf

**Ein Dokument ist nur so lesbar wie sein am wenigsten lesbares Feld.** `people` **verweigert**,
statt `null` zu antworten. In derselben Query wie `subjectGroups` riss es die ganze Seite in ein
403 — für genau die Dozierenden, die sie lesen sollen. Jetzt eine eigene Anfrage, deren Refusal
bewusst geschluckt wird: die Abwesenheit _ist_ die Antwort, und die Regel hier nachzubauen wäre
eine zweite Meinung über Berechtigungen.

→ Merkregel: ein Feld mit engerer Regel als die Seite gehört in eine eigene Anfrage.

**Eine Person kann gar keinen Namen haben** (der Dev-Nutzer). Eine Checkbox mit leerem Label ist
ein Bedienelement ohne zugänglichen Namen — axe meldet das als _critical_, ein Screenreader sagt
nur „Checkbox". `personLabel()` in `src/lib/subjectGroups.ts` fällt auf die Adresse zurück, die
jede Person hat.

## Playwright: RegExp normalisiert keinen Leerraum

`getByText(/1 Modul nach X verschoben/)` findet nichts, wenn der Satz im Markup über mehrere
Zeilen läuft — nur **String**-Matching normalisiert Leerraum. Bei mehrzeiligen Sätzen also String
(ggf. mit `{ exact: true }`, damit „1 Modul" nicht auch „1 Module" trifft).

Zweite Falle im selben Lauf: Testkürzel dürfen **keine Präfixe voneinander** sein.
`locator('article', { hasText: 'E2EMATHE' })` traf auch `E2EMATHE-ML` und brach im Strict Mode.

Siehe auch [[no-wish-aggregates]] — die Fachgruppenseite ist die Tabelle, in die als Nächstes
jemand „3 Interessent:innen" schreiben möchte.
