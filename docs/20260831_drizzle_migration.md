# Drizzle migration

## Goal

Replace application-level raw `bun:sqlite` query calls with Drizzle ORM over Bun SQLite, define the complete schema in TypeScript, and infer persisted row/insert types from Drizzle while preserving database files, migrations, transactions, backups, and API behavior.

## Decisions

- Use `drizzle-orm/bun-sqlite`; keep Bun's SQLite driver only as Drizzle's required transport and for lifecycle, backup, migration, PRAGMA, and integrity operations that Drizzle does not simplify.
- Keep the existing SQL migrations and `schema_version` upgrade path authoritative so deployed databases remain compatible.
- Model all existing tables, columns, foreign keys, indexes, defaults, and constraints in Drizzle schema modules.
- Derive persistence types from each table's `$inferSelect` and `$inferInsert`; retain explicit domain/API types where they represent validated or transformed data rather than database rows.
- Migrate by bounded context and preserve the existing `Result`-based error and transaction behavior.
- Reuse installed libraries and project conventions; do not introduce another database abstraction.

## Approach

- Add and initialize Drizzle around the existing Bun SQLite connection.
- Establish schema parity against the SQL migrations before replacing queries.
- Convert raw query/get/all/run calls to Drizzle query builder operations, using Drizzle `sql` only for SQLite-specific expressions or operations.
- Update tests with each bounded migration and finish with complete type, unit, integration, compatibility, and backup/restore verification.

## Tasks

- [x] 1. Add Drizzle dependencies and typed Bun SQLite connection lifecycle while preserving migration, transaction, and backup behavior.
- [x] 2. Define the complete Drizzle schema and inferred persistence types with parity tests against the migrated SQLite schema.
- [x] 3. Migrate identity, session handoff, and two-factor database operations to Drizzle.
- [x] 4. Migrate folders, ciphers, attachments, and sync database operations to Drizzle.
- [x] 5. Migrate organizations, admin, events, notifications, and web database operations to Drizzle.
- [x] 6. Migrate sends and emergency-access database operations to Drizzle.
- [x] 7. Migrate backup/restore application queries and isolate unavoidable raw SQLite maintenance operations.
- [x] 8. Remove superseded row/projection declarations, infer persistence types from the schema, and verify no application-level raw SQLite CRUD remains.
- [x] 9. Run and fix the full check, unit, integration, compatibility, and backup/restore suites.
