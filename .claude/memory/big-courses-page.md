---
name: big-courses-page
description: /statistik/grosse-faecher — die Übersicht „Große Fächer (FKR 387)“ je Studienjahr; Statistik ist seitdem ein Bereich mit Reitern, Fachgruppenleitungen landen direkt dort
metadata:
  type: project
---

Gebaut am 2026-11-23 als Teil 2 eines Fakultätswunschs; das Backend (`bigCourseOverview`, v5.60.0)
kam als Teil 1.

- **Alles rechnet das Backend**: SWS je Semester, Mittel, Soll, Ist, Status, gezählte Fächer mit
  Grund (`BY_HOURS` „mind. 6 SWS“, `BY_COHORT` „ganze Kohorte“), `provisional`. `#lib/bigCourses.ts`
  filtert (Fachgruppe nach Mitgliedschaft, Status), sortiert und benennt nur.
- **Wer was sieht, entscheidet das Backend**: Dekanat, Fachgruppen- und Studiengangsleitungen alle
  Professorinnen und Professoren (bewusst schon während der Planung, auch für Studiengangsleitungen —
  so entschieden), alle anderen und jedes normale Token nur die eigene Zeile. Die Seite sagt das
  in einem Satz, wenn die Rolle keine Leitung ist.
- **Statistik ist seitdem ein Bereich mit Kindern**: „SWS-Controlling“ (`/statistik`, `exact`) und
  „Große Fächer“. Der Bereich trägt zusätzlich `SUBJECT_GROUP_LEAD`; eine reine Fachgruppenleitung
  sieht nur den zweiten Reiter und landet über die Leiste direkt dort. Beobachtung und
  Partnerfakultät bekommen den Reiter nicht (sie hätten höchstens eine leere eigene Zeile).
- Studienjahr in der URL (`?studienjahr=2026`), ohne Angabe 303 auf das Jahr des Planungssemesters,
  Filter bleiben dabei erhalten. Eine Absage (Jahr außerhalb der Reichweite) kostet die Tabelle,
  nicht die Seite.
- Status als Badge mit Wort (nie nur Farbe); „nicht erfüllt“ sortiert zuerst.
- E2E: `tests/big-courses.spec.ts` mit eigenem Datensatz (E2L, Studienjahr 2031, Zwei hält 20 SWS
  eines einzügigen Pflichtfachs im Winter → Mittel 10, Soll 1, erfüllt, vorläufig).
