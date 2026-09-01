# Bitwarden extension sources

## Purpose

This is the primary-source map for tasks 2–18 in
`docs/20260901_extension_feature_parity.md`. The behavioral reference is the
official [`bitwarden/clients`](https://github.com/bitwarden/clients) repository.
Paths below are repository-relative and intentionally point to source areas
rather than copied implementation details.

## Decisions

- Use `libs/common` for the vault contract layers, `apps/browser` for browser
  orchestration and page integration, and `libs/vault` for shared cipher-view
  behavior.
- Use the official web auth sources where registration and two-factor setup are
  shared auth behavior rather than browser-only UI. The browser challenge
  services remain the extension-specific reference.
- Treat model layers as boundaries: API/request/response types describe wire
  contracts, data types describe local representations, domain types own
  behavior, and view types are presentation projections.
- Keep the reference behavioral. OneWarden continues to use its existing Solid,
  MV3, background-worker, crypto, and encrypted-storage architecture.
- Keep decrypted secrets behind background/key-management access. Content
  scripts may collect page metadata and render ephemeral UI, but should not own
  durable vault state.

## Verified source areas

| Area | Primary repository paths | Behavior signal |
| --- | --- | --- |
| Vault model layers | `libs/common/src/vault/models/{api,data,domain,request,response,view}` | Cipher/resource discriminators, wire/local/domain conversions, mutation payloads, server responses, and decrypted presentation projections. |
| Browser application | `apps/browser/src/{auth,autofill,background,key-management,vault}` | Extension entry points, auth state, background message/orchestration ownership, key access, and popup vault flows. |
| Inline autofill UI | `apps/browser/src/autofill/overlay/inline-menu` | Secure field-adjacent button/menu mounting, iframe/page separation, candidate display, and teardown. |
| Autofill notification UI | `apps/browser/src/autofill/notification` | Ephemeral save/update/fill notifications and dismissal behavior. |
| Autofill lifecycle and collection | `apps/browser/src/autofill/services/autofill-lifecycle.service.ts`; `apps/browser/src/autofill/services/collect-autofill-content.service.ts` | Port/frame lifecycle, authenticated monitoring, DOM collection, labels, visibility, targeting rules, mutation handling, shadow DOM, and iframe routing. |
| Autofill insertion | `apps/browser/src/autofill/services/insert-autofill-content.service.ts` | Ordered fill scripts, guarded insecure/untrusted-frame fills, native-like events, checkbox/radio handling, and animation. |
| Autofill dispatch | `apps/browser/src/autofill/background/autofill-orchestrator.ts` | Serialized per-tab/frame dispatch, page-load policy, live-tab and URL guards, activity updates, TOTP copy, and overlay refresh. |
| Browser biometrics | `apps/browser/src/key-management/biometrics/background-browser-biometrics.service.ts`; `apps/browser/src/key-management/biometrics/foreground-browser-biometrics.ts` | Capability/status checks, native messaging or SDK/IPC authentication, background unlock, foreground message bridging, and password fallback boundaries. |
| TOTP | `libs/common/src/vault/services/totp.service.ts` | Expiry-aware TOTP generation and the shared service contract used by vault/autofill flows. |
| Registration | `apps/web/src/app/auth/core/services/registration` | Official registration capability, verification, and registration-finish behavior used when browser UI delegates to shared identity flows. |
| Two-factor | `apps/web/src/app/auth/settings/two-factor`; `apps/browser/src/auth/services/extension-two-factor-auth-component.service.ts`; `apps/browser/src/auth/services/extension-two-factor-auth-webauthn-component.service.ts`; `apps/browser/src/auth/services/extension-two-factor-auth-duo-component.service.ts` | Setup/recovery choices in shared auth plus extension challenge handling for supported methods. |
| Account switching | `apps/browser/src/auth/popup/account-switching` | Account list/current-account state, switch action, active-account coordination, and isolated account activity. |
| FIDO2/WebAuthn | `apps/browser/src/autofill/fido2`; `apps/browser/src/auth/popup/guards/fido2-auth.guard.ts`; `apps/web/src/app/auth/settings/webauthn-login-settings` | Browser page-script/content/background bridge, permission policy, user consent, credential selection, and account WebAuthn settings. |
| Cipher view | `libs/vault/src/cipher-view`; `apps/browser/src/vault/popup/views/popup-cipher.view.ts`; `apps/browser/src/vault/popup/components/vault` | Shared cipher detail/edit presentation and browser popup list/detail/add-edit/delete navigation. |

## Task map

| Plan task | Primary-source paths | Behavior notes to carry into OneWarden |
| --- | --- | --- |
| 2. Models and migration | `libs/common/src/vault/models/{api,data,domain,request,response,view}` | Model all cipher families and shared resources through explicit layers. Preserve type discriminators, IDs, folder/collection relationships, revision timestamps, attachments, and password history through versioned encrypted-cache migration; do not flatten secret-bearing fields into summaries. |
| 3. Background DTOs and CRUD | `apps/browser/src/background`; `libs/common/src/vault/models/{api,request,response,view}` | Make the background the single owner of search/filter state, secure retrieval, sync translation, and create/update/archive/delete commands. Validate message direction and return only the minimum data needed by each view or autofill operation. |
| 4. Secure notes | `libs/common/src/vault/models/{domain,view,api,data,request,response}`; `libs/vault/src/cipher-view`; `apps/browser/src/vault` | Reuse the cipher detail lifecycle for note-specific fields, reveal/copy actions, create/edit/delete, and list summaries without treating notes as login credentials. |
| 5. Cards and identities | `libs/common/src/vault/models/{domain,view,api,data,request,response}`; `libs/vault/src/cipher-view`; `apps/browser/src/vault` | Keep card and identity fields type-specific in detail forms, summaries, and autofill selection. Use the same guarded mutation/detail flow as other cipher types. |
| 6. SSH keys | `libs/common/src/vault/models/{domain,view,api,data,request,response}`; `libs/vault/src/cipher-view`; `apps/browser/src/vault` | Preserve SSH-key-specific wire fields and display/copy semantics; do not route private-key material through generic login autofill. |
| 7. Folders and collections | `libs/common/src/vault/models/{data,domain,request,response,view}`; `apps/browser/src/background`; `apps/browser/src/vault` | Model folder assignment separately from organization collections. Carry organization membership, collection visibility/permissions, filtering, and assignment state into list/detail navigation. |
| 8. Attachments and password history | `libs/common/src/vault/models/{data,domain,request,response,view}`; `libs/vault/src/cipher-view`; `apps/browser/src/vault` | Attach upload/download/delete and history reveal/copy/restore to cipher detail. Keep attachment metadata and history entries typed, encrypted at rest, and gated by the same item access policy. |
| 9. Autofill foundation | `apps/browser/src/autofill`; `apps/browser/src/autofill/services/autofill-lifecycle.service.ts`; `apps/browser/src/autofill/services/collect-autofill-content.service.ts`; `apps/browser/src/autofill/overlay/inline-menu` | Establish persistent content-script monitoring with explicit start/stop lifecycle, per-tab/frame ports, DOM/shadow/iframe discovery, mutation resilience, typed messages, and secure ephemeral inline-menu mounting. |
| 10. Manual/type-specific autofill | `apps/browser/src/autofill/services/collect-autofill-content.service.ts`; `apps/browser/src/autofill/services/insert-autofill-content.service.ts`; `apps/browser/src/autofill/overlay/inline-menu`; `apps/browser/src/autofill/notification`; `apps/browser/src/background`; `libs/common/src/vault/models/view` | Match login, card, and identity candidates by their own field rules. Retrieve secrets only for an authorized fill, fill by stable field identifiers, simulate expected page events, and tear down overlays when the page or account changes. |
| 11. Autofill on page load | `apps/browser/src/autofill/background/autofill-orchestrator.ts`; `apps/browser/src/autofill/services/autofill-lifecycle.service.ts`; `apps/browser/src/autofill/services` | Gate page-load fills on settings, serialize work per tab/frame, revalidate the live tab/frame URL, observe late forms, and prevent duplicate fills while preserving explicit user fills. |
| 12. Credential capture | `apps/browser/src/autofill/services/collect-autofill-content.service.ts`; `apps/browser/src/autofill/services/insert-autofill-content.service.ts`; `apps/browser/src/autofill/notification`; `apps/browser/src/background`; `libs/common/src/vault/models/{request,response,view}` | Detect submitted or changed credentials from collected form state, compare against the matching login, and show dismissible save/update notifications. Keep comparison and mutation in the background; never persist page secrets from the content script. |
| 13. TOTP autofill and capture | `libs/common/src/vault/services/totp.service.ts`; `apps/browser/src/autofill/services`; `apps/browser/src/autofill/overlay/inline-menu`; `apps/browser/src/autofill/notification`; `libs/common/src/vault/models/view` | Detect OTP fields separately from credentials, generate only while the code is valid, fill/copy through the guarded autofill path, and preserve TOTP capture when creating or updating a login. |
| 14. Registration | `apps/web/src/app/auth/core/services/registration`; `apps/browser/src/auth`; `apps/browser/src/background` | Reproduce capability checks, registration completion, verification, and password setup through OneWarden identity endpoints. Browser code should own handoff/session state, not duplicate the shared registration protocol. |
| 15. Challenge-capable login | `apps/browser/src/auth/popup/login`; `apps/browser/src/auth/services`; `apps/web/src/app/auth/settings/two-factor` | Support the extension challenge UI/service boundary, method-specific responses, WebAuthn/Duo/authenticator paths, recovery/new-device verification, cancellation, and retry without treating a failed challenge as a successful login. |
| 16. Multiple accounts | `apps/browser/src/auth/popup/account-switching`; `apps/browser/src/background`; `apps/browser/src/key-management`; `libs/common/src/vault/models` | Keep account state, encrypted stores, active-account pointer, lock/logout, cache refresh, and activity isolated by account. Switching must update background access and page monitors without leaking candidates or decrypted data across accounts. |
| 17. Biometric unlock | `apps/browser/src/key-management/biometrics/background-browser-biometrics.service.ts`; `apps/browser/src/key-management/biometrics/foreground-browser-biometrics.ts`; `apps/browser/src/key-management` | Detect platform/native capability, route foreground requests to the background, validate the returned user key before unlock, support enrollment/revocation and password fallback, and preserve the existing vault-key protection model. |
| 18. Passkey management | `apps/browser/src/autofill/fido2`; `apps/browser/src/auth/popup/guards/fido2-auth.guard.ts`; `apps/web/src/app/auth/settings/webauthn-login-settings`; `libs/common/src/vault/models/{data,domain,view,api,request,response}`; `libs/vault/src/cipher-view` | Distinguish account-login WebAuthn credentials from login-cipher FIDO2 credentials. Preserve encrypted credential data, user consent, RP/user-handle matching, registration/assertion compatibility, credential inventory/detail, rename/delete mutations, and safe counter behavior. |

## Implementation boundary

The source map identifies behavior to port, not files to import. Tasks 2–18
should adapt these behaviors to OneWarden's existing contracts and UI
components, with background/key-management access remaining the security
boundary and `#ui/...` components remaining the presentation boundary.
