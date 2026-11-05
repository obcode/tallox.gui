---
name: error-ids
description: Jeder unerwartete Fehler bekommt eine Fehlernummer — auf der Fehlerseite, im Log mit Stacktrace, als Tag in GlitchTip; warum kein Name und kein Query-String im Log steht
metadata:
  type: project
---

Gebaut am 2026-11-05 nach einer Meldung aus dem Kollegium („Fehler 500 / Internal Error“ beim
Anlegen von Kompetenzen), die sich nicht nachverfolgen ließ: Die Seite sagte nichts, und ohne
Zeitpunkt war das Log nicht zu durchsuchen.

`$lib/errorReport.ts` → `reportUnexpectedError`, aufgerufen von `handleError` in
`hooks.server.ts` **und** `hooks.client.ts`. Er ersetzt `Sentry.handleErrorWithSentry()`:

- `newErrorId()`: acht Hex-Ziffern, am Telefon vorlesbar. `App.Error.errorId` (`app.d.ts`),
  angezeigt in `+error.svelte` (`data-testid="error-id"`).
- Logzeile `unexpected error <id>: <status> <METHOD> <path> (route …, version …)` + Stacktrace
  per `console.error`. GlitchTip bekommt `captureException` mit Tag `errorId`, nur mit DSN.
- **404 bekommt keine Nummer** und wird nicht gemeldet: falsche Adresse, kein Fehler.
- **Pfad ohne Query-String**, weil `/verwaltung/diagnose?mail=…` eine Mailadresse trägt.
  **Keine Identität im Log**: Die Nummer schickt die Person selbst.
- Dockerfile startet `node --enable-source-maps ./build`; die Build-Ausgabe hat die Maps
  bereits, also zeigt der Stack auf `…/<route>/_page.server.ts.js:<zeile>`.

Erwartete Absagen des Backends laufen **nicht** hier durch: Die Seiten fangen sie ab
(`toRefusal` → 403 bzw. `fail(400)`). Eine Fehlernummer heißt also immer „etwas, das niemand
abgefangen hat“. Ein INTERNAL aus dem Backend steht dort im Log (`graph/internal_error.go`).

Geprüft per temporärer Absturzroute gegen den Produktions-Build; Unit-Test in
`errorReport.test.ts`. Runbook zum Nachschlagen im privaten `tallox.dev/deploy/README.md`.
