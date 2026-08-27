# @adaptive-ds/onewarden

OneWarden is an MIT-licensed, Bun/TypeScript foundation for a clean-room,
backend-first server intended to make a Bitwarden-compatible implementation
possible over time.

> **Current status:** the initial package provides buildable library, CLI, Hono
> server, and web UI entry points. The web UI is a local development
> orientation page only. The database-backed `GET /alive`, `HEAD /alive`, and
> `GET /api/alive` readiness contracts and `GET /api/config` are implemented;
> authentication and vault screens are planned for later increments.

OneWarden is not a drop-in replacement for Bitwarden or Vaultwarden today, is
not affiliated with Bitwarden, Inc., and does not copy upstream implementation
code, documentation, branding, or assets. Compatibility work will be added in
later, separately verified increments.

## Compatibility status

The [upstream HTTP API inventory](docs/compatibility/upstream-api-routes.json)
records 307 discoverable Vaultwarden route declarations. The [upstream test
contract inventory](docs/compatibility/upstream-tests.json) records 34 Rust unit
tests and 43 Playwright test contracts. `GET /alive`, `HEAD /alive`,
`GET /api/alive`, and `GET /api/config` are marked `compatible`;
all other inventory entries are currently `not_implemented` by OneWarden. The
manifests include the exact upstream repository commit used as provenance.

These inventories are regenerated and checked with
`bun run compatibility:generate` and `bun run compatibility:check`.

## Target foundation

The planned backend foundation uses:

- Bun and TypeScript
- Hono for HTTP composition
- Valibot for runtime validation
- SQLite with Drizzle ORM
- Solid, Vite, and Tailwind CSS v4 for the web UI
- Biome for formatting and linting
- Result-style fallible boundaries

These are project direction and tooling choices, not a claim that the
corresponding runtime features are implemented in this release.

## Install

```bash
bun add @adaptive-ds/onewarden
```

## Scripts

```bash
bun run dev         # watch the Hono server
bun run dev:web      # start Vite at http://127.0.0.1:3041
bun run cli         # run the source CLI
bun run test        # run Bun tests
bun run compatibility:check  # validate upstream compatibility inventories
bun run build       # typecheck and build library, server, CLI, and web outputs
bun run preview:web  # preview the built web UI at http://127.0.0.1:3041
bun run format      # format the repository with Biome
bun run release     # prepare a changelog and release (repository required)
```

## Web UI

`bun run dev:web` serves a single Solid page from `src/web`. It reports which
entry points exist today and which areas are still planned, and lists the local
development commands. It performs no network calls, has no vault or sign-in
screens, and makes no Bitwarden API compatibility claims. `bun run build:web`
emits a static bundle to `dist/web`.

## License

MIT
