---
name: zpa-run-polling
description: Die ZPA-Seite folgt einem laufenden Abgleich per Polling (depends/invalidate), Endpunkt für Endpunkt; warum keine Subscription und kein feinerer Zähler
metadata:
  type: project
---

Gebaut am 2026-10-23, zusammen mit dem losgelösten Lauf im Backend (`go/zpa-import.md`,
Abschnitt „Der Knopf-Lauf überlebt seinen Request“).

`syncZpaNow` kehrt sofort mit einer `RUNNING`-Zeile zurück. `/verwaltung/zpa` lädt sich dann
selbst neu: `load` ruft `depends(ZPA_DEPENDENCY)`, und solange `runningRun(data.runs)` etwas
findet, invalidiert ein `$effect` einmal je Sekunde (`POLL_INTERVAL_MS`). Das Intervall endet
mit dem Lauf, weil der Effekt neu läuft, sobald `running` falsch wird. Es greift auch für einen
Lauf, den der Cron gestartet hat, während die Seite offen ist.

**Körnung = Endpunkt**, weil gemessen: die DB-Arbeit eines ganzen Laufs dauert ≈ 1 s, und 8 der
≈ 11 s sind ein einziger GET aufs ZPA. Der Balken steht also sekundenlang still, und das ist
der wahre Zustand. `total` kommt aus `KIND_LABELS` (typisiert gegen das Schema-Enum), nicht aus
einer Zahl. Die `kinds` kommen **alphabetisch nach Kind** sortiert, nicht in Abschlussreihenfolge.

**a11y:** `aria-live` steht nur auf dem Satz, der sich je Endpunkt ändert. Die Sekunden liegen
außerhalb, sonst würde ein Screenreader jeden Tick ansagen.

**E2E** (`tests/zpa.spec.ts`, „a run in progress“): die Zeile wird per `runSql` angelegt und
fortgeschrieben, weil hinter dem E2E-Stack kein ZPA steht. Seriell und mit Aufräumen, weil eine
`RUNNING`-Zeile für alle anderen Tests den Knopf sperrt und eine fertige zehn Minuten lang
einen Handlauf abweist. Geprüft wird auch, dass **kein** `load`-Event kommt, das Ersetzen also
das Polling war.

Warum keine Subscription: steht in `architecture-decisions.md` (tallox.dev).
