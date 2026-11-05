---
name: local-module-edit
description: Umbenennen und Stilllegen eigener Lehrveranstaltungen auf der Modulseite — warum das Formular vor dem Schreiben frisch liest
metadata:
  type: project
---

Seit 2026-11-05 (Issue 48 im Tracker) hat die Modulseite für `source: LOCAL` den Abschnitt
„Eigene Lehrveranstaltung“: Name, Art, Lehrform, SWS ändern und „Aus den Listen nehmen“ /
„Wieder aufnehmen“. In der Bedarfsplanung führt ein Stift ✏️ an eigenen Zeilen dorthin.

- `changeLocalModule` ersetzt die **ganze** Beschreibung samt Aufteilung. Die Actions lesen den
  Eintrag deshalb direkt vor dem Schreiben neu (`StoredLocalModule`) und schicken alles Nicht-
  Bearbeitete über `localModuleInput` (`$lib/catalogue`) unverändert zurück — sonst würde eine
  inzwischen gespeicherte Aufteilung überschrieben.
- Wer darf: `mayEditLocalModule` — Studiengangsleitung des Heimatstudiengangs und Dekanat, nicht
  die Fachgruppenleitung (anders als bei der Aufteilung). Kosmetisch; das Backend prüft.
- Stilllegen lehnt das Backend mit `MODULE_IN_DEMAND` ab, solange ein nicht abgeschlossenes
  Semester eine Instanz hat. `MODULE_IN_DEMAND`, `MODULE_NAME_TAKEN`, `LOCAL_MODULE_INVALID`
  stehen seitdem auf der Allowlist in `graphqlError.ts`.
- Im Katalog heißt der Haken jetzt „zurückgezogene und stillgelegte anzeigen“; die Plakette
  sagt „stillgelegt“ für eigene, „zurückgezogen“ für ZPA-Einträge.

Verwandt: [[demand-page]], [[module-split-ui]].
