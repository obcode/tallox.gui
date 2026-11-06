---
name: local-teachers-ui
description: Reiter „Lehrpersonen“ unter Zuteilung — von Hand angelegte Lehrende, Korrigieren und Stilllegen, kein Löschen, und warum `/ablauf` aus StaticRoute flog
metadata:
  type: project
---

Gebaut am 2026-11-06 (Schritt 2 des Anliegens „Lehrbeauftragte planbar“), gegen tallox.go v5.44.0.

- `/zuteilung/lehrpersonen`, Reiter für `ASSIGNING`. Liest `teachers(includeInactive: true)` und
  zeigt nur `enteredByHand` (`$lib/localTeachers`). Anlegen mit `askBeforeLeave`, Korrigieren in
  einem `<details>` je Zeile, „Aus den Listen nehmen“/„Wieder aufnehmen“ als Ein-Klick-Formular,
  das die übrigen Felder unverändert mitschickt (`changeLocalTeacher` nimmt immer alle).
- Vor- und Nachname kommen aus `sortName` zurück (`namesOf`), weil das Schema sie nicht einzeln
  liefert; ein von Hand angelegter Name enthält kein Komma.
- Wer anlegen darf, entscheidet das Backend (`TEACHER_ENTRY_REFUSED`); die Codes
  `TEACHER_MAIL_TAKEN` und `LOCAL_TEACHER_INVALID` stehen auf der Allowlist in `graphqlError.ts`.
- Der neue Reiter sprengte wieder die 25-Mitglieder-Grenze von `StaticRoute`; raus ist `/ablauf`,
  das nur per Literal aus Hilfe-Leiste und „Jetzt dran“ verlinkt wird.
- Offen: die Plakette „nicht im ZPA“ steht nur auf dieser Seite, nicht in den Auswahllisten der
  Zuteilung.
