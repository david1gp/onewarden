import { constants, type Dirent } from "node:fs"
import { lstat, open, readdir, readFile, realpath } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import * as v from "valibot"
import { type Result } from "#result"
import { type ReleaseManifest, releaseManifestSchema } from "../../src/server/release/releaseManifestSchema.js"
import { sha256Hex } from "../../src/shared/crypto/sha256Hex.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { releaseMigrationsValidate } from "./releaseMigrationsValidate.js"

const releasePackageRequiredFiles = [
  "server/server.js",
  "tools/backup/backupCli.js",
  "tools/backup/restoreCli.js",
  "package.json",
]

type ReleasePackageValidateOptions = {
  ignoredPaths?: ReadonlySet<string>
}

export async function releasePackageValidate(
  packageDirectory: string,
  options?: ReleasePackageValidateOptions,
): Promise<Result<ReleaseManifest>> {
  const op = "releasePackageValidate"
  const packagePathResult = await releasePackageDirectoryValidate(packageDirectory)
  if (!packagePathResult.success) return packagePathResult
  const manifestResult = await releasePackageManifestRead(join(packageDirectory, "release.json"))
  if (!manifestResult.success) return manifestResult
  const manifest = manifestResult.data
  const packageMetadataResult = await releasePackageMetadataRead(join(packageDirectory, "package.json"))
  if (!packageMetadataResult.success) return packageMetadataResult
  if (manifest.application !== "onewarden" || packageMetadataResult.data.application !== "onewarden")
    return resultErrorCreate(op, "Release application identity is invalid.")
  if (manifest.application !== packageMetadataResult.data.application)
    return resultErrorCreate(op, "Release application does not match package.json.")
  if (manifest.releaseVersion !== packageMetadataResult.data.releaseVersion)
    return resultErrorCreate(op, "Release version does not match package.json.")
  const bunResult = releaseBunEngineValidate(manifest.bunVersion, packageMetadataResult.data.bunEngine)
  if (!bunResult.success) return bunResult
  if (manifest.gitHead.length !== 40 || !/^[0-9a-f]{40}$/.test(manifest.gitHead))
    return resultErrorCreate(op, "Release Git HEAD is not a full commit.")
  if (manifest.artifactFormat !== 1) return resultErrorCreate(op, "Release artifact format is unsupported.")
  const migrationsResult = await releaseMigrationsValidate(join(packageDirectory, "migrations"))
  if (!migrationsResult.success) return migrationsResult
  if (manifest.schemaVersion !== migrationsResult.data.latestVersion)
    return resultErrorCreate(op, "Release schema version does not match packaged migrations.")
  if (manifest.schemaIdentity !== `onewarden-schema-${manifest.schemaVersion}`)
    return resultErrorCreate(op, "Release schema identity is invalid.")

  for (const requiredFile of releasePackageRequiredFiles) {
    if (!manifest.files.some((file) => file.path === requiredFile))
      return resultErrorCreate(op, `Release package is missing ${requiredFile}.`)
  }
  if (!manifest.files.some((file) => file.path === "migrations/0001_schema_version.sql"))
    return resultErrorCreate(op, "Release package is missing the schema migration.")
  if (!manifest.files.some((file) => file.path === "build/web/index.html"))
    return resultErrorCreate(op, "Release package is missing the web vault.")

  const filesResult = await releasePackageFilesRead(packageDirectory, options?.ignoredPaths)
  if (!filesResult.success) return filesResult
  if (!releasePackageFileListsEqual(filesResult.data, manifest.files))
    return resultErrorCreate(op, "Release package contents do not match release.json.")
  const hashResult = await releasePackageHashesValidate(packageDirectory, manifest)
  if (!hashResult.success) return hashResult
  const artifactResult = await releasePackageArtifactHashCreate(manifest.files)
  if (!artifactResult.success) return artifactResult
  if (artifactResult.data !== manifest.artifactSha256)
    return resultErrorCreate(op, "Release artifact identity does not match release.json.")
  return resultCreate(manifest)
}

