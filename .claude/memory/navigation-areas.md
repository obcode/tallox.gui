---
name: navigation-areas
description: Die Leiste hält Bereiche, ein Bereich seine Seiten als Reiter — „Meine Lehre“, Zuteilung, Verwaltung; das persönliche Menü ist nur das Konto
metadata:
  type: project
---

Umgebaut am 2026-10-18 auf Rückmeldung aus dem Betrieb: die Leiste war unübersichtlich, und was
jede Dozierende Person für sich tut, lag verstreut — Wünsche in der Leiste, Kompetenzen und
Fachgruppen im persönlichen Menü. Das Menü hatte elf Einträge aus vier Welten (Konto, Hilfe, API,
Fakultätsverwaltung).

## Die Ordnung

| Wo                   | Was                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------- |
| Leiste               | Module · Bedarf · **Meine Lehre** · Zuteilung · Statistik · Semester · **Verwaltung**   |
| Reiter „Meine Lehre“ | Wünsche · Kompetenzen · Fachgruppen (für alle)                                          |
| Reiter „Zuteilung“   | Besetzen · Kompetenzen der Fachgruppe                                                   |
| Reiter „Verwaltung“  | Personen · Studiengänge · Fachgruppen · ZPA-Import · Zugriffe · Diagnose, je nach Rolle |
| Persönliches Menü    | Meine Rollen · Tokens — sonst nichts                                                    |
| „?“-Hilfe            | zusätzlich „Nachschlagen“: Ablauf, API-Doku                                             |

## Wie es gebaut ist

- `NavItem.children` in `src/lib/navigation.ts`. `visibleNavItems` filtert die Kinder mit, gibt
  dem Bereich das `href` des **ersten sichtbaren** Kinds (Dekanat landet auf Studiengänge, ADMIN
  auf Personen) und lässt einen Bereich ohne sichtbares Kind weg.
- **Die Rollen eines Kinds sind seine eigenen**, die des Bereichs entscheiden nur über den
  Leisteneintrag. Deshalb tragen die Zuteilungsreiter `ASSIGNING` selbst, und „Fachgruppen“ unter
  Verwaltung hat keine: für alle lesbar (wen frage ich?), aber kein Grund für einen
  Leisteneintrag. Dozierende erreichen es über den Link auf `/konto/fachgruppen`.
  `navigationPages()` löst Bereiche in Seiten auf; `guide.ts` (`mayOpen`, `isNavigationRoute`)
  fragt danach — sonst hielte die Leitfaden-Prüfung „Meine Lehre“ für ein Ziel.
- `exact` am Kind: „Besetzen“ (`/zuteilung`) darf auf `/zuteilung/kompetenzen` nicht aktiv sein.
- `AreaTabs.svelte` hängt **einmal im Layout**, nicht pro Seite. Links in `<nav aria-label>` mit
  `aria-current`, kein `role="tablist"`: jeder Reiter lädt eine eigene Seite. `tabs-box`, weil
  das die Variante mit gemessenem Kontrast ist ([[daisyui-contrast-overrides]]). Unter zwei
  sichtbaren Kindern keine Reiterleiste.
- Im ☰-Menü unter `xl` ist ein Bereich eine Überschrift mit eingerückten Seiten, kein Link — er
  wäre nur ein zweiter Weg zu seinem ersten Reiter.

## Warum die URLs geblieben sind

`/wuensche`, `/konto/kompetenzen`, `/konto/fachgruppen` sind nicht nach `/lehre/…` umgezogen.
Gruppiert wird in der Navigation, nicht im Routenbaum: Lesezeichen, Leitfaden, Hilfe-Antworten
und E2E-Links bleiben gültig, und es braucht keine Weiterleitungen.

## Gemessen

Bei 1280 px passt die Leiste auch für das Dekanat mit allen sieben Einträgen. E2E:
`tests/navigation.spec.ts`.

**`responsive.spec.ts` war grün und hat trotzdem nichts gesagt:** es misst nur die Startseite,
anonym — keine Reiter, kein langes Menü. Nachgemessen fanden sich zwei echte Fehler:

- Bei 375 px schoben die fünf Verwaltungsreiter „Diagnose“ hinter einen seitlichen Scroll. Die
  Reiter brechen jetzt um (`flex-wrap`), statt zu scrollen.
- Das ☰-Menü des Dekanats endete bei 727 px — auf einem 667-px-Telefon unter der `sticky`
  Kopfzeile unerreichbar. Es hat jetzt `max-h-[calc(100dvh-4.5rem)] overflow-y-auto` und
  **`flex-nowrap`**: daisyUIs `.menu` bricht um, und eine Höhengrenze auf einer umbrechenden
  Spalte erzeugt eine zweite Spalte statt einer Scrollleiste. Dazu `w-64`, weil „Kompetenzen der
  Fachgruppe“ eingerückt nicht in `w-56` passt.

Beides prüft jetzt „areas across widths“ in `responsive.spec.ts`, angemeldet, über alle fünf
Breiten; die Tests schlugen gegen den alten Stand fehl.
