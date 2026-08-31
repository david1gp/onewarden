# Theme toggle and sidebar spacing

## Goal

Add a light/dark mode toggle at the bottom of the demo sidebar, ensure light mode renders correctly, reduce the excessive sidebar gap above Navigation, then commit, push, and deploy the finished change.

## Decisions

- Reuse components from `./ui` through `#ui/...` imports.
- Place the theme control in the sidebar footer/bottom area.
- Preserve the existing dark appearance while making every demo surface readable in light mode.
- Make the smallest layout adjustment that removes the excessive gap without redesigning the sidebar.

## Approach

- Inspect the demo shell, sidebar, current color tokens/theme support, tests, and deployment scripts.
- Implement persisted theme selection using the project’s existing conventions and dependencies.
- Adjust sidebar layout spacing and verify both themes on `/demo/secure-note` in a real browser.
- Run the relevant automated checks, then use the `/commits` workflow and deploy.

## Tasks

- [x] 1. Locate the demo sidebar, theme architecture, and deployment workflow.
- [x] 2. Implement the sidebar light/dark mode toggle and light-theme styling.
- [x] 3. Reduce the gap above Navigation.
- [x] 4. Run automated checks and browser verification for both themes and spacing.
- [x] 5. Use the commits skill to commit and push the changes, then deploy.

## Current context

- `VaultNav.tsx` owns the sidebar; the identity card’s inherited `lg:p-8` caused the desktop gap and is now locally overridden with `lg:p-2`.
- Reusable `#ui/interactive/theme/ThemeButton.jsx` already provides persisted light/dark selection through the shared theme signal.
- Existing dependencies are sufficient; no package addition is needed.
- Relevant checks are format, lint, typecheck, unit/browser tests, and `build:web`; deployment is `bun run deploy`.
- The toggle is now in the sidebar footer, the app mounts its theme toast, and Tailwind’s `dark:` variant follows the persisted `.dark` class instead of OS preference.
- Focused theme browser tests pass in both themes and across reloads; existing demo alignment and vault-shell browser tests also pass.
- The desktop identity-to-Navigation gap is reduced while preserving mobile layout and the footer toggle.
- Unrelated pre-existing Sends/server work currently causes repository-wide unit and lint failures and must not be included in this feature’s commit.
- Automated feature checks, typecheck, unit tests, lint, and web build pass; repository formatting is blocked only by unrelated pre-existing files.
- The mobile Details toolbar now wraps so every action, including Trash, stays within the 390px viewport; desktop and both themes remain intact.
- The page root chain now has explicit light/dark canvas backgrounds, eliminating the white region below short dark-mode mobile content.
- Final browser verification passes at desktop and mobile sizes for switching, persistence, contrast, spacing, full-height backgrounds, no horizontal overflow, and all Details toolbar actions.
