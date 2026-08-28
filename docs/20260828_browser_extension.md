# Browser extension

## Goal

Add a Chrome Manifest V3 Solid extension that connects to OneWarden or a Bitwarden-compatible self-hosted server, supports an independent popup and full-window vault, synchronizes an encrypted local cache, creates login entries, copies standard or custom fields, explicitly fills a selected login, and applies configurable lock/logout behavior.

## Decisions

- Keep one repository and one root Bun package; contain extension source and configuration in `src/extension`.
- Use current CRXJS with the existing Vite/Solid stack; keep the web and extension builds independent.
- Keep reusable wire contracts, schemas, route paths, and API models browser-neutral under `src/shared`; keep extension-only contracts under `src/extension`.
- Treat Bitwarden clients and Vaultwarden as compatibility references, not source foundations.
- Keep the browser-action popup site-focused; use a separate full-window entry for browsing, creating, and managing entries.
- Support Bitwarden-style official/self-hosted environment configuration, with normalized API, identity, icons, notifications, and web-vault locations.
- Make the background service worker own authentication, sync, storage, lock/logout policy, window coordination, and page injection; UI documents own view state only.
- Start with server-first entry creation and encrypted local drafts; do not add an offline mutation outbox until offline writes are required.
- Expose copy actions for username, password, URI, notes, and copyable custom fields.

## Approach

- Map current OneWarden routes and schemas against the checked-out Bitwarden/Vaultwarden contracts.
- Establish a browser-neutral compatibility contract boundary and typed extension API client.
- Scaffold independent MV3 build, manifest, popup, full-window, options, background, and one-shot injection entries.
- Add environment configuration, encrypted cache/session handling, sync, lock/logout, create-entry, copy, and explicit fill flows incrementally.
- Verify contracts and logic with automated tests, then load the unpacked build in Chrome for end-to-end verification.

## Tasks

- [x] 1. Map current and upstream-compatible API contracts and identify the smallest server/extension contract delta.
- [x] 2. Add the extension build boundary, manifest, entries, scripts, and type configuration.
- [x] 3. Add shared compatibility contracts and the typed extension API/environment client.
- [x] 4. Add encrypted extension storage, session state, sync, and configurable lock/logout behavior.
- [x] 5. Implement the site-filtered popup and separate full-window vault using shared UI components.
- [x] 6. Implement entry creation, encrypted drafts, cache refresh, and copy actions for standard/custom fields.
- [x] 7. Implement explicit one-shot page filling and minimal background message/window coordination.
- [x] 8. Add or complete the required compatible server endpoints and route registration.
- [x] 9. Add automated coverage and verify the unpacked MV3 extension in Chrome.

## Paths

- `src/extension/`
- `src/shared/api/`
- `src/shared/validation/`
- `src/server/contexts/`
- `ui/`
- `tests/extension/`
- `package.json`
- `tsconfig.json`
- `build/extension/`
