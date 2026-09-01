import { randomUUID } from "node:crypto"
import { constants, type Dirent } from "node:fs"
import { lstat, mkdir, open, readdir, realpath, rename, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join, resolve, sep } from "node:path"
import { max, sql } from "drizzle-orm"
import type { Result } from "#result"
import { sha256Hex } from "../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { databaseClose } from "../database/databaseClose.js"
import { databaseMigrate } from "../database/databaseMigrate.js"
import { databaseMigrationsLatestVersionRead } from "../database/databaseMigrationsLatestVersionRead.js"
import { databaseOpen } from "../database/databaseOpen.js"
import { databasePathIsMemory } from "../database/databasePathIsMemory.js"
import { databaseSchemaTablesValidate } from "../database/databaseSchemaTablesValidate.js"
import { schemaVersion } from "../database/schema/schemaVersion.js"
import type { BackupManifest } from "./backupManifestSchema.js"
import { backupManifestValidate } from "./backupManifestValidate.js"

const backupDatabaseFile = "database.sqlite3"
const backupSendsDirectory = "sends"
const backupAttachmentsDirectory = "attachments"
const databaseSidecarSuffixes = ["-wal", "-shm", "-journal"] as const

type BackupRestoreTargets = {
  databasePath: string
  sendsFolder: string
  attachmentsFolder: string
}

type BackupRestoreStage = {
  directory: string
  databasePath: string
  sendsFolder: string
  attachmentsFolder: string
}

type BackupRestoreQuarantineArtifact = {
  kind: "directory" | "file"
  existed: boolean
  originalPath: string
  quarantinePath: string
}

type BackupRestoreQuarantine = {
  directory: string
  artifacts: BackupRestoreQuarantineArtifact[]
}

type BackupRestoreActivation = {
  stagedPath: string
  targetPath: string
}

export async function backupBundleRestore(options: {
  backupDirectory: string
  databasePath: string
  sendsFolder: string
  attachmentsFolder: string
}): Promise<Result<string>> {
  const op = "backupBundleRestore"
  if (options.attachmentsFolder.startsWith("s3://"))
    return resultErrorCreate(op, "S3 attachment objects must be restored independently.")
  const targetsResult = await backupRestoreTargetsPrepare(options)
  if (!targetsResult.success) return targetsResult
  const targets = targetsResult.data

  const backupDirectory = resolve(options.backupDirectory)
  if (
    backupPathIsWithin(targets.sendsFolder, backupDirectory) ||
    backupPathIsWithin(targets.attachmentsFolder, backupDirectory) ||
    backupPathIsWithin(backupDirectory, targets.databasePath) ||
    backupPathIsWithin(backupDirectory, targets.sendsFolder) ||
    backupPathIsWithin(backupDirectory, targets.attachmentsFolder)
  ) {
    return resultErrorCreate(op, "Backup directory cannot be inside configured storage.")
  }

  const manifestResult = await backupManifestValidate(backupDirectory)
  if (!manifestResult.success) return manifestResult
  const manifest = manifestResult.data

  const stageResult = await backupRestoreStageCreate(targets.databasePath)
  if (!stageResult.success) return stageResult
  const stage = stageResult.data
  let quarantine: BackupRestoreQuarantine | undefined

  try {
    const stageFilesResult = await backupRestoreStagePopulate(backupDirectory, manifest, stage)
    if (!stageFilesResult.success) return stageFilesResult
    const stagedManifestResult = await backupManifestValidate(stage.directory)
    if (!stagedManifestResult.success) return stagedManifestResult

    const migrationResult = await backupRestoreDatabasePrepare(stage.databasePath)
    if (!migrationResult.success) return migrationResult

    const quarantineResult = await backupRestoreQuarantineCreate(targets)
    if (!quarantineResult.success) return quarantineResult
    quarantine = quarantineResult.data

    const moveResult = await backupRestoreCurrentDataMove(quarantine)
    if (!moveResult.success) return moveResult

    const activationResult = await backupRestoreActivate(stage, targets, quarantine)
    if (!activationResult.success) return activationResult

    await backupRestoreTemporaryDirectoryRemove(stage.directory)
    return resultCreate(quarantine.directory)
  } catch {
    return quarantine === undefined
      ? resultErrorCreate(op, "Restore failed before activation.")
      : resultErrorCreate(op, "Restore failed; the previous data remains in the quarantine.")
  } finally {
    await backupRestoreTemporaryDirectoryRemove(stage.directory)
  }
}

