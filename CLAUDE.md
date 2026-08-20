# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository. The workspace-level file at `/workspace/CLAUDE.md` (from the private `tallox.dev`
repo) applies as well and covers the domain glossary, the cross-repo workflow and the git
conventions.

## What this is

A SvelteKit UI for **Tallox** (from _Teacher Allocations_), the teaching-assignment planning
system (_Einsatzplanung_) of faculty 07 at Hochschule München. It is a **thin frontend over the `tallox.go` GraphQL
backend**: no business logic, no persistence, and **never a security boundary**.

That last point is not a slogan here. The same GraphQL API is reachable directly with a
Personal Access Token, which bypasses this app entirely — so anything this UI appears to
enforce (hiding a button, filtering a list) is cosmetic. The backend is the gate.

UI language is German. Code, identifiers, comments and commit messages are English.

**This repository is public.** No hostnames, no operational detail, no names of colleagues.

## Commands

Package manager is **pnpm** (pinned via `packageManager`, use Corepack).

```bash
pnpm install
pnpm dev                 # :5173 — binds 127.0.0.1, see below
pnpm build               # adapter-node -> ./build
pnpm preview             # :4173
pnpm check               # svelte-check, blocking in CI
pnpm lint                # prettier --check . && eslint .
pnpm format
pnpm test                # vitest
pnpm test:e2e            # playwright, needs a running backend
pnpm codegen             # regenerate typed documents from schema.graphql
pnpm run update-schema   # refetch schema from $TALLOX_SERVER, then codegen
```

`pnpm dev` binds `127.0.0.1` on purpose: without it Vite binds only `::1` and the
DevContainer port forward hangs silently.

## Backend connection

Two URLs, and the difference matters:

- `PUBLIC_TALLOX_SERVER` — from the browser. In production the public URL; it carries the OIDC
  cookie.
- `TALLOX_SERVER` — from the SSR process, container-internal (`http://tallox-api:8080/query`).
  **Never point this at the public URL:** the SSR process has no OIDC cookie and would get
  the IdP's HTML login page back, which surfaces as a 500 on an arbitrary page.

Because the SSR hop bypasses the auth proxy, this app must relay `X-Remote-User` itself.
That happens in `src/lib/server/backend.ts` via **AsyncLocalStorage**, set once in
`hooks.server.ts` — rather than threading `locals` through every load and handler signature,
where one forgotten call site would be a silent authorization failure.

`backendClient()` builds its headers **from scratch**. Client-supplied `Authorization` or
`X-Remote-*` headers are never forwarded.

One header goes the other way: `X-Tallox-Assume-Roles`, built from the `tallox_assume` cookie
in `hooks.server.ts` and relayed the same way as the identity. It is the role preview, and it
is safe to relay unvalidated because `policy.Narrow` in the backend intersects the selection
with the grants the person actually holds — a hand-written cookie takes privileges away from
its author and does nothing else. Validating it here would create a second opinion about
permissions, and two opinions about permissions is one more than this project may have.

`undefined` means "not narrowed", `[]` means "narrowed to no role at all". They are different
states and travel as "no header" and "header with an empty value" — see `$lib/assumedRoles.ts`.

**Three failure modes, three different pages.** A person with an HM login but no row in
`person` is not a broken backend, and used to be shown as one ("Backend nicht erreichbar" in
the footer). `loadSession()` separates them by HTTP status: 401 is "no account here" and
becomes a 403 from the root layout, 503 and a dead socket are "temporarily unreachable" and
the app keeps rendering. Because SvelteKit does not render `+error.svelte` for a failure in
the root layout — that layout is the thing that failed — the no-account page is
`src/error.html`, self-contained with its own inline CSS. `+error.svelte` covers page-level
errors inside the shell.

## Data fetching

- **SSR loads** — `+page.server.ts` calls `backendRequest(...)`.
- **Client-side proxies** — `src/routes/gui-api/<domain>/<name>/+server.ts`.

Two deliberate choices, both lessons from the sibling project:

1. **`/gui-api/`, not `/api/`.** `/api/graphql` is the machine API served by the backend
   through Caddy. Keeping the app's own proxies in a separate namespace makes the boundary
   visible in the URL and prevents Caddy from silently shadowing a route.
2. **GET for reads, POST for writes.** The sibling project made every proxy POST and then
   needed a hand-maintained allowlist of "POSTs that are really reads" for its write-lock.
   Using the right verb makes that classification automatic.

