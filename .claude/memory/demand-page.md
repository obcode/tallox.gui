---
name: demand-page
description: Wie /bedarf gebaut ist — zwei Sichten unter einer Adresse, und die Regel, an der drei Fehler an einem Tag hingen
metadata:
  type: project
---

Stand 2026-08-24. `/bedarf` ist die größte Seite der Anwendung und die einzige mit zwei
Sichten unter einer Adresse.

## Zwei Sichten, ein Pfad

- **Lesesicht** (Standard, für alle): eine Zeile je **Modul** mit den Zügen darin, nur was
  angemeldet ist. Ohne Studiengang heißt das „alle", nach Studiengang gruppiert.
- **Planungstabelle** (`?bearbeiten=1`): eine Zeile je **Katalogmodul** mit Häkchen, Zügen,
  Gruppen — die Arbeitsliste.

Die Kornung ist in beiden dieselbe: ein Modul, das in zwei Zügen läuft, ist **ein** Fach, das
zweimal angeboten wird. Die Lesesicht listete es anfangs zweimal (eine Zeile je Instanz), und
damit beschrieben zwei Bildschirme denselben Bedarf verschieden.

`editing = ?bearbeiten=1 ∧ mayPlan ∧ Studiengang gewählt`. Wer das Recht nicht hat und den
Parameter tippt, bekommt die Lesesicht — nicht eine Planungstabelle mit neun abgeschalteten
Bedienelementen.

**Der Umschalter hängt an der Person, nicht am Studiengang.** Zwei Fragen: `plansAtAll`
(PROGRAMME_LEAD ∨ DEANS_OFFICE) entscheidet, ob es den Knopf _gibt_; `mayPlan` entscheidet, ob
er _geht_. Ein Knopf, der beim Durchklicken der Studiengänge kommt und geht, liest sich wie ein
Fehler, und seine Abwesenheit beantwortet nichts — also abgeschaltet mit Grund im `title`. Drei
Gründe, weil die Reparaturen verschieden sind (Studiengang wählen / anderen wählen / Zuordnung
erbitten).

## Die Regel, an der drei Fehler hingen

**Ein GET-Formular schickt von seinen Absende-Knöpfen nur den geklickten.** Beide Reiterleisten
standen in _einem_ Formular ohne versteckte Felder — ein Klick auf einen Studiengang schickte
`studiengang` und sonst nichts, landete ohne `semester` und damit im Planungssemester.
Umgekehrt genauso. Und das dritte Formular trug dieselben fünf Felder, die es sichtbar hat,
_zusätzlich versteckt_: zwei Bedienelemente gleichen Namens, `searchParams.get` nimmt das erste
— die Turnus-Auswahl war wirkungslos.

Daraus: **ein Formular je Leiste**, und `{#snippet carriedOver(own)}`, dem jedes Formular sagt,
welche Parameter es selbst als sichtbares Bedienelement trägt. Alles andere reist versteckt mit.
`filterFields` ist die eine Liste, aus der sich das speist.

**Nicht** „verstecktes Feld hinter das sichtbare stellen und die DOM-Reihenfolge entscheiden
lassen". Das funktioniert und bricht beim nächsten Umbau lautlos — es ist genau der Weg, auf dem
der dritte Fehler entstand.

## Sofort umschalten ohne `replaceState`

Die Reiter sind Absende-Knöpfe. **SvelteKit fängt GET-Formulare ab** (`client.js`:
Submit-Listener, `if (method !== 'get') return`) und macht daraus eine echte Navigation — also
stimmt `page.url`, der Load läuft, und ohne Skript tut es dasselbe mit vollem Seitenaufbau. Die
`replaceState`-Falle aus [[save-on-toggle]] entfällt damit, statt umgangen zu werden. Das
`<form>` steht **um** die Leiste, nie dazwischen: daisyUI stylt über `.tabs > .tab`.

## Der Turnus folgt dem Semester

Kein Dreifach-Filter mehr. Bei gewähltem Wintersemester fragte „Sommersemester" nach genau den
Modulen, die darin nicht laufen können. Jetzt ein Schalter, benannt nach dem Turnus, den er
hinzunimmt. Ausgeblendet wird dabei **genau eine** Gruppe — die 90 Module des anderen Turnus;
`ON_ANNOUNCEMENT`, `EVERY_SEMESTER`, `ALTERNATING…` und `UNKNOWN` (zusammen 328) stehen immer
da, weil Wegblenden weit mehr versteckte, als es entfernt.