async function backupRestoreTargetsPrepare(options: {
  databasePath: string
  sendsFolder: string
  attachmentsFolder: string
}): Promise<Result<BackupRestoreTargets>> {
  const op = "backupRestoreTargetsPrepare"
  if (databasePathIsMemory(options.databasePath))
    return resultErrorCreate(op, "In-memory database targets cannot be restored.")

  const databaseResult = await backupRestoreTargetPathPrepare(options.databasePath, "Database", "file")
  if (!databaseResult.success) return databaseResult
  const sendsResult = await backupRestoreTargetPathPrepare(options.sendsFolder, "Sends", "directory")
  if (!sendsResult.success) return sendsResult
  const attachmentsResult = await backupRestoreTargetPathPrepare(options.attachmentsFolder, "Attachments", "directory")
  if (!attachmentsResult.success) return attachmentsResult

  const paths = [databaseResult.data, sendsResult.data, attachmentsResult.data]
  for (let leftIndex = 0; leftIndex < paths.length; leftIndex += 1) {
    const left = paths[leftIndex]
    if (left === undefined) continue
    for (let rightIndex = leftIndex + 1; rightIndex < paths.length; rightIndex += 1) {
      const right = paths[rightIndex]
      if (right === undefined) continue
      if (left === right || backupPathIsWithin(left, right) || backupPathIsWithin(right, left))
        return resultErrorCreate(op, "Database and storage targets must not overlap.")
    }
  }
  const sidecarResult = await backupRestoreDatabaseSidecarsValidate(databaseResult.data)
  if (!sidecarResult.success) return sidecarResult
  return resultCreate({
    attachmentsFolder: attachmentsResult.data,
    databasePath: databaseResult.data,
    sendsFolder: sendsResult.data,
  })
}

async function backupRestoreTargetPathPrepare(
  configuredPath: string,
  label: string,
  kind: "directory" | "file",
): Promise<Result<string>> {
  const op = "backupRestoreTargetPathPrepare"
  if (configuredPath.trim().length === 0) return resultErrorCreate(op, `${label} target cannot be empty.`)
  const resolvedPath = resolve(configuredPath)
  const parentResult = await backupRestoreParentPrepare(dirname(resolvedPath))
  if (!parentResult.success) return resultErrorCreate(op, `${label} target parent is invalid.`)

  try {
    const stats = await lstat(resolvedPath)
    if (stats.isSymbolicLink()) return resultErrorCreate(op, `${label} target must not be a symlink.`)
    if (kind === "file" && !stats.isFile()) return resultErrorCreate(op, `${label} target must be a regular file.`)
    if (kind === "directory" && !stats.isDirectory())
      return resultErrorCreate(op, `${label} target must be a directory.`)
    if ((await realpath(resolvedPath)) !== resolvedPath)
      return resultErrorCreate(op, `${label} target path must not contain symlinks.`)
  } catch (error) {
    if (!backupErrorIsNotFound(error)) return resultErrorCreate(op, `${label} target could not be inspected.`)
  }
  return resultCreate(resolvedPath)
}

async function backupRestoreParentPrepare(parentPath: string): Promise<Result<void>> {
  const op = "backupRestoreParentPrepare"
  try {
    await mkdir(parentPath, { mode: 0o700, recursive: true })
    const stats = await lstat(parentPath)
    if (stats.isSymbolicLink() || !stats.isDirectory())
      return resultErrorCreate(op, "Restore target parent is invalid.")
    if ((await realpath(parentPath)) !== parentPath)
      return resultErrorCreate(op, "Restore target parent must not contain symlinks.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Restore target parent could not be prepared.")
  }
}