GraphQL documents go through **graphql-codegen `client-preset`** (`graphql(...)` tagged
documents, typed end to end) — not untyped template strings. `schema.graphql` is the
committed copy of the backend schema; codegen reads that file, so it works offline and in CI.

## Conventions

- **Svelte 5 in runes mode**, globally. `svelte.config.js` sets `compilerOptions.runes: true`,
  so `export let`, `$:`, `on:click`, `createEventDispatcher` and `<slot>` are **compile
  errors**, not style preferences. Use `$props()`, `$state()`, `$derived`, `$effect()`,
  callback props, `{@render children()}`.
  `dynamicCompileOptions` compiles `node_modules` in legacy mode — that escape hatch is for
  dependencies, never for `src/`.
- **TypeScript only.** `strict: true`. No `.js` files in `src/`.
- **Styling: Tailwind v4 (CSS-first) + daisyUI.** The theme is a **cookie**, resolved in
  `hooks.server.ts` and written into `<html data-theme>` via `transformPageChunk` — not
  `theme-change`, whose localStorage lives on the client and therefore flashes the default
  theme on every full load of a server-rendered page. `src/lib/themes.ts` holds the
  allowlist; the resolved value goes into the markup unescaped, so nothing outside that list
  may ever survive `resolveTheme()`. The list must match the `themes:` block in `app.css`.
  Page wrapper `flex flex-col gap-4`; heading `text-2xl font-semibold`; cards
  `rounded-lg border border-base-300 bg-base-100 p-4`. **Never hard-coded colours** like
  `text-green-700`.

  daisyUI's own defaults are the recurring source of contrast findings: `.menu` entries,
  `thead th` (3.49:1) and inactive `.tab` (2.66:1) are all damped below 4.5:1. They are
  overridden in `app.css`, in one block per component, with the measured ratio in the comment.
  Expect the next daisyUI component to need the same treatment — check it, do not assume it.

  **Such an override must exclude the marked state.** daisyUI pairs `.menu-active` /
  `.tab-active` / `:active` with a matching foreground (`--menu-active-fg` on
  `--menu-active-bg`), and that pair is built for contrast. Undoing only the foreground half
  of it made the current page in the nav bar dark-on-dark on all seven light themes. Reuse
  the exact `:not(…)` list daisyUI itself damps with. Note that axe cannot see this: daisyUI
  paints a `background-image` on the active entry, so its `color-contrast` rule reports
  `incomplete`, never `violation` — `tests/contrast.spec.ts` therefore measures that one
  ratio itself.

  Two contrast rules, both measured across all twelve themes by `tests/contrast.spec.ts`:

  - **Muted text is `/80` or `/90`, never lower.** Below 80% opacity `base-content` drops
    under the 4.5:1 of WCAG 1.4.3 on `winter` (3.87:1 at /70) and `retro` (3.72:1). The scale
    is therefore 100 / 90 / 80 and nothing else.
  - **Semantic colours are background colours.** `text-error` / `text-warning` /
    `text-success` on `base-100` reach 1.35:1 to 3.5:1 on the light themes — as text they are
    unreadable, whatever they signal. Use `badge badge-error`, which daisyUI pairs with its
    `*-content` foreground, and keep the sentence itself in `text-base-content/80`.

- **Responsive, tablet-first.** Full usability from 768px, clean at 375px. Horizontal padding
  comes from `+layout.svelte`; pages do not add their own. Grids are always
  `grid-cols-1 sm:grid-cols-N`, wide tables live in `overflow-x-auto`.
  Full usability does not mean everything at once: the nav bar shows its seven areas
  side by side only from `xl` (1280px), below that the menu carries them — with the same
  entries. They did not fit at 768px (883px wide) and did not fit at 1024px either (1061px,
  once the identity and the role switcher had grown). `tests/responsive.spec.ts` watches five
  widths, and 1280 is in the list because a breakpoint means _from_: the row appears at exactly
  that width, so that is where the next area will break it.
- **Prettier:** tabs, single quotes, no trailing commas, printWidth 100.
- **Links need `resolve()`** from `$app/paths` (`svelte/no-navigation-without-resolve`).

## Things the UI must not do

These follow from the domain, not from taste. Full reasoning in the backend's
`internal/policy` and in the workspace `CLAUDE.md`.

- **Before wishes are published, show no aggregate about them.** No counts, no
  "hat Wünsche" badges, no sorting by interest, no heat-map colouring. Such a badge leaks the
  _kein Windhundverfahren_ information completely without naming anyone. If the backend
  returns a count, it is already filtered — do not compute one client-side from a list.
