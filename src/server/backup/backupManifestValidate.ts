import { Database } from "bun:sqlite"
import { constants, type Dirent } from "node:fs"
import { lstat, mkdtemp, open, readdir, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { isAbsolute, join, resolve } from "node:path"
import * as v from "valibot"
import { type Result } from "#result"
import { sha256Hex } from "../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { databaseMigrationsLatestVersionRead } from "../database/databaseMigrationsLatestVersionRead.js"
import { databaseMigrationVersionSupported } from "../database/databaseMigrationVersionSupported.js"
import { databasePathIsMemory } from "../database/databasePathIsMemory.js"
import { databaseSchemaTablesValidate } from "../database/databaseSchemaTablesValidate.js"
import { type BackupManifest, backupManifestSchema } from "./backupManifestSchema.js"

const backupDatabaseFile = "database.sqlite3"
const backupSendsDirectory = "sends"
const backupAttachmentsDirectory = "attachments"
export async function backupManifestValidate(backupDirectory: string): Promise<Result<BackupManifest>> {
  const op = "backupManifestValidate"
  const directoryResult = await backupManifestDirectoryResolve(backupDirectory)
  if (!directoryResult.success) return directoryResult

  const manifestPath = join(directoryResult.data, "manifest.json")
  const manifestReadResult = await backupManifestRead(manifestPath)
  if (!manifestReadResult.success) return manifestReadResult

  let parsedManifest: unknown
  try {
    parsedManifest = JSON.parse(manifestReadResult.data)
  } catch {
    return resultErrorCreate(op, "Backup manifest is not valid JSON.")
  }
  const manifestResult = v.safeParse(backupManifestSchema, parsedManifest)
  if (!manifestResult.success) return resultErrorCreate(op, "Backup manifest is invalid.")
  const manifest = manifestResult.output

  const pathResult = backupManifestPathsValidate(manifest)
  if (!pathResult.success) return pathResult
  const entriesResult = await backupManifestEntriesValidate(directoryResult.data, manifest)
  if (!entriesResult.success) return entriesResult
  const hashesResult = await backupManifestHashesValidate(directoryResult.data, manifest)
  if (!hashesResult.success) return hashesResult

  const databaseResult = await backupManifestDatabaseValidate(
    join(directoryResult.data, backupDatabaseFile),
    manifest.schemaVersion,
  )
  if (!databaseResult.success) return databaseResult
  return resultCreate(manifest)
}

async function backupManifestDirectoryResolve(configuredPath: string): Promise<Result<string>> {
  const op = "backupManifestDirectoryResolve"
  if (configuredPath.trim().length === 0) return resultErrorCreate(op, "Backup directory cannot be empty.")
  const resolvedPath = resolve(configuredPath)
  try {
    const stats = await lstat(resolvedPath)
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Backup directory must not be a symlink.")
    if (!stats.isDirectory()) return resultErrorCreate(op, "Backup path must be a directory.")
    if ((await realpath(resolvedPath)) !== resolvedPath)
      return resultErrorCreate(op, "Backup directory path must not contain symlinks.")
    return resultCreate(resolvedPath)
  } catch {
    return resultErrorCreate(op, "Backup directory could not be read.")
  }
}

async function backupManifestRead(manifestPath: string): Promise<Result<string>> {
  const op = "backupManifestRead"
  try {
    const stats = await lstat(manifestPath)
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Backup manifest must not be a symlink.")
    if (!stats.isFile()) return resultErrorCreate(op, "Backup manifest must be a regular file.")
    if ((await realpath(manifestPath)) !== manifestPath)
      return resultErrorCreate(op, "Backup manifest path must not contain symlinks.")
    const bytesResult = await backupManifestFileBytesRead(manifestPath)
    if (!bytesResult.success) return bytesResult
    return resultCreate(new TextDecoder().decode(bytesResult.data))
  } catch {
    return resultErrorCreate(op, "Backup manifest could not be read.")
  }
}

function backupManifestPathsValidate(manifest: BackupManifest): Result<void> {
  const op = "backupManifestPathsValidate"
  let databaseEntryCount = 0
  const paths = new Set<string>()
  for (const file of manifest.files) {
    const segments = file.path.split("/")
    if (
      file.path.length === 0 ||
      isAbsolute(file.path) ||
      file.path.includes("\\") ||
      file.path.includes("\u0000") ||
      segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    ) {
      return resultErrorCreate(op, "Backup manifest contains a path traversal.")
    }
    if (file.path === backupDatabaseFile) databaseEntryCount += 1
    else if (segments[0] !== backupSendsDirectory && segments[0] !== backupAttachmentsDirectory)
      return resultErrorCreate(op, "Backup manifest contains an unsupported path.")
    if (paths.has(file.path)) return resultErrorCreate(op, "Backup manifest contains duplicate paths.")
    paths.add(file.path)
  }
  if (databaseEntryCount !== 1) return resultErrorCreate(op, "Backup manifest must contain one database file.")
  return resultCreate(undefined)
}

async function backupManifestEntriesValidate(backupDirectory: string, manifest: BackupManifest): Promise<Result<void>> {
  const op = "backupManifestEntriesValidate"
  const expectedPaths = new Set(["manifest.json", ...manifest.files.map((file) => file.path)])
  const actualPaths = new Set<string>()
  const directories = new Set<string>()

  const walkResult = await backupManifestEntriesWalk(backupDirectory, "", expectedPaths, actualPaths, directories)
  if (!walkResult.success) return walkResult
  if (!directories.has(backupSendsDirectory) || !directories.has(backupAttachmentsDirectory))
    return resultErrorCreate(op, "Backup storage directories are missing.")
  if (actualPaths.size !== expectedPaths.size) return resultErrorCreate(op, "Backup contains unexpected files.")
  for (const path of expectedPaths) {
    if (!actualPaths.has(path)) return resultErrorCreate(op, "Backup manifest references a missing file.")
  }
  return resultCreate(undefined)
}

async function backupManifestEntriesWalk(
  backupDirectory: string,
  relativeDirectory: string,
  expectedPaths: Set<string>,
  actualPaths: Set<string>,
  directories: Set<string>,
): Promise<Result<void>> {
  const op = "backupManifestEntriesWalk"
  const currentDirectory =
    relativeDirectory.length === 0 ? backupDirectory : join(backupDirectory, ...relativeDirectory.split("/"))
  let entries: Dirent<string>[]
  try {
    if ((await realpath(currentDirectory)) !== currentDirectory)
      return resultErrorCreate(op, "Backup storage path must not contain symlinks.")
    entries = await readdir(currentDirectory, { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Backup contents could not be read.")
  }

  for (const entry of entries) {
    const entryPath = relativeDirectory.length === 0 ? entry.name : `${relativeDirectory}/${entry.name}`
    const sourcePath = join(backupDirectory, ...entryPath.split("/"))
    let stats: Awaited<ReturnType<typeof lstat>>
    try {
      stats = await lstat(sourcePath)
    } catch {
      return resultErrorCreate(op, "Backup entry could not be inspected.")
    }
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Backup must not contain symlinks.")
    if (stats.isDirectory()) {
      if (
        relativeDirectory.length === 0 &&
        entry.name !== backupSendsDirectory &&
        entry.name !== backupAttachmentsDirectory
      )
        return resultErrorCreate(op, "Backup contains an unsupported directory.")
      if (entryPath === backupSendsDirectory || entryPath === backupAttachmentsDirectory) directories.add(entryPath)
      const childResult = await backupManifestEntriesWalk(
        backupDirectory,
        entryPath,
        expectedPaths,
        actualPaths,
        directories,
      )
      if (!childResult.success) return childResult
      continue
    }
    if (!stats.isFile()) return resultErrorCreate(op, "Backup contains an unsupported file type.")
    if ((await realpath(sourcePath)) !== sourcePath)
      return resultErrorCreate(op, "Backup file path must not contain symlinks.")
    if (!expectedPaths.has(entryPath)) return resultErrorCreate(op, `Backup contains an unexpected file: ${entryPath}.`)
    actualPaths.add(entryPath)
  }
  return resultCreate(undefined)
}

async function backupManifestHashesValidate(backupDirectory: string, manifest: BackupManifest): Promise<Result<void>> {
  const op = "backupManifestHashesValidate"
  for (const file of manifest.files) {
    const filePath = join(backupDirectory, ...file.path.split("/"))
    const bytesResult = await backupManifestFileBytesRead(filePath)
    if (!bytesResult.success) return resultErrorCreate(op, "Backup file could not be read.")
    const bytes = bytesResult.data
    if (bytes.byteLength !== file.size) return resultErrorCreate(op, `Backup size mismatch for ${file.path}.`)
    const digestResult = await sha256Hex(bytes)
    if (!digestResult.success || digestResult.data !== file.sha256)
      return resultErrorCreate(op, `Backup hash mismatch for ${file.path}.`)
  }
  return resultCreate(undefined)
}

async function backupManifestDatabaseValidate(databasePath: string, schemaVersion: number): Promise<Result<void>> {
  const op = "backupManifestDatabaseValidate"
  if (databasePathIsMemory(databasePath)) return resultErrorCreate(op, "In-memory databases cannot be restored.")

  let database: Database | undefined
  let temporaryDirectory: string | undefined
  let validationResult: Result<void>
  try {
    const bytesResult = await backupManifestFileBytesRead(databasePath)
    if (!bytesResult.success) return bytesResult
    const bytes = bytesResult.data
    temporaryDirectory = await mkdtemp(join(tmpdir(), "onewarden-manifest-db-"))
    const temporaryDatabasePath = join(temporaryDirectory, backupDatabaseFile)
    await writeFile(temporaryDatabasePath, bytes, { mode: 0o600 })
    database = new Database(temporaryDatabasePath, { readonly: true })
    const integrityRow = database.query<{ integrity_check: string }, []>("PRAGMA integrity_check").get()
    if (integrityRow?.integrity_check !== "ok") {
      validationResult = resultErrorCreate(op, "Backup database failed SQLite integrity validation.")
    } else {
      const schemaTable = database
        .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'")
        .get()
      const schemaRow = database
        .query<{ version: number | null }, []>("SELECT MAX(version) AS version FROM schema_version")
        .get()
      if (
        schemaTable?.name !== "schema_version" ||
        schemaRow?.version !== schemaVersion ||
        schemaRow === null ||
        !Number.isSafeInteger(schemaRow.version) ||
        schemaRow.version < 1
      ) {
        validationResult = resultErrorCreate(op, "Backup database schema is incompatible with its manifest.")
      } else {
        const latestVersionResult = databaseMigrationsLatestVersionRead()
        if (!latestVersionResult.success) {
          validationResult = resultErrorCreate(op, "Backup database schema could not be compared with this runtime.")
        } else if (schemaVersion > latestVersionResult.data) {
          validationResult = resultErrorCreate(op, "Backup database schema is newer than this runtime.")
        } else {
          const supportedVersionResult = databaseMigrationVersionSupported(schemaVersion)
          if (!supportedVersionResult.success) {
            validationResult = resultErrorCreate(op, "Backup database schema could not be compared with this runtime.")
          } else if (!supportedVersionResult.data) {
            validationResult = resultErrorCreate(op, "Backup database schema version is not supported by this runtime.")
          } else if (schemaVersion === latestVersionResult.data) {
            validationResult = databaseSchemaTablesValidate(database)
          } else {
            validationResult = resultCreate(undefined)
          }
        }
      }
    }
  } catch {
    validationResult = resultErrorCreate(op, "Backup database is not a valid SQLite database.")
  }
  if (database !== undefined) {
    try {
      database.close()
    } catch {
      if (validationResult.success) validationResult = resultErrorCreate(op, "Backup database could not be closed.")
    }
  }
  if (temporaryDirectory !== undefined) {
    try {
      await rm(temporaryDirectory, { force: true, recursive: true })
    } catch {
      if (validationResult.success)
        return resultErrorCreate(op, "Backup database validation files could not be removed.")
    }
  }
  return validationResult
}

async function backupManifestFileBytesRead(path: string): Promise<Result<Uint8Array>> {
  const op = "backupManifestFileBytesRead"
  let fileHandle: Awaited<ReturnType<typeof open>> | undefined
  let bytesResult: Result<Uint8Array>
  try {
    fileHandle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stats = await fileHandle.stat()
    if (!stats.isFile()) bytesResult = resultErrorCreate(op, "Backup source is not a regular file.")
    else bytesResult = resultCreate(Uint8Array.from(await fileHandle.readFile()))
  } catch {
    bytesResult = resultErrorCreate(op, "Backup source file could not be read.")
  }
  if (fileHandle !== undefined) {
    try {
      await fileHandle.close()
    } catch {
      return resultErrorCreate(op, "Backup source file could not be closed.")
    }
  }
  return bytesResult
}
