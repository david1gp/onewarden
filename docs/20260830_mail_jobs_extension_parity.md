# Mail, scheduled jobs, and extension parity

## Goal

Complete the identified production gaps by adding real outbound mail and Send recipient verification, reliable in-process maintenance jobs, and a Chrome MV3 extension that can use all login information—including TOTP and website passkeys—while delegating normal cipher creation and editing to `https://onewarden.contentoren.de` through a secure session handoff.

## Decisions

- Use `/home/david/opensource/vaultwarden` as the read-only reference for routes, payloads, authentication behavior, scheduled-job semantics, Send verification, and compatibility tests. Do not copy or compile its Rust implementation.
- Use `/home/david/opensource/bw` as a read-only checkout of Bitwarden's official `bitwarden/clients` monorepo. Use `apps/browser` for extension entrypoints, MV3 manifests, autofill, popup/popout behavior, and browser FIDO2 bridging; use `libs/common` and related crypto/SDK libraries for vault models, Argon2/key derivation, organization and cipher-key handling, TOTP, encrypted FIDO2 credential storage, authenticator primitives, and shared tests. Its add/edit flow remains extension-local, so OneWarden's server-backed web handoff is a new design rather than behavior to port. Reimplement the required behavior within OneWarden's architecture rather than importing the application wholesale.
- Use `/home/david/leo/contentoren-server/mailcow` as the read-only reference for Mailcow SMTP/IMAP configuration and local delivery E2E setup. Never copy credentials or other secrets from it into OneWarden.
- Send production mail as `auth@contentoren.de` through `email.contentoren.de:587` with STARTTLS and certificate verification.
- Keep SMTP and IMAP credentials in environment variables only. Never copy Mailcow secrets into this repository or logs.
- Build all email links from `https://onewarden.contentoren.de`.
- Preserve the in-memory mail adapter for deterministic tests; production uses an SMTP adapter when mail is enabled.
- Implement every existing mail-adapter flow and Bitwarden-compatible Send recipient email verification/OTP access.
- Add an opt-in real-mail E2E test that sends through Mailcow and verifies local IMAP receipt at `e2e-customer@contentoren.de`.
- Run application jobs in the Bun server. Configuration is environment-only, intervals are independent, and `0` disables a job.
- Enabled jobs run immediately, use recursive timers, never overlap, and drain during graceful shutdown.
- Schedule existing maintenance plus trash and incomplete-SSO cleanup. Do not create a fake Duo cleanup job while Duo remains stateless; add it only if durable Duo contexts are introduced.
- Current Duo authentication is stateless: no durable Duo context exists in the database, so there is no Duo context to purge.
- Extension scope is Chrome MV3 and login ciphers: personal and organization items, wrapped user keys, Argon2id, cipher-specific keys, all URIs, username, password, notes, duplicate custom fields, TOTP generation/copy, and encrypted FIDO2 credentials.
- The extension acts as a software WebAuthn authenticator for relying-party websites: it handles passkey registration and authentication with explicit user confirmation.
- Never install the passkey interception bridge on `onewarden.contentoren.de`; account WebAuthn/2FA there must continue to use the browser-native implementation.
- Normal add/edit actions open the OneWarden web app. A server-backed, short-lived, single-use exchange token establishes a web session without placing access tokens, refresh tokens, or decrypted vault keys in the URL.
- Use existing libraries first. Expected additions are a maintained SMTP client, an IMAP client limited to E2E tests, a browser-compatible Argon2id implementation, and a public-suffix/RP-ID validation library. Passkey CBOR/COSE encoding stays small and local unless verification proves a library is necessary.
- Follow repository code style: one export per file, subject-first names, `Result` at failure boundaries, view-only TSX, and `#ui/...` components.

## Approach

- Extend existing dependency-injected boundaries instead of replacing them: `IdentityMailAdapter`, server startup/shutdown, cipher crypto/session services, and extension background routing.
- Lock protocol and security behavior with unit/compatibility tests before wiring external I/O.
- Store only durable server state that must survive restart: Send recipient OTP state and session handoffs. Passkeys remain encrypted inside compatible cipher `login.fido2Credentials` data.
- Keep secrets and decrypted vault material in the narrowest runtime boundary. SMTP credentials stay server-only; passkey private keys, TOTP seeds, organization keys, and user keys stay in the extension background vault session.
- Derive passkey request origin/frame from Chrome's trusted `MessageSender`, validate RP IDs against the public-suffix list, require HTTPS except localhost development, and fail closed on unsupported algorithms or policies.
- Verify each increment with focused tests, then run the full unit, integration, compatibility, browser, build, and opt-in Mailcow suites.

## Tasks

