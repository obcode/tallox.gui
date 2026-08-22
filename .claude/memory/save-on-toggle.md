---
name: save-on-toggle
description: Der Zulassungsbildschirm — Schalter ohne Speichern-Knopf, Filtern im Browser, und warum page.url dafür nicht reicht
metadata:
  type: project
---

Gebaut am 2026-08-22 auf `feat/teacher-admission`: `/verwaltung/personen` bekommt zwei Reiter.
„Aus dem ZPA" listet die Lehrenden aus dem Import, vorgefiltert auf Professuren der FK07, mit
einem Schalter je Zeile für Konto, Rollen und Studiengänge — jeder Klick wird sofort
gespeichert. „Alle Konten" ist der bisherige Bildschirm; er ist die **einzige** Sicht auf
Konten ohne ZPA-Eintrag (Dekanat, Sekretariat, `auth.protectedadmins`).

## Ein Schalter ist ein Formular

`<button type="submit" role="switch" aria-checked>` in einem winzigen `<form>`, mit der
**ganzen gewünschten Menge** in versteckten Feldern. Das ist genau das, was `setPersonRoles`
und `setPersonProgrammes` entgegennehmen — und der Grund, aus dem sie es tun: Hinzufügen und
Entfernen verliert ein Rennen, sobald zwei Administrationen dieselbe Person offen haben.

Ein Button statt einer Checkbox, weil es dann **ein** Bedienelement gibt und nicht eines plus
einen Knopf, den mit JavaScript niemand braucht. Ohne JavaScript schickt derselbe Klick
dasselbe Formular ab; mit JavaScript übernimmt `use:enhance` und ruft
`update({ reset: false })` — Vorbild ist die Selbstspeicherung in `bedarf/+page.svelte`.

Playwright findet solche Schalter über `getByRole('switch', { name: 'Konto' })` und
`toBeChecked()` (liest `aria-checked`). Der zugängliche Name muss deshalb **stabil** sein: „Konto",
nicht „Konto anlegen" / „Konto entziehen" je nach Zustand.

## Gefiltert wird im Browser

Das Backend bietet bewusst keine Filterargumente an — ein paar hundert Zeilen hinter einem
Admin-Login. Die reine Logik liegt in `src/lib/teacherAccounts.ts` und läuft **zweimal**: im
Server-Load (erste Darstellung schon eingeengt, funktioniert ohne JavaScript) und im Browser
(ein Klick kostet keine Runde).

**Die Falle, die eine Stunde gekostet hätte:** `replaceState()` aus `$app/navigation`
aktualisiert **`page.url` nicht**. Ein `$derived(parseTeacherFilter(page.url.searchParams))`
sieht daher weiterhin die alte Auswahl — die Adresse stimmt, die Tabelle bewegt sich nicht,
und ein Reload zeigt plötzlich das Richtige. Die Auswahl ist deshalb eigener `$state`, gesetzt
von genau der Funktion, die auch die Adresse schreibt; damit können beide nicht auseinanderlaufen.

Zwei kleinere Punkte derselben Art: `svelte/prefer-svelte-reactivity` verlangt `SvelteSet` und
`SvelteURL(SearchParams)` in `.svelte`-Dateien, und `svelte/no-navigation-without-resolve`
schlägt bei `replaceState` immer zu — `resolve()` baut eine Route, und hier geht es um dieselbe
Route mit anderem Query-String. Ausnahme mit Begründung an der Stelle, wie in `Footer.svelte`.

## Was der Bildschirm sagen muss

**Wie viele Zeilen der Vorfilter wegnimmt** (`hiddenBy`). 146 von 257 echten Lehrenden tragen
gar keine Fakultätsangabe — eine auf FK07 vorgefilterte Liste sieht deshalb genauso aus wie
eine vollständige, und wer eine Kollegin nicht findet, kann die beiden nicht unterscheiden.
„Ohne Angabe" ist aus demselben Grund ein Filterwert und keine Lücke.

**Kein Konto ≠ deaktiviertes Konto.** Der nächste Schritt ist ein anderer: zulassen oder wieder
aktivieren. Dafür gibt es `Person.active` überhaupt erst.

**Refusals in der Zeile**, nicht am Seitenkopf: `LAST_ADMIN` und `TEACHER_HAS_NO_MAIL` handeln
von einer Person, und ein Satz über zweihundert Zeilen sagt nicht, welcher Schalter ihn
ausgelöst hat. Alle Actions geben dafür die id mit zurück.

Zum Backend siehe `../../tallox.go/.claude/memory/admitting-a-teacher.md` — dort steht, warum
das Zulassen `LECTURER` mitvergibt. Kontrast-Overrides: [[daisyui-contrast-overrides]].
