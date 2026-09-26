---
name: toolchain-gotchas
description: Drei Stolperfallen beim Aufsetzen der SvelteKit-Toolchain, die je zehn Minuten gekostet haben
metadata:
  type: project
---

Gefunden beim Aufsetzen am 2026-07-30. Alle drei sehen nach Konfigurationsfehlern des
Projekts aus und sind es nicht.

## `allowBuilds` ist eine Map, keine Liste

pnpm 10/11 blockiert native postinstall-Skripte. Die Freigabe steht seit pnpm 10 **nicht mehr
im `pnpm`-Feld der package.json**, sondern in `pnpm-workspace.yaml` — und zwar als Map:

```yaml
allowBuilds:
  '@tailwindcss/oxide': true
  esbuild: true
```

Die Listenform (`- esbuild`) wird stillschweigend ignoriert; `pnpm install` meldet weiterhin
`ERR_PNPM_IGNORED_BUILDS`. Ebenso `pnpm.onlyBuiltDependencies` in der package.json.

Zweite Falle an derselben Stelle: nach dem Ändern der Datei sagt `pnpm install` „Already up
to date" und übergeht die neue Einstellung. `pnpm install --force` oder eine echte
Lockfile-Änderung erzwingt sie.

## `test` gehört nicht in die vite.config

Ein `test`-Block in `vite.config.ts` ist zwar zur Laufzeit funktionsfähig, aber kein
gültiges `UserConfigExport` — `pnpm run check` meldet zu Recht _„Object literal may only
specify known properties, and 'test' does not exist"_. Deshalb liegt die Vitest-Konfiguration
in einer eigenen `vitest.config.ts` mit `defineConfig` aus `vitest/config`.

Der `include`-Glob muss dort eng auf `src/**` stehen, sonst zieht `pnpm test` die
Playwright-Specs aus `tests/` mit hinein und scheitert daran, dass sie einen Browser
erwarten.

## Links brauchen `resolve()`

`eslint-plugin-svelte` 3.x erzwingt `svelte/no-navigation-without-resolve`: ein
`href="/irgendwas"` ist ein Lint-Fehler. Richtig:

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<a href={resolve('/')}>…</a>
```

## Erst formatieren, dann `pnpm codegen`

Der `client-preset` ordnet ein `graphql(`…`)`-Dokument über seinen **exakten Quelltext** zu. Formatiert
Prettier die Query nach dem Codegen um (z. B. die Variablenliste auf eine Zeile), findet
`graphql()` sein Dokument nicht mehr, die Anfrage scheitert, und die Seite zeigt ein 403 mit der
generischen Meldung — `svelte-check` bleibt grün. Reihenfolge deshalb immer `pnpm format`, dann
`pnpm codegen`. Gefunden am 2026-09-26 an `/zuteilung/kompetenzen`.

## Ein alter Preview-Server auf 4173 testet den alten Build

`reuseExistingServer` ist lokal an: läuft auf 4173 noch ein Preview von vorhin, baut Playwright
**nicht** neu und testet gegen den alten Stand. Ein Fehler, der nach dem Fix bleibt, ist deshalb
zuerst eine Frage an `ps`, nicht an den Code. Ein manuell gestarteter Preview, der „Port 4173 is in
use" meldet, hat es gerade verraten.
