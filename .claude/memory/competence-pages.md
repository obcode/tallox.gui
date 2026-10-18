---
name: competence-pages
description: Die Kompetenz-Seiten — eigene Angaben im Kontobereich, der Pool der Fachgruppenleitung unter der Zuteilung, und der Pool in der Kandidatenliste
metadata:
  type: project
---

Gebaut am 2026-09-26 zum Backend-Schritt [[go/competences]]. Drei Stellen:

| Was                                                  | Wo                                        | Für wen                     |
| ---------------------------------------------------- | ----------------------------------------- | --------------------------- |
| Eigene Angaben                                       | `/konto/kompetenzen`                      | alle, ohne Rolle            |
| Pool, Lücken, unter dem Minimum, Lehrende ohne Konto | `/zuteilung/kompetenzen`                  | Fachgruppenleitung, Dekanat |
| Pool in der Kandidatenliste                          | `/zuteilung` via `candidatesFor(…, pool)` | wer zuteilt                 |

Logik in `$lib/competences.ts` (vitest), E2E in `tests/competences.spec.ts`, Fixture `COMPETENCES`
in `tests/seed.ts`.

## Eigene Angaben

Nur die Module der **eigenen Fachgruppen**, Pflichtfächer zuerst (`ModuleRef.compulsory`, eigens
dafür im Backend ergänzt). Eine Tabelle je Gruppe, **ein** Formular für alles, Differenz
serverseitig gegen den gespeicherten Stand — das Muster der Wunschseite.

**Speichert sich selbst** (seit 2026-10-18, wie `/wuensche`, siehe [[wish-page]]): `change` /
`input` / `focusout` am Formular, immer nur eine Abschickung unterwegs, „Alles speichern“ bleibt
unauffällig für den Fall ohne JavaScript. Die Zeile ist `CompetenceRow.svelte` mit lokalem
`$state`, im `{#key}` auf dem _gespeicherten_ Stand. Das frühere `{#key data.mine}` um das ganze
Formular hätte nach jedem automatischen Speichern alle Zeilen neu aufgebaut und den Fokus aus der
Notiz genommen.

## Die zwei Stufen sind keine Rangfolge

Bis 2026-10-18 hießen sie „kann ich halten“ / „würde ich gern“. Aus dem Betrieb gemeldet: „würde
ich gern“ las sich wie ein Wunsch und wie die _höhere_ Stufe — wer ein Pflichtfach kann **und**
gern hält, wählte es, fiel damit aus dem Notfall-Pool und aus dem Minimum und sah oben „0 von 3“.
Gemeint ist laut Kickoff: `CAN_TEACH` = „kann halten, wenn es brennt“, `WOULD_LIKE` = Interesse
an einem Fach, das man **noch nicht** gehalten hat. Jetzt: **„kann ich halten (auch
kurzfristig)“** / **„Interesse, noch nicht gehalten“**, dazu `COMPETENCE_LEVEL_HINTS` als
Erklärliste über der Tabelle und als Tooltip. Ein vitest verbietet „gern“/„Wunsch“/„möchte“ im
zweiten Label.

Die Mindestzahl ist ein **Hinweis** (`badge-warning` + Satz), keine Ablehnung; `minimumHint` hat
einen Test, der Ablehnungsvokabular ausschließt. Einträge **außerhalb** der eigenen Gruppen (Gruppe
verlassen) stehen in einem eigenen Abschnitt mit „Entfernen“, weil keine Gruppentabelle sie zeigt.

## Pool der Fachgruppenleitung

Unter `/zuteilung/…`, nicht als eigener Menüpunkt: die Leiste hat ab `xl` genau Platz für ihre
Bereiche, und der Pool gehört zur Zuteilung. Verlinkt aus dem Einleitungstext von `/zuteilung`.

Die beiden Zählungen (`competenceMemberStatus`, `modulesWithoutCompetence`) stehen in einer
**eigenen Anfrage**: sie verweigern für jeden, der nicht über die ganze Gruppe zählen darf, und in
derselben Anfrage wie die Zeilen hätten sie die Seite in ein 403 gerissen — die Merkregel aus
[[subject-group-pages]].

Lehrende ohne Konto: Suche über `teachers(search:)`, im Load auf `!isUser` gefiltert. Das ist
Komfort, verweigern tut das Backend (`COMPETENCE_TEACHER_HAS_ACCOUNT`).

## In der Kandidatenliste

Reihenfolge: Wünsche → `kann halten` → `Interesse, noch nicht gehalten` → Fachgruppe → Suche → aktuell zugeteilt.
Der Pool ist optionaler letzter Parameter von `candidatesFor`, damit bestehende Aufrufe gleich
lesen. Geladen mit `competences(subjectGroup:)` — verweigert nie, antwortet mit weniger, also
gefahrlos in der großen Anfrage.

## Vertraulichkeit

`WOULD_LIKE` ist ein Wunsch ohne Semester — keine Zahl über fremde Einträge außer den beiden
Arbeitslisten der Leitung, die das Backend nur ihr gibt. Die E2E-Spec prüft für Zwei, dass Neuns
Name auf keiner der beiden Seiten steht.

**Neun ist das Mitglied der Fixture**, weil sie sonst in keiner Spec Zeilen hat; Mitgliedschaft
berechtigt zu nichts und berührt den ungescopten Zustand nicht, für den sie existiert.

Siehe auch [[assignment-page]], [[wish-page]], [[no-wish-aggregates]], [[toolchain-gotchas]].
