---
name: module-split-ui
description: „Bestehende Instanzen“ auf der Modulseite — Vorschau nach dem Speichern der Aufteilung, Übertragen als zweiter Submit, und die Fixture-Kollision beim Bauen
metadata:
  type: project
---

Gebaut am 2026-10-20 auf `feat/apply-module-split`, zum Backend-Schritt
`applyModuleSplitToInstances` (siehe [[go/split-application]]).

- **Ort:** In der Karte „SWS-Aufteilung“ auf `/module/[id]` gibt es einen Abschnitt „Bestehende
  Instanzen“. Er erscheint nur, wenn man die Aufteilung schreiben darf und eine bestätigte
  Aufteilung existiert. Die Rollenprüfung ist kosmetisch, das Backend lehnt sonst ab.
- **Vorschau nach dem Speichern:** Die Action `components` ruft nach einem erfolgreichen
  Speichern selbst `dryRun: true` auf und gibt `splitPreview` zurück. So sieht man im selben
  Moment, dass die Instanzen _nicht_ mitgegangen sind. Das war genau die Lücke aus der
  Collab-Meldung. Scheitert die Vorschau, verdirbt das das Speichern nicht (`null`).
- **Übertragen ist der zweite Submit desselben Formulars** (`?/applySplit`, `dryRun=0|1`), ohne
  Bestätigungsdialog. Die Vorschau ist dieselbe Transaktion, nur zurückgerollt.
- Berichtszeilen und Überschrift kommen aus `src/lib/splitApplication.ts`. Nach der Vorschau
  stehen sie im Konjunktiv („würde angepasst“), nach dem Speichern im Perfekt. Sonst liest man die
  Vorschau als Speichern.

**Falle beim E2E-Fixture:** Die erste Fassung nahm die IDs `…091`/`…092` und den Studiengang
`E2S`. Beides gehörte schon dem Sortier-Fixture, und `E2U` gehört dem Controlling. Der Test
fand dadurch eine fremde Instanz, und `setModuleComponents` hatte dem Sortier-Modul eine
Aufteilung verpasst, die von Hand aus der Entwicklungsdatenbank entfernt werden musste.
**Vor einem neuen Fixture `grep` über `tests/*.ts` nach ID _und_ Studiengangskürzel.** Freie
IDs lagen ab `…0c1`.

## Module über zwei Semester (2026-10-20, gleicher Tag)

Zu [[go/two-semester-modules]]. In der Karte „SWS-Aufteilung“ gibt es oben den Knopf „Läuft über
zwei Semester“, für dieselben Personen wie die Aufteilung. Danach zeigen Kopf und Katalog „8 SWS
über 2 Semester“, und `componentMismatch` vergleicht mit dem Wert je Semester. Nach dem
Umschalten füllt sich der Editor neu, weil der Vorschlag von der Dauer abhängt. Fixture
`TWO_SEMESTERS` (E2V, `…0c3`).
