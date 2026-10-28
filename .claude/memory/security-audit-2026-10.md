---
name: security-audit-2026-10
description: Was das GUI-Security-Audit vom 2026-10-28 fand, was daraufhin gebaut wurde, und die Regel „ClientError verlässt backend.ts nie“
metadata:
  type: project
---

# Security-Audit 2026-10-28 (GUI)

Quelltext-Review auf `694bc55`; keine kritische Lücke, vier Befunde mit Handlungsbedarf. Die
Audit-Datei liegt im privaten `tallox.dev` unter `docs/security-audit-2026-10-28-gui.md`.

**Gebaut:**

- **F1** SvelteKit ≥ 2.70.2 (ReDoS über `Accept`), Vite ≥ 6.4.4, `devalue` 5.9.x. Dazu lehnt
  `hooks.server.ts` Pfade ab, die mit `//` beginnen (`$lib/requestPath`): protokollrelative URL,
  heute ohne Catch-all nicht ausnutzbar, trotzdem 400.
- **F2** `backendRequest` fängt graphql-requests `ClientError` und wirft `BackendError` mit nur
  `response.status` und `response.errors` — ohne Query, Variablen, Antwortdaten; die Message ist
  der erste Fehlersatz, nicht das JSON der ganzen Runde. `toRefusal`/`httpStatusOf` lesen
  dieselbe Form wie vorher. Server-Sentry: `requestDataIntegration({ include: { headers: false } })`
  plus `beforeSend` (`$lib/server/reporting`), das `x-remote-*`, `cookie`, `authorization`
  defensiv entfernt. **Nach dem Deploy ein Test-Event in GlitchTip ansehen** — der
  Header-Befund war aus dem SDK-Quelltext abgeleitet.
- **F4** `bedarf/+page.server.ts` übergibt `session.effectiveRoles` (über `parent()`) an
  `filingGroupsFor`, nicht `me.roles`. **H7** `mayShowGaps` verlangt die Rolle
  SUBJECT_GROUP_LEAD zusätzlich zur geleiteten Gruppe — `me.subjectGroupsLed` wird von der
  Rollenvorschau nicht verengt, die Wunschliste schon.
- **H1** `isHttpError` statt `'status' in err`. **H2** `Number.isInteger`/`isFinite` an den vier
  `Number()`-Stellen. **H4** `/healthz/gui` liefert nur noch `status` (Version steht im Footer und
  in `buildInfo`). **H6** Theme- und Rollen-Cookie tragen `secure` auf https
  (`$lib/cookies`). **H5** liegt in `tallox.dev` (Caddy-Header, CSP report-only).

**Regel seit diesem Tag:** Ein `ClientError` verlässt `src/lib/server/backend.ts` nie. Wer einen
neuen Backend-Aufruf baut, geht durch `backendRequest`; wer einen Fehler loggt oder weiterwirft,
hat damit automatisch keine Variablen im Text.

**Bewusst belassen:** H3 (Mailadresse der geprüften Person als URL-Parameter der Diagnose),
H8 (401-Text des Backends wörtlich in `error.html`, Kit escaped).

**Why:** SSR-Loads ohne `try/catch` werden zu 500ern, deren Message ins Container-Log und zu
GlitchTip wandert; mit graphql-requests Originalfehler stünden Wunschnotizen und Mailadressen
darin. **How to apply:** Beim nächsten CSP-Schritt `kit.csp` mit Nonces in `svelte.config.js`
aktivieren und die Report-Only-Verstöße aus der Browser-Konsole vorher abarbeiten. Siehe
[[auth-header-relay]], [[no-wish-aggregates]], [[partner-faculty-ui]].
