# Extension generator and unlock settings

## Goal

Give the browser extension a Bitwarden-like icon navigation experience with dedicated Vault, Password Generator, and Settings views, including a polished password generator and configurable vault timeout action/settings.

## Decisions

- Reuse the existing extension full-window pane/query-state architecture and expose clear icon navigation for Vault, Generator, and Settings.
- Add compact Generator and Settings access from the popup so the extension action surface can enter those views directly.
- Extract one cryptographically secure password generator for both the existing cipher editor and the new extension view.
- Support the security model already implemented: inactivity timeout plus `lock` or `logout`, including a Never option. Do not add PIN or biometric unlock because the current vault has no secure key-wrapping support for them.
- Reuse `#ui/...` components and existing package dependencies; keep runtime messages and persisted policy schema typed and validated.
- Use Sol subagents for UI design/implementation, a browser subagent for visual verification, and Luna for final commits and deployment.

## Approach

- First expose lock-policy load/save through the existing storage, background router, runtime bridge, and full-window state.
- Then add and test shared password-generation logic.
- Build the Generator and Security settings panes and icon navigation as focused UI increments.
- Verify unit/type/lint behavior, then verify the built extension visually and interactively in a real browser.
- Commit the completed work with the `/commits` workflow and deploy using the repository’s existing deployment scripts.

## Tasks

- [x] 1. Add typed runtime/background APIs and tests for loading and saving the existing vault lock policy.
- [x] 2. Extract shared cryptographically secure password-generation logic, reuse it in the cipher editor, and add focused tests.
- [x] 3. Add the full-window Generator pane and polished icon navigation for Vault, Generator, and Settings.
- [x] 4. Add a polished Security settings section for timeout and lock/logout action.
- [x] 5. Add compact popup icon actions that enter Generator and Settings views.
- [x] 6. Run focused and repository-wide verification and fix only issues caused by this change.
- [x] 7. Verify the extension UI and interactions in a real browser, fixing any visual or functional defects.
- [x] 8. Use the `/commits` workflow to create and push conventional commits, then deploy with the existing release workflow.
