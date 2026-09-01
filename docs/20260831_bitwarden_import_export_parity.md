# Bitwarden Import/Export Parity

## Goal

Provide user-facing vault import and export behavior compatible with current Bitwarden/Vaultwarden formats, covering folders and all cipher types supported by Onewarden, with validated input, safe persistence, and actionable errors.

## Decisions

- Treat Bitwarden/Vaultwarden wire formats as the compatibility contract rather than preserving Onewarden-specific interchange formats.
- Keep import additive; do not replace existing vault data.
- Support individual and organization decrypted JSON/CSV, portable password-protected encrypted JSON, same-account restricted encrypted JSON, and individual attachment ZIP export.
- Include folders, login, secure note, card, identity, custom fields, URI matching, TOTP, favorites, reprompt, timestamps, and password history when represented by the reference format.
- Match Bitwarden JSON/CSV exclusions: individual exports omit organization-owned and trashed items; CSV is explicitly lossy and supports login and secure-note records only.
- Keep attachment binaries out of JSON/CSV; carry plaintext attachment bytes only in the compatible individual-vault ZIP export. Do not add ZIP import because Bitwarden/Vaultwarden do not support importing their attachment ZIP exports.
- Preserve organization collection relationships and enforce organization membership/management permissions during organization interchange.
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

- [x] 1. Document the exact reference formats, field mappings, encryption envelopes, and compatibility fixtures/test cases.
- [x] 2. Implement and test validated decrypted Bitwarden JSON import/export for supported cipher types and folders. Current context: types 1–4, discriminated payloads, folder relationships, timestamps, empty values, FIDO2 counters, URI/field metadata, reprompt, favorites, archive state, and password history are validated or preserved according to the local model. Imported records receive local creation/revision timestamps.
- [x] 3. Implement and test Bitwarden CSV import/export compatibility and documented lossy-field behavior. Login and secure-note records use the documented strict header/types; CSV quoting, favorite, reprompt, one-URI, login credentials/TOTP, and lossy custom fields are covered.
- [x] 4. Implement and test portable password-protected encrypted JSON import/export compatibility. Current context: exports use PBKDF2 with the current Bitwarden iteration default; imports accept bounded PBKDF2/Argon2id envelopes, distinguish file and master passwords, authenticate ciphertext, and reject account-restricted wrappers.
- [x] 5. Harden the server import transaction, ownership checks, folder mapping, invalid-payload handling, and import result reporting. Current context: malformed relationships and unauthorized ownership fail atomically; successful additive imports return structured item, folder, and warning counts.
- [x] 6. Update the Settings import/export UI for compatible format choices, password flow, warnings, and result/error feedback. Current context: import offers Bitwarden JSON/CSV with a distinct file password separated from the master password; export offers unencrypted JSON, unencrypted CSV, and password-protected JSON with password confirmation. Additive-import explanation, plaintext/CSV-loss warnings, disabled/busy states, file read and download failures, inline validation errors, and structured imported item/folder/warning counts are covered.
- [x] 7. Add end-to-end compatibility fixtures and browser verification for representative import/export flows. Current context: adapter-to-server/database tests cover additive JSON import and decrypted/CSV/portable export round trips, including vaults with omitted attachment binaries; browser checks cover format selection, warnings, password confirmation, validation, counts, and downloads.
- [x] 8. Implement and test organization JSON/CSV import/export with collection mapping and permission enforcement. Current context: organization JSON/CSV adapters remap cross-organization source collection IDs to additive destination collections, preserve same-organization UUID mapping when present, remap source organization IDs to the selected organization, preserve collection relationships and supported cipher data, enforce admin export/member import and writable-collection permissions transactionally, export active organization items only, reject trashed JSON items, and assign imported records local timestamps. Focused unit, route-integration, and CSV compatibility coverage is complete.
- [x] 9. Implement and test same-account restricted encrypted JSON import/export with Bitwarden key-validation marker binding. Current context: strict account-envelope schema preserves the compatible wire format; export validates every retained encrypted field, filters organization/trash/per-item-key/collection data, and import authenticates/decrypts before additive persistence. Master-password unlock remains separate from file passwords, failures do not call import, and derived keys/temporary plaintext are cleared on completion or failure.
- [x] 10. Implement and test individual-vault attachment ZIP export without serializing attachment IDs, keys, or signed URLs. Current context: authenticated metadata/raw-byte routes, AES-CBC-HMAC decryption, cleanup, filtering/skips, collision-safe Bitwarden naming, ZIP32 validation, binary responses, and exact decrypted `data.json` parity are covered; ZIP import is not a reference-supported flow.
- [x] 11. Expose the additional compatible flows in Settings and complete integration/browser verification. Current context: Settings separates personal and organization scopes, explicit organization selection, portable and same-account encrypted JSON, organization JSON/CSV, and binary ZIP export; passwords, warnings, downloads, summaries, active-tab errors, and temporary key cleanup are covered. Current-source browser verification passed representative personal/organization import-export flows and ZIP attachment archive inspection.
