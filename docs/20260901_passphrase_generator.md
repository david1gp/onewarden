# Passphrase generator

## Goal

Add a Bitwarden-style passphrase generator to the extension generator pane, make it the default mode, and keep the existing password generator available through a type switch.

## Decisions

- Label the new mode “Passphrase,” matching Bitwarden’s extension terminology.
- Default to passphrase mode with 3 words, `-` as the separator, and number inclusion enabled.
- Use cryptographically secure selection from the EFF long word list and add exactly one digit to one randomly selected word when number inclusion is enabled.
- Support 3–20 words and a zero-or-one-character separator, matching Bitwarden constraints.
- Keep generator settings local to the pane, as the existing password settings are; persistence is out of scope.
- Reuse components from `#ui` and preserve existing copy, reveal, and regenerate behavior for both modes.

## Approach

- Add shared passphrase generation logic and its word-list data beside the existing password generator.
- Extend generator pane state with a password/passphrase mode and mode-specific options.
- Add a type switch and conditional passphrase/password controls to the existing pane.
- Cover generation behavior, defaults, switching, and controls with focused unit tests, then verify the rendered extension flow.

## Tasks

- [x] 1. Add and test the shared passphrase generator.
- [x] 2. Extend generator state and UI with default passphrase mode and a type switch.
- [x] 3. Add/update generator pane tests and run focused/type/lint verification.
- [x] 4. Verify the generator interactively in the browser and fix any UI regressions.
