# Extension-wide color and theme fixes

## Goal

Make every extension page and component consistently readable, keyboard-visible, and color-accessible in persisted light and dark themes, including production popup, full-window, passkey-consent, authentication, feature panes, and demo previews.

## Decisions

- Use the existing persisted extension theme preference across every standalone extension document.
- Define the missing semantic color contract and document surfaces in extension-owned styles.
- Keep synced `ui/` sources unchanged; fix extension usage through tokens, extension-local styling, props, or thin extension-owned wrappers.
- Require WCAG AA text contrast, visible focus, identifiable control boundaries, and clearly distinct disabled/selected states.
- Preserve behavior and layout except where a color-state fix requires a semantic or accessibility correction.
- Use existing package dependencies and `#ui` components; add no replacement design system.

## Approach

- Establish shared theme bootstrap and semantic tokens before changing individual surfaces.
- Fix repeated primitive states through extension-owned integration styles, then remove page-local conflicts.
- Validate production documents first and align demo previews last.
- Current context: all production and demo extension surfaces use persisted/scoped themes and semantic colors; final full-page and targeted axe runs report zero violations in every light/dark host and preview combination.

## Tasks

- [x] 1. Generalize the persisted theme bootstrap and initialize it before popup, full-window, and passkey-consent mounts; add focused tests.
- [x] 2. Add complete extension-owned light/dark semantic tokens and base document surfaces so imported UI focus, input, foreground, border, and placeholder utilities compile and render correctly.
- [x] 3. Correct extension primary/selected button contrast and hover/focus/disabled states without editing synced `ui/` sources; verify representative auth, popup, full-window, and passkey controls.
- [x] 4. Correct keyboard focus, selection, and disabled/loading presentation for extension uses of checkbox, credential selector, switches, icon buttons, inputs, textareas, and native selects.
- [x] 5. Normalize extension card, separator, badge, input, and required boundary colors across light/dark themes.
- [x] 6. Fix remaining page-local issues across popup, auth, passkey consent, full-window shell/navigation, and every full-window feature pane, including selected-state mismatches and dark low-contrast text.
- [x] 7. Align extension demo previews with production theme isolation and colors, then run focused tests, typecheck, lint/format, production builds, and browser/axe verification across all extension pages in both themes.