- **Do not surface raw backend error strings on write paths.** A verbatim uniqueness
  violation reveals that someone else already registered. `src/lib/server/graphqlError.ts` is
  where that rule lives: refusals are recognised by their `extensions.code` — the stable half
  of the contract with the backend — and only codes on its allowlist keep their wording.
  Everything else becomes a generic sentence. Never branch on the German text: that is the
  half somebody rewords after a support question.
- Role-based hiding (buttons, menu entries) is **cosmetic**. Write it for clarity, never rely
  on it. It is worth doing anyway: somebody who sees "Statistik" in the menu and gets a
  refusal on every click learns to ignore refusals.
- **"It is harmless" is not a reason to show a control.** The role preview can only ever
  remove permissions, so offering it to everybody with more than one role was safe — and still
  wrong: a study-programme lead has two roles and no question that button answers, and what it
  does to her screen looks like a defect without the question. `mayPreviewRoles` gates it on
  ADMIN, and on the _granted_ roles rather than the effective ones, or the way out would
  vanish exactly while narrowed.
- **A field marked `@interactiveOnly` needs a page here, or it does not exist.** The API
  console under `/api-doku` deliberately talks to the token door, so it answers `null` for
  every such field — and the playground is off in production. `diagnoseAccess` was shipped
  without a page and was therefore unreachable by anybody. Check the directive when adding a
  backend field, before assuming the console covers it.
- **Build the navigation from `session.effectiveRoles`, never from `me.roles`.** The two
  differ the moment somebody narrows their roles, and a menu built from the held ones shows
  the view of a person whose permissions the server is no longer applying — which answers
  exactly the wrong question for the feature that exists to answer it.

## Tests

No step, feature or fix is finished without tests.

- **vitest** for pure logic in `src/lib/**`. Convention: pull logic out of `.svelte` into a
  `lib` module, test the module, import it back. Coverage has thresholds (see
  `vitest.config.ts`); `.svelte` files are excluded because Playwright covers them.
- **Playwright** in `tests/`, against a real stack — PostgreSQL → `tallox.go` → SSR →
  Chromium. Runs in its own workflow (`e2e.yml`), which checks out and builds the backend.
  In the DevContainer `/dev/shm` is 64 MB, so Chromium needs `--disable-dev-shm-usage` and
  capped workers.

**E2E needs seeded people.** The backend resolves `X-Remote-User` against its `person` table,
so a persona without a row is nobody and every page answers 401 — an authorization failure
that looks like a broken app. `tests/global-setup.ts` pipes SQL generated from `PERSONAS`
into `psql` before the first test; it needs `TALLOX_DB_URL` and does nothing without it.

`tests/fixtures.ts` holds the cast — `PERSONAS.eins` owns the record, `zwei` must not see it —
with the same names as the backend's `internal/testdata`, so a scenario reads the same in both
repos. `asPersona(p)` sets `X-Remote-User` **the way the proxy does**: the test plays Caddy,
not the client. `checkA11y(page)` runs axe against WCAG 2.1 AA.

**What E2E is for here, and unit tests are not.** The SSR hop bypasses the auth proxy, so this
app relays `X-Remote-User` itself through AsyncLocalStorage. When that breaks, every page
renders as anonymous and looks completely normal — no error, no failing unit test. A mock
backend cannot show it, because the mock receives whatever headers the test hands it. That is
why `e2e.yml` builds the real backend rather than stubbing it.

**Known-open findings stay visible.** `KNOWN_A11Y_DEBT` in `tests/fixtures.ts` lists axe rules
that are currently violated; they are disabled for the blocking check so the other ~90 rules
can stay sharp, and each one also gets its own `test.fixme` so it is named in every report.
Same for the viewport widths in `tests/responsive.spec.ts`. Deleting such a test, or loosening
it to a comfortable value, is how a suite quietly stops meaning anything — mark it `fixme`
with a reason instead.

Currently open: nothing. Both findings from the first run — contrast and the nav-bar
overflow — are fixed, and `KNOWN_A11Y_DEBT` is empty.

`tests/contrast.spec.ts` runs axe's contrast rule against **all twelve themes**, because the
regular a11y check only ever sees the default one. Contrast here is a property of the pair
(component, theme), not of the component: a value that is comfortable on `nord` fails on
`winter`.

**Opening a dropdown in a test needs `openDropdown()`**, not `.click()`. daisyUI fades menus
in via `opacity`, and Playwright's `toBeVisible()` does not look at opacity — so axe measures
through a half-transparent element, finds washed-out colours and reports contrast violations
that do not exist. That looks exactly like a real defect in the UI.
