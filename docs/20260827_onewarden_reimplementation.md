# Goal

Build OneWarden as an independent TypeScript reimplementation of Vaultwarden with complete Bitwarden/Vaultwarden API behavior compatibility, migrated behavior tests, and a substantially better Solid-based UI/UX.

# Decisions

- Do not retain or compile Vaultwarden Rust application code; use `/home/david/opensource/vaultwarden` only as a read-only protocol and behavior reference.
- Use the relevant default stack: Bun, TypeScript, Biome, Hono, Valibot, SQLite, JOSE, Solid, Vite, Tailwind CSS v4, `solid-ui`, Corvu, Floating UI, `@adaptive-ds/mdi`, `clsx`, and `tailwind-merge`.
- Follow the `code-style` skill: bounded contexts, one matching export per file, subject-first naming, Valibot-derived types, `Result` for fallible operations, and view-only TSX with sibling state factories.
- Organize backend features as bounded contexts under `src/server/contexts/`; keep protocol schemas, domain logic, persistence, routes, and tests local to each context.
- Use SQLite as the primary database and version every schema change with migrations.
- Match exact API paths, verbs, aliases, casing, status codes, error bodies, token claims, cryptographic formats, and realtime frames before extending behavior.
- Port behavior tests feature-by-feature; every feature task includes focused unit, integration, and compatibility tests before it is complete.
- Build the UI against the same public API; do not introduce private shortcuts around authentication, authorization, or encryption behavior.
- Implement each feature increment before running or editing its tests; repair every failing test without dismissing failures as unrelated.
- Run and repair end-to-end tests only after the corresponding feature implementation is complete.
- When a phase is complete and all tests pass, use a fresh Luna subagent with the `commits` skill to commit, push, and deploy it before continuing to the next phase.
- Reuse existing demo pages and components, extracting shared behavior where needed; keep UI implementation DRY and import reusable primitives from `./ui` via `#ui/...`.

# Approach

- Remove the copied upstream implementation and obsolete generated/runtime artifacts.
- Establish a strict TypeScript workspace and reusable test harness first.
- Build protocol foundations, then port API features in dependency order as independently verifiable increments.
- Add the improved UI as bounded features after their APIs stabilize.
- Maintain a mechanical compatibility manifest against the read-only upstream route registrations and behavior fixtures.
- Current context: task 34 is committed, pushed, and deployed on `main`. Task 35 is implemented with uncommitted publication-integration and demo-alignment fixes that must be reviewed, repaired, fully tested, committed, pushed, and deployed. Tasks 36-38 have work on isolated branches/worktrees and must be integrated and verified serially after task 35 publication; task 38 remains incomplete. Task 39 has not started.

# Tasks

- [x] 1. Remove copied Vaultwarden source, Rust metadata, upstream web/Playwright infrastructure, stale compatibility tooling, generated artifacts, and leftover containers while preserving this plan.
- [x] 2. Scaffold Bun/TypeScript/Biome workspaces, scripts, environment validation, Hono server entry, Solid/Vite web entry, and test runners.
- [x] 3. Add shared `Result`, API error envelope, request validation, logging, configuration, clock, identifier, and cryptographic utility foundations.
- [x] 4. Add SQLite connection lifecycle, migration runner, transaction helpers, test database factory, and initial schema-version table.
- [x] 5. Build a mechanical upstream route/alias compatibility manifest and a Hono route-registration drift test.
- [x] 6. Port identity prelogin, registration capability, registration, verification, and account-creation behavior with tests.
- [x] 7. Port password-grant token issuance, refresh-token rotation, device identity, token claims, and revocation behavior with tests.
- [x] 8. Port API-key, organization API-key, authorization-code, and SSO token grant behavior with tests.
- [x] 9. Port authentication guards, security-stamp rules, client-version checks, trusted-device rules, and organization role guards with tests.
- [x] 10. Port user profile, keys, password changes, KDF changes, account revision, account deletion, and device management APIs with tests.
- [x] 11. Port email workflows and account lifecycle APIs, using deterministic mail adapters and behavior tests.
- [x] 12. Port authenticator, email, WebAuthn, Duo, YubiKey, recovery-code, and remembered-device two-factor behavior with tests.
- [x] 13. Port folder CRUD, ordering, revisions, and notification hooks with tests.
- [x] 14. Port cipher create/read/update/delete/restore, bulk operations, favorites, ownership, and revision behavior with tests.
- [x] 15. Port cipher sharing, collection assignment, organization ownership transfer, and access-control behavior with tests.
- [x] 16. Port attachment metadata, upload, download-token, download, replacement, quota, and deletion behavior with tests.
- [x] 17. Port sync responses, domains, equivalent domains, profile composition, revisions, and exclusion rules with tests.
- [x] 18. Port personal import/export and cipher-password-history behavior with tests.
- [x] 19. Port organization creation, update, deletion, keys, billing compatibility, limits, and seat behavior with tests.
- [x] 20. Port organization membership invite, accept, confirm, update, remove, restore, resend, and bulk behavior with tests.
- [x] 21. Port collection CRUD, user/group assignments, access details, and bulk behavior with tests.
- [x] 22. Port group CRUD, membership, collection access, directory-sync compatibility, and bulk behavior with tests.
- [x] 23. Port organization policies, organization domains, SSO configuration, and policy enforcement behavior with tests.
- [x] 24. Port organization event logging, event retrieval, retention rules, and event notification hooks with tests.
- [x] 25. Port Send text/file CRUD, access, passwords, download tokens, quotas, expiration, and deletion behavior with tests.
- [x] 26. Port emergency-access invite, accept, confirm, initiate, approve, reject, view, takeover, timeout, and reminder behavior with tests.
- [x] 27. Port public organization import and remaining public compatibility endpoints with tests.
- [x] 28. Port authenticated and anonymous notification hubs, SignalR MessagePack framing, ping behavior, update types, and connection limits with tests.
- [x] 29. Port optional push-relay device registration, token caching, dispatch, and failure behavior behind an adapter with tests.
- [x] 30. Port icon retrieval, caching, fallback, SSRF protection, redirect, and content-type behavior with tests.
- [x] 31. Port admin authentication, users, organizations, diagnostics, configuration, mail test, invite, deauthorization, and backup APIs with tests.
- [x] 32. Port static/web compatibility routes, health endpoints, configuration endpoints, legacy aliases, and fallback behavior with tests.
- [x] 33. Build accessible authentication, registration, verification, unlock, and two-factor UI flows with browser tests.
- [x] 34. Build the responsive vault shell, navigation, search, filters, collections, folders, empty states, and keyboard workflows with browser tests.
- [ ] 35. Build cipher view/edit/create flows for login, secure note, card, identity, fields, attachments, history, sharing, and deletion with browser tests.
- [ ] 36. Build organization, members, collections, groups, policies, events, and settings UI flows with browser tests.
- [ ] 37. Build Send, emergency access, security, devices, import/export, account, and admin UI flows with browser tests.
- [ ] 38. Port and run the complete upstream-compatible behavior matrix, add protocol fixtures for uncovered APIs, and close every compatibility-manifest gap.
- [ ] 39. Add production build, Caddy/systemd deployment, migrations, backup/restore, observability, security headers, and release verification.

# Paths

- `package.json`
- `biome.json`
- `src/shared/`
- `src/server/`
- `src/server/contexts/`
- `src/server/database/`
- `src/web/`
- `tests/compatibility/`
- `tests/browser/`
- `tools/compatibility/`
- `migrations/`
- `docs/`
