# Extension feature parity

## Goal

Bring the OneWarden browser extension to practical Bitwarden parity for synchronized vault item types, organization UI, autofill and capture, TOTP capture, and biometric unlock while preserving encrypted local storage.

## Decisions

- Use the official `bitwarden/clients` browser extension as the behavioral reference, but implement against OneWarden's existing Solid, MV3, API, crypto, and storage architecture.
- Keep the task-by-task upstream source map in `docs/20260901_bitwarden_extension_sources.md`.
- Reuse existing dependencies and `#ui/...` components; follow the repository TypeScript/TSX style and keep view-only `.tsx` files.
- Broaden the encrypted extension cache to typed cipher/resource unions with a versioned migration; keep autofill matching type-specific and do not expose decrypted secrets in list summaries.
- Keep the background service worker responsible for authentication, sync, mutations, policy, secure data access, and browser messaging; persistent content scripts own DOM observation and ephemeral page UI only.
- Implement biometric unlock through a browser/platform-authenticator adapter with capability detection, enrollment, revocation, recovery, and password fallback; do not weaken the existing vault-key protection model or persist plaintext vault keys.
- Run quick focused checks after each increment. Run the full browser/e2e suites only after all implementation tasks, against the user's systemd-managed server at `127.0.0.1:3041`; never start a separate dev server or add Playwright `webServer` startup.

## Approach

- Preserve the completed typed sync/storage, vault UI, autofill, credential-capture, and TOTP work and close focused regressions found by verification.
- Add biometric capability detection and secure key wrapping first, then enrollment/revocation, unlock integration, settings, and locked-vault UI.
- Finish with static checks, packaged-extension build, browser coverage, and the complete end-to-end suite, fixing regressions before completion.

## Tasks

- [x] 1. Compare and document the exact official Bitwarden behavior/source paths needed by each implementation increment.
- [x] 2. Add versioned encrypted sync/storage models for secure notes, cards, identities, SSH keys, attachments, password history, folders, and collections, with backward-compatible migration and tests.
- [x] 3. Add extension background DTOs, search/filtering, and CRUD mutation commands for all synchronized cipher types and shared resources.
- [x] 4. Add full-window vault taxonomy, navigation, list/detail, and create/edit/delete flows for secure notes.
- [x] 5. Add full-window list/detail and create/edit/delete flows for cards and identities.
- [x] 6. Complete SSH-key wire parity and add full-window SSH-key list/detail and create/edit/delete flows.
- [x] 7. Add folder and collection navigation, filtering, assignment, permission indicators, and organization context.
- [x] 8. Add attachment list/upload/download/delete flows and password-history reveal/copy/restore UI to cipher details.
- [x] 9. Add a persistent MV3 autofill content-script foundation, typed message contracts, resilient field discovery/classification, SPA/iframe lifecycle handling, and secure inline-menu mounting.
- [x] 10. Add login, card, and identity inline/manual autofill with matching, guarded secret retrieval, teardown, and focused DOM tests.
- [x] 11. Add autofill-on-page-load policy, settings UI, candidate rules, late-form observation, and duplicate-fill prevention.
- [x] 12. Add save/update-login detection for submitted and changed credentials, comparison logic, dismissal policy, and secure save/update prompts.
- [x] 13. Add TOTP field detection and inline filling plus TOTP capture into login create/update flows, with expiry-safe generation and tests.
- [x] 14. Audit the requested feature list against the implementation and official-source map; confirm all requested non-biometric increments are present with focused coverage.
- [x] 15. Add biometric capability detection and secure wrapped-key enrollment/revocation primitives with focused tests.
- [x] 16. Integrate biometric unlock and password fallback into background/session flows with focused tests.
- [x] 17. Add biometric settings and locked-vault UI using shared `#ui` components with focused tests.
- [x] 18. Resolve focused unit/integration, typecheck, lint, format, and extension-build failures without disturbing unrelated user changes.
- [x] 19. Build the packaged extension, then run browser and end-to-end tests last against the existing user systemd-managed server without starting another server; fix all failures.
