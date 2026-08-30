import { constants, type Dirent } from "node:fs"
import { chmod, copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises"
import { basename, dirname, join, resolve, sep } from "node:path"
import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { releaseRuntimeProtectedPathsRead } from "./releaseRuntimeProtectedPathsRead.js"

const releaseRuntimeProtectedNames = new Set([".env", "data"])

export async function releaseRuntimeSnapshotRestore(
  snapshotDirectory: string,
  runtimeDirectory: string,
): Promise<Result<void>> {
  const op = "releaseRuntimeSnapshotRestore"
  const snapshotPath = resolve(snapshotDirectory)
  const runtimePath = resolve(runtimeDirectory)
  if (snapshotPath === runtimePath || releaseRuntimePathsOverlap(snapshotPath, runtimePath))
    return resultErrorCreate(op, "Runtime snapshot must be outside the managed runtime.")

  const snapshotResult = await releaseRuntimeDirectoryValidate(snapshotPath, "Runtime snapshot")
  if (!snapshotResult.success) return snapshotResult
  const runtimeResult = await releaseRuntimeDirectoryValidate(runtimePath, "Managed runtime", true)
  if (!runtimeResult.success) return runtimeResult
  const protectedPathsResult = await releaseRuntimeProtectedPathsRead(runtimePath)
  if (!protectedPathsResult.success) return protectedPathsResult

  let stagingPath: string | undefined
  let oldRuntimePath: string | undefined
  let runtimeMoved = false
  try {
    await mkdir(dirname(runtimePath), { mode: 0o700, recursive: true })
    stagingPath = await mkdtemp(join(dirname(runtimePath), `.${basename(runtimePath)}.restore-`))
    const packageResult = await releaseRuntimeDirectoryRestore(snapshotPath, stagingPath, "", protectedPathsResult.data)
    if (!packageResult.success) return packageResult
    const protectedResult = await releaseRuntimeProtectedEntriesCopy(
      runtimePath,
      stagingPath,
      protectedPathsResult.data,
    )
    if (!protectedResult.success) return protectedResult

    if (runtimeResult.data.exists) {
      oldRuntimePath = await mkdtemp(join(dirname(runtimePath), `.${basename(runtimePath)}.rollback-old-`))
      await rm(oldRuntimePath, { force: true, recursive: true })
      await rename(runtimePath, oldRuntimePath)
      runtimeMoved = true
    }
    await rename(stagingPath, runtimePath)
    stagingPath = undefined
  } catch {
    if (runtimeMoved && oldRuntimePath !== undefined) {
      await rm(runtimePath, { force: true, recursive: true }).catch(() => undefined)
      await rename(oldRuntimePath, runtimePath).catch(() => undefined)
    }
    return resultErrorCreate(op, "Runtime package could not be atomically restored.")
  } finally {
    if (stagingPath !== undefined) await rm(stagingPath, { force: true, recursive: true }).catch(() => undefined)
  }

  if (oldRuntimePath !== undefined) await rm(oldRuntimePath, { force: true, recursive: true }).catch(() => undefined)
  return resultCreate(undefined)
}

async function releaseRuntimeDirectoryValidate(
  directory: string,
  label: string,
  allowMissing = false,
): Promise<Result<{ exists: boolean }>> {
  const op = "releaseRuntimeDirectoryValidate"
  try {
    const stats = await lstat(directory)
    if (stats.isSymbolicLink() || !stats.isDirectory()) return resultErrorCreate(op, `${label} is invalid.`)
    return resultCreate({ exists: true })
  } catch (error) {
    if (allowMissing && releaseRuntimeIsNotFound(error)) return resultCreate({ exists: false })
    return resultErrorCreate(op, `${label} could not be opened.`)
  }
}

async function releaseRuntimeDirectoryRestore(
  sourceDirectory: string,
  destinationDirectory: string,
  relativeDirectory: string,
  protectedPaths: ReadonlySet<string>,
): Promise<Result<void>> {
  const op = "releaseRuntimeDirectoryRestore"
  let entries: Dirent<string>[]
  try {
    entries = await readdir(join(sourceDirectory, relativeDirectory), { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Runtime snapshot could not be read for rollback.")
  }
  for (const entry of entries) {
    const entryRelativePath = relativeDirectory.length === 0 ? entry.name : `${relativeDirectory}/${entry.name}`
    if (releaseRuntimePathIsProtected(entryRelativePath, protectedPaths)) continue
    const sourcePath = join(sourceDirectory, relativeDirectory, entry.name)
    const destinationPath = join(destinationDirectory, relativeDirectory, entry.name)
    let stats: Awaited<ReturnType<typeof lstat>>
    try {
      stats = await lstat(sourcePath)
    } catch {
      return resultErrorCreate(op, "Runtime snapshot entry could not be inspected.")
    }
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Runtime snapshot must not contain symlinks.")
    if (stats.isDirectory()) {
      try {
        await mkdir(destinationPath, { mode: 0o700, recursive: false })
        await chmod(destinationPath, stats.mode & 0o7777)
      } catch {
        return resultErrorCreate(op, "Runtime rollback directory could not be created.")
      }
      const childResult = await releaseRuntimeDirectoryRestore(
        sourceDirectory,
        destinationDirectory,
        join(relativeDirectory, entry.name),
        protectedPaths,
      )
      if (!childResult.success) return childResult
      continue
    }
    if (!stats.isFile()) return resultErrorCreate(op, "Runtime snapshot contains an unsupported entry.")
    try {
      await mkdir(join(destinationDirectory, relativeDirectory), { mode: 0o700, recursive: true })
      await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL)
      await chmod(destinationPath, stats.mode & 0o7777)
    } catch {
      return resultErrorCreate(op, "Runtime rollback file could not be copied.")
    }
  }
  return resultCreate(undefined)
}

async function releaseRuntimeProtectedEntriesCopy(
  runtimeDirectory: string,
  stagingDirectory: string,
  protectedPaths: ReadonlySet<string>,
): Promise<Result<void>> {
  const op = "releaseRuntimeProtectedEntriesCopy"
  let entries: Dirent<string>[]
  try {
    entries = await readdir(runtimeDirectory, { encoding: "utf8", withFileTypes: true })
  } catch (error) {
    if (releaseRuntimeIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Managed runtime protected storage could not be read.")
  }

  for (const entry of entries) {
    if (!releaseRuntimeProtectedRootNameIsProtected(entry.name)) continue
    const copyResult = await releaseRuntimeEntryCopy(
      join(runtimeDirectory, entry.name),
      join(stagingDirectory, entry.name),
    )
    if (!copyResult.success) return copyResult
  }
  for (const protectedPath of protectedPaths) {
    if (releaseRuntimePathHasProtectedRoot(protectedPath)) continue
    const sourcePath = join(runtimeDirectory, ...protectedPath.split("/"))
    const destinationPath = join(stagingDirectory, ...protectedPath.split("/"))
    const copyResult = await releaseRuntimeEntryCopy(sourcePath, destinationPath)
    if (!copyResult.success) return copyResult
  }
  return resultCreate(undefined)
}

async function releaseRuntimeEntryCopy(sourcePath: string, destinationPath: string): Promise<Result<void>> {
  const op = "releaseRuntimeEntryCopy"
  let stats: Awaited<ReturnType<typeof lstat>>
  try {
    stats = await lstat(sourcePath)
  } catch (error) {
    if (releaseRuntimeIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Protected runtime storage could not be inspected.")
  }
  if (stats.isSymbolicLink()) return resultErrorCreate(op, "Protected runtime storage must not contain symlinks.")
  if (stats.isDirectory()) {
    try {
      await mkdir(destinationPath, { mode: 0o700, recursive: true })
      await chmod(destinationPath, stats.mode & 0o7777)
      const entries = await readdir(sourcePath, { encoding: "utf8", withFileTypes: true })
      for (const entry of entries) {
        const childResult = await releaseRuntimeEntryCopy(
          join(sourcePath, entry.name),
          join(destinationPath, entry.name),
        )
        if (!childResult.success) return childResult
      }
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Protected runtime storage could not be copied.")
    }
  }
  if (!stats.isFile()) return resultErrorCreate(op, "Protected runtime storage contains an unsupported entry.")
  try {
    await mkdir(dirname(destinationPath), { mode: 0o700, recursive: true })
    await copyFile(sourcePath, destinationPath)
    await chmod(destinationPath, stats.mode & 0o7777)
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Protected runtime storage could not be copied.")
  }
}

function releaseRuntimePathHasProtectedRoot(path: string): boolean {
  const rootName = path.split("/")[0]
  return rootName !== undefined && releaseRuntimeProtectedRootNameIsProtected(rootName)
}

function releaseRuntimePathIsProtected(path: string, protectedPaths: ReadonlySet<string>): boolean {
  if (protectedPaths.has(path)) return true
  for (const protectedPath of protectedPaths) {
    if (path.startsWith(`${protectedPath}/`)) return true
  }
  const rootName = path.split("/")[0]
  return rootName !== undefined && releaseRuntimeProtectedRootNameIsProtected(rootName)
}

function releaseRuntimeProtectedRootNameIsProtected(rootName: string): boolean {
  return (
    releaseRuntimeProtectedNames.has(rootName) ||
    rootName.startsWith(".env.") ||
    rootName.startsWith("onewarden.sqlite") ||
    rootName.startsWith("onewarden-backup-")
  )
}

function releaseRuntimePathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}${sep}`) || right.startsWith(`${left}${sep}`)
}

function releaseRuntimeIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}

if (import.meta.main) {
  const snapshotDirectory = process.argv[2]
  const runtimeDirectory = process.argv[3]
  if (snapshotDirectory === undefined || runtimeDirectory === undefined || process.argv.length > 4) {
    console.error("Usage: bun tools/release/releaseRuntimeSnapshotRestore.ts <snapshot> <runtime>")
    process.exitCode = 1
  } else {
    const result = await releaseRuntimeSnapshotRestore(snapshotDirectory, runtimeDirectory)
    if (!result.success) {
      console.error(`Runtime rollback failed: ${result.errorMessage}`)
      process.exitCode = 1
    }
  }
}
