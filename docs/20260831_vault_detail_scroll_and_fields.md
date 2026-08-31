# Vault detail scroll and fields

## Goal

Refine the vault workspace so each column scrolls independently with consistent styled scrollbars, simplify navigation and password display, and improve detail actions and collection selection.

## Decisions

- Give `vault-navigation-column`, `vault-items-column`, and `vault-detail-column` independent vertical scrolling with the existing shared scrollbar styling.
- Put Edit before Favorite in the detail action grid.
- Replace text-based Collections entry with the existing `CheckMultiple` UI component.
- Hide password-strength evaluation badges in display view.
- Show password history as a section below the password details only when previous passwords exist.
- Remove navigation section separator lines and use the same spacing rhythm already used between navigation groups and vaults.
- Reuse existing `#ui/...` components and installed libraries.

## Approach

- Correct workspace height/overflow ownership and apply shared natural scrollbar styles to each column.
- Simplify navigation separators and detail action ordering.
- Replace collection text entry and reorganize password history/strength presentation in the shared detail UI.
- Add focused regression coverage and verify desktop/narrow behavior in a real browser.
- Commit, push, and deploy through the repository's existing workflow.

## Tasks

- [x] 1. Make all three vault columns independently scrollable with consistent styled scrollbars.
- [x] 2. Remove navigation separator lines, retain consistent group spacing, and place Edit before Favorite.
- [x] 3. Replace Collections text entry with `CheckMultiple`.
- [x] 4. Remove display-view password strength badges and show non-empty password history as a section below password details.
- [x] 5. Add focused tests and visually verify the updated vault workspace.
- [x] 6. Run final checks, commit and push scoped changes, then deploy and verify.
