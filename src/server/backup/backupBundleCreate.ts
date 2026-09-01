import { Database } from "bun:sqlite"
import { randomUUID } from "node:crypto"
import { constants, type Dirent } from "node:fs"
import { type FileHandle, lstat, mkdir, open, readdir, realpath, rename, rm, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { max } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sqlite"
import type { Result } from "#result"
import { sha256Hex } from "../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { databasePathIsMemory } from "../database/databasePathIsMemory.js"
import { databaseSchema } from "../database/schema/databaseSchema.js"
import { schemaVersion } from "../database/schema/schemaVersion.js"

const BACKUP_MANIFEST_VERSION = 1
const BACKUP_DATABASE_FILE = "database.sqlite3"
const BACKUP_SENDS_DIRECTORY = "sends"
const BACKUP_ATTACHMENTS_DIRECTORY = "attachments"

type BackupManifestFile = {
  path: string
  size: number
  sha256: string
}

type BackupDatabaseSnapshot = {
  bytes: Uint8Array
  schemaVersion: number
}

export async function backupBundleCreate(options: {
  databasePath: string
  sendsFolder: string
  attachmentsFolder: string
  destinationRoot: string
}): Promise<Result<string>> {
  const op = "backupBundleCreate"
  if (databasePathIsMemory(options.databasePath))
    return resultErrorCreate(op, "In-memory databases cannot be backed up.")

  const databasePathResult = await backupDatabasePathResolve(options.databasePath)
  if (!databasePathResult.success) return databasePathResult
  const attachmentsAreS3 = options.attachmentsFolder.startsWith("s3://")
  const destinationRootCandidate = resolve(options.destinationRoot)
  const sourceRootCandidates = [resolve(options.sendsFolder)]
  if (!attachmentsAreS3) sourceRootCandidates.push(resolve(options.attachmentsFolder))
  for (const sourceRootCandidate of sourceRootCandidates) {
    if (backupPathIsWithin(sourceRootCandidate, destinationRootCandidate))
      return resultErrorCreate(op, "Backup destination cannot be inside configured storage.")
  }
  const sendsFolderResult = await backupStorageDirectoryResolve(options.sendsFolder, "Sends")
  if (!sendsFolderResult.success) return sendsFolderResult
  const attachmentsFolderResult = attachmentsAreS3
    ? resultCreate<string | null>(null)
    : await backupStorageDirectoryResolve(options.attachmentsFolder, "Attachments")
  if (!attachmentsFolderResult.success) return attachmentsFolderResult
  const destinationRootResult = await backupDestinationRootPrepare(options.destinationRoot)
  if (!destinationRootResult.success) return destinationRootResult

  const destinationRoot = destinationRootResult.data
  const temporaryDirectoryResult = await backupTemporaryDirectoryCreate(destinationRoot)
  if (!temporaryDirectoryResult.success) return temporaryDirectoryResult
  const temporaryDirectory = temporaryDirectoryResult.data
  let completed = false

  try {
    const snapshotResult = await backupDatabaseSnapshotRead(databasePathResult.data)
    if (!snapshotResult.success) return snapshotResult

    const databaseFileResult = await backupFileWrite(
      temporaryDirectory,
      BACKUP_DATABASE_FILE,
      snapshotResult.data.bytes,
    )
    if (!databaseFileResult.success) return databaseFileResult
    const manifestFiles: BackupManifestFile[] = [databaseFileResult.data]

    const sendsResult = await backupStorageDirectoryCopy(
      sendsFolderResult.data,
      join(temporaryDirectory, BACKUP_SENDS_DIRECTORY),
      BACKUP_SENDS_DIRECTORY,
    )
    if (!sendsResult.success) return sendsResult
    manifestFiles.push(...sendsResult.data)

    const attachmentsResult = await backupStorageDirectoryCopy(
      attachmentsFolderResult.data,
      join(temporaryDirectory, BACKUP_ATTACHMENTS_DIRECTORY),
      BACKUP_ATTACHMENTS_DIRECTORY,
    )
    if (!attachmentsResult.success) return attachmentsResult
    manifestFiles.push(...attachmentsResult.data)

    const manifest = backupManifestCreate(snapshotResult.data.schemaVersion, manifestFiles)
    const manifestResult = await backupManifestWrite(temporaryDirectory, manifest)
    if (!manifestResult.success) return manifestResult

    const finalDirectoryResult = await backupFinalDirectoryRename(destinationRoot, temporaryDirectory)
    if (!finalDirectoryResult.success) return finalDirectoryResult
    completed = true
    return finalDirectoryResult
  } catch {
    return resultErrorCreate(op, "Backup bundle creation failed.")
  } finally {
    if (!completed) await backupTemporaryDirectoryRemove(temporaryDirectory)
  }
}

async function backupDatabasePathResolve(databasePath: string): Promise<Result<string>> {
  const op = "backupDatabasePathResolve"
  const resolvedPath = resolve(databasePath)
  try {
    const fileStats = await lstat(resolvedPath)
    if (fileStats.isSymbolicLink()) return resultErrorCreate(op, "Database path must not be a symlink.")
    if (!fileStats.isFile()) return resultErrorCreate(op, "Database path must be a regular file.")
    if ((await realpath(resolvedPath)) !== resolvedPath)
      return resultErrorCreate(op, "Database path must not contain symlinks.")

    for (const sidecarPath of [`${resolvedPath}-wal`, `${resolvedPath}-shm`, `${resolvedPath}-journal`]) {
      try {
        const sidecarStats = await lstat(sidecarPath)
        if (sidecarStats.isSymbolicLink()) return resultErrorCreate(op, "Database sidecar paths must not be symlinks.")
      } catch (error) {
        if (!backupErrorIsNotFound(error)) return resultErrorCreate(op, "Database sidecar validation failed.")
      }
    }
    return resultCreate(resolvedPath)
  } catch (error) {
    if (backupErrorIsNotFound(error)) return resultErrorCreate(op, "Database file does not exist.")
    return resultErrorCreate(op, "Database path validation failed.")
  }
}

async function backupStorageDirectoryResolve(configuredPath: string, label: string): Promise<Result<string | null>> {
  const op = "backupStorageDirectoryResolve"
  const resolvedPath = resolve(configuredPath)
  try {
    const directoryStats = await lstat(resolvedPath)
    if (directoryStats.isSymbolicLink()) return resultErrorCreate(op, `${label} storage must not contain symlinks.`)
    if (!directoryStats.isDirectory()) return resultErrorCreate(op, `${label} storage must be a directory.`)
    if ((await realpath(resolvedPath)) !== resolvedPath)
      return resultErrorCreate(op, `${label} storage path must not contain symlinks.`)
    return resultCreate(resolvedPath)
  } catch (error) {
    if (backupErrorIsNotFound(error)) return resultCreate(null)
    return resultErrorCreate(op, `${label} storage path validation failed.`)
  }
}

async function backupDestinationRootPrepare(configuredPath: string): Promise<Result<string>> {
  const op = "backupDestinationRootPrepare"
  if (configuredPath.trim().length === 0) return resultErrorCreate(op, "Backup destination cannot be empty.")
  const resolvedPath = resolve(configuredPath)
  try {
    await mkdir(resolvedPath, { mode: 0o700, recursive: true })
    const directoryStats = await lstat(resolvedPath)
    if (directoryStats.isSymbolicLink()) return resultErrorCreate(op, "Backup destination must not be a symlink.")
    if (!directoryStats.isDirectory()) return resultErrorCreate(op, "Backup destination must be a directory.")
    if ((await realpath(resolvedPath)) !== resolvedPath)
      return resultErrorCreate(op, "Backup destination path must not contain symlinks.")
    return resultCreate(resolvedPath)
  } catch {
    return resultErrorCreate(op, "Backup destination could not be prepared.")
  }
}

async function backupTemporaryDirectoryCreate(destinationRoot: string): Promise<Result<string>> {
  const op = "backupTemporaryDirectoryCreate"
  const temporaryDirectory = join(destinationRoot, `.onewarden-backup-${randomUUID()}.tmp`)
  try {
    await mkdir(temporaryDirectory, { mode: 0o700 })
    return resultCreate(temporaryDirectory)
  } catch {
    return resultErrorCreate(op, "Temporary backup directory could not be created.")
  }
}

async function backupDatabaseSnapshotRead(databasePath: string): Promise<Result<BackupDatabaseSnapshot>> {
  const op = "backupDatabaseSnapshotRead"
  let database: Database | undefined
  try {
    // Bun SQLite is retained here for read-only connection lifecycle and serialize (SQLite backup API).
    database = new Database(databasePath, { readonly: true })
  } catch {
    return resultErrorCreate(op, "Live database snapshot could not be opened.")
  }

  let snapshotResult: Result<BackupDatabaseSnapshot>
  try {
    const databaseDrizzle = drizzle({ client: database, schema: databaseSchema })
    const schemaVersionRow = databaseDrizzle
      .select({ version: max(schemaVersion.version) })
      .from(schemaVersion)
      .get()
    if (
      schemaVersionRow === undefined ||
      schemaVersionRow.version === null ||
      !Number.isSafeInteger(schemaVersionRow.version) ||
      schemaVersionRow.version < 1
    ) {
      snapshotResult = resultErrorCreate(op, "Database schema version could not be determined.")
    } else {
      // SQLite serializes the logical database, so pages committed in the live WAL are included.
      snapshotResult = resultCreate({
        bytes: Uint8Array.from(database.serialize()),
        schemaVersion: schemaVersionRow.version,
      })
    }
  } catch {
    snapshotResult = resultErrorCreate(op, "Live database snapshot failed.")
  }

  try {
    database.close()
  } catch {
    if (snapshotResult.success) return resultErrorCreate(op, "Live database snapshot could not be closed.")
  }
  return snapshotResult
}

async function backupStorageDirectoryCopy(
  sourceRoot: string | null,
  destinationRoot: string,
  manifestPrefix: string,
): Promise<Result<BackupManifestFile[]>> {
  const op = "backupStorageDirectoryCopy"
  try {
    await mkdir(destinationRoot, { mode: 0o700, recursive: true })
  } catch {
    return resultErrorCreate(op, "Backup storage directory could not be created.")
  }
  if (sourceRoot === null) return resultCreate([])
  return backupDirectoryCopy(sourceRoot, destinationRoot, "", manifestPrefix)
}

async function backupDirectoryCopy(
  sourceRoot: string,
  destinationRoot: string,
  relativeDirectory: string,
  manifestPrefix: string,
): Promise<Result<BackupManifestFile[]>> {
  const op = "backupDirectoryCopy"
  const sourceDirectory = relativeDirectory.length === 0 ? sourceRoot : join(sourceRoot, relativeDirectory)
  let entries: Dirent<string>[]
  try {
    if ((await realpath(sourceDirectory)) !== sourceDirectory)
      return resultErrorCreate(op, "Configured storage must not contain symlinks.")
    entries = await readdir(sourceDirectory, { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Configured storage could not be read.")
  }
  entries.sort((left, right) => left.name.localeCompare(right.name))

  const manifestFiles: BackupManifestFile[] = []
  for (const entry of entries) {
    const sourcePath = join(sourceRoot, relativeDirectory, entry.name)
    const relativePathResult = backupRelativePathCreate(sourceRoot, sourcePath, destinationRoot, manifestPrefix)
    if (!relativePathResult.success) return relativePathResult
    const { destinationPath, manifestPath, relativePath } = relativePathResult.data

    let entryStats: Awaited<ReturnType<typeof lstat>>
    try {
      entryStats = await lstat(sourcePath)
    } catch {
      return resultErrorCreate(op, "Configured storage entry could not be inspected.")
    }
    if (entryStats.isSymbolicLink()) return resultErrorCreate(op, "Configured storage must not contain symlinks.")

    if (entryStats.isDirectory()) {
      try {
        await mkdir(destinationPath, { mode: 0o700, recursive: false })
      } catch {
        return resultErrorCreate(op, "Backup storage directory could not be created.")
      }
      const childResult = await backupDirectoryCopy(sourceRoot, destinationRoot, relativePath, manifestPrefix)
      if (!childResult.success) return childResult
      manifestFiles.push(...childResult.data)
      continue
    }
    if (!entryStats.isFile()) return resultErrorCreate(op, "Configured storage contains an unsupported file type.")

    const bytesResult = await backupFileBytesRead(sourcePath)
    if (!bytesResult.success) return bytesResult
    const fileResult = await backupFileWrite(destinationRoot, relativePath, bytesResult.data)
    if (!fileResult.success) return fileResult
    manifestFiles.push({ ...fileResult.data, path: manifestPath })
  }
  return resultCreate(manifestFiles)
}

async function backupFileBytesRead(sourcePath: string): Promise<Result<Uint8Array>> {
  const op = "backupFileBytesRead"
  let fileHandle: FileHandle | undefined
  let bytesResult: Result<Uint8Array>
  try {
    if ((await realpath(sourcePath)) !== sourcePath)
      return resultErrorCreate(op, "Backup source path must not contain symlinks.")
    fileHandle = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const fileStats = await fileHandle.stat()
    if (!fileStats.isFile()) bytesResult = resultErrorCreate(op, "Backup source is not a regular file.")
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

async function backupFileWrite(
  destinationRoot: string,
  relativePath: string,
  bytes: Uint8Array,
): Promise<Result<BackupManifestFile>> {
  const op = "backupFileWrite"
  const destinationPath = join(destinationRoot, relativePath)
  const digestResult = await sha256Hex(bytes)
  if (!digestResult.success) return resultErrorCreate(op, "Backup file integrity could not be calculated.")
  try {
    await mkdir(dirname(destinationPath), { mode: 0o700, recursive: true })
    await writeFile(destinationPath, bytes, { mode: 0o600 })
    return resultCreate({ path: relativePath, size: bytes.byteLength, sha256: digestResult.data })
  } catch {
    return resultErrorCreate(op, "Backup file could not be written.")
  }
}

function backupRelativePathCreate(
  sourceRoot: string,
  sourcePath: string,
  destinationRoot: string,
  manifestPrefix: string,
): Result<{ destinationPath: string; manifestPath: string; relativePath: string }> {
  const op = "backupRelativePathCreate"
  const relativePath = relative(sourceRoot, sourcePath)
  const segments = relativePath.split(sep)
  if (
    relativePath.length === 0 ||
    isAbsolute(relativePath) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === ".." || segment.includes("\\"))
  ) {
    return resultErrorCreate(op, "Backup source path escapes its configured storage root.")
  }
  const destinationPath = resolve(destinationRoot, ...segments)
  if (!backupPathIsWithin(destinationRoot, destinationPath))
    return resultErrorCreate(op, "Backup destination path escapes its temporary directory.")
  return resultCreate({
    destinationPath,
    manifestPath: `${manifestPrefix}/${segments.join("/")}`,
    relativePath: segments.join(sep),
  })
}

function backupManifestCreate(schemaVersion: number, files: BackupManifestFile[]): string {
  return `${JSON.stringify(
    {
      format: "onewarden-backup",
      version: BACKUP_MANIFEST_VERSION,
      schemaVersion,
      files: files.toSorted((left, right) => left.path.localeCompare(right.path)),
    },
    null,
    2,
  )}\n`
}

async function backupManifestWrite(temporaryDirectory: string, manifest: string): Promise<Result<void>> {
  const op = "backupManifestWrite"
  try {
    await writeFile(join(temporaryDirectory, "manifest.json"), manifest, { encoding: "utf8", mode: 0o600 })
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Backup manifest could not be written.")
  }
}

async function backupFinalDirectoryRename(
  destinationRoot: string,
  temporaryDirectory: string,
): Promise<Result<string>> {
  const op = "backupFinalDirectoryRename"
  const timestamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replace(".", "")
  const finalDirectory = join(destinationRoot, `onewarden-backup-${timestamp}-${randomUUID()}`)
  if (!backupPathIsWithin(destinationRoot, finalDirectory))
    return resultErrorCreate(op, "Backup path escaped its root.")
  try {
    await rename(temporaryDirectory, finalDirectory)
    return resultCreate(finalDirectory)
  } catch {
    return resultErrorCreate(op, "Backup bundle could not be finalized atomically.")
  }
}

async function backupTemporaryDirectoryRemove(directory: string): Promise<Result<void>> {
  const op = "backupTemporaryDirectoryRemove"
  try {
    await rm(directory, { force: true, recursive: true })
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Temporary backup directory could not be removed.")
  }
}

function backupPathIsWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`)
}

function backupErrorIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
