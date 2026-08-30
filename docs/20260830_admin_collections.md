# Admin collections

## Goal

Add complete collection management to `/demo/admin`, reuse the existing organization collection implementation, identify the remaining concrete Vaultwarden parity gaps, then commit, push, and deploy the verified OneWarden package.

## Decisions

- Treat `/home/david/adaptive/onewarden` as the implementation repository; this repository remains the production operations repository.
- Reuse the existing organization collection list, detail, create, and edit UI instead of duplicating collection behavior.
- Keep `/demo/admin` data local and deterministic through an admin-specific adapter; do not add server endpoints because collection CRUD already exists.
- Preserve all unrelated Task 39 worktree changes and include only intentional, verified changes in commits.
- Verify focused state/UI tests, the existing organization collection regression suite, browser behavior, the full release gate, and production health.

## Approach

- Add an admin collection workspace/state adapter over the existing collection schemas and components.
- Wire it into the organizations section while preserving current organization search, details, status, and deletion behavior.
- Cover collection search, create, edit, member permissions, delete, selection fallback, counts, responsive behavior, and accessibility.
- Audit actual OneWarden behavior against the local Vaultwarden reference and report prioritized missing or partial features.
- Use the repository commit workflow, push the resulting commits, deploy with the existing release scripts, and run post-deploy/browser checks.

## Tasks

- [x] 1. Implement the `/demo/admin` collection state, UI integration, and focused automated tests.
- [x] 2. Verify collection workflows in a real browser and fix only defects in the new flow.
- [x] 3. Audit and summarize remaining Vaultwarden parity gaps with repository evidence.
- [x] 4. Run full release verification, use the commits skill to split and push intentional changes, then deploy and verify production health.
