---
name: advance-wishes-ui
description: Vormerkungen in der GUI — eigener Reiter unter „Meine Lehre“, Lesesicht für Leitungen unter „Zuteilung“, „nicht angeboten“ auf der Startseite
metadata:
  type: project
---

Gebaut am 2026-11-01, Backend siehe `go/wishes.md` (Abschnitt „Vormerkungen“). Anregung aus dem
Kollegium: die private Mehrjahresplanung ins Werkzeug, damit die Fachgruppenleitung sie sieht und
man erfährt, wenn man nicht gebraucht wird.

- **`/wuensche/vormerkungen`** („Meine Lehre → Vormerkungen“): Studiengang per GET-Auswahl zuerst
  (`?programme=`), weil die Modulliste dessen Katalog ist; dann Semester, Modul (eigene Fachgruppen
  als erste `optgroup`), Stufe, „Höchstens so viele Züge“, Notiz — Formular mit `askBeforeLeave`.
  Darunter nur die **eigenen** Vormerkungen über alle Semester, mit Status-Badge und Zurückziehen.
  Dasselbe Modul/Semester/Studiengang noch einmal vormerken ändert die bestehende (Upsert im Backend).
- **`/zuteilung/vormerkungen`** („Zuteilung → Vormerkungen“, `ASSIGNING`): fremde Vormerkungen eines
  Semesters, wie das Backend sie filtert. **Nicht** auf der eigenen Seite — dieselbe Regel wie auf
  der Wunschseite: wer sich selbst etwas vormerkt, soll dabei nicht die anderen lesen. Leerer
  Zustand sagt „nichts, das Du sehen darfst“, nie „niemand“.
- **Startseite**: Karte „📌 Vormerkungen“ nur bei `NOT_OFFERED` eigener Vormerkungen
  (`notOfferedNotice`) — das ist die Benachrichtigung, keine Mail.
- **Wunschseite**: der Satz über nicht freigegebene Studiengänge verweist auf die Vormerkungen.
- Semesterauswahl: `advanceSemesters(today)` — die acht Semester **nach** dem laufenden
  (`semesterAt`: März–August SS, sonst WS, Jan/Feb gehören zum WS des Vorjahres). Das Backend nimmt
  ±10 Jahre; die Liste lädt nur nicht zum laufenden ein, dessen Bedarf meist schon freigegeben ist.

**Falle `StaticRoute`:** die zwei neuen Seiten haben die Union wieder über 25 Glieder gehoben —
Fehler an jeder `resolve()`-Stelle in NavBar/AreaTabs/GuidePlaces, ohne Hinweis auf die Ursache.
Ausgeschlossen wurden `/verwaltung` (Layout ohne Seite) und `/einfuehrung` (nur direkt verlinkt).

**Falle im E2E:** `getByLabel('Semester')` traf auch die Studiengangsauswahl — der zugängliche Name
eines `<select>` enthält die gewählte Option, und ein Fixture-Studiengang heißt „…Semester…“.
Felder über `name` suchen. Und: `{label}{#if …} · {…}{/if}` verliert in Svelte das Leerzeichen
vor dem Punkt — zusammengesetzte Beschriftung gehört in eine Funktion (`advanceLevelLabel`).
