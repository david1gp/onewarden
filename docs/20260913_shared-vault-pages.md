# Shared vault pages

## Goal
- Render the existing web vault presentation in both web app and extension full-page tab, with independently injected state and controls. Keep the popup distinct.
- Reuse a vault tab or open a tab in an existing window; commit and deploy when verified.

## Decisions
- View-only means presentation without platform data/API/state construction, not read-only interactions.
- Preserve the web design and reuse #ui components and existing libraries.
- Retain a bundled extension page entry and runtime adapters; remove obsolete fullscreen presentation, not extension runtime support.
- Preserve existing working-tree changes. Commit only understood changes without discarding unrelated work.

## Approach
- Separate web presentation contracts from web state ownership, then adapt extension state to those same views.
- Keep platform operations injected, including nested cipher controls; no implicit web API fallback in shared views.
- Verify each increment and browser-test both surfaces before commits and deployment.

## Tasks
1. Completed: decouple web vault shell presentation from state construction; WebVaultShell owns web state and VaultShell receives state/actions.
2. Completed: nested vault/cipher views receive presentation state and CipherPresentationAdapter operations; web wrappers own API integration.
3. Completed: extension full-page uses shared web vault presentation with extension adapters; obsolete fullscreen panes removed and bundled entry retained.
4. Completed: full-vault action focuses an existing vault tab or creates a tab in an existing window without replacing unrelated tabs.
5. Completed: verify shared UI fixtures, builds, focused tests and adapter regressions; existing-window lookup includes query-error fallback.
6. Completed: Luna ran commits skill and pushed task commits; frontend and vault deployed with extension artifact built.
