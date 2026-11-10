---
name: home-screen-install
description: „Zum Home-Bildschirm“ per Web-Manifest — gebaut und am selben Tag (2026-11-10) zurückgestellt; wo der Code liegt und was beim Wiederaufnehmen zu beachten ist
metadata:
  type: project
---

**Zurückgestellt am 2026-11-10** auf Wunsch von Olli, nachdem es gebaut war. Kein Befund dagegen,
nur jetzt nicht. Eine native App war vorher schon verworfen (Store-Review kommt nicht ins VPN,
Personaldaten auf Geräten, eine weitere Tür).

**Wiederaufnehmen:** `git revert` des Reverts von `d49b299` (Manifest, vier Icons,
`scripts/make-icons.mjs`, Head-Tags in `src/app.html`, `tests/install.spec.ts`, Hilfe-Eintrag).
Dazu gehört eine Login-Ausnahme für diese Dateien in der Deployment-Konfiguration (privates Repo,
eigener Branch).

Was dabei entschieden war:

- **Kein Service Worker.** Nichts im Cache auf dem Gerät, jeder Start lädt die aktuelle GUI.
- **`crossorigin="use-credentials"` am Manifest-Link**, weil Browser das Manifest sonst ohne
  Cookies holen und hinter dem Auth-Proxy einen Login-Redirect bekommen — der
  Installieren-Eintrag fehlt dann lautlos.
- **Icons** aus dem Favicon-Emoji gerendert und committet, damit der Image-Bau keine
  Emoji-Schrift braucht; maskable und apple-touch-icon randlos.
- **iOS:** eigener Cookie-Speicher (einmal eigens anmelden), keine Browserleiste. Vor einer
  Ankündigung auf einem echten iPhone prüfen, ob der SSO-Umweg in die App zurückführt.

Siehe [[help-maintenance]].
