---
name: responsive-tables
description: Tabellen werden zu Karten, wenn ihre Spalten nicht passen (table-stack + use:stackedTable), Reiter brechen um; warum overflow-x-auto nicht reichte und wie responsive.spec das jetzt für jede Seite prüft
metadata:
  type: project
---

Am 2026-10-23 gefordert: „Stelle 100 % sicher, dass es responsive zu nutzen ist. Das muss es
immer sein.“

## Was vorher falsch war, ohne dass ein Test es sah

`responsive.spec.ts` prüfte nur, dass die _Seite_ nicht seitlich scrollt — und das stimmte
überall. Trotzdem lagen bei 375 px die Personenauswahl der Zuteilung, alle Zug-Spalten der
Wunschtabelle, die Teile/SWS-Spalten des Bedarfs und die Schalter der Studiengänge außerhalb des
Bildes, in einem `overflow-x-auto`, das die Seite ruhig hielt und den Inhalt versteckte. Zwischen
640 und 1023 px galt dasselbe für Wunschmatrix (935 px), Modulkatalog (869), Statistik (890) und
Zugriffsprotokoll (962). Und die Semester-/Fachgruppen-Reiter scrollten — am Desktop lagen
„WS 2030/31“ und später unsichtbar dahinter.

Gefunden mit einer **Demo-Datenbank** (`tallox_demo`, echter ZPA-Katalog plus synthetischer
Planungsstand, nur lokal): die E2E-Daten sind zu klein, um breite Tabellen zu erzeugen.

## Die Lösung

- **`$lib/stackedTable`**: Action misst die Tabelle gegen ihren Container und setzt `.stacked`,
  wenn die Spalten nicht passen (16 px Hysterese gegen Flattern durch die Scrollleiste). Sie
  kopiert die Spaltenköpfe als `data-label` auf die Zellen (`colspan` beachtet); eigene
  `data-label` bleiben, leer heißt „keine Beschriftung“.
- **`app.css`**: `.table-stack.stacked` macht aus jeder Zeile eine Karte, Beschriftung links
  neben dem Wert (unter 24rem darüber), Sortierknöpfe als Leiste oben. Ein Zwillingsblock
  `.table-stack:not(.measured)` unter 40rem gilt vor der Hydration und ohne JS — **die beiden
  Blöcke gleich halten**. `min-width: 0` im gestapelten Zustand, `overflow-wrap: anywhere` für
  lange Bezeichner (API-Schema).
- Beschriftung in voller `base-content`-Farbe: auf den getönten Zellen der Wunschtabelle misst /80
  nur 3,48:1 auf `winter`, und axe liest `::before` nicht.
- **Falle `hidden` + Variant**: aufklappbare Zeilen (Teile in der Zuteilung) waren
  `hidden [tbody:has(...)]:table-row` — die gestapelte Regel `display:block` hätte sie immer
  geöffnet. Jetzt `data-collapsed` mit einer `!important`-Regel in app.css.
- **Falle Mindestbreite**: ohne `min-w-[…]` quetscht sich eine Tabelle und „passt“ scheinbar.
  Mindestbreiten bleiben, die gestapelte Form hebt sie auf.

## Die Absicherung

`responsive.spec.ts` › „every page across widths“: jede Seite als ihre Persona, bei 320, 375,
768, 1024, 1280, 1440 px; Fehler bei Seiten-Überlauf **und** bei jedem Element, das seitlich
scrollt (außer `<pre>`). Fand beim ersten Lauf noch `/api-doku/schema` (lange Typnamen) und eine
Zeile auf `/verwaltung/zpa` bei 320 px. `a11y.spec.ts` prüft zwei gestapelte Seiten mit axe.

Neue Seite → in `EVERY_PAGE` aufnehmen. Neue Tabelle → `table-stack` + `use:stackedTable`.
