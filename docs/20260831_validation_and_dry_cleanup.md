# Validation and DRY cleanup

## Goal

Validate untrusted runtime inputs with Valibot, derive static types from their owning schemas, derive database row/insert types from Drizzle schemas, and remove repeated transport and view-state code without obscuring domain behavior.

## Decisions

- Valibot schemas own external, serialized JSON, storage, form, URL, token-claim, and API wire contracts; validated application types use `v.InferOutput`, while pre-transform caller types use `v.InferInput` only when needed.
- Database access currently uses raw `bun:sqlite` and SQL migrations; no Drizzle dependency or table schemas exist. Keep query projection and row types explicit rather than introducing an ORM migration as incidental cleanup.
- If Drizzle table schemas are introduced separately, they should own shape-identical row and insert types through `$inferSelect` and `$inferInsert`. Those inferred types would not runtime-validate JSON columns, which still require focused Valibot schemas when read.
- Validate each untrusted value once at its boundary and pass the validated output inward. Do not add redundant validation to trusted internal calls.
- Reuse existing `Result`, request-validation, and API-client conventions. Reuse existing package dependencies and do not introduce another validation library.
- Share transport mechanics and narrow pure mappings, but keep endpoint declarations and materially different domain branches explicit.

## Approach

- Introduce small shared helpers first, then migrate one bounded client or context at a time.
- Preserve current public behavior and error contracts while replacing casts with schema parsing.
- Colocate schemas with the boundary that owns the representation; move a schema to `shared` only when multiple runtimes consume the identical wire contract.
- Keep each increment independently type-checkable and testable.

## Tasks

- [x] 1. Add shared schema-aware web API response parsing and authenticated header helpers, then migrate the currently validated admin, sends, settings, and emergency-access transport boilerplate without changing endpoint behavior.
- [x] 2. Add response schemas and boundary validation to the organization API client, covering every consumed response envelope and replacing unchecked JSON casts.
- [x] 3. Complete authentication and session-handoff response validation, including decoded token claims and special two-factor response handling.
- [x] 4. Add focused Valibot schemas for security-sensitive two-factor JSON persisted in database columns and validate immediately after deserialization.
- [x] 5. Audit database row and insert types for Drizzle inference; retain existing types because the repository has no Drizzle dependency/table schemas and uses raw `bun:sqlite`, avoiding an out-of-scope ORM migration.
- [x] 6. Validate raw admin form and attachment multipart inputs with focused schemas plus explicit file constraints.
- [x] 7. Convert web-auth request interfaces and repeated inline two-factor payload types to named Valibot schemas with correctly distinguished input and output types.
- [x] 8. Validate remaining decoded runtime inputs identified by the audit, including relevant URL/query state and extension sync payloads, at their immediate trust boundaries.
- [x] 9. Deduplicate popup/full-window status derivation, remove non-semantic extension type aliases, and extract only narrow shared cipher mapping helpers.
- [x] 10. Run repository-wide type checking and tests, search for remaining unsafe runtime casts/JSON deserialization at external boundaries, and fix only regressions or uncovered instances within this scope.
