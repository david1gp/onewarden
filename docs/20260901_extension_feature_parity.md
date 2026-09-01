# Extension feature parity

## Goal

Bring the OneWarden browser extension to practical Bitwarden feature parity for vault item types, organization, autofill and capture, authentication, biometric unlock, and passkey management while preserving encrypted local storage and current passkey behavior.

## Decisions

- Use the official `bitwarden/clients` browser extension as the behavioral reference, but implement against OneWarden's existing Solid, MV3, API, crypto, and storage architecture.
- Keep the task-by-task upstream source map in `docs/20260901_bitwarden_extension_sources.md`.
- Reuse existing dependencies and `#ui/...` components; follow the repository TypeScript/TSX style and keep view-only `.tsx` files.
- Broaden the encrypted extension cache to typed cipher/resource unions with a versioned migration; keep autofill matching type-specific and do not expose decrypted secrets in list summaries.
- Keep the background service worker responsible for authentication, sync, mutations, policy, secure data access, and browser messaging; persistent content scripts own DOM observation and ephemeral page UI only.
- Implement account data as isolated per-account encrypted stores with one active-account pointer.
- Implement biometric unlock through a browser/platform-authenticator adapter with capability detection, enrollment, recovery, and password fallback; do not weaken the existing vault-key protection model.
- Run quick focused checks after each increment. Run the full browser/e2e suites only after all implementation tasks, against the user's systemd-managed server at `127.0.0.1:3041`; never start a separate dev server or add Playwright `webServer` startup.

## Approach

- First establish typed sync/storage parity and mutations for every cipher/resource needed by UI and browser integrations.
- Add vault browsing and management one item family at a time, then layer folders, collections, attachments, and history onto shared item detail flows.
- Build one persistent autofill content-script foundation, then add field classification, inline selection, automatic fill, credential capture, and TOTP behavior incrementally.
- Extend authentication in the order challenge-capable login, registration, multi-account isolation/switching, then biometric enrollment/unlock.
- Add general passkey inventory and management on top of the existing interception, registration, assertion, and consent implementation.
- Finish with packaged-extension browser coverage and the complete end-to-end suite, fixing every regression before completion.

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
- [x] 14. Add extension account registration and verification/password-setup flows using existing identity endpoints.
- [ ] 15. Add challenge-capable extension login for supported 2FA methods, recovery paths, and focused auth tests.
- [ ] 16. Add isolated multi-account storage, active-account switching, add/remove account controls, and per-account lock/logout behavior.
- [ ] 17. Add biometric capability detection, enrollment/revocation, wrapped-key unlock, password fallback, settings, and locked-vault UI.
- [ ] 18. Add general passkey-management inventory, per-login credential detail, rename/delete actions, registration entry points, and compatibility tests.
- [ ] 19. Add/update focused unit and integration coverage for all feature increments and resolve typecheck, lint, format, and extension-build failures.
- [ ] 20. Build the packaged extension, run browser and end-to-end tests last against the existing systemd-managed server without starting another server, and fix all failures.
