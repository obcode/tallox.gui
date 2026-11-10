---
name: notification-ui
description: Mail-Seiten (2026-11-10) — Menüeintrag „Mail“, /konto/benachrichtigungen, /mitteilungen außerhalb der Routen-Union, 🔔 auf der Modulseite, Vorschau im sandbox-iframe
metadata:
  type: project
---

Gebaut am 2026-11-10 gegen `tallox.go` v5.50.0. Was das Backend entscheidet, steht in
`go/notifications.md`; hier steht nur die Oberfläche.

- **Ein Menüeintrag „Mail“** in `ACCOUNT_ITEMS` → `/konto/benachrichtigungen`. Der zweite für
  `/mitteilungen` passte nicht: `resolve()` vergleicht eine Union nur bis 25 Mitglieder, und mit
  beiden neuen Routen waren es 26. `/api-doku` und `/mitteilungen` sind jetzt aus `StaticRoute`
  genommen, wie `/ablauf`. `/mitteilungen` wird von der Benachrichtigungsseite (oben), aus der
  Hilfe und aus jeder Rundmail verlinkt.
- **Nichts ist vorausgewählt.** „Empfohlene Abos übernehmen“ ist ein Knopf, kein Default; die
  Liste beginnt leer (E2E prüft das).
- **🔔 auf der Modulseite** ist genau ein Abo `MODULE_OFFERED` + Modul, ohne Semester
  (`isModuleBell` in `$lib/notifications`). Für Onlooker ausgeblendet — das Backend lehnt
  sie mit `ONLOOKER_SUBSCRIBES` ab.
- **Rundmail-Formular**: erst „Vorschau“ (`previewAnnouncement`), dann erscheint der Knopf
  „An N Personen schicken“ mit Rückfrage. Die Vorschau ist das gerenderte Mail-HTML in einem
  `iframe sandbox=""` — es führt nichts aus. Die Zielgruppen kommen aus
  `announcementAudiences`; die GUI bietet nichts anderes an.
- Die Zustellung je Abo ist ein `autosave`-Select; Pause und Neues Abo sind `askBeforeLeave`.
- Neue Fehlercodes in der Pass-through-Liste: `SUBSCRIPTION_*`, `TOO_MANY_SUBSCRIPTIONS`,
  `ONLOOKER_SUBSCRIBES`, `AUDIENCE_*`, `ANNOUNCEMENT_INVALID`, `RATE_LIMITED`.
