# Memory — tallox.gui (Frontend)

Wissensbasis des Frontends. Übergreifendes und Betriebswissen liegt im privaten `tallox.dev`
(im Container unter `../tallox.dev/.claude/memory/`).

**Dieses Repo ist öffentlich.** Keine Hostnamen, keine Zugangsdaten, keine Namen von
Kolleg:innen.

- [Identität über AsyncLocalStorage](auth-header-relay.md) — warum der SSR-Hop X-Remote-User selbst mitschicken muss
- [Keine Aggregate über unveröffentlichte Wünsche](no-wish-aggregates.md) — der Leckkanal, den Zeilenfilterung nicht schließt
- [Themewahl im Cookie](theme-cookie.md) — warum nicht localStorage, und warum die Allowlist eine Sicherheitsgrenze ist
- [Toolchain-Stolperfallen](toolchain-gotchas.md) — pnpm allowBuilds, vitest.config, resolve() bei Links
- [Speichern beim Umschalten](save-on-toggle.md) — der Zulassungsbildschirm: Schalter als Formulare, Filtern im Browser, und die Falle mit `replaceState`
- [daisyUI-Kontrast-Overrides](daisyui-contrast-overrides.md) — der markierte Zustand muss ausgespart bleiben, und wo axe blind ist

<!-- Weitere Notizen entstehen mit dem Code. Eine Datei = ein Sachverhalt, Frontmatter mit
     name/description/metadata.type, Querverweise als [[slug]]. -->