**Die ganze Filterzeile gibt es nur beim Bearbeiten.** Suche, Art, Turnus und die Häkchen
filtern die Katalogliste, aus der die Planungstabelle ihre Zeilen macht — und die wird nur dort
geladen. In der Lesesicht standen fünf Bedienelemente ohne Wirkung.

## Was die Tabelle nie zeigen darf

Nichts über Wünsche — kein Zähler, kein „hat Interesse"-Abzeichen, keine Einfärbung. Eine
Tabelle mit einer Zeile je zuteilbarem Zug ist genau die Stelle, an der jemand so etwas
ergänzen würde. Siehe [[no-wish-aggregates]].

## Zeilen, die der Filter nicht liefert

`demandRows` bildet die **Vereinigung**: Katalogmodule plus alles, was darüber hinaus geplant
ist, aus der Instanz selbst. Vorher zählte der Kopf eine Instanz mit, für die es keine Zeile
gab — und schlimmer: `planDemand` fasst nur an, was auf dem Bildschirm stand, eine unsichtbare
Zeile ließ sich also nie wieder abwählen.

Siehe [[save-on-toggle]], [[no-wish-aggregates]], `go/programme-planning-status`.

## Deckung über Studiengänge (2026-08-27)

Zwei Studiengänge halten dasselbe Modul **einmal gemeinsam**. Der gedeckte Zug hält keine Teile,
leiht die des haltenden und kostet 0 SWS. Das Backend-Wissen dazu steht in
`tallox.go/.claude/memory/instance-coverage.md`; hier stehen die drei Dinge, die in der GUI
schiefgingen.

**Ein Knopf mit `formmethod="GET"` in der Planungstabelle schickt die ganze Tabelle ab.**
Formulare lassen sich nicht schachteln, also lag der Picker-Knopf im großen POST-Formular und
verwandelte beim Klick jedes Häkchen und jede Gruppenzahl in Query-Parameter. Lösung: ein
eigenständiges `<form method="GET" id="coverage-picker">` außerhalb der Tabelle, und die
Zeilenknöpfe verweisen per `form`-Attribut darauf. Dieselbe Regel wie beim Link-vs-GET-Formular
eine Ebene tiefer — und die dritte Variante desselben Fehlers auf dieser Seite.

**`plannedHours` braucht ein eigenes `covered`-Flag, nicht `borrowedKinds`.** Die geliehene Liste
ist, was der _haltende_ Zug tatsächlich hält. Nennt die Modul-Zerlegung eine Einheit, für die
dort kein Teil existiert — eine Übung, die niemand angelegt hat —, würde sie einem Zug berechnet,
der überhaupt keine Lehre hält. Genau so bekommt ein gedeckter Zug eine plausibel aussehende Zahl
über null.

**`liveHours` musste dasselbe Flag durchreichen.** Sonst zeigte die Planungstabelle die volle
Aufteilung, während die gespeicherte Zahl daneben 0 sagt — zwei widersprüchliche Zahlen
nebeneinander, auf dem Schirm, dessen Aufgabe es ist zu zeigen, was eine Änderung kostet.

**Ein Nebenfund, der älter ist als diese Funktion:** `demand.spec.ts` setzte
`CATALOGUE.otherProgramme` kurzzeitig auf `DISCONTINUED`, während `programmes.spec.ts` genau diese
Zeile für plannbar hält — parallel. Das Rennen lag immer da und fiel erst um, als diese Datei lang
genug wurde, dass sich die Fenster überlappten. Beide benutzen jetzt einen Studiengang, den sonst
niemand anfasst. **Merksatz: ein Test, der eine Zeile mutiert, die eine andere Datei besitzt, ist
ein Flake mit Verzögerung.**

**Die Anfragen-Sektion ist kein Schmuck.** Eine offene Anfrage steht in der Zeile des _fragenden_
Studiengangs, und die sieht die haltende Leitung in ihrer eigenen Auswahl nie. Ohne den Abschnitt
„Anfragen anderer Studiengänge" ist die Anfrage auf dem einzigen Schirm unsichtbar, der sie
beantworten kann.

## Die Rückzugsfrage als Modal (2026-08-28)

Enthaken speichert nicht sofort: der Probelauf meldet einen Rückzug, die Antwort kommt als
Vorschau zurück, und `edits` bleibt absichtlich stehen — die Marke sagt dann „noch nicht
gespeichert". Das war korrekt und wurde trotzdem als Fehler gelesen: die Frage stand als Kasten
**oben**, die Marke steht **unten rechts**, und die Marke ist lauter.

