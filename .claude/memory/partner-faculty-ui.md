---
name: partner-faculty-ui
description: Wie die GUI ein Konto behandelt, das nur PARTNER_READER hält — Navigation, „Jetzt dran“, Verwaltung, E2E-Persona Zehn
metadata:
  type: project
---

Seit 2026-10-18. Die Regel selbst steht im Backend (`go/partner-reader.md`): allein gehalten
verengt die Rolle auf die zugeordneten Studiengänge und schreibt nichts.

- `isPartnerOnly(roles)` in `$lib/roles` ist das Gegenstück zu `policy.PartnerOnly`: genau die eine
  Rolle. Daneben irgendeine andere → Kollegium, alles wie bisher.
- `NavItem.colleaguesOnly`: „Meine Lehre“ und seine drei Seiten (Wünsche, Kompetenzen,
  Fachgruppen) sind für Partner allein ausgeblendet; `mayOpen` folgt dem, weil es über
  `visibleNavItems` geht. „Statistik“ hat `PARTNER_READER` in den Rollen.
- `dueNow`: Schritte mit `who: []` sind Schritte des Kollegiums, nicht des Partners.
- Verwaltung → Personen: zweites Formular „Studiengänge dieser Partnerfakultät“, dieselbe
  Action `?/programmes` mit verstecktem `role=PARTNER_READER`; alle Studiengänge wählbar, auch
  nicht geplante.
- E2E: Persona `partner` (`partner.zehn@example.org`), GUI-only wie Neun; der Controlling-Spec
  gibt ihr E2U.

Verwandt: [[start-page-guide]], [[sws-controlling-page]].
