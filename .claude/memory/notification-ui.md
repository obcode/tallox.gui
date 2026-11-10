---
name: notification-ui
description: Mail-Seiten (2026-11-10) — Menüeinträge „Benachrichtigungen“ und „Rundmails“, asRoute() statt Routen-Ausschlüssen, 🔔 auf der Modulseite, Vorschau im sandbox-iframe
metadata:
  type: project
---

Gebaut am 2026-11-10 gegen `tallox.go` v5.50.0. Was das Backend entscheidet, steht in
`go/notifications.md`; hier steht nur die Oberfläche.

- **Zwei Menüeinträge** im Namensmenü: „Benachrichtigungen“ (`/konto/benachrichtigungen`) und
  „Rundmails“ (`/mitteilungen`). Zuerst war es ein Eintrag „Mail“, weil die 25er-Grenze von
  `resolve()` erreicht war; noch am selben Tag (Olli: „wo finde ich die Rundmails?“) an der Wurzel
  behoben: `asRoute()` in `$lib/navigation` verengt `StaticRoute` an den Aufrufstellen auf einen
  Typ. Die Ausschlüsse nur wegen der Grenze (`/ablauf`, `/einfuehrung`, `/api-doku`,
  `/mitteilungen`) sind wieder raus — neue Seiten passen ohne Tricks ins Menü.
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
- **Archiv gerendert** (2026-11-10, v5.51.0): `Announcement.bodyHtml` kommt aus demselben Markdown
  wie die Mail, ohne Inline-Stile. Die Seite zeigt es mit `{@html}` — der einzige Ort damit —,
  aber erst nach `safeFragment` (`$lib/announcementBody`), das nur die Tags des Renderers mit
  genau ihren Attributen durchlässt; sonst fällt sie auf den Rohtext zurück.