**Das Modal muss ohne JavaScript dastehen.** Diese Seite kommt ohne aus, und die Vorschau ist eine
servergerenderte Antwort. Ein `<dialog>`, das nur per `showModal()` aufgeht, verlöre die Rückfrage
genau dort. Deshalb steht `open` als **Attribut** am Element — daisyUI zeigt `.modal[open]` —, und
ein Effekt hebt es mit JavaScript zum echten Modal (Backdrop, Fokusfalle, ESC).

**`showModal()` wirft auf einem bereits offenen Dialog.** Also erst `close()`, dann `showModal()`.
Und `close()` feuert ein `close`-Event — ohne Wächter verwirft sich der Dialog in dem Moment, in
dem er entsteht. Der Wächter ist ein Flag, das per `setTimeout(…, 0)` zurückgesetzt wird: das
Event wird als Task eingereiht und läuft davor, egal ob synchron oder asynchron gefeuert.

**Abbrechen muss `edits` leeren.** Eine Navigation auf dieselbe Route baut die Komponente _nicht_
neu — ein zurückgelassenes Enthaken überlebte den Reload und hielte das Häkchen aus, während die
Datenbank die Instanz noch hat. Genau der Zustand, über den die Marke sich beschwert hatte.

**Zwei Knöpfe dürfen nicht denselben zugänglichen Namen tragen.** Der Backdrop-Knopf hieß per
`aria-label` ebenfalls „Abbrechen" — Playwrights Strict Mode fand zwei und brach ab. Er heißt
jetzt „Dialog schließen".

## Kopplung als Regelfall (2026-08-28)

Aus dem Sonderfall mit Handschlag ist die Voreinstellung geworden: wer ein Modul plant, das ein
anderer Studiengang schon geplant hat, hält es **sofort mit ihm zusammen**. Backend-Wissen in
`tallox.go/.claude/memory/instance-coverage.md`; hier steht, was die GUI davon trägt.

**„Deckung lösen" heißt jetzt „getrennt planen".** Der Knopf ist nicht mehr das Rückgängig einer
Ausnahme, sondern die ausdrückliche Wahl — und soll sich so lesen.

**Die dritte Badge ist die wichtigste.** `alsoPlannedSeparately` sagt „auch in DC2, DE3, ID5
geplant (getrennt)" — dasselbe Modul, zweimal geplant, weil keiner vom anderen wusste. Als Angebot
formuliert und nicht als Fehler: es kann genau richtig sein, und der Schirm kann das nicht wissen.
Sie ist außerdem das einzige, was das eine Rennen der Automatik je sichtbar macht (zwei Leitungen
planen gleichzeitig, keine sieht die andere).

**Der Toast muss sagen, was in fremden Studiengängen passiert ist.** „1 angelegt" verschweigt, dass
die Zeile nichts hält. Und ein zurückgezogener Gastgeber hat seine Lehre an einen anderen
Studiengang weitergegeben — das ist das Einzige, was ein Speichern außerhalb des eigenen
Studiengangs tut, und darf deshalb nicht fehlen.

**Der Rückzugs-Dialog nennt die Folge im Konjunktiv.** „GS übernähme" — nicht „übernimmt": an der
Instanz kann ein Wunsch hängen (`ON DELETE RESTRICT`), die Übergabe liegt in derselben Transaktion
und rollt dann mit zurück. Eine Zusage, die das Backend nicht halten muss, wäre schlimmer als keine.

### Zwei Fallen im E2E, beide teuer

**`demandResetSql` musste breiter werden.** Es räumte nur die Instanzen _dieses_ Studiengangs weg.
Das war dieselbe Menge — bis die Automatik kam: eine Zeile, die ein früherer Lauf in E2F oder E2H
hinterlassen hat, greift jetzt in die Fixture und macht aus „2 angelegt" eine Anlage und eine
Kopplung. **Merksatz: ein Reset muss alles besitzen, was seine Assertions erreichen kann** — sonst
hängt die Suite am letzten Lauf.

**Ein Häkchen zu setzen, das schon gesetzt ist, speichert nicht.** Die Zeile kommt aus dem
Vorsemester vorbelegt und angehakt; `check()` ist dann ein No-op, und der Test wartete auf einen
Toast, den nie jemand ausgelöst hat. Irgendeine echte Änderung an der Zeile — der Gruppen-Stepper —
übernimmt den Vorschlag mit.
