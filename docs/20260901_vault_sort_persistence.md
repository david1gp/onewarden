# Vault sort persistence

## Goal

Add persistent vault sorting to the web vault and extension full-window vault.

## Decisions

- Provide six options: Name A–Z, Name Z–A, Created newest, Created oldest, Updated newest, and Updated oldest.
- Default to Name A–Z, matching the extension’s current ordering.
- Apply sorting after filtering; missing or invalid dates sort last, with name then ID as deterministic tie-breakers.
- Persist device-locally and independently per surface: web `localStorage`, extension `chrome.storage.local` through the typed storage abstraction.
- Preserve preferences across lock and logout; do not sync them to the server.
- Sort all visible web vault items and full-window extension logins; extension popup relevance ordering remains unchanged.
- Reuse `#ui` select controls.

## Approach

- Add a shared sort value/schema/default and deterministic model-agnostic comparison helpers.
- Add the sort control, state, sorting, and local persistence to the web vault.
- Carry extension login timestamps into the full-window model, add typed extension storage, and wire hydrated sorting/control state.
- Add focused unit/browser coverage for all options and persistence.

## Tasks

- [x] 1. Add and test shared vault sort definitions and comparison behavior.
- [x] 2. Add persistent sorting to the web vault.
- [x] 3. Add timestamps and persistent sorting to the extension full-window vault.
- [x] 4. Complete focused tests and static verification.
- [x] 5. Verify both surfaces and persistence interactively in the browser.