- [x] **1. Define and validate production mail configuration.** Add env-only SMTP settings, public origin validation, redacted error handling, `.env.example` documentation, and tests. Keep the recording adapter for tests and add a disabled production adapter that retains no tokens.
- [x] **2. Render every existing mail flow.** Introduce typed mail envelopes and escaped text/HTML rendering for registration, welcome, verification/change/delete, password hint/reset, email 2FA, organization, emergency-access, admin SMTP-test, and Send OTP messages. Generate all links with `URL` from the configured public origin.
- [x] **3. Implement and wire the SMTP adapter.** Send all envelopes through STARTTLS on port 587, enforce bounded timeouts and certificate checks, report safe `Result` failures, make `/admin/test/smtp` use the same transport, and close the transport during shutdown.
- [ ] **4. Implement Send recipient verification.** Add recipient and hashed OTP persistence, normalization/deduplication, expiry, resend and attempt limits, atomic consumption, rate limiting, mail delivery, compatible `send_access` token behavior/errors, cleanup on Send update/delete, and web/API tests. Never expose recipients or plaintext OTPs in public responses or logs.
- [ ] **5. Add opt-in Mailcow E2E coverage.** Exercise a real registration verification message and Send recipient OTP through OneWarden, poll local IMAP for uniquely tagged messages, consume the resulting link/code, clean up only test-owned messages, and skip unless explicit E2E environment variables are present.
- [x] **6. Add a reusable Bun job runner and env configuration.** Implement immediate recursive scheduling, per-job intervals, `0` disable semantics, no-overlap guards, safe logging, failure recovery, stop/drain lifecycle, and fake-timer tests.
- [x] **7. Move current jobs into the runner.** Register Send purge, auth-request purge, event purge, emergency-access timeout/reminders, and incomplete-2FA notifications without changing their domain behavior; remove direct interval ownership from `serverStart.ts`.
- [x] **8. Add missing meaningful maintenance.** Implement bounded, idempotent trash purge with attachment/revision handling and incomplete-SSO-state purge with required indexes. Register both jobs and test expiry boundaries and partial-failure behavior. Document that current stateless Duo has no persisted context to purge.
- [ ] **9. Generalize extension login schemas and key unlock.** Preserve unknown compatible fields, add Argon2id derivation with bounded parameters, support encrypted/wrapped user-key aliases, and add known-answer/fixture tests without exposing key material.
- [ ] **10. Support organization and cipher-specific keys.** Decrypt confirmed organization keys, resolve personal/organization/cipher keys correctly, include authorized organization login ciphers in sync, honor edit/view-password permissions, and cover real encrypted fixtures.
- [ ] **11. Expose every copyable login field.** Add indexed copy actions for every URI and custom field, plus username, password, notes, and other saved login values; preserve duplicate/unnamed fields and never render sensitive plaintext unnecessarily.
- [ ] **12. Add TOTP generation.** Move browser-neutral Base32/TOTP primitives into shared code, support raw seeds and `otpauth://` URIs with SHA-1/SHA-256/SHA-512, configured digits/period, rollover-safe generation, and background-only seed handling. Expose only generated-code copy actions.
- [ ] **13. Preserve and encrypt FIDO2 credential data.** Add compatible `login.fido2Credentials` schemas and per-field encryption/decryption, ensure server create/update/sync round-trips values without loss, and ensure web editing preserves credentials before enabling passkey registration.
- [ ] **14. Implement secure extension-to-web session handoff.** Add durable hashed handoffs with 30–60 second expiry, operation/cipher/user/device binding, atomic single use, cleanup, authenticated create/consume routes, fragment-based delivery, local user-key transfer encryption, replay tests, and web routing to create/edit pages.
- [ ] **15. Replace extension add/edit forms with web handoff actions.** Pre-fill the current site URL for creation, open the configured OneWarden origin, consume the handoff into a normal encrypted web session, and navigate directly to the requested create/edit page. Retain extension-side mutation only where passkey registration requires it.
- [ ] **16. Implement passkey authenticator primitives.** Support ES256/P-256 registration and authentication, Bitwarden-compatible encrypted credential storage, `none` attestation, COSE/CBOR encoding, authenticator data, DER signatures, RP/user-handle matching, discoverable credentials, explicit consent, and safe sign-counter behavior. Validate generated responses with the existing independent WebAuthn server verifier.
- [ ] **17. Add the secure page/content/background WebAuthn bridge.** Intercept supported `navigator.credentials.create/get` calls on eligible relying-party pages, derive origin/frame from Chrome, validate RP ID and frame policy, preserve native fallback where appropriate, handle timeout/abort semantics, exclude OneWarden itself, and never expose vault APIs or private keys to page scripts.
- [ ] **18. Add passkey consent and verification UI.** Build extension-owned credential selection/confirmation using `#ui` components, require a fresh unlock/verification when user verification is required, and cover cancellation, locked-vault, read-only organization, and conflicting update cases.
- [ ] **19. Verify complete behavior.** Run formatting, lint, typecheck, unit/integration/compatibility suites, browser tests, route-manifest freshness, extension build, real loaded-extension registration/authentication against a controlled HTTPS RP, handoff replay checks, and the opt-in local Mailcow SMTP/IMAP suite.
