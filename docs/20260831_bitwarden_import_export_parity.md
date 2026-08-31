# Bitwarden Import/Export Parity

## Goal

Provide user-facing vault import and export behavior compatible with current Bitwarden/Vaultwarden formats, covering folders and all cipher types supported by Onewarden, with validated input, safe persistence, and actionable errors.

## Decisions

- Treat Bitwarden/Vaultwarden wire formats as the compatibility contract rather than preserving Onewarden-specific interchange formats.
- Keep import additive; do not replace existing vault data.
- Support individual-vault decrypted JSON and CSV plus portable password-protected encrypted JSON. Account-restricted encrypted exports remain account-bound where compatibility requires it.
- Include folders, login, secure note, card, identity, custom fields, URI matching, TOTP, favorites, reprompt, timestamps, and password history when represented by the reference format.
- Match Bitwarden JSON/CSV exclusions: individual exports omit organization-owned and trashed items; CSV is explicitly lossy and supports login and secure-note records only.
- Exclude attachment ZIP and organization collection interchange from this increment because they are separate reference export/import flows; do not claim binaries are present in JSON/CSV.
- Use current Bitwarden field values: cipher types 1–4 supported by Onewarden, URI match 0–5, field types 0–3, and reprompt 0–1. Reject unsupported newer cipher types explicitly.
- Match the password-protected envelope (`passwordProtected`, salt, KDF parameters, key validation, and authenticated `data` cipher string) with PBKDF2 and Argon2id input compatibility.
- Reuse existing dependencies and `#ui/...` components.

## Approach

- Audit the existing implementation against Bitwarden/Vaultwarden schemas and behavior, then lock the compatibility contract with sanitized fixtures.
- Isolate format parsing/formatting and encryption behind validated adapters returning explicit results.
- Route normalized imports through one transactional server path with ownership and folder mapping enforced.
- Expose compatible format choices and concise validation/import summaries in Settings.
- Verify unit, integration, and browser behavior incrementally.

## Tasks

- [x] 1. Document the exact reference formats, field mappings, encryption envelopes, and current implementation gaps with fixtures/test cases. Current context: JSON validation is bypassed, CSV fields are dropped, and existing encrypted export is an incompatible internal wrapper; official contract and target fixtures are now identified.
- [x] 2. Implement and test validated decrypted Bitwarden JSON import/export for supported cipher types and folders. Current context: types 1–4 and folder relationships are validated; supported URI, field, reprompt, favorite, archive, timestamp/export, FIDO2, and password-history data are covered. Imported records receive local creation/revision timestamps.
- [x] 3. Implement and test Bitwarden CSV import/export compatibility and documented lossy-field behavior. Login and secure-note records use the documented strict header/types; CSV quoting, favorite, reprompt, one-URI, login credentials/TOTP, and lossy custom fields are covered.
- [x] 4. Implement and test portable password-protected encrypted JSON import/export compatibility.
- [x] 5. Harden the server import transaction, ownership checks, folder mapping, invalid-payload handling, and import result reporting.
- [x] 6. Update the Settings import/export UI for compatible format choices, password flow, warnings, and result/error feedback. Current context: import offers Bitwarden JSON/CSV with a distinct file password separated from the master password; export offers unencrypted JSON, unencrypted CSV, and password-protected JSON with password confirmation. Additive-import explanation, plaintext/CSV-loss warnings, disabled/busy states, file read and download failures, inline validation errors, and structured imported item/folder/warning counts are covered.
- [ ] 7. Add end-to-end compatibility fixtures and browser verification for representative import/export flows.
