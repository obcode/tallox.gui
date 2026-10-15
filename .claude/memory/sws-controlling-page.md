---
name: sws-controlling-page
description: /bedarf/sws — die Seite zum SWS-Controlling: warum unter /bedarf statt im Menü, Vorjahresvergleich als eigene Anfrage, eigener E2E-Datensatz
metadata:
  type: project
---

Gebaut am 2026-10-15 über `teachingLoad` aus dem Backend ([[go/sws-controlling]]): Lehr-SWS je
Heimatstudiengang, wie das alte Excel-Sheet.

- **Route `/bedarf/sws`, kein Menüeintrag.** Die Leiste ist ab 1280px voll, und „Statistik" ist
  ein Dekanats-Platzhalter — das Controlling brauchen aber die Studiengangsleitungen. Unter
  `/bedarf` bleibt „Bedarf" aktiv markiert (`isActive` mit Präfix). Verlinkt aus dem Kopftext von
  `/bedarf`; der Leitfaden nennt es nur im Text von Schritt 9, weil `where` nur Menürouten darf.
- **Vorjahr als eigene Anfrage**, deren Fehler nur den Vergleich kostet (ein Jahr außerhalb der
  ±10 lehnt das Backend ab). `null` heißt „keine Zahl", nicht 0 — sonst liest sich Δ als Wachstum.
- Aufbereitung in `$lib/controlling.ts` (getestet): geplante Studiengänge zuerst, fremde mit Badge
  „nicht von uns geplant", Summe über beide.
- `tfoot` explizit `text-base-content`: daisyUI dämpft es auf /60.
- **E2E auf eigenen Daten** (`tests/controlling.spec.ts`: E2S/E2T, 2029-SS/2028-SS). Der erste
  Versuch las das Vorsemester des gemeinsamen Seeds — das setzt der Demand-Spec während des Laufs
  zurück, und die Zahl war die des zuletzt gelaufenen Specs. Seriell, sonst schreiben zwei Worker
  den Seed gleichzeitig.