function releaseBunEngineValidate(manifestVersion: string, engine: string): Result<void> {
  const op = "releaseBunEngineValidate"
  const minimumMatch = /^>=\s*(\d+)\.(\d+)\.(\d+)$/u.exec(engine.trim())
  const manifestMatch = /^(\d+)\.(\d+)\.(\d+)$/u.exec(manifestVersion)
  const runtimeMatch = /^(\d+)\.(\d+)\.(\d+)$/u.exec(Bun.version)
  if (minimumMatch === null || manifestMatch === null || runtimeMatch === null)
    return resultErrorCreate(op, "Release Bun engine metadata is invalid.")

  const minimum = releaseBunVersionTupleRead(minimumMatch)
  const manifest = releaseBunVersionTupleRead(manifestMatch)
  const runtime = releaseBunVersionTupleRead(runtimeMatch)
  if (minimum === undefined || manifest === undefined || runtime === undefined)
    return resultErrorCreate(op, "Release Bun engine metadata is invalid.")
  if (releaseBunVersionCompare(manifest, minimum) < 0 || releaseBunVersionCompare(runtime, minimum) < 0)
    return resultErrorCreate(op, "Bun does not satisfy the packaged release engine requirement.")
  if (releaseBunVersionCompare(runtime, manifest) < 0)
    return resultErrorCreate(op, "Bun is older than the version used to build the release.")
  return resultCreate(undefined)
}

function releaseBunVersionTupleRead(match: RegExpExecArray): [number, number, number] | undefined {
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if (![major, minor, patch].every((value) => Number.isSafeInteger(value) && value >= 0)) return undefined
  return [major, minor, patch]
}

function releaseBunVersionCompare(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    if (leftValue !== rightValue) return leftValue - rightValue
  }
  return 0
}

async function releasePackageDirectoryValidate(packageDirectory: string): Promise<Result<void>> {
  const op = "releasePackageDirectoryValidate"
  try {
    const stats = await lstat(packageDirectory)
    if (stats.isSymbolicLink() || !stats.isDirectory())
      return resultErrorCreate(op, "Release package must be a directory.")
    if ((await realpath(packageDirectory)) !== packageDirectory)
      return resultErrorCreate(op, "Release package must not contain symlinks.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Release package directory does not exist.")
  }
}

async function releasePackageManifestRead(path: string): Promise<Result<ReleaseManifest>> {
  const op = "releasePackageManifestRead"
  let contents: string
  try {
    const stats = await lstat(path)
    if (stats.isSymbolicLink() || !stats.isFile())
      return resultErrorCreate(op, "Release package manifest must be a regular file.")
    contents = await readFile(path, "utf8")
  } catch {
    return resultErrorCreate(op, "Release package manifest is missing.")
  }
  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    return resultErrorCreate(op, "Release package manifest is not valid JSON.")
  }
  const result = v.safeParse(releaseManifestSchema, value)
  if (!result.success) return resultErrorCreate(op, "Release package manifest is invalid.")
  return resultCreate(result.output)
}

async function releasePackageMetadataRead(
  path: string,
): Promise<Result<{ application: string; bunEngine: string; releaseVersion: string }>> {
  const op = "releasePackageMetadataRead"
  let contents: string
  try {
    contents = await readFile(path, "utf8")
  } catch {
    return resultErrorCreate(op, "Release package package.json is missing.")
  }
  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    return resultErrorCreate(op, "Release package package.json is not valid JSON.")
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    value.name.length === 0 ||
    !("version" in value) ||
    typeof value.version !== "string" ||
    value.version.length === 0 ||
    !("engines" in value) ||
    typeof value.engines !== "object" ||
    value.engines === null ||
    !("bun" in value.engines) ||
    typeof value.engines.bun !== "string" ||
    value.engines.bun.length === 0
  )
    return resultErrorCreate(op, "Release package package.json has no application, release version, or Bun engine.")
  return resultCreate({ application: value.name, bunEngine: value.engines.bun, releaseVersion: value.version })
}

async function releasePackageFilesRead(
  packageDirectory: string,
  ignoredPaths: ReadonlySet<string> | undefined,
): Promise<Result<ReleaseManifest["files"]>> {
  const files: ReleaseManifest["files"] = []
  const walkResult = await releasePackageFilesWalk(packageDirectory, packageDirectory, files, ignoredPaths)
  if (!walkResult.success) return walkResult
  files.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
  return resultCreate(files)
}