async function backupRestoreDatabaseSidecarsValidate(databasePath: string): Promise<Result<void>> {
  const op = "backupRestoreDatabaseSidecarsValidate"
  for (const suffix of databaseSidecarSuffixes) {
    try {
      const sidecarPath = `${databasePath}${suffix}`
      const stats = await lstat(sidecarPath)
      if (stats.isSymbolicLink() || !stats.isFile())
        return resultErrorCreate(op, "Database sidecar paths must be regular, non-symlink files.")
      if ((await realpath(sidecarPath)) !== sidecarPath)
        return resultErrorCreate(op, "Database sidecar paths must not contain symlinks.")
    } catch (error) {
      if (!backupErrorIsNotFound(error)) return resultErrorCreate(op, "Database sidecar validation failed.")
    }
  }
  return resultCreate(undefined)
}

async function backupRestoreStageCreate(databasePath: string): Promise<Result<BackupRestoreStage>> {
  const op = "backupRestoreStageCreate"
  const directory = join(dirname(databasePath), `.onewarden-restore-${randomUUID()}.tmp`)
  try {
    await mkdir(directory, { mode: 0o700 })
    await mkdir(join(directory, backupSendsDirectory), { mode: 0o700 })
    await mkdir(join(directory, backupAttachmentsDirectory), { mode: 0o700 })
    return resultCreate({
      attachmentsFolder: join(directory, backupAttachmentsDirectory),
      databasePath: join(directory, backupDatabaseFile),
      directory,
      sendsFolder: join(directory, backupSendsDirectory),
    })
  } catch {
    try {
      await rm(directory, { force: true, recursive: true })
    } catch {
      // The staging directory is already inaccessible; the restore has not activated anything.
    }
    return resultErrorCreate(op, "Restore staging directory could not be created.")
  }
}

async function backupRestoreStagePopulate(
  backupDirectory: string,
  manifest: BackupManifest,
  stage: BackupRestoreStage,
): Promise<Result<void>> {
  const op = "backupRestoreStagePopulate"
  try {
    await writeFile(join(stage.directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    })
  } catch {
    return resultErrorCreate(op, "Restore manifest could not be staged.")
  }

  for (const file of manifest.files) {
    const sourcePath = join(backupDirectory, ...file.path.split("/"))
    const stagePath = join(stage.directory, ...file.path.split("/"))
    const bytesResult = await backupRestoreFileBytesRead(sourcePath)
    if (!bytesResult.success) return bytesResult
    if (bytesResult.data.byteLength !== file.size)
      return resultErrorCreate(op, `Backup changed while being staged: ${file.path}.`)
    const digestResult = await sha256Hex(bytesResult.data)
    if (!digestResult.success || digestResult.data !== file.sha256)
      return resultErrorCreate(op, `Backup changed while being staged: ${file.path}.`)
    try {
      await mkdir(dirname(stagePath), { mode: 0o700, recursive: true })
      await writeFile(stagePath, bytesResult.data, { mode: 0o600 })
    } catch {
      return resultErrorCreate(op, `Backup file could not be staged: ${file.path}.`)
    }
  }
  return resultCreate(undefined)
}

async function backupRestoreDatabasePrepare(databasePath: string): Promise<Result<void>> {
  const op = "backupRestoreDatabasePrepare"
  const latestVersionResult = databaseMigrationsLatestVersionRead()
  if (!latestVersionResult.success) return latestVersionResult
  const databaseResult = databaseOpen(databasePath)
  if (!databaseResult.success) return resultErrorCreate(op, "Staged database could not be opened.")

  let prepareResult: Result<void>
  try {
    const migrationResult = databaseMigrate(databaseResult.data)
    if (!migrationResult.success) {
      prepareResult = resultErrorCreate(op, "Restored database schema could not be migrated.")
    } else {
      // SQLite integrity validation and WAL checkpointing are maintenance operations.
      const integrityRow = databaseResult.data.drizzle.values<[string]>(sql`PRAGMA integrity_check`)[0]
      const schemaRow = databaseResult.data.drizzle
        .select({ version: max(schemaVersion.version) })
        .from(schemaVersion)
        .get()
      if (integrityRow?.[0] !== "ok") {
        prepareResult = resultErrorCreate(op, "Staged database failed SQLite integrity validation.")
      } else if (schemaRow?.version !== latestVersionResult.data) {
        prepareResult = resultErrorCreate(op, "Restored database schema is incompatible with this runtime.")
      } else {
        const tableResult = databaseSchemaTablesValidate(databaseResult.data)
        if (!tableResult.success) {
          prepareResult = resultErrorCreate(op, "Restored database schema is incomplete.")
        } else {
          try {
            databaseResult.data.drizzle.run(sql`PRAGMA wal_checkpoint(TRUNCATE)`)
            prepareResult = resultCreate(undefined)
          } catch {
            prepareResult = resultErrorCreate(op, "Staged database could not be checkpointed.")
          }
        }
      }
    }
  } catch {
    prepareResult = resultErrorCreate(op, "Restored database preparation failed.")
  }

  const closeResult = databaseClose(databaseResult.data)
  if (!closeResult.success && prepareResult.success)
    return resultErrorCreate(op, "Staged database could not be closed.")
  return prepareResult
}

