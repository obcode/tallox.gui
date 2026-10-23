---
name: visual-overview
description: Die grafischen Übersichten vom 2026-10-23 — Phasen-Leiste, Kontingent-Balken, SWS-Balken (möchte/eingeplant), Besetzungsstand, geschlossene Wunschrunden in einem Satz — und was dabei vertraulich bleiben muss
metadata:
  type: project
---

Gewünscht am 2026-10-23: „über alle Seiten schauen, ob etwas übersichtlicher bzw. einfacher zu
erfassen geht, z. B. graphisch aufbereitet“. Vorher das Prozessbild auf `/ablauf`
([[start-page-guide]]).

- **Phasen-Leiste** `PhaseSteps.svelte`, Logik `phaseProgress` in `$lib/semester`: auf der Karte
  „Jetzt dran“ und auf jeder Semesterkarte. Unter `sm` nur Balken plus eine Zeile „Phase n von 5“,
  weil ein Fünftel eines Handys für „Studiengangs-Review“ zu schmal ist. Fiel in `semester.spec`
  auf: der Phasenname stand doppelt, der Test sucht jetzt `[aria-current="step"]`.
- **Kontingent-Balken** `QuotaBars.svelte`, `quotaUsage` in `$lib/controlling`: Studienjahr je
  Studiengang, WS und SS als Anteile des Kontingents; drüber voll und Plakette „über Kontingent“.
  Name im Balken ist nur der Code (Spalte 3.5rem), der Titel steht im `title`.
- **SWS-Balken** `HoursGauge.svelte`, `loadGauge`/`gaugeScale` in `$lib/desiredHours`: gefüllt
  = eingeplant, umrandet = Wunschbereich, Plakette unter/im/über Wunsch. In „SWS im Kollegium“
  **eine Skala für alle Zeilen**, mit Legende; auf `/wuensche` nur, wenn ein Wunsch angegeben ist.
  Zeigt nur, was die Zeile ohnehin zeigt — vor der Veröffentlichung sehen Kolleginnen und Kollegen
  die Tabelle gar nicht.
- **Besetzungsstand** auf `/zuteilung`, `fillProgress` in `$lib/assignment`: Teile und SWS
  besetzt, folgt Fachgruppe und Abschluss; Teile einer anderen Fakultät zählen nicht. Zählt
  Zuteilungen, keine Wünsche. Falle: `getByText('3 Teile')` traf „von 3 Teilen besetzt“.
- **Geschlossene Wunschrunden** auf `/wuensche`: `closedRoundNotice` in `$lib/wishes` — ein Satz
  über der Tabelle (eine Gruppe: wie früher in der Zelle; mehrere: zusammen), in der Zelle nur
  die Marke „Wunschrunde geschlossen“ mit dem Satz als `title`. Vorher stand er in jeder Zelle
  jedes Zuges.

Hilfe nachgezogen in `help.ts` (Statistik, SWS im Kollegium, Wunsch eintragen, neue Frage „Wie
weit ist meine Fachgruppe mit dem Besetzen?“).
