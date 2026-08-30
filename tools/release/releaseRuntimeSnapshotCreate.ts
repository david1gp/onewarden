import { constants, type Dirent } from "node:fs"
import { chmod, copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises"
import { basename, dirname, join, resolve, sep } from "node:path"
import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { releaseRuntimeProtectedPathsRead } from "./releaseRuntimeProtectedPathsRead.js"

const releaseRuntimeProtectedNames = new Set([".env", "data"])

export async function releaseRuntimeSnapshotCreate(
  runtimeDirectory: string,
  snapshotDirectory: string,
): Promise<Result<void>> {
  const op = "releaseRuntimeSnapshotCreate"
  const runtimePath = resolve(runtimeDirectory)
  const snapshotPath = resolve(snapshotDirectory)
  if (runtimePath === snapshotPath || releaseRuntimePathsOverlap(runtimePath, snapshotPath))
    return resultErrorCreate(op, "Runtime snapshot must be outside the managed runtime.")
  let runtimeStats: Awaited<ReturnType<typeof lstat>> | undefined
  try {
    runtimeStats = await lstat(runtimePath)
  } catch (error) {
    if (releaseRuntimeIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Managed runtime could not be inspected for a snapshot.")
  }
  if (runtimeStats.isSymbolicLink() || !runtimeStats.isDirectory())
    return resultErrorCreate(op, "Managed runtime must be a regular directory.")
  const protectedPathsResult = await releaseRuntimeProtectedPathsRead(runtimePath)
  if (!protectedPathsResult.success) return protectedPathsResult
  try {
    await mkdir(dirname(snapshotPath), { mode: 0o700, recursive: true })
    await lstat(snapshotPath)
    return resultErrorCreate(op, "Runtime snapshot destination already exists.")
  } catch (error) {
    if (!releaseRuntimeIsNotFound(error)) return resultErrorCreate(op, "Runtime snapshot destination is invalid.")
  }

  let stagingPath: string | undefined
  try {
    stagingPath = await mkdtemp(join(dirname(snapshotPath), `.${basename(snapshotPath)}.staging-`))
    const copyResult = await releaseRuntimeDirectoryCopy(runtimePath, stagingPath, "", protectedPathsResult.data)
    if (!copyResult.success) return copyResult
    await rename(stagingPath, snapshotPath)
    stagingPath = undefined
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Runtime snapshot could not be atomically published.")
  } finally {
    if (stagingPath !== undefined) await rm(stagingPath, { force: true, recursive: true }).catch(() => undefined)
  }
}

async function releaseRuntimeDirectoryCopy(
  sourceDirectory: string,
  destinationDirectory: string,
  relativeDirectory: string,
  protectedPaths: ReadonlySet<string>,
): Promise<Result<void>> {
  const op = "releaseRuntimeDirectoryCopy"
  let entries: Dirent<string>[]
  try {
    entries = await readdir(join(sourceDirectory, relativeDirectory), { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Runtime snapshot source could not be read.")
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
      return resultErrorCreate(op, "Runtime snapshot source entry could not be inspected.")
    }
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Managed runtime must not contain symlinks.")
    if (stats.isDirectory()) {
      try {
        await mkdir(destinationPath, { mode: 0o700, recursive: false })
        await chmod(destinationPath, stats.mode & 0o7777)
      } catch {
        return resultErrorCreate(op, "Runtime snapshot directory could not be created.")
      }
      const childResult = await releaseRuntimeDirectoryCopy(
        sourceDirectory,
        destinationDirectory,
        join(relativeDirectory, entry.name),
        protectedPaths,
      )
      if (!childResult.success) return childResult
      continue
    }
    if (!stats.isFile()) return resultErrorCreate(op, "Managed runtime contains an unsupported entry.")
    try {
      await mkdir(join(destinationDirectory, relativeDirectory), { mode: 0o700, recursive: true })
      await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL)
      await chmod(destinationPath, stats.mode & 0o7777)
    } catch {
      return resultErrorCreate(op, "Runtime snapshot file could not be copied.")
    }
  }
  return resultCreate(undefined)
}

function releaseRuntimePathIsProtected(path: string, protectedPaths: ReadonlySet<string>): boolean {
  if (protectedPaths.has(path)) return true
  for (const protectedPath of protectedPaths) {
    if (path.startsWith(`${protectedPath}/`)) return true
  }
  const rootName = path.split("/")[0]
  return (
    rootName !== undefined &&
    (releaseRuntimeProtectedNames.has(rootName) ||
      rootName.startsWith(".env.") ||
      rootName.startsWith("onewarden.sqlite") ||
      rootName.startsWith("onewarden-backup-"))
  )
}

function releaseRuntimePathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}${sep}`) || right.startsWith(`${left}${sep}`)
}

function releaseRuntimeIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}

if (import.meta.main) {
  const runtimeDirectory = process.argv[2]
  const snapshotDirectory = process.argv[3]
  if (runtimeDirectory === undefined || snapshotDirectory === undefined || process.argv.length > 4) {
    console.error("Usage: bun tools/release/releaseRuntimeSnapshotCreate.ts <runtime> <snapshot>")
    process.exitCode = 1
  } else {
    const result = await releaseRuntimeSnapshotCreate(runtimeDirectory, snapshotDirectory)
    if (!result.success) {
      console.error(`Runtime snapshot failed: ${result.errorMessage}`)
      process.exitCode = 1
    }
  }
}
