---
name: planning-token-ui
description: Planungs-Token in der Token-Seite (2026-10-28) — Häkchen statt Scope, was die Seite sagt, und die Svelte-5-Falle, die das Beschreibungsfeld leerte
metadata:
  type: project
---

Gebaut am 2026-10-28 auf `feat/full-reach-tokens`, zum Backend-Schritt gleichen Namens
(`go/full-reach-tokens.md`).

## Was die Seite tut

- **Eigenes Feldset „Planungs-Token“ mit einem Häkchen**, nicht als Scope-Fläche. Volle
  Reichweite ist kein Bereich der API, sondern eine Tür; die Scopes darunter verengen weiter wie
  bisher. Angekreuzt erscheint ein Hinweis mit Badge „Vertraulich“: höchstens 90 Tage, steht im
  Nachtbericht, und was das Token liest, liest auch ein Assistent mit.
- Das Laufzeitfeld zeigt „höchstens 90 Tage“ und setzt `max` auf 90. Die Regel liegt im Backend
  (`TOKEN_LIFETIME_OUT_OF_RANGE` mit eigenem Satz), die Seite sagt sie nur.
- In der Liste steht unter der Reichweite das Badge „volle Reichweite“, damit das vertrauliche
  Token beim Widerrufen zu finden ist.
- `ADMIN` ist jetzt eine anbietbare Scope-Fläche (ZPA und Fachgruppen erreicht ein Planungs-Token
  der Administration). `TOKENS` bleibt in `UNREACHABLE_AREAS`.
- `FULL_REACH_REQUIRED` steht in der Durchlassliste von `graphqlError.ts`.

## Die Falle: `value={…}` in Svelte 5

Das Ankreuzen leerte das Beschreibungsfeld. Svelte 5 setzt alle Ausdrücke eines Template-Blocks
neu, sobald sich einer ändert. `max={fullReach ? 90 : 365}` und der Hinweistext hängen an
`fullReach`, also wurde auch `value={refusal?.description ?? ''}` neu geschrieben, mit `''`.
Abhilfe: `bind:value` an einen eigenen `$state`, den ein `$effect` nur aus der Absage setzt.

Aufgefallen ist es erst im E2E-Test, und dort zuerst als „Rennen beim zweiten Anlegen“
fehlgedeutet. Der 90-Tage-Test war vorher grün, **obwohl** das Formular leer war: der Browser
verweigerte das Absenden wegen `required`, und die erwartete Zeile „höchstens 90 Tage“ stand
ohnehin im Hinweis. Jetzt prüft er `toHaveValue` nach dem Ankreuzen und die Absage über
„Fehlgeschlagen“. Merksatz: **ein Test, der eine Absage erwartet, muss prüfen, wer abgesagt hat.**

Betrifft jedes Eingabefeld mit `value={…}` neben einem reaktiven Geschwister im selben Block.
