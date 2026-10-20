---
name: leave-guard
description: Jedes Formular meldet sich bei einem Register; Seitenwechsel wartet auf Selbstspeicherer oder fragt bei Anlege-Formularen — und die Fallen dabei
metadata:
  type: project
---

Gemeldet am 2026-10-20: unter „Meine Fachgruppen" eine Gruppe angeklickt, auf „Kompetenzen"
gewechselt — dort nicht ausgewählt. Die Seite hatte einen „Speichern"-Knopf, und nichts sagte, dass
der Haken nur im Browser stand. Gewünscht: **immer sofort speichern**, und wo das keinen Sinn ergibt,
beim Verlassen fragen (speichern / verwerfen).

## Bauart

- `$lib/pendingChanges.ts` — reines Register (vitest): je Formular `auto` oder `ask`, `touched`,
  Baseline (serialisierte Felder), Speicherungen unterwegs, letzter Fehlschlag. `settle()` schickt
  Zurückgehaltenes und wartet per Polling.
- `$lib/saveOnLeave.ts` — drei Svelte-Actions, die `use:enhance` **ersetzen** (sie rufen `enhance`
  selbst auf, damit das Register jede Abschickung sieht): `autosave`, `askBeforeLeave`,
  `trackSaves` (für Wünsche, Kompetenzen, Zuteilung, Bedarf mit eigener Speicherlogik).
- `LeaveGuard.svelte` im Root-Layout: `beforeNavigate` → Selbstspeicherer offen ⇒ abbrechen, warten,
  dann `goto`; Anlege-Formular mit Eingabe ⇒ Dialog; Tab schließen ⇒ Browser-eigene Rückfrage.

## Welches Formular was ist (Stand 2026-10-20)

Sofort: Meine Fachgruppen, Leitung/Mitglieder/Umbenennen (Verwaltung › Fachgruppen), Fachgruppe auf
der Modulseite, Kontingent (Studiengänge), Rollen/Studiengänge (Personen › Alle Konten), Wunsch-SWS.
Fragen: neues Token, neue Fachgruppe, neues Konto, eigene Lehrveranstaltung, SWS-Aufteilung,
Kompetenz für Lehrende ohne Konto, Stapelzuordnung im Katalog.

**`canSave: false`** wo „Speichern" aus dem Dialog falsch wäre: das **Token** (Geheimnis wird nur
einmal auf der Seite gezeigt — beim Verlassen angelegt, kennt es niemand) und die
**Stapelzuordnung** (Ziel ist, was das Auswahlfeld zufällig zeigt).

## Fallen

- **Das Wechseln selbst war das Leck**, nicht nur der Knopf: ein Klick auf einen Link direkt nach
  dem Haken startet den Load der nächsten Seite, während die Mutation noch unterwegs ist. Deshalb
  wartet der Guard auch bei Selbstspeicherern, nicht nur bei Dialog-Formularen.
- **`{#key}` auf der gespeicherten Menge + Sofortspeichern = verlorener zweiter Haken.** Der Remount
  nach der ersten Antwort wischt den Haken, der inzwischen gesetzt wurde. `PeoplePicker` liest die
  Menge jetzt selbst neu ein, und nur wenn nichts nachgeschoben ist.
- **Dialog `onclose` ≠ „bleiben"**: der Dialog schließt auch auf dem Weg zum Speichern. Escape läuft
  über `oncancel`.
- **Felder außerhalb des `<form>`** (Token-Reichweite mit `form="create-token"`) blubbern nicht
  durchs Formular — die Listener hängen am Dokument und prüfen `field.form`.
- **`requestSubmit` auf ungültigem Formular schickt still nichts** — zählt als Fehlschlag, sonst
  wartet der Guard 15 s auf eine Speicherung, die nie startet.
- Rollen mit „Befristet bis": das Datum allein ändert nichts, also löst nur eine Checkbox das
  Speichern aus (`accepts`); Hinweis „erst Datum, dann Rolle".
- Lokal: ein **alter `vite preview` auf :4173** wird von Playwright wiederverwendet
  (`reuseExistingServer`) — dann testet man den alten Build.

E2E: `tests/leave-guard.spec.ts` (Dialog), `own-subject-groups.spec.ts` (der gemeldete Weg: Haken,
sofort zu Kompetenzen). Siehe auch [[save-on-toggle]], [[subject-group-pages]].
