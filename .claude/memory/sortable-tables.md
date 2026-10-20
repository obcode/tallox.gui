---
name: sortable-tables
description: Sortieren per Spaltenkopf — Dreierzyklus, kein URL-Zustand, eingefrorene Reihenfolge in bearbeitbaren Tabellen, und welche Tabellen bewusst nicht sortieren
metadata:
  type: project
---

Gebaut am 2026-10-20 auf Wunsch aus dem Collab („zumindest bei den Wünschen“). `$lib/sorting`
(`nextSort`, `sortRows`, `applyOrder`) und `SortHeader.svelte`.

- **Zyklus aufsteigend → absteigend → aus.** „Aus“ ist die Reihenfolge der Seite, und die hat
  oft Bedeutung (Pflicht zuerst, PBLV zuletzt, geplante Studiengänge vorn). Leere Werte stehen
  in beiden Richtungen hinten.
- **Kein URL-Zustand**, ein `$state` je Seite; mehrere Tabellen einer Seite (je Semester, je
  Gruppe, die zwei Abschnitte der Wünsche) teilen ihn. Siehe [[save-on-toggle]] zu `page.url`.
- **Bearbeitbare Tabellen frieren die Reihenfolge beim Klick ein** (`applyOrder`): nach der
  eigenen Priorität sortiert, spränge die Zeile sonst beim Speichern unter dem Cursor weg. Wo
  das nicht lohnt, ist die bearbeitete Spalte nicht sortierbar (Stufe in Meine Kompetenzen,
  Konto/Rechte in der Personenverwaltung).
- **Vertraulichkeit:** Zug-Spalten der Wunschtabelle sortieren nur nach `mine`, nie nach
  fremden Wünschen; im Kompetenzpool nur nach Modul. Eine Reihenfolge nach Interesse ist die
  Heatmap ohne Farbe — [[no-wish-aggregates]]. `tests/sorting.spec.ts` prüft das mit eigenem
  Fixture (`SORTING`, Wunsch von Neun, Blick von Zwei).
- **Bewusst ohne Sortierung:** gruppierte/mehrzeilige Tabellen (Zuteilung, Übersicht,
  Statistik, Bedarf je Jahrgang, Modul-Angebote) und das seitenweise geladene
  Zugriffsprotokoll — eine Seite davon zu sortieren sähe aus wie das ganze Protokoll.
- `type="button"` im Kopf ist Pflicht: die Wunschtabelle steht in einem selbst speichernden
  Formular. Der Pfeil ist ein SVG, damit der Kopftext der Spaltenname bleibt (`wishes.spec.ts`
  prüft ihn exakt).
