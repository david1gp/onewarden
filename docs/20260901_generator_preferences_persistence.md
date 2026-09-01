# Generator preferences persistence

## Goal

Persist password/passphrase generator UI choices across generator and extension restarts using the extension’s local storage abstraction.

## Decisions

- Store preferences in `chrome.storage.local`, not browser `localStorage` or the server.
- Persist generator mode, password options, and passphrase options as one validated device-level record.
- Do not persist generated output, visibility, copy status, or errors.
- Preserve preferences across lock and logout.
- Fall back safely to current defaults when storage is absent or invalid.

## Approach

- Add a typed generator-preferences schema, storage key, and load/save methods to the existing extension storage layer.
- Hydrate generator pane state from storage and save preference changes without blocking generation.
- Add focused storage/state/UI tests and browser verification.

## Tasks

- [x] 1. Add validated generator-preferences support to extension storage.
- [x] 2. Hydrate and save generator pane preferences.
- [x] 3. Add focused persistence tests and run static verification.
- [x] 4. Verify persistence across reload/reopen in the browser.
