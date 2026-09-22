---
name: no-wish-aggregates
description: Vor der Veröffentlichung darf die Oberfläche keinerlei Aggregat über Wünsche zeigen — auch keine Counts oder Badges
metadata:
  type: feedback
---

Wünsche (Interessensbekundungen an Lehrveranstaltungen) sind bis zum
Veröffentlichungs-Stichtag für andere unsichtbar. Zweck: _kein Windhundverfahren_ — neue
Kolleg:innen sollen sich eintragen können, ohne dass es wie ein Angriff auf eine
alteingesessene Person wirkt.

**Zeilenfilterung allein reicht nicht.** Ein Badge „3 Kolleg:innen haben bereits Interesse"
verrät die Information vollständig, ohne einen einzigen Namen zu nennen. Dasselbe gilt für:

- ein „hat Wünsche"-Flag oder ein gefülltes/leeres Icon
- Sortierung nach Interessentenzahl
- Heatmap- oder Ampelfärbung, die von Wünschen abhängt
- „noch niemand hat sich eingetragen" als Hinweis
- Disabled-Zustände oder Tooltips, die aus fremden Einträgen folgen

**Why:** Die Oberfläche ist der Ort, an dem so ein Badge selbstverständlich wirkt — genau
deshalb entsteht das Leck hier und nicht im Backend. Und es ist kein Bug, sondern der
politische Schaden, den das ganze Werkzeug verhindern soll.

**How to apply:** Vor der Veröffentlichung keine Aggregate über Wünsche rendern. Wenn das
Backend einen Count liefert, ist er bereits gefiltert — **niemals clientseitig aus einer
Liste zählen**, denn die Liste ist ebenfalls gefiltert und der Count wäre dann falsch _und_
verräterisch, je nachdem, wer schaut.

Zweiter Leckkanal an derselben Stelle: **rohe Backend-Fehlermeldungen auf Schreibpfaden.**
Eine durchgereichte Verletzung einer Eindeutigkeitsregel verrät, dass schon jemand
eingetragen ist. Auf Schreibpfaden generische Meldungen anzeigen.

Die Regel selbst wird im Backend durchgesetzt ([[auth-header-relay]] erklärt, warum diese
Anwendung ohnehin keine Sicherheitsgrenze ist) — hier geht es darum, sie nicht durch die
Darstellung zu unterlaufen.

## Die Lesesicht des Bedarfs (2026-08-24)

`/bedarf` zeigt jetzt für alle eine Übersicht: **eine Zeile je Instanz**, also je Zug — genau
die Einheit, die später zugeteilt und bewünscht wird. Damit ist das die Tabelle, in die jemand
als Nächstes „3 Interessent:innen" schreiben möchte.

**Dort darf nie eine Zahl über Wünsche stehen** — kein Zähler, kein „hat Interesse"-Häkchen,
keine Einfärbung, keine Sortierung danach. Der Satz steht als Kommentar in
`src/lib/components/DemandOverview.svelte` und in `src/lib/demand.ts` über `instanceRows`, weil
das die zwei Stellen sind, an denen es jemand ergänzen würde.

Was aus `instance_part` kommt (Teile, Gruppen, SWS), ist unbedenklich: das ist Bedarf, nicht
Wunsch.

## Die eine erlaubte Ausnahme (2026-09-22)

`/zuteilung` zeigt der **Leitung einer Fachgruppe** einen Abschnitt „Noch ohne Interesse": die
Züge ihrer Fachgruppe, auf die sich niemand eingetragen hat. Damit steht dort genau der Satz, den
die Liste oben verbietet — und zwar zu Recht, aber nur unter drei Bedingungen, die alle drei im
Code stehen und einzeln getestet sind:

1. **Nur für eine Fachgruppe, die diese Person leitet** (`mayShowGaps` in `$lib/assignment.ts`).
   Sie liest die Eintragungen darauf ohnehin — die Regel ist Eigentümer ∨ veröffentlicht ∨
   zuständig — es ist also eine Umsortierung vorhandener Zeilen und keine neue Auskunft.
   Geprüft wird die **Leitung** (`me.subjectGroupsLed`), nie die Mitgliedschaft: die berechtigt
   zu nichts.
2. **Berechnet aus der serverseitig gefilterten `wishes`-Liste.** Für alle anderen enthält die
   nur die eigenen Einträge, „niemand eingetragen" wäre dann falsch _und_ verräterisch. Deshalb
   ist Bedingung 1 keine Höflichkeit.
3. **Keine Zahl.** Namen von Zügen, nichts gezählt, nichts eingefärbt, nichts danach sortiert.
   Eine Lücke ist „hier keiner", nie „dort drei".

**Why:** Die Fachgruppenleitung hat im Beta-Test danach gefragt, mit einem konkreten Grund —
Lehrbeauftragte früh ansprechen, eine Woche entscheidet über die Verfügbarkeit. Die Regel schützt
vor dem Windhundverfahren zwischen Kolleg:innen, nicht vor der Person, die die Fachgruppe besetzt.

**How to apply:** Diese Ausnahme ist **kein Freibrief**. Sie gilt für diesen einen Abschnitt auf
dieser einen Seite. Jede weitere Stelle, die etwas über fremde Wünsche aggregieren will, braucht
dieselben drei Bedingungen einzeln nachgewiesen — insbesondere die erste, ohne die die anderen
beiden nichts wert sind. Auf `/wuensche` gilt die Ausnahme ausdrücklich **nicht**: dort steht nur
ein Satz darüber, _dass_ die Leitung die Eintragungen ihrer Fachgruppen sieht, und nie etwas
darüber, was darin steht.
