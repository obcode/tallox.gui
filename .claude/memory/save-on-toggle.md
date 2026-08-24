---
name: save-on-toggle
description: Schalter ohne Speichern-Knopf, Filtern im Browser, warum page.url dafür nicht reicht — und wann ein GET-Formular das bessere Werkzeug ist
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

## Sichtwechsel und Filter sind GET-Formulare, kein `replaceState` (2026-08-24)

Auf `/bedarf` schalten Semester und Studiengang beim Klick um, und der Bearbeiten-Schalter
wechselt die Sicht — alles ohne `replaceState`, und das ist kein Versehen.

**SvelteKit fängt GET-Formulare ab.** Im Client-Runtime steht ein Submit-Listener mit
`if (method !== 'get') return;` und danach eine gewöhnliche clientseitige Navigation. Ein
`<button type="submit" name="studiengang" value="IF">` in einem `<form method="GET">` ist damit
sofortiges Umschalten **mit** korrektem `page.url`, laufendem Load und funktionierendem
Zurück-Knopf — und ohne Skript tut dasselbe Markup dasselbe mit vollem Seitenaufbau.

Der Unterschied zu `/verwaltung/personen`: dort wird **im Browser** gefiltert, es braucht also
gar keine Runde, und `replaceState` schreibt nur die Adresse nach. Hier braucht jede Umschaltung
ohnehin einen Server-Load — dann ist das Formular die richtige Bauart und `replaceState` das
falsche Werkzeug. Die `page.url`-Falle entfällt, statt umgangen zu werden.

Zwei Bauregeln, die dabei Zeit gekostet hätten:

- **Zwei Bedienelemente gleichen Namens passen nicht in ein Formular.** Die Reiter „meiner"
  Studiengänge und die Auswahlliste der übrigen heißen beide `studiengang`, also stehen sie in
  zwei Formularen — und jedes schickt die übrigen Filter als versteckte Felder mit, sonst fällt
  beim Umschalten die halbe Auswahl weg.
- **`<form>` gehört nicht in ein `<label>`.** Ungültige Verschachtelung; der Parser hebt das
  Formular heraus, und das Layout springt nach der Hydration.

Und ein Testfallstrick derselben Runde: `boundingBox()` ist **viewport-relativ**. Ein Klick, der
seinen Knopf ins Bild scrollt, verschiebt jede Zahl auf der Seite — der Test „die Tabelle bewegt
sich beim Speichern nicht" hing damit an der Höhe der Filterkarte. Jetzt wird gegen das Dokument
gemessen (`+ window.scrollY`).

### Nachtrag (2026-08-24): alle Studiengänge als Reiter

Erst waren es „meine" als Reiter plus eine Auswahlliste für die übrigen neunzehn — zwei
Bedienelemente gleichen Namens, also zwei Formulare. Seit die Liste nur noch die Studiengänge
enthält, die die Fakultät wirklich plant (siehe `go/programme-planning-status`), sind es fünfzehn
und sie passen in eine Reihe. Die Auswahlliste ist weg, das zweite Formular auch, und `#snippet
currentFilter` braucht seinen Parameter nicht mehr.

Die eigenen Studiengänge stehen **fett**, nicht vorne: alphabetisch heißt, ein Studiengang steht
immer an derselben Stelle.
