import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseMigrate } from "../../../src/server/database/databaseMigrate.js"
import { databaseOpen } from "../../../src/server/database/databaseOpen.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { databaseTransaction } from "../../../src/server/database/databaseTransaction.js"

const temporaryDirectories: string[] = []

function databaseTestDirectoryCreate(): string {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-database-"))
  temporaryDirectories.push(directory)
  return directory
}

function databaseMigrationFilesCreate(directory: string, files: Readonly<Record<string, string>>): void {
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(directory, name), sql)
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

test("databaseOpen configures an isolated in-memory SQLite connection", () => {
  const result = databaseOpen()
  expect(result.success).toBe(true)
  if (!result.success) return

  expect(result.data.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 })
  expect(result.data.query("PRAGMA busy_timeout").get()).toEqual({ timeout: 5_000 })
  expect(databaseClose(result.data).success).toBe(true)
})

test("databaseOpen creates parent directories and enables WAL for file databases", () => {
  const directory = databaseTestDirectoryCreate()
  const databasePath = join(directory, "nested", "onewarden.sqlite3")
  const result = databaseOpen(databasePath)
  expect(result.success).toBe(true)
  if (!result.success) return

  expect(existsSync(dirname(databasePath))).toBe(true)
  expect(result.data.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 })
  expect(result.data.query("PRAGMA busy_timeout").get()).toEqual({ timeout: 5_000 })
  expect(result.data.query("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" })
  expect(databaseClose(result.data).success).toBe(true)
  expect(existsSync(databasePath)).toBe(true)
})

test("databaseOpen returns an error when its parent path is not a directory", () => {
  const directory = databaseTestDirectoryCreate()
  const parentPath = join(directory, "database-parent")
  writeFileSync(parentPath, "not a directory")

  expect(databaseOpen(join(parentPath, "onewarden.sqlite3"))).toMatchObject({
    success: false,
    op: "databaseOpen",
    errorMessage: "Database open failed.",
  })
})

test("databaseClose is safe to call more than once", () => {
  const result = databaseOpen()
  expect(result.success).toBe(true)
  if (!result.success) return

  expect(databaseClose(result.data)).toEqual({ success: true, data: undefined })
  expect(databaseClose(result.data)).toEqual({ success: true, data: undefined })
})

test("databaseTransaction commits a successful operation", () => {
  const result = databaseTestCreate()
  expect(result.success).toBe(true)
  if (!result.success) return

  result.data.exec("CREATE TABLE transaction_entries (value TEXT NOT NULL)")
  const transactionResult = databaseTransaction(result.data, () => {
    result.data.run("INSERT INTO transaction_entries (value) VALUES (?)", ["committed"])
    return { success: true, data: "done" as const }
  })

  expect(transactionResult).toEqual({ success: true, data: "done" })
  expect(result.data.query("SELECT value FROM transaction_entries").all()).toEqual([{ value: "committed" }])
  databaseClose(result.data)
})

test("databaseTransaction rolls back and preserves a callback Result error", () => {
  const result = databaseTestCreate()
  expect(result.success).toBe(true)
  if (!result.success) return

  result.data.exec("CREATE TABLE transaction_entries (value TEXT NOT NULL)")
  const expectedError = resultErrorCreate("transactionOperation", "The operation failed.")
  const transactionResult = databaseTransaction(result.data, () => {
    result.data.run("INSERT INTO transaction_entries (value) VALUES (?)", ["rolled-back"])
    return expectedError
  })

  expect(transactionResult).toBe(expectedError)
  expect(result.data.query("SELECT value FROM transaction_entries").all()).toEqual([])
  databaseClose(result.data)
})

test("databaseTransaction rolls back and hides thrown callback errors", () => {
  const result = databaseTestCreate()
  expect(result.success).toBe(true)
  if (!result.success) return

  result.data.exec("CREATE TABLE transaction_entries (value TEXT NOT NULL)")
  const transactionResult = databaseTransaction(result.data, () => {
    result.data.run("INSERT INTO transaction_entries (value) VALUES (?)", ["rolled-back"])
    throw new Error("secret transaction detail")
  })

  expect(transactionResult).toMatchObject({
    success: false,
    op: "databaseTransaction",
    errorMessage: "Database transaction failed.",
  })
  expect(JSON.stringify(transactionResult)).not.toContain("secret transaction detail")
  expect(result.data.query("SELECT value FROM transaction_entries").all()).toEqual([])
  databaseClose(result.data)
})

