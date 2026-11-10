---
name: home-screen-install
description: Web-Manifest für „Zum Home-Bildschirm“ (seit 2026-11-10) — bewusst ohne Service Worker, use-credentials, Icons per Skript, und die Ausnahme im Auth-Proxy
metadata:
  type: project
---

Tallox lässt sich seit 2026-11-10 auf den Home-Bildschirm, ins Dock oder als Desktop-App legen:
`static/manifest.webmanifest`, vier PNG-Icons, Head-Tags in `src/app.html`. Eine native App wurde
vorher verworfen (Store-Review kommt nicht ins VPN, Personaldaten auf Geräten, eine weitere Tür).

- **Kein Service Worker, mit Absicht.** Nichts wird auf dem Gerät zwischengespeichert, jeder Start
  lädt die aktuelle GUI, kein Versionsversatz. Chromium verlangt für die Installation keinen mehr.
  Wer „offline“ oder Push nachrüsten will: das ist eine eigene Entscheidung (Personaldaten im
  Cache; Push-Texte laufen über Apple/Google und dürfen nichts Vertrauliches tragen).
- **`crossorigin="use-credentials"` am Manifest-Link.** Browser holen das Manifest sonst ohne
  Cookies; hinter dem Auth-Proxy kommt dann ein Login-Redirect statt der Datei, und der
  Installieren-Eintrag fehlt lautlos. Zusätzlich nimmt die Deployment-Konfiguration die Dateien
  mit exakten Pfaden vom Login aus (privates Repo) — **eine neue Datei in `static/`, die ohne
  Login erreichbar sein muss, braucht dort einen Eintrag.**
- **Icons:** `node scripts/make-icons.mjs` rendert sie aus dem Favicon-Emoji (Chromium mit Noto
  Color Emoji) und sie werden committet, damit der Image-Bau keine Emoji-Schrift braucht.
  Maskable und apple-touch-icon randlos (Android/iOS schneiden selbst), die übrigen mit Rundung.
- **Test:** `tests/install.spec.ts` — Head-Tags, Manifest-Felder für den Installieren-Eintrag,
  und jedes Icon in seiner deklarierten Größe (eine Abweichung lässt Chromium das Icon still
  überspringen).
- **iOS:** die Home-Bildschirm-App hat einen eigenen Cookie-Speicher, also einmal eigens
  anmelden; ohne Browserleiste gibt es kein Zurück und keine kopierbare Adresse. Steht so in der
  Hilfe (`help.ts`, Stufe ONCE). Vor einer Ankündigung im Kollegium auf einem echten iPhone
  prüfen, ob der SSO-Umweg (außerhalb des `scope`) sauber in die App zurückführt.

Siehe [[responsive-tables]] und [[help-maintenance]].
