# Shared field icons

## Goal
- Give Username, Password (including copied feedback), Website, Account number, Recovery phrase, and TOTP code appropriate, consistent MDI icons in extension and matching web UI.

## Decisions
- Reuse installed `@adaptive-ds/mdi` and `#ui/...` components; do not edit synced `ui`.
- Follow zitadel-login's domain-to-MDI resolver convention in a shared catalog.
- Use the existing deployment workflow after the requested Luna `/commits` step.

## Approach
- Centralize semantic field icons and reuse the catalog wherever these fields are rendered in popup, full-window, and corresponding web views.
- Preserve field behavior and copied feedback.

## Tasks
1. Completed: implement shared catalog and integrate field icons; add focused tests and run non-browser checks.
2. Completed: browser-verify extension demos and matching web UI.
3. Completed: Luna runs the commits skill to commit and push the changes.
4. Completed: deploy using existing project scripts.
