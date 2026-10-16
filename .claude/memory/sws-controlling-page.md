---
name: sws-controlling-page
description: /statistik — die Seite zum SWS-Controlling (bis 2026-10-16 /bedarf/sws, jetzt Menü „Statistik“ für Studiengangsleitung und Dekanat), Vorjahresvergleich, Kontingent und Saldo, Fremdmodule, eigener E2E-Datensatz
metadata:
  type: project
---

Gebaut am 2026-10-15 über `teachingLoad` aus dem Backend ([[go/sws-controlling]]): Lehr-SWS je
Heimatstudiengang, wie das alte Excel-Sheet.

- **Route `/statistik`, Menüeintrag „📊 Statistik“** für `PROGRAMME_LEAD` und `DEANS_OFFICE`
  (seit 2026-10-16, auf Wunsch aus der Fakultät). Am ersten Tag lag die Seite unter
  `/bedarf/sws` ohne Menüeintrag, nur im Fließtext von `/bedarf` verlinkt, und war damit
  praktisch unauffindbar. Statistik war bis dahin ein Dekanats-Platzhalter ohne Seite; das
  Controlling brauchen aber vor allem die Studiengangsleitungen, deshalb ist die Rolle mit drin.
  Kein neuer Eintrag in der Leiste, also kein Breitenproblem bei 1280px.
  `/bedarf/sws` leitet mit 301 samt Query weiter. Der Leitfaden verlinkt Statistik im Bedarfs-Schritt,
  `/bedarf` im Kopftext.
  Weitere Auswertungen (Import/Export) kommen als `/statistik/…` dazu; `isActive` mit Präfix
  markiert sie mit.
- **Vorjahr als eigene Anfrage**, deren Fehler nur den Vergleich kostet (ein Jahr außerhalb der
  ±10 lehnt das Backend ab). `null` heißt „keine Zahl", nicht 0 — sonst liest sich Δ als Wachstum.
- Aufbereitung in `$lib/controlling.ts` (getestet): geplante Studiengänge zuerst, fremde mit Badge
  „nicht von uns geplant", Summe über beide.
- `tfoot` explizit `text-base-content`: daisyUI dämpft es auf /60.
- **E2E auf eigenen Daten** (`tests/controlling.spec.ts`: E2S/E2T, 2029-SS/2028-SS). Der erste
  Versuch las das Vorsemester des gemeinsamen Seeds — das setzt der Demand-Spec während des Laufs
  zurück, und die Zahl war die des zuletzt gelaufenen Specs. Seriell, sonst schreiben zwei Worker
  den Seed gleichzeitig.

## Kontingent, Saldo, Fremdmodule (2026-10-16)

Auf das Feedback zum alten Sheet „SWS-Controlling" ([[go/sws-controlling]]):

- **Abschnitt „Kontingent"** über der Haupttabelle: Kontingent Studienjahr, davon dieses Semester
  (Hälfte), geplant, Saldo. Saldo und Hälfte rechnet das **Backend** (`balance`,
  `semesterQuota`) — `$lib/controlling.ts` wählt nur aus und sortiert (`quotaTable`). Badge
  `badge-error` bei negativ, `badge-success` sonst; ohne Kontingent „kein Kontingent", nie 0.
- **Abschnitt „Module mit fremder Heimat"**: `courseInstances(foreignHome: true)` für den
  Studiengang aus `?studiengang=`, sonst der erste aus `me.programmes`, sonst Auswahl. Gruppiert
  nach Heimatstudiengang (`importGroups`), mit Pflicht/Wahlpflicht im empfangenden Studiengang
  (`dutyStatus(programme:)`). Ein nicht geplanter Studiengang aus der URL kommt mit in die Auswahl.
- **Pflege** in `/verwaltung/studiengaenge`: Spalte „Kontingent 〈Studienjahr〉" bei den geplanten
  Studiengängen, Form-Action `setQuota` (Komma erlaubt, leer = zurücknehmen), nur das Dekanat
  sieht Felder. Studienjahr = das des Planungssemesters (`studyYearOf`), anderes per
  `?studienjahr=`.
- Die Abschnitte haben `aria-labelledby` — die E2E-Selektoren `row /^E2S – /` gab es danach
  zweimal, deshalb gehen die Assertions über `getByRole('region', …)`.
- E2E: Kontingent 20 für E2S/2028 im Seed; der Formular-Test schreibt 2031, damit er den Saldo
  der anderen Tests nicht verschiebt.