test("databaseMigrate applies the initial schema-version migration and is idempotent", () => {
  const result = databaseOpen()
  expect(result.success).toBe(true)
  if (!result.success) return

  expect(databaseMigrate(result.data)).toEqual({ success: true, data: undefined })
  expect(databaseMigrate(result.data)).toEqual({ success: true, data: undefined })
  expect(result.data.query("SELECT version FROM schema_version ORDER BY version").all()).toEqual([
    { version: 1 },
    { version: 2 },
    { version: 3 },
    { version: 4 },
    { version: 5 },
    { version: 6 },
    { version: 8 },
    { version: 9 },
    { version: 10 },
    { version: 11 },
    { version: 12 },
    { version: 13 },
    { version: 14 },
    { version: 15 },
    { version: 16 },
  ])
  expect(
    result.data
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'")
      .get(),
  ).toEqual({ name: "schema_version" })
  expect(
    result.data
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'invitations', 'identity_signing_keys', 'devices', 'organization_api_key', 'sso_auth', 'sso_users', 'organizations', 'org_policies', 'organization_domains', 'organization_sso_configs', 'users_organizations', 'collections', 'users_collections', 'groups', 'groups_users', 'collections_groups', 'folders', 'folders_ciphers', 'ciphers', 'ciphers_collections', 'favorites', 'archives', 'sends', 'emergency_access', 'attachments', 'event') ORDER BY name",
      )
      .all(),
  ).toEqual([
    { name: "archives" },
    { name: "attachments" },
    { name: "ciphers" },
    { name: "ciphers_collections" },
    { name: "collections" },
    { name: "collections_groups" },
    { name: "devices" },
    { name: "emergency_access" },
    { name: "event" },
    { name: "favorites" },
    { name: "folders" },
    { name: "folders_ciphers" },
    { name: "groups" },
    { name: "groups_users" },
    { name: "identity_signing_keys" },
    { name: "invitations" },
    { name: "org_policies" },
    { name: "organization_api_key" },
    { name: "organization_domains" },
    { name: "organization_sso_configs" },
    { name: "organizations" },
    { name: "sends" },
    { name: "sso_auth" },
    { name: "sso_users" },
    { name: "users" },
    { name: "users_collections" },
    { name: "users_organizations" },
  ])
  const deviceColumns = result.data
    .query<{ name: string; type: string; notnull: number; pk: number }, []>("PRAGMA table_info(devices)")
    .all()
    .map(({ name, type, notnull, pk }) => ({ name, type, notnull, pk }))
  expect(deviceColumns).toEqual([
    { name: "uuid", type: "TEXT", notnull: 1, pk: 1 },
    { name: "created_at", type: "TEXT", notnull: 1, pk: 0 },
    { name: "updated_at", type: "TEXT", notnull: 1, pk: 0 },
    { name: "user_uuid", type: "TEXT", notnull: 1, pk: 2 },
    { name: "name", type: "TEXT", notnull: 1, pk: 0 },
    { name: "atype", type: "INTEGER", notnull: 1, pk: 0 },
    { name: "push_uuid", type: "TEXT", notnull: 0, pk: 0 },
    { name: "push_token", type: "TEXT", notnull: 0, pk: 0 },
    { name: "refresh_token", type: "TEXT", notnull: 1, pk: 0 },
    { name: "twofactor_remember", type: "TEXT", notnull: 0, pk: 0 },
  ])
  expect(result.data.query("PRAGMA foreign_key_list(devices)").all()).toEqual([
    {
      id: 0,
      seq: 0,
      table: "users",
      from: "user_uuid",
      to: "uuid",
      on_update: "NO ACTION",
      on_delete: "NO ACTION",
      match: "NONE",
    },
  ])
  databaseClose(result.data)
})

test("databaseMigrate preserves device refresh secrets and composite user identity", () => {
  const result = databaseTestCreate()
  expect(result.success).toBe(true)
  if (!result.success) return

  for (const uuid of ["user-one", "user-two"]) {
    result.data.run(
      `INSERT INTO users (uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        "2026-08-28T00:00:00.000Z",
        "2026-08-28T00:00:00.000Z",
        `${uuid}@example.com`,
        uuid,
        new Uint8Array([1]),
        new Uint8Array([2]),
        100_000,
        "akey",
        `${uuid}-stamp`,
      ],
    )
  }
  for (const userUuid of ["user-one", "user-two"]) {
    result.data.run(
      `INSERT INTO devices (uuid, created_at, updated_at, user_uuid, name, atype, refresh_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "same-device-identifier",
        "2026-08-27T00:00:00.000Z",
        "2026-08-28T00:00:00.000Z",
        userUuid,
        `${userUuid} device`,
        7,
        `${userUuid}-refresh-secret`,
      ],
    )
  }

  expect(databaseMigrate(result.data)).toEqual({ success: true, data: undefined })
  expect(
    result.data.query("SELECT uuid, user_uuid, name, refresh_token FROM devices ORDER BY user_uuid").all(),
  ).toEqual([
    {
      uuid: "same-device-identifier",
      user_uuid: "user-one",
      name: "user-one device",
      refresh_token: "user-one-refresh-secret",
    },
    {
      uuid: "same-device-identifier",
      user_uuid: "user-two",
      name: "user-two device",
      refresh_token: "user-two-refresh-secret",
    },
  ])
  databaseClose(result.data)
})

