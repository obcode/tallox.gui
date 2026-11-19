---
name: stale-build
description: Tab älter als das letzte Deploy — Chunk weg, „Importing a module script failed“; was SvelteKit selbst tut, warum das nicht reichte, und die drei Schichten seitdem
metadata:
  type: project
---

Gemeldet am 2026-11-19 als GlitchTip-Issue: `TypeError: Importing a module script failed.`
(Safari), aus einem Tab, der seit dem Vorabend offen war; dazwischen lag das Deploy von v5.87.0,
und der erste Klick auf eine Seite, die der Tab noch nicht geladen hatte (`/verwaltung/zpa`),
endete auf der Fehlerseite mit Fehlernummer.

**Was SvelteKit selbst tut** (2.70, `client.js`): Scheitert ein Load bei der _Navigation_, fragt
es `/_app/version.json` und lädt voll neu, wenn die Version abweicht. Das Hover-Preload meldet
**nicht** (in Chromium nachgeprüft: der Fehler kommt erst beim Klick). Die Meldung heißt also,
seine Prüfung sagte „keine neuere Fassung“ — warum, ist offen. Kandidat: `version.json` kommt
von adapter-node ohne `Cache-Control` (nur ETag/Last-Modified, heuristisches Caching möglich);
ohne Safari nicht nachstellbar. Der Fix hängt nicht an dieser Prüfung.

**Drei Schichten seitdem:**

1. `svelte.config.js` `version.pollInterval` 5 min, dazu `updated.check()` bei
   `visibilitychange` (`NewVersionReload.svelte`, Root-Layout). Ist `updated.current`, wird der
   nächste **Link oder GET-Formular** zu `location.assign` — nicht `goto` (LeaveGuard macht nach
   dem Speichern mit `goto` weiter), nicht popstate, und nicht, solange `pendingChanges` etwas
   hält (dann fragt LeaveGuard zuerst).
2. `hooks.client.ts`: `isStaleBuildError` ($lib/staleBuild; Meldungen von Safari, Chromium,
   Firefox, Vite) → **keine Meldung, keine Fehlernummer**, `App.Error.staleBuild`, dazu
   `updated.check()`.
3. `+error.svelte` mit `staleBuild`: lädt einmal je Adresse und Minute neu (`claimReload`,
   sessionStorage); danach, oder ohne Storage, der Knopf „Seite neu laden“ — nie eine Schleife.

Seitdem auch: `beforeBreadcrumb`/`beforeSend` schneiden **Query-Strings** aus allen URLs
($lib/sentryScrub) — im Issue stand der Anfang eines Namens aus der Personensuche (`?q=`).

E2E `tests/stale-build.spec.ts` spielt das Deploy mit zwei Routen nach (version.json, 404 für
nicht gesehene `/_app/immutable/nodes/`); alle drei Tests sind ohne den Fix rot. Siehe auch
[[error-ids]], [[leave-guard]].
