# UI/UX and Admin Parity

## Goal

Fix the reported demo UI/UX issues and expand `/demo/admin` to represent the locally available Vaultwarden admin functionality with interactive demo-state workflows.

## Decisions

- `text-sm` is the minimum rendered text size; replace `text-xs`, `text-[11px]`, `text-[10px]`, and smaller utilities in affected web UI.
- Use existing `#ui` components and standard button sizes; every visible button action has an icon.
- Fix overflow at the responsible flex/grid child rather than hiding page overflow.
- Render folders as a two-column grid, with long labels spanning both columns and truncating safely.
- Preserve demo-local behavior while matching the local `~/opensource/vaultwarden` admin feature surface.
- Do not run browser or end-to-end tests. Verify with static checks and focused unit tests only.
- Complete each phase with conventional commits and deployment before starting the next phase.

## Approach

- Phase 1 normalizes shared typography, controls, responsive layout, and page backgrounds across the demo UI.
- Phase 2 completes user and organization administration workflows and metadata.
- Phase 3 expands configuration, SMTP, backup, and server-setting workflows.
- Phase 4 adds actionable diagnostics and completes admin-shell parity.

## Tasks

- [x] Phase 1: Fix login overflow, remove the decrypted/active footer, add the folder grid, correct short-page theme coverage, normalize minimum typography and button sizing, and add missing button icons across web UI.
- [x] Phase 1 release: Run non-e2e verification, create conventional commits with the `commits` skill, and deploy.
- [x] Phase 2: Add Vaultwarden-parity user metadata/actions, organization metadata/actions, role editing, reload/resync workflows, and confirmation flows to `/demo/admin`.
- [x] Phase 2 release: Run non-e2e verification, create conventional commits with the `commits` skill, and deploy.
- [ ] Phase 3: Add grouped editable/read-only server configuration, override states, password visibility, admin-token warning, SMTP testing, backup, save, and reset workflows.
- [ ] Phase 3 release: Run non-e2e verification, create conventional commits with the `commits` skill, and deploy.
- [ ] Phase 4: Add detailed diagnostics, generated support information with copy action, theme selection, admin login presentation, and reconcile the admin compositions.
- [ ] Phase 4 release: Run non-e2e verification, create conventional commits with the `commits` skill, and deploy.
