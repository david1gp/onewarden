# Extension popup navigation

## Goal

Persist the popup's selected content tab across popup reopenings, and present Settings as a distinct link/action rather than as a third tab. Finish by committing, pushing, and deploying the completed change.

## Decisions

- Vault and Generator remain the popup's content tabs.
- Persist only the selected content tab; Settings must not become persisted tab state.
- Settings continues opening the full-window Settings pane.
- Reuse components from `#ui/...` and keep the popup styling visually consistent with the existing extension.
- Do not include unrelated untracked files in commits.

## Approach

- Store and restore the selected Vault/Generator pane through the extension's existing persistence/browser APIs, with Vault as the safe fallback.
- Refactor popup navigation so the two content tabs read as a tab group and Settings reads as a separate polished navigation action.
- Add focused tests where the existing extension test structure supports them, then run targeted checks and an extension build.
- Use the repository `/commits` workflow to create conventional commits and push, then run the repository deployment workflow.

## Tasks

- [x] 1. Implement and verify persisted Vault/Generator popup selection.
- [x] 2. Redesign and verify Settings as a visually distinct link/action using `sol-medium`.
- [x] 3. Run final verification for the combined popup behavior.
- [x] 4. Use a Luna subagent with the `/commits` skill to commit and push the intended changes.
- [x] 5. Deploy the committed result and report the outcome.
