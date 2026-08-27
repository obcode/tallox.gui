---
name: assignment-page
description: Die Zuteilungsseite — warum sie nach Fachgruppe filtert, wie die Kandidatenliste entsteht, und zwei Fallen
metadata:
  type: project
---

Gebaut am 2026-08-27, `src/routes/zuteilung/`. Die dritte Prozessseite: wer hält welchen Teil.

## Zeile je **Teil**, gruppiert nach Kohorte

Der Unterschied zur Wunschseite, und er folgt aus dem Datenmodell: **gewünscht wird die Instanz,
zugeteilt der Teil** (siehe `go/assignments`). Also eine Überschrift je Kohorte (Modul · Zug) und
darunter eine Zeile je Teil — Vorlesung, Praktikum 1, Praktikum 2.

Nummeriert wird nur, wo die Zahl etwas unterscheidet: ein einzelnes „Praktikum 1" wirft die Frage
auf, welches andere es gibt.

## Warum die Seite nach Fachgruppe filtert

Ein Semester der Fakultät sind einige hundert Instanz-Teile, und wer hier lehrt, sind 257 Personen.
Das Produkt aus beidem ist kein Bildschirm — ein `<select>` je Teil mit allen Lehrenden wären
sechsstellig viele `<option>`-Elemente.

Die Fachgruppe ist der natürliche Schnitt, weil sie **auch die Einheit der Zuständigkeit** ist. Die
Studiengangsleitung, die quer über Fachgruppen besetzt, nimmt sie nacheinander.

Ohne gewählte Fachgruppe steht dort ein Satz, der das sagt — nicht eine leere Tabelle.

## Die Kandidatenliste ist der eigentliche Nutzen

Je Teil, in dieser Reihenfolge:

1. **Wer sich für diese Kohorte eingetragen hat**, mit Priorität und Notiz im Label
   („Prof. X (unbedingt · nur die Vorlesung)"). Deshalb existiert die Seite in dieser Form: die
   Zuteilung wird **aus** den Wünschen gemacht, also gehören sie dorthin, wo entschieden wird —
   nicht auf eine zweite Seite zum Vergleichen.
2. Die Mitglieder der Fachgruppe.
3. Wen die Suche gefunden hat. Ein Suchfeld oben lädt die Seite mit `?q=` neu und ergänzt die
   Treffer in **jeder** Auswahl. Serverseitig, ohne JavaScript, ohne zweiten Endpunkt.
4. Wer den Teil gerade hält, falls ihn nichts davon schon nennt.

Die Liste ist **keine Berechtigung**: wer fehlt, darf trotzdem — die Seite hat nur nicht daran
gedacht, und dafür ist die Suche da.

**Ein Treffer der Suche wird als `teacherId` geschickt, nicht als Konto.** Das Backend
kanonisiert selbst (wer ein Konto hat, wird als Konto gespeichert), also muss die Seite nicht
wissen, wer eins hat — und kann sich nicht darin irren.

## `replacing` kommt geschenkt

Die Seite bildet die Differenz serverseitig gegen den **gespeicherten** Stand (zweite Query beim
Speichern, wie `MyWishesForSaving`). Damit liegt die id der ersetzten Zuteilung ohnehin vor, und
der Compare-and-Set des Backends kostet nichts extra: wer mit veraltetem Stand schreibt, bekommt
`ASSIGNMENT_MOVED_ON` statt still eine fremde Entscheidung zu überschreiben.

Dass zwei Rollen dieselbe Zeile schreiben dürfen, macht das zu einem realen Fall und nicht zu
einer Formalie.

## Keine Aggregate, hier doppelt

[[no-wish-aggregates]] gilt wörtlich weiter — und dies ist **die** Tabelle, in die jemand als
Nächstes „2 von 3 besetzt" schreiben möchte. Kein Fortschrittsbalken, keine Färbung, keine
Sortierung nach Besetzungsgrad. Vor der Veröffentlichung ist das die vertrauliche Tatsache ohne
die Namen.

Die einzige Zahl auf der Seite ist „N Änderungen gespeichert" — sie handelt von den eigenen Klicks
und von nichts sonst. `savedHint` hat einen Test, der behauptet, dass sie keine der verbotenen
Formulierungen enthält.

Der E2E-Test prüft für die unbeteiligte Kollegin nicht nur, dass der Name fehlt, sondern auch, dass
keine Zahl über die Besetzung dasteht.

## Zwei Fallen, die Zeit gekostet haben

**`action="?/save"` ersetzt den Query-String.** Das Semester stand in der Adresse, die Action las
`url.searchParams` — und bekam nichts. Die Seite sah richtig aus, speicherte aber nichts und sagte
„Kein Semester gewählt". Jetzt reist das Semester als verstecktes Feld im Formular, so wie es die
Wunschseite immer schon tat.

**Eine Fixture, die jemandem eine Zeile gibt, verändert jede Seite, die dessen Zeilen listet.** Der
Wunsch im Zuteilungs-Fixture gehörte zuerst `eins` — und „Meine Eintragungen" auf der Wunschseite
spannt über **alle** Semester, also erschien dort ein Zusammenfassungsblock mehr und verschob die
Tabelle, die `wishes.spec.ts` über ihre Position findet. Jetzt gehört er `fuenf`, die in keinem
Wunschtest vorkommt. Das ist die Regel aus [[wish-page]] („eine Fixture, die eine Berechtigung
vergibt, braucht ein eigenes Subjekt") — sie gilt für Datenzeilen genauso.

## Wo es liegt

| Was                | Wo                                                                   |
| ------------------ | -------------------------------------------------------------------- |
| Seite              | `src/routes/zuteilung/+page.server.ts`, `+page.svelte`               |
| Logik (vitest-bar) | `src/lib/assignment.ts`, `assignment.test.ts`                        |
| E2E                | `tests/assignment.spec.ts`, Fixture `ASSIGNMENTS` in `tests/seed.ts` |
| Fehlercodes        | Allowlist in `src/lib/server/graphqlError.ts`                        |
| Menüeintrag        | `src/lib/navigation.ts`                                              |

Siehe auch [[wish-page]], [[demand-page]], [[no-wish-aggregates]].
