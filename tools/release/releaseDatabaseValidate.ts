import { Database } from "bun:sqlite"
import { constants } from "node:fs"
import { lstat, open } from "node:fs/promises"
import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { databaseSchemaTablesValidate } from "../../src/server/database/databaseSchemaTablesValidate.js"

export async function releaseDatabaseValidate(
  databasePath: string,
  latestSchemaVersion: number,
  supportedSchemaVersions?: ReadonlySet<number>,
): Promise<Result<{ exists: boolean; schemaVersion?: number }>> {
  const op = "releaseDatabaseValidate"
  const existsResult = await releaseDatabaseExists(databasePath)
  if (!existsResult.success) return existsResult
  if (!existsResult.data) return resultCreate({ exists: false })
  const pathResult = await releaseDatabasePathValidate(databasePath)
  if (!pathResult.success) return pathResult

  let database: Database | undefined
  try {
    database = new Database(databasePath, { readonly: true })
    const integrity = database.query<{ integrity_check: string }, []>("PRAGMA integrity_check").get()
    if (integrity?.integrity_check !== "ok")
      return resultErrorCreate(op, "Existing SQLite database failed integrity validation.")
    const foreignKeys = database.query<Record<string, unknown>, []>("PRAGMA foreign_key_check").all()
    if (foreignKeys.length > 0) return resultErrorCreate(op, "Existing SQLite database failed foreign-key validation.")
    const schemaTable = database
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'")
      .get()
    if (schemaTable?.name !== "schema_version")
      return resultErrorCreate(op, "Existing SQLite schema identity is missing.")
    const schemaRows = database.query<{ version: number }, []>("SELECT version FROM schema_version").all()
    if (supportedSchemaVersions !== undefined && schemaRows.some((row) => !supportedSchemaVersions.has(row.version)))
      return resultErrorCreate(op, "Existing SQLite schema contains an unsupported migration version.")
    const schemaRow = database
      .query<{ version: number | null }, []>("SELECT MAX(version) AS version FROM schema_version")
      .get()
    const schemaVersion = schemaRow?.version
    if (
      schemaVersion === null ||
      schemaVersion === undefined ||
      !Number.isSafeInteger(schemaVersion) ||
      schemaVersion < 1
    )
      return resultErrorCreate(op, "Existing SQLite schema version is invalid.")
    if (schemaVersion > latestSchemaVersion)
      return resultErrorCreate(op, "Existing SQLite schema is newer than the release.")
    if (schemaVersion === latestSchemaVersion) {
      const tablesResult = databaseSchemaTablesValidate(database)
      if (!tablesResult.success) return resultErrorCreate(op, "Existing SQLite schema is incomplete.")
    }
    return resultCreate({ exists: true, schemaVersion })
  } catch {
    return resultErrorCreate(op, "Existing SQLite database could not be validated.")
  } finally {
    try {
      database?.close()
    } catch {
      // The validation already failed or the read-only connection is no longer needed.
    }
  }
}

async function releaseDatabaseExists(databasePath: string): Promise<Result<boolean>> {
  const op = "releaseDatabaseExists"
  try {
    const stats = await lstat(databasePath)
    if (!stats.isFile()) return resultErrorCreate(op, "Existing SQLite database path is not a regular file.")
    return resultCreate(true)
  } catch (error) {
    if (releaseDatabaseIsNotFound(error)) return resultCreate(false)
    return resultErrorCreate(op, "Existing SQLite database could not be inspected.")
  }
}

async function releaseDatabasePathValidate(databasePath: string): Promise<Result<void>> {
  const op = "releaseDatabasePathValidate"
  let fileHandle: Awaited<ReturnType<typeof open>> | undefined
  try {
    fileHandle = await open(databasePath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stats = await fileHandle.stat()
    if (!stats.isFile()) return resultErrorCreate(op, "Database path must be a regular file.")
    for (const sidecarPath of [`${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`]) {
      try {
        const sidecarStats = await lstat(sidecarPath)
        if (sidecarStats.isSymbolicLink()) return resultErrorCreate(op, "Database sidecar paths must not be symlinks.")
      } catch (error) {
        if (!releaseDatabaseIsNotFound(error))
          return resultErrorCreate(op, "Database sidecar paths could not be inspected.")
      }
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Database path must be a regular file without symlinks.")
  } finally {
    if (fileHandle !== undefined) await fileHandle.close().catch(() => undefined)
  }
}

function releaseDatabaseIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
