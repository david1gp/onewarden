# Extension primary URL

## Goal

Make the web extension use `https://onewarden.contentoren.de` by default and show one primary server URL input instead of separate endpoint URL inputs.

## Decisions

- Keep the persisted environment settings shape for backward compatibility.
- Use one shared first-run environment default: `selfHosted` with base URL `https://onewarden.contentoren.de`.
- Keep the region selector and show one `Server URL` field bound to `base`.
- Hide the endpoint override fields; derive service endpoints from the base URL with the existing resolver.
- Apply the default in both the settings view and background runtime paths so first-run requests never fall back to Bitwarden.

## Approach

- Update the environment settings factory defaults.
- Simplify the server settings UI to one URL input while retaining existing save behavior.
- Replace background runtime US fallbacks with the shared OneWarden default.
- Update focused unit coverage and verify the extension build, static checks, and browser UI.

## Tasks

- [x] 1. Change environment defaults and simplify the settings pane.
- [x] 2. Update focused tests for the default and single-input behavior.
- [x] 3. Apply the OneWarden first-run default to background runtime paths.
- [x] 4. Add focused background first-run regression tests.
- [x] 5. Run targeted tests, typecheck, lint, extension build, and browser verification.

## Current context

- The environment settings factory now defaults to `selfHosted` and `https://onewarden.contentoren.de`.
- The settings pane keeps Region and exposes one `Server URL` input bound to `base`.
- Persisted endpoint fields remain intact and the existing resolver derives them from the base URL.
- Focused unit coverage now checks the new default, one URL input, and compatible save shape.
- A shared environment source now supplies the OneWarden URL to UI and all background first-run paths when storage is unset.
- Extension host configuration includes the OneWarden origin needed by the default environment.
- Background regression coverage now checks API, view model, handoff, and WebAuthn behavior with unset storage.
- The primary URL change is complete.
