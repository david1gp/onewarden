# Shared Presentational DRY Migration

## Goal

Remove repeated vault field presentation and copy-control markup by extracting small, domain-neutral UI primitives, while preserving the distinct web and extension layouts, security boundaries, and runtime behavior.

## Decisions

- Keep synchronized root `ui/` read-only. Add application-owned shared presentation under `src/ui/`, composing existing design-system controls through `#ui/...` imports.
- Keep cipher models, extension login models, permissions, copy identifiers, reveal state, formatting, and browser commands outside shared UI components.
- Do not create a shared cipher/login detail component. The web renders permissioned values, while extension surfaces intentionally expose sensitive values only to copy callbacks.
- Do not create a shared list abstraction. Web cipher fields, extension popup actions, and extension full-window rows have materially different layouts.
- Keep extension popup and full-window presentation local. Their existing use of `ExtensionCopyableField` is the safe shared domain contract; forcing shared JSX would add variants without meaningful reuse.
- Keep edit forms web-owned. The extension has no equivalent editor or write model.
- Keep generator UI surface-specific. Password generation is already shared through `src/shared/crypto/passwordGenerate.ts`.
- Defer generic copy/reveal state helpers until the component migrations demonstrate an identical state contract; current permission, timeout, and copied-key semantics differ.

## Approach

- Introduce one primitive per file under `src/ui/`, composed from existing `#ui` controls:
  - `src/ui/interactive/button/CopyActionButton.tsx` for standard copy/check icon feedback, disabled state, accessible naming, and click handling.
  - `src/ui/static/value/LabeledValueRow.tsx` for a structural label/value/optional-action layout supplied entirely as JSX by the caller.
- Keep sensitive-value decisions at call sites. Neither primitive receives cipher or extension objects, infers permissions, formats values, or decides whether secrets are visible.
- Adopt the primitives incrementally in repeated web cipher-detail markup, preserving special layouts for URIs, addresses, expiration grids, attachments, history, and dialogs.
- Leave extension markup unchanged unless a future design change makes its controls structurally identical to the shared primitives.
- Protect behavior with focused primitive tests, existing cipher tests, browser coverage for reveal/copy flows, and the repository typecheck/lint/build gates.

## Tasks

- [x] **1. Add the generic copy action primitive**
  - Create `src/ui/interactive/button/CopyActionButton.tsx` using the existing `#ui` `ButtonIcon` and copy/check icons.
  - Accept only copied state, disabled state, click callback, visible labels, and accessible-label props.
  - Add focused tests for normal/copied icons and labels, accessible naming, one callback per activation, and disabled behavior.

- [x] **2. Add the generic labeled value layout primitive**
  - Create `src/ui/static/value/LabeledValueRow.tsx` with caller-supplied label, value, optional action, and class props.
  - Provide only structural layout defaults; callers retain typography, truncation, multiline, borders, and spacing.
  - Keep masking, reveal controls, links, badges, multiline behavior, and field formatting in callers.
  - Add focused tests for content order, optional action omission, JSX content, and caller classes.

- [x] **3. Migrate custom-field presentation**
  - Refactor `src/web/ciphers/ui/CipherCustomFieldsView.tsx` to use the new primitives for repeated text-field rows and copy actions.
  - Preserve concealed-field reveal behavior, checkbox badge rendering, non-copyable checkbox behavior, copied-state keys, and final-row spacing.
  - Update or add focused cipher custom-field tests without changing user-visible behavior.

- [x] **4. Migrate login and secure-note detail fields**
  - Refactor the compatible username, password, TOTP, and secure-note blocks in `src/web/ciphers/ui/CipherDetailView.tsx`.
  - Keep URI blocks local because their link and match presentation is specialized.
  - Preserve web permission checks, masks, reveal/reset state, copy keys, labels, and responsive classes.

- [x] **5. Migrate card and identity detail fields**
  - Refactor structurally compatible cardholder, card-number, CVV, full-name, username, email, phone, SSN, passport, and license rows in `src/web/ciphers/ui/CipherDetailView.tsx`.
  - Keep expiration, address, and other specialized grids local.
  - Preserve formatting, permission-controlled reveal behavior, action grouping, copied state, and responsive layout.

- [x] **6. Verify cross-surface behavior and remove superseded markup**
  - Confirm `ExtensionPopupLoginCard.tsx` and `ExtensionFullWindowLoginDetail.tsx` still never render sensitive `ExtensionCopyableField.value` data and retain their existing copy/TOTP behavior.
  - Run the shared UI and cipher unit tests, extension popup/full-window tests, relevant browser reveal/copy tests, `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build`, and `bun run build:extension`.
  - Remove only imports and local markup made obsolete by the migrations; do not broaden the abstraction to absorb specialized rows.
