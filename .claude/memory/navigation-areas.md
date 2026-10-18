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

Bei 1280 px passt die Leiste auch für das Dekanat mit allen sieben Einträgen;
`tests/responsive.spec.ts` blieb ohne Änderung grün. E2E: `tests/navigation.spec.ts`.
