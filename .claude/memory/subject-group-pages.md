---
name: subject-group-pages
description: Die Fachgruppen-Seiten — warum Mitgliedschaft und Leitung getrennt aussehen müssen, und zwei Befunde aus dem ersten E2E-Lauf
metadata:
  type: project
---

Zwei Seiten für die zwei Hälften dessen, was eine Fachgruppe ist (2026-08-25):
`/verwaltung/fachgruppen` legt sie an und besetzt sie, `/module` ordnet Module zu.

## Mitgliedschaft und Leitung müssen verschieden aussehen

Beides sind zwei Listen von Kolleg:innen und bedeuten völlig Verschiedenes:

- **Mitgliedschaft** bestimmt, was die Wunschseite zuerst anbietet, und berechtigt zu **nichts**.
- **Leitung** entscheidet, wer die Instanzen der Fachgruppe besetzt und — sobald es Wünsche gibt —
  wer die unveröffentlichten liest.

Deshalb steht der Unterschied als Satz auf der Seite und nicht nur in zwei Überschriften. Als
Leitung werden nur Personen mit der Rolle angeboten; das ist doppelt kosmetisch (Backend und
Fremdschlüssel verweigern es ohnehin) und trotzdem richtig: eine Auswahl, die immer scheitert,
bringt Leuten bei, Fehlermeldungen zu ignorieren.

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
