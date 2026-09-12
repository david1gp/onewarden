# Extension Window Productivity

## Goal

Make the extension faster and more space-efficient by adding a theme switcher when opening the full-window tab, using wide-screen space better, compacting the full-window header/navigation, and exposing password and passphrase generation directly in the popup.

## Decisions

- Reuse the existing extension theme storage and `#ui` components.
- Keep the existing full-window routes/state and generator preference model.
- Treat “paraphrases” as the existing passphrase generator mode.
- Preserve a compact popup footprint while making generation available without opening the full window.
- Use responsive full-window layouts that add useful content width rather than decorative empty space.
- Keep styling visually consistent across popup and full-window views.

## Approach

- Refactor the full-window shell so branding, primary navigation, theme control, and relevant actions share a compact responsive header.
- Increase the usable content width and adjust pane/grid sizing for wide screens without harming narrow layouts.
- Add a popup generator surface backed by the existing generator state/preferences and generation utilities.
- Verify both themes, responsive sizes, generator behavior, builds, and browser-visible flows.

## Tasks

- [x] 1. Implement the compact, responsive full-window shell, improve wide-screen space use, and add the theme switcher.
- [x] 2. Add password/passphrase generation to the popup using existing generator behavior and UI components.
- [x] 3. Add or update focused automated coverage for the changed shell, theme, and popup generator flows.
- [x] 4. Run code-quality/build checks and browser verification in both popup and full-window views.
- [x] 5. Create conventional commits, push them, and deploy the application.
