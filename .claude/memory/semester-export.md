---
name: semester-export
description: Excel-Export eines Semesters unter /gui-api/export/semester — warum in der GUI statt im Backend, warum keine Wünsche, der Hinweissatz, und die Stolperfallen beim Testen von Downloads
metadata:
  type: project
---

Gebaut am 2026-10-16 auf Wunsch aus dem Collab: Wer für SoSe 27 eine Planung nebenher in Excel
mitlaufen lässt, soll nicht alles doppelt eintragen müssen. Button „Als Excel exportieren“ auf
`/statistik` ([[sws-controlling-page]]), drei Blätter: **Planung** (eine Zeile je Instanz-Teil
mit Besetzung), **SWS je Studiengang** (dieselbe Anordnung wie `controllingTable`) und
**Hinweise**.

**Warum in der GUI und nicht unter `/download/*` im Backend.** Die Datei entsteht aus _einer_
GraphQL-Operation `ExportSemester`. Damit gelten Sichtbarkeitsfilter, Scopes und Zugriffsprotokoll
ohne neuen Code im Backend. Die deutschen Spaltenköpfe bleiben in der GUI, wie es die Sprachregel
verlangt. Wer ein Token hat, bekommt dieselben Daten ohnehin über die API. Ein Backend-Handler
hätte eine eigene Protokollierung gebraucht, denn `RecordAccess` hängt nur am gqlgen-Handler.
Außerdem hätte er einen Proxy für Dev und E2E gebraucht. Caddy leitet `/download/*` weiterhin ans
Backend, dort ist aber nichts gemountet.

**Keine Wünsche, auch keine Zählungen**, nicht einmal für das Dekanat, das sie lesen darf. Eine
Datei lässt sich nicht zurückholen. Siehe [[no-wish-aggregates]].

**Der Hinweissatz steht bei unveröffentlichter Zuteilung für alle**, auch für das Dekanat, das
alles sieht. Bekämen ihn nur die, denen Zeilen fehlen, würde er genau das verraten.

**Bibliothek: `write-excel-file`** (Laufzeit, eine Abhängigkeit) und `read-excel-file` (nur
Tests). Gegen exceljs wurde entschieden, weil es seit 2023 kein Release mehr hatte und neun
Abhängigkeiten mitbringt. Einen Autofilter bietet die Bibliothek nicht, deshalb ist nur die
Kopfzeile fixiert.

**Stolperfallen**

- **`StaticRoute` in `$lib/navigation.ts` schließt `/gui-api/…` und `/healthz/…` aus.** Die drei
  neuen Routen-IDs schoben die Union über 25 Mitglieder. Ab dieser Grenze löst TypeScript ein
  Union-Argument nicht mehr gegen die Überladungen von `resolve()` auf. Jede Aufrufstelle im
  NavBar schlug dann mit einem Fehler fehl, der die Ursache nicht nennt.
- **Ein verwaister `vite preview` auf :4173 wird von Playwright lokal wiederverwendet**
  (`reuseExistingServer`). Dann laufen die Tests gegen einen alten Build ohne
  `PUBLIC_TALLOX_FEEDBACK_URL`. Das sah aus wie ein Fehler im Download und in `layout.spec.ts`.
  Vorher mit `ss -ltnp | grep 4173` prüfen.
- **Fixture-Wünsche gehören Fuenf.** „Meine Eintragungen“ umfasst alle Semester. Ein Wunsch für
  Zwei hat `wishes.spec.ts` gebrochen. Dieselbe Lehre steht schon im Zuteilungs-Fixture in
  `tests/seed.ts`.
- Ein Teil hat höchstens eine Besetzung (`UNIQUE` im Backend). Der Join ist deshalb ein Lookup,
  und kein Teil wird zu zwei Zeilen.