async function releasePackageFilesWalk(
  packageDirectory: string,
  currentDirectory: string,
  files: ReleaseManifest["files"],
  ignoredPaths: ReadonlySet<string> | undefined,
): Promise<Result<void>> {
  const op = "releasePackageFilesWalk"
  let entries: Dirent<string>[]
  try {
    entries = await readdir(currentDirectory, { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Release package contents could not be read.")
  }
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  for (const entry of entries) {
    const path = join(currentDirectory, entry.name)
    const relativePath = relative(packageDirectory, path).split(sep).join("/")
    if (relativePath === "release.json") continue
    if (releasePackagePathIgnored(relativePath, ignoredPaths)) continue
    let stats: Awaited<ReturnType<typeof lstat>>
    try {
      stats = await lstat(path)
    } catch {
      return resultErrorCreate(op, "Release package entry could not be inspected.")
    }
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Release package must not contain symlinks.")
    if (stats.isDirectory()) {
      const childResult = await releasePackageFilesWalk(packageDirectory, path, files, ignoredPaths)
      if (!childResult.success) return childResult
      continue
    }
    if (!stats.isFile()) return resultErrorCreate(op, "Release package contains an unsupported file type.")
    files.push({ path: relativePath, size: stats.size, sha256: "" })
  }
  return resultCreate(undefined)
}

function releasePackagePathIgnored(path: string, ignoredPaths: ReadonlySet<string> | undefined): boolean {
  if (ignoredPaths !== undefined) {
    if (ignoredPaths.has(path)) return true
    for (const ignoredPath of ignoredPaths) {
      if (path.startsWith(`${ignoredPath}/`)) return true
    }
  }
  const rootName = path.split("/")[0]
  return (
    rootName !== undefined &&
    (rootName === ".env" ||
      rootName.startsWith(".env.") ||
      rootName.startsWith("onewarden.sqlite") ||
      rootName.startsWith("onewarden-backup-"))
  )
}

function releasePackageFileListsEqual(
  actualFiles: ReleaseManifest["files"],
  manifestFiles: ReleaseManifest["files"],
): boolean {
  if (actualFiles.length !== manifestFiles.length) return false
  return actualFiles.every((file, index) => file.path === manifestFiles[index]?.path)
}

async function releasePackageHashesValidate(
  packageDirectory: string,
  manifest: ReleaseManifest,
): Promise<Result<void>> {
  const op = "releasePackageHashesValidate"
  for (const file of manifest.files) {
    const path = join(packageDirectory, ...file.path.split("/"))
    const bytesResult = await releasePackageFileBytesRead(path)
    if (!bytesResult.success) return bytesResult
    if (bytesResult.data.byteLength !== file.size)
      return resultErrorCreate(op, `Release size mismatch for ${file.path}.`)
    const digestResult = await sha256Hex(bytesResult.data)
    if (!digestResult.success || digestResult.data !== file.sha256)
      return resultErrorCreate(op, `Release hash mismatch for ${file.path}.`)
  }
  return resultCreate(undefined)
}

async function releasePackageFileBytesRead(path: string): Promise<Result<Uint8Array>> {
  const op = "releasePackageFileBytesRead"
  let fileHandle: Awaited<ReturnType<typeof open>> | undefined
  try {
    fileHandle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stats = await fileHandle.stat()
    if (!stats.isFile()) return resultErrorCreate(op, "Release package entry is not a regular file.")
    return resultCreate(Uint8Array.from(await fileHandle.readFile()))
  } catch {
    return resultErrorCreate(op, "Release package file could not be read.")
  } finally {
    if (fileHandle !== undefined) await fileHandle.close().catch(() => undefined)
  }
}

async function releasePackageArtifactHashCreate(files: ReleaseManifest["files"]): Promise<Result<string>> {
  const digestResult = await sha256Hex(new TextEncoder().encode(JSON.stringify(files)))
  if (!digestResult.success)
    return resultErrorCreate("releasePackageArtifactHashCreate", "Release artifact hash failed.")
  return digestResult
}
