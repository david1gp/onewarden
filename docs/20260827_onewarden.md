# OneWarden

## Goal

Create `@adaptive-ds/onewarden` as a public Bun/TypeScript package with a TypeScript library, `@stricli/core` CLI, web UI, and backend-first clean-room Bitwarden-compatible server in `/home/david/c/adaptive/onewarden`, with an explicit path to preserve Vaultwarden's public API contracts and tests.

## Decisions

- Use Bun, TypeScript, Hono, Valibot, SQLite, Drizzle, Solid, Vite, Tailwind CSS, `@stricli/core`, Biome, and Result-style fallible boundaries.
- Follow the global default-tech-stack command and code-style skill; keep one export per file and organize by bounded context.
- Use `/home/david/opensource/vaultwarden` only as an interoperability reference; do not copy AGPL source, docs, branding, or assets into OneWarden.
- Copy project tooling conventions from `/home/david/adaptive/authworks`, adapting all project identity and runtime behavior.
- Start with backend infrastructure and unauthenticated compatibility endpoints; track the complete upstream route and test surface for later increments.
- Publish under `https://github.com/david1gp/onewarden` with package name `@adaptive-ds/onewarden` and MIT licensing for original code.
- Register the project with project-registry and use its assigned development port consistently in Vite and project metadata.
- Mirror `/home/david/adaptive/solid-ui/ui` into the project `ui/` directory, expose it through `#ui` absolute imports, and require reuse of those components in `AGENTS.md`.

## Approach

- Establish the complete project/release/tooling baseline and compatibility manifests.
- Keep library, CLI, server, and web UI as explicit build outputs with shared bounded-context application logic.
- Implement a bounded modular Hono server with validated configuration, consistent errors, and independently testable app construction.
- Port backend contracts incrementally in dependency order: public/config, identity/sessions, accounts, vault, organizations, 2FA, realtime, then remaining integrations.
- Verify each increment with Bun tests and formatting/build checks before publishing.

## Tasks

- [x] 1. Scaffold the project and copy/adapt the requested repository, package, build, release, deployment, metadata, workspace, license, and README files.
- [x] 2. Establish buildable TypeScript library, `@stricli/core` CLI, Solid web UI, and Hono server entry points with package exports, development scripts, project-registry registration, a synchronized assigned Vite port, and the mirrored `#ui` component library.
- [x] 3. Add machine-readable upstream API/test inventories and document compatibility status without copying upstream implementation.
- [x] 4. Implement the backend foundation and first public compatibility endpoints with Bun tests.
- [x] 5. Verify formatting, tests, and production builds for all four outputs; fix only issues in the initial increment.
- [x] 6. Initialize Git, create focused conventional commits, create the public GitHub repository, and push the default branch.

## Paths

- Project: `/home/david/c/adaptive/onewarden`
- Upstream reference: `/home/david/opensource/vaultwarden`
- Tooling reference: `/home/david/adaptive/authworks`
- Plan: `docs/20260827_onewarden.md`
