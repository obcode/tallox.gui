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
dafür im Backend ergänzt). Eine Tabelle je Gruppe, **ein** Formular und ein Speichern für alles,
Differenz serverseitig gegen den gespeicherten Stand — das Muster der Wunschseite.

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

Reihenfolge: Wünsche → `kann halten` → `würde gern` → Fachgruppe → Suche → aktuell zugeteilt.
Der Pool ist optionaler letzter Parameter von `candidatesFor`, damit bestehende Aufrufe gleich
lesen. Geladen mit `competences(subjectGroup:)` — verweigert nie, antwortet mit weniger, also
gefahrlos in der großen Anfrage.

## Vertraulichkeit

„würde gern" ist ein Wunsch ohne Semester — keine Zahl über fremde Einträge außer den beiden
Arbeitslisten der Leitung, die das Backend nur ihr gibt. Die E2E-Spec prüft für Zwei, dass Neuns
Name auf keiner der beiden Seiten steht.

**Neun ist das Mitglied der Fixture**, weil sie sonst in keiner Spec Zeilen hat; Mitgliedschaft
berechtigt zu nichts und berührt den ungescopten Zustand nicht, für den sie existiert.

Siehe auch [[assignment-page]], [[wish-page]], [[no-wish-aggregates]], [[toolchain-gotchas]].