test("databaseMigrate applies custom migrations in numeric order and ignores unrelated files", () => {
  const directory = databaseTestDirectoryCreate()
  databaseMigrationFilesCreate(directory, {
    "0010_third.sql": "INSERT INTO migration_order (value) VALUES ('third');",
    "0002_second.sql": "INSERT INTO migration_order (value) VALUES ('second');",
    "0001_first.sql": "CREATE TABLE migration_order (value TEXT NOT NULL);",
    "README.sql": "THIS IS NOT SQL;",
  })
  const databaseResult = databaseOpen()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return

  expect(databaseMigrate(databaseResult.data, directory)).toEqual({ success: true, data: undefined })
  expect(databaseResult.data.query("SELECT value FROM migration_order ORDER BY rowid").all()).toEqual([
    { value: "second" },
    { value: "third" },
  ])
  expect(databaseResult.data.query("SELECT version FROM schema_version ORDER BY version").all()).toEqual([
    { version: 1 },
    { version: 2 },
    { version: 10 },
  ])
  databaseClose(databaseResult.data)
})

test("databaseMigrate rejects duplicate migration versions without applying either migration", () => {
  const directory = databaseTestDirectoryCreate()
  databaseMigrationFilesCreate(directory, {
    "0001_first.sql": "CREATE TABLE first_migration (value TEXT NOT NULL);",
    "01_second.sql": "CREATE TABLE second_migration (value TEXT NOT NULL);",
  })
  const databaseResult = databaseOpen()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return

  expect(databaseMigrate(databaseResult.data, directory)).toMatchObject({
    success: false,
    op: "databaseMigrate",
    errorMessage: "Database migration versions must be unique.",
  })
  expect(databaseResult.data.query("SELECT version FROM schema_version").all()).toEqual([])
  expect(databaseResult.data.query("SELECT name FROM sqlite_master WHERE name LIKE '%_migration'").all()).toEqual([])
  databaseClose(databaseResult.data)
})

test("databaseMigrate rolls back a failed migration and keeps earlier migrations", () => {
  const directory = databaseTestDirectoryCreate()
  databaseMigrationFilesCreate(directory, {
    "0001_first.sql": "CREATE TABLE first_migration (value TEXT NOT NULL);",
    "0002_second.sql":
      "CREATE TABLE second_migration (value TEXT NOT NULL); INSERT INTO missing_migration (value) VALUES ('failure');",
  })
  const databaseResult = databaseOpen()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return

  expect(databaseMigrate(databaseResult.data, directory)).toMatchObject({
    success: false,
    op: "databaseMigrate",
    errorMessage: "Database migration failed.",
  })
  expect(databaseResult.data.query("SELECT version FROM schema_version ORDER BY version").all()).toEqual([
    { version: 1 },
  ])
  expect(databaseResult.data.query("SELECT name FROM sqlite_master WHERE name = 'first_migration'").get()).toEqual({
    name: "first_migration",
  })
  expect(databaseResult.data.query("SELECT name FROM sqlite_master WHERE name = 'second_migration'").get()).toBeNull()
  databaseClose(databaseResult.data)
})

test("databaseTestCreate returns a migrated isolated database and reports setup failures", () => {
  const result = databaseTestCreate()
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.query("SELECT version FROM schema_version").all()).toEqual([
      { version: 1 },
      { version: 2 },
      { version: 3 },
      { version: 4 },
      { version: 5 },
      { version: 6 },
      { version: 8 },
      { version: 9 },
      { version: 10 },
      { version: 11 },
      { version: 12 },
      { version: 13 },
      { version: 14 },
      { version: 15 },
      { version: 16 },
    ])
    databaseClose(result.data)
  }

  const failedResult = databaseTestCreate(join(databaseTestDirectoryCreate(), "missing-migrations"))
  expect(failedResult).toMatchObject({ success: false, op: "databaseMigrate" })
})

test("serverAppCreate exposes its injected database to handlers", async () => {
  const databaseResult = databaseTestCreate()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return

  const app = serverAppCreate({ database: databaseResult.data })
  app.get("/database-version", (context) => {
    const database = context.get("database")
    if (database === undefined) return context.json({ version: null }, 503)
    const row = database.query<{ version: number }, []>("SELECT MAX(version) AS version FROM schema_version").get()
    return context.json({ version: row?.version ?? null })
  })
  const response = await app.request("http://localhost/database-version")

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ version: 16 })
  databaseClose(databaseResult.data)
})
