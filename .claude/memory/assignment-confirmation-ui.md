---
name: assignment-confirmation-ui
description: Bestätigung der Zuteilung in der GUI — „Passt so“ unter Meine Zuteilungen, Hinweis unter „Dein Stand“ nur bis zum Prüftermin, Zustand neben dem Namen in der Zuteilung, Prüftermin auf /semester, Spalte im Export
metadata:
  type: project
---

Gebaut am 2026-11-05 für Server v5.41.0 (Backend-Notiz: `assignment-confirmation` in `tallox.go`).

- **Meine Zuteilungen** (`/konto/zuteilungen`): je Semester mit eigenen Zuteilungen ein Kasten mit
  Zustand und „Passt so“ (Ein-Klick-Formular, `use:enhance`), sobald ein Prüftermin gesetzt ist oder
  schon bestätigt wurde. Eine Anfrage `myAssignmentConfirmation` je Semester, in dem man etwas hält.
- **Startseite**: Gruppe „Zuteilung <Semester>“ in „Dein Stand“ (`$lib/setup.ts`), nur für das
  Planungssemester, nur solange der Termin nicht vorbei ist (der Tag selbst zählt) und man etwas
  hält. Nach dem Bestätigen ist die Gruppe erledigt und verschwindet — so gewünscht am
  2026-10-29 („temporär“). Ohne Termin wird nichts abgefragt.
- **Zuteilung**: Badges neben den Haltenden der Kohorte (`holderStates`), nie gezählt — eine Summe
  „x von y bestätigt“ wäre ein Aggregat über Zuteilungen. Lehrende ohne Konto erscheinen nicht.
- **Semester und Phasen**: Datumsfeld mit `autosave`, leer = zurücknehmen; nur für das Dekanat,
  nicht in `FINAL`. Kein Disclosure, weil umkehrbar und nichts sperrend.
- **Export**: Spalte „Bestätigt“ nach „Besetzt durch“, aus `assignmentConfirmations` (derselbe
  Filter wie die Zuteilungen).
- „Heute“ ist `berlinToday()` (en-CA + Europe/Berlin), damit ein Server in UTC kurz nach Mitternacht
  denselben Tag meint wie die Fakultät.

E2E in `tests/assignment.spec.ts` › „confirming one’s assignments …“; der Reset löscht
`assignment_confirmation` und den Termin, weil beides am Semester hängt und nichts kaskadiert.

Verwandt: [[assignment-page]], [[start-page-guide]], [[semester-export]].
