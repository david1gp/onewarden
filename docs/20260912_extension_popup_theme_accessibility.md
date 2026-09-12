# Extension popup theme and accessibility

## Goal

Make the web extension popup readable and accessible in light and dark modes, add an explicit persisted theme toggle, and correct nearby interaction and layout defects without expanding extension scope.

## Decisions

- Reuse existing `#ui` components and theme infrastructure before adding new UI.
- Persist the explicit popup theme in extension-local storage and apply it before the popup renders to avoid an incorrect-color flash.
- Use semantic theme tokens instead of popup-specific hard-coded slate colors.
- Keep the popup compact while bounding result-list growth with scrolling.
- Treat navigation as tabs with accurate selected state, keyboard/accessibility semantics, and visible focus.

## Approach

- First establish the persisted theme state and early theme application.
- Then update popup presentation and semantics around that stable theme behavior.
- Finally add focused coverage and verify the built extension in a browser at popup dimensions.
- Current context: browser inspection passes in both themes, persistence and keyboard flow work, axe reports zero violations, and final focused tests, typecheck, lint, format, diff checks, and production extension build pass. Repository-wide checks include unrelated baseline failures.

## Tasks

- [x] 1. Implement explicit persisted light/dark theme state for the extension popup, reuse the shared theme control where compatible, and cover storage/initialization behavior.
- [x] 2. Refine popup colors, contrast, navigation semantics, focus states, form metadata, announcements, width/overflow behavior, and other directly related accessibility defects; extend component tests.
- [x] 3. Run static/unit/build verification, inspect the built popup in light and dark themes with browser automation, and make only fixes required by that verification.
