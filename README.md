# tallox.gui

Web interface for **Tallox** (from _Teacher Allocations_), the teaching-assignment planning
system (_Einsatzplanung_) of faculty 07 at Hochschule München.

> **Status: early construction.** Structure, tooling and CI are in place; the pages are being
> built. See [CLAUDE.md](CLAUDE.md) for the conventions.

A thin frontend over the [`tallox.go`](https://github.com/obcode/tallox.go) GraphQL backend
— no business logic, no persistence, and not a security boundary. The same API is reachable
directly with a Personal Access Token, so everything this app appears to enforce is
cosmetic; the backend is the gate.

## Stack

SvelteKit 2 · Svelte 5 (runes mode, enforced globally) · TypeScript · Tailwind v4 + daisyUI ·
graphql-request with codegen `client-preset` · adapter-node

## Development

Everything runs in the DevContainer from the `tallox.dev` repo.

```bash
cp .env.example .env
pnpm install
pnpm dev        # :5173
```

`pnpm dev` binds `127.0.0.1` deliberately — without it Vite binds only `::1` and the
DevContainer port forward hangs silently.

```bash
pnpm check      # svelte-check, blocking in CI
pnpm lint
pnpm test       # vitest
pnpm test:e2e   # playwright, needs a running backend
```

After a backend schema change, with the backend running:

```bash
pnpm run update-schema   # fetch schema.graphql, then codegen
```

## Configuration

Two URLs, and the difference matters:

| Variable               | Used by     | Value                                                   |
| ---------------------- | ----------- | ------------------------------------------------------- |
| `PUBLIC_TALLOX_SERVER` | browser     | the public URL — it carries the OIDC cookie             |
| `TALLOX_SERVER`        | SSR process | container-internal, e.g. `http://tallox-api:8080/query` |

The SSR hop bypasses the auth proxy, so this app relays the verified `X-Remote-User` itself
(see `src/lib/server/backend.ts`). Pointing `TALLOX_SERVER` at the public URL returns the IdP's
HTML login page and surfaces as a 500.

## Versioning

Releases are cut by semantic-release from the Conventional Commits on `main`. The git tag is
the source of truth; `package.json` stays at `0.0.0` and is never bumped.

The **major follows [`tallox.go`](https://github.com/obcode/tallox.go)**. This app is generated
against that backend's schema and has no persistence of its own, so a breaking API change is a
breaking change here too. When the server's major moves, a commit with a `BREAKING CHANGE:`
footer moves this one with it.

The two majors are meant to be **equal**, not merely to move together: the number answers "which
server does this GUI belong to". A gap between them is a bug in the pairing rather than a
difference of opinion about what changed — so the alignment commit is made as soon as the gap
appears, even when nothing in this app needs editing.

## License

BSD 3-Clause. See [LICENSE](LICENSE).
