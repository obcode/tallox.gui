---
name: daisyui-contrast-overrides
description: Warum die Kontrast-Overrides in app.css den markierten Zustand aussparen müssen, und wo axe genau dort blind ist
metadata:
  type: project
---

Gefunden am 2026-08-01: die markierte Seite in der Navigationsleiste war auf **allen sieben
hellen Themes** unlesbar — dunkel auf fast schwarz, auf `emerald` und `lofi` bei einem
Kontrastverhältnis von exakt 1.0, also Schrift und Hintergrund identisch. Auf den dunklen
Themes war nichts zu sehen, deshalb fiel es lange nicht auf.

## Die Ursache: ein Override, der zu breit greift

`app.css` dreht daisyUIs gedämpfte Menüfarben auf `base-content` zurück (WCAG 1.4.3, und die
Hochschule ist eine öffentliche Stelle). Der Selektor traf aber auch den markierten Eintrag.
daisyUI legt unter `.menu-active` — und unter `:active`, solange die Maustaste unten ist —
`--menu-active-bg` (`neutral`) als Hintergrund und dazu passend `--menu-active-fg`
(`neutral-content`) als Schrift. Das Paar ist auf Kontrast ausgelegt; nur die Vordergrundhälfte
davon zurückzudrehen zerstört es.

**Regel:** ein Override der gedämpften Farbe übernimmt dieselbe `:not(…)`-Liste, mit der
daisyUI selbst dämpft — bei `.menu` also `:not(.menu-active, :active)`. Dieselbe Ausnahme
existierte bei `.tabs .tab.tab-active` bereits; beim Menü fehlte sie. Beim nächsten
daisyUI-Bauteil mit einem markierten Zustand wieder prüfen, nicht annehmen.

## Der Grund, warum es die Tests passierte

Zwei Lücken, die sich gegenseitig gedeckt haben:

1. `a11y.spec.ts` klappt die Menüs auf, aber nur im Standard-Theme (`nord`).
   `contrast.spec.ts` lief über alle zwölf Themes, sah die Menüs aber nur zugeklappt.
2. **Und selbst mit offenem Menü hätte axe geschwiegen.** daisyUI legt auf `.menu-active`
   zusätzlich ein `background-image` (`--fx-noise`, ein Data-URI-SVG). Für axes
   `color-contrast` ist ein Element mit Hintergrundbild nicht entscheidbar: es landet in
   `results.incomplete`, nicht in `results.violations`. Nachgestellt — mit dem kaputten CSS
   blieben alle zwölf axe-Läufe grün.

Deshalb misst `contrastRatio()` in `tests/contrast.spec.ts` den markierten Eintrag jetzt
selbst: Farben über ein 1×1-Canvas nach sRGB auflösen (die Themes sind `oklch`, die
serialisierte Rechenform ist je nach Farbraum verschieden) und die WCAG-Formel darauf
anwenden. Der Gegenbeweis wurde gefahren: ohne den Fix sind es genau die sieben hellen Themes,
die rot werden.

**Verallgemeinerung:** `results.violations` leer heißt nicht „geprüft und in Ordnung". Wo
daisyUI Farbverläufe, Noise oder sonst ein `background-image` malt, muss der Kontrast von Hand
gemessen werden, sonst ist die Prüfung lautlos wirkungslos.

**Nachtrag 2026-08-22, `tabs-box`:** Der Override für `.tabs .tab` stand auf 80 % — gemessen
gegen `base-100`. `tabs-box` legt die Leiste aber auf `base-200`, und dagegen sind es auf
`retro` nur 4,3:1. Jetzt 90 %. Gefunden hat das erst der Kontrast-Durchlauf über den
Zulassungsbildschirm; `/api-doku` trug denselben Befund seit seiner Entstehung, weil kein
Durchlauf je eine Seite mit Reitern besucht hat. **Der Sweep prüft nur die Seiten, die er
besucht** — eine neue Seite mit einer neuen Komponentenkombination braucht einen eigenen Fall.

Siehe auch [[theme-cookie]] (die Themeliste und warum sie kuratiert ist) und
[[save-on-toggle]].

**Nachtrag 2026-09-21, FieldText:** daisyUI setzt auf `.input`, `.select` und `.textarea` den
Hintergrund (`base-100`), aber **keine Schriftfarbe**. Die kommt dann aus dem UA-Stylesheet:
`color: FieldText`, eine _Systemfarbe_. Chromium löst sie nach Farbschema auf, Firefox unter Linux
aus dem GTK-Thema — und auf Mint mit dunklem Desktop ist das ein helles Grau auf weißem Feld. Die
Stepper der Bedarfstabelle waren für genau eine Person „schlecht lesbar" und für jeden Test
unsichtbar, weil FieldText im Testbrowser schwarz ist. `app.css` setzt die Farbe jetzt explizit,
mit `:not(:disabled)`, damit die gedämpfte Farbe eines abgeschalteten Feldes stehen bleibt (eine
ungelayerte Regel schlägt daisyUIs gelayerte). `contrast.spec.ts` misst die Stepper-Ziffer gegen
ihr Feld über alle zwölf Themes — das kann den Ausgangsfehler nicht nachstellen, hält aber die
Regel fest und fängt einen falschen Override auf einem dunklen Theme. **Verallgemeinerung: eine
Farbe, die vom Desktop-Thema der Leserin abhängt, hat dieses Stylesheet nicht gewählt.**