async function backupRestoreQuarantineCreate(targets: BackupRestoreTargets): Promise<Result<BackupRestoreQuarantine>> {
  const op = "backupRestoreQuarantineCreate"
  const timestamp = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replace(".", "")
  const directory = join(dirname(targets.databasePath), `onewarden-restore-quarantine-${timestamp}-${randomUUID()}`)
  const databaseDirectory = join(directory, "database")
  try {
    await mkdir(directory, { mode: 0o700 })
    await mkdir(databaseDirectory, { mode: 0o700 })
  } catch {
    return resultErrorCreate(op, "Restore quarantine could not be created.")
  }

  const artifacts: BackupRestoreQuarantineArtifact[] = [
    ...databaseSidecarSuffixes.map((suffix) => {
      const originalPath = `${targets.databasePath}${suffix}`
      return {
        existed: false,
        kind: "file" as const,
        originalPath,
        quarantinePath: join(databaseDirectory, basename(originalPath)),
      }
    }),
    {
      existed: false,
      kind: "file",
      originalPath: targets.databasePath,
      quarantinePath: join(databaseDirectory, basename(targets.databasePath)),
    },
    {
      existed: false,
      kind: "directory",
      originalPath: targets.sendsFolder,
      quarantinePath: join(directory, backupSendsDirectory),
    },
    {
      existed: false,
      kind: "directory",
      originalPath: targets.attachmentsFolder,
      quarantinePath: join(directory, backupAttachmentsDirectory),
    },
  ]

  for (const artifact of artifacts) {
    const existsResult = await backupRestoreEntryExists(artifact.originalPath)
    if (!existsResult.success) return existsResult
    artifact.existed = existsResult.data
  }
  try {
    await writeFile(
      join(directory, "quarantine.json"),
      `${JSON.stringify({ artifacts: artifacts.map(({ existed, kind, originalPath, quarantinePath }) => ({ existed, kind, originalPath, quarantinePath })) }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    )
  } catch {
    return resultErrorCreate(op, "Restore quarantine metadata could not be written.")
  }
  return resultCreate({ artifacts, directory })
}

async function backupRestoreCurrentDataMove(quarantine: BackupRestoreQuarantine): Promise<Result<void>> {
  const op = "backupRestoreCurrentDataMove"
  const movedArtifacts: BackupRestoreQuarantineArtifact[] = []
  for (const artifact of quarantine.artifacts) {
    if (!artifact.existed) continue
    const validationResult = await backupRestoreEntryValidate(artifact.originalPath, artifact.kind)
    if (!validationResult.success) {
      const recoveryResult = await backupRestoreQuarantineRecover(movedArtifacts)
      if (!recoveryResult.success) return recoveryResult
      return validationResult
    }
    try {
      await rename(artifact.originalPath, artifact.quarantinePath)
      movedArtifacts.push(artifact)
    } catch {
      const recoveryResult = await backupRestoreQuarantineRecover(movedArtifacts)
      if (!recoveryResult.success) return recoveryResult
      return resultErrorCreate(op, "Current data could not be moved to the quarantine.")
    }
  }
  return resultCreate(undefined)
}

async function backupRestoreActivate(
  stage: BackupRestoreStage,
  targets: BackupRestoreTargets,
  quarantine: BackupRestoreQuarantine,
): Promise<Result<void>> {
  const op = "backupRestoreActivate"
  const activations = [
    { stagedPath: stage.databasePath, targetPath: targets.databasePath },
    { stagedPath: stage.sendsFolder, targetPath: targets.sendsFolder },
    { stagedPath: stage.attachmentsFolder, targetPath: targets.attachmentsFolder },
  ]
  const activated: BackupRestoreActivation[] = []
  for (const activation of activations) {
    const targetExistsResult = await backupRestoreEntryExists(activation.targetPath)
    if (!targetExistsResult.success) {
      const rollbackResult = await backupRestoreActivationRollback(activated, quarantine)
      return rollbackResult.success ? targetExistsResult : rollbackResult
    }
    if (targetExistsResult.data) {
      const rollbackResult = await backupRestoreActivationRollback(activated, quarantine)
      return rollbackResult.success
        ? resultErrorCreate(op, "Restore target changed while the service was stopped.")
        : rollbackResult
    }
    try {
      await rename(activation.stagedPath, activation.targetPath)
      activated.push(activation)
    } catch {
      const rollbackResult = await backupRestoreActivationRollback(activated, quarantine)
      return rollbackResult.success
        ? resultErrorCreate(op, "Restored data could not be activated atomically.")
        : rollbackResult
    }
  }
  return resultCreate(undefined)
}

async function backupRestoreActivationRollback(
  activated: BackupRestoreActivation[],
  quarantine: BackupRestoreQuarantine,
): Promise<Result<void>> {
  const op = "backupRestoreActivationRollback"
  for (const activation of activated.toReversed()) {
    try {
      await rename(activation.targetPath, activation.stagedPath)
    } catch {
      return resultErrorCreate(op, "Restored data could not be removed during rollback.")
    }
  }
  const recoveryResult = await backupRestoreQuarantineRecover(
    quarantine.artifacts.filter((artifact) => artifact.existed),
  )
  if (!recoveryResult.success) return recoveryResult
  return resultCreate(undefined)
}

async function backupRestoreQuarantineRecover(artifacts: BackupRestoreQuarantineArtifact[]): Promise<Result<void>> {
  const op = "backupRestoreQuarantineRecover"
  for (const artifact of artifacts.toReversed()) {
    const targetExistsResult = await backupRestoreEntryExists(artifact.originalPath)
    if (!targetExistsResult.success) return targetExistsResult
    if (targetExistsResult.data) return resultErrorCreate(op, "Original data recovery target is not empty.")
    const copyResult =
      artifact.kind === "file"
        ? await backupRestoreFileCopyAtomic(artifact.quarantinePath, artifact.originalPath)
        : await backupRestoreDirectoryCopyAtomic(artifact.quarantinePath, artifact.originalPath)
    if (!copyResult.success) return copyResult
  }
  return resultCreate(undefined)
}

async function backupRestoreFileCopyAtomic(sourcePath: string, targetPath: string): Promise<Result<void>> {
  const op = "backupRestoreFileCopyAtomic"
  const bytesResult = await backupRestoreFileBytesRead(sourcePath)
  if (!bytesResult.success) return bytesResult
  const temporaryPath = `${targetPath}.onewarden-recovery-${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, bytesResult.data, { mode: 0o600, flag: "wx" })
    await rename(temporaryPath, targetPath)
    return resultCreate(undefined)
  } catch {
    await rm(temporaryPath, { force: true })
    return resultErrorCreate(op, "Original file could not be recovered.")
  }
}

async function backupRestoreDirectoryCopyAtomic(sourcePath: string, targetPath: string): Promise<Result<void>> {
  const op = "backupRestoreDirectoryCopyAtomic"
  const temporaryPath = `${targetPath}.onewarden-recovery-${randomUUID()}.tmp`
  try {
    await mkdir(temporaryPath, { mode: 0o700 })
    const copyResult = await backupRestoreDirectoryCopy(sourcePath, temporaryPath)
    if (!copyResult.success) {
      await rm(temporaryPath, { force: true, recursive: true })
      return copyResult
    }
    await rename(temporaryPath, targetPath)
    return resultCreate(undefined)
  } catch {
    await rm(temporaryPath, { force: true, recursive: true })
    return resultErrorCreate(op, "Original directory could not be recovered.")
  }
}

async function backupRestoreDirectoryCopy(sourcePath: string, targetPath: string): Promise<Result<void>> {
  const op = "backupRestoreDirectoryCopy"
  let entries: Dirent<string>[]
  try {
    const sourceStats = await lstat(sourcePath)
    if (sourceStats.isSymbolicLink() || !sourceStats.isDirectory())
      return resultErrorCreate(op, "Quarantine directory is invalid.")
    entries = await readdir(sourcePath, { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Quarantine directory could not be read.")
  }
  for (const entry of entries) {
    const sourceEntryPath = join(sourcePath, entry.name)
    const targetEntryPath = join(targetPath, entry.name)
    let stats: Awaited<ReturnType<typeof lstat>>
    try {
      stats = await lstat(sourceEntryPath)
    } catch {
      return resultErrorCreate(op, "Quarantine entry could not be inspected.")
    }
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Quarantine data must not contain symlinks.")
    if (stats.isDirectory()) {
      try {
        await mkdir(targetEntryPath, { mode: 0o700 })
      } catch {
        return resultErrorCreate(op, "Recovered directory could not be created.")
      }
      const childResult = await backupRestoreDirectoryCopy(sourceEntryPath, targetEntryPath)
      if (!childResult.success) return childResult
      continue
    }
    if (!stats.isFile()) return resultErrorCreate(op, "Quarantine contains an unsupported file type.")
    const bytesResult = await backupRestoreFileBytesRead(sourceEntryPath)
    if (!bytesResult.success) return bytesResult
    try {
      await writeFile(targetEntryPath, bytesResult.data, { mode: 0o600, flag: "wx" })
    } catch {
      return resultErrorCreate(op, "Recovered file could not be written.")
    }
  }
  return resultCreate(undefined)
}

async function backupRestoreEntryExists(path: string): Promise<Result<boolean>> {
  const op = "backupRestoreEntryExists"
  try {
    await lstat(path)
    return resultCreate(true)
  } catch (error) {
    if (backupErrorIsNotFound(error)) return resultCreate(false)
    return resultErrorCreate(op, "Restore entry could not be inspected.")
  }
}

async function backupRestoreEntryValidate(path: string, kind: "directory" | "file"): Promise<Result<void>> {
  const op = "backupRestoreEntryValidate"
  try {
    const stats = await lstat(path)
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Current data must not contain symlinks.")
    if (kind === "file" && !stats.isFile())
      return resultErrorCreate(op, "Current database entry is not a regular file.")
    if (kind === "directory" && !stats.isDirectory())
      return resultErrorCreate(op, "Current storage entry is not a directory.")
    if ((await realpath(path)) !== path) return resultErrorCreate(op, "Current data path must not contain symlinks.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Current data could not be inspected.")
  }
}

async function backupRestoreFileBytesRead(path: string): Promise<Result<Uint8Array>> {
  const op = "backupRestoreFileBytesRead"
  let fileHandle: Awaited<ReturnType<typeof open>> | undefined
  let bytesResult: Result<Uint8Array>
  try {
    fileHandle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stats = await fileHandle.stat()
    if (!stats.isFile()) bytesResult = resultErrorCreate(op, "Restore source is not a regular file.")
    else bytesResult = resultCreate(Uint8Array.from(await fileHandle.readFile()))
  } catch {
    bytesResult = resultErrorCreate(op, "Restore source file could not be read.")
  }
  if (fileHandle !== undefined) {
    try {
      await fileHandle.close()
    } catch {
      return resultErrorCreate(op, "Restore source file could not be closed.")
    }
  }
  return bytesResult
}

async function backupRestoreTemporaryDirectoryRemove(directory: string): Promise<Result<void>> {
  try {
    await rm(directory, { force: true, recursive: true })
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("backupRestoreTemporaryDirectoryRemove", "Restore staging directory could not be removed.")
  }
}

function backupPathIsWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`)
}

function backupErrorIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
