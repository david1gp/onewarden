import { constants, type Dirent } from "node:fs"
import { lstat, open, readdir, readFile, rename, writeFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { type Result } from "#result"
import { type ReleaseManifest } from "../../src/server/release/releaseManifestSchema.js"
import { sha256Hex } from "../../src/shared/crypto/sha256Hex.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { releaseMigrationsValidate } from "./releaseMigrationsValidate.js"

type ReleaseManifestGenerateOptions = {
  gitDirectory?: string
  bunVersion?: string
  allowDirtyWorktree?: boolean
}

type ReleaseGitMetadata = {
  gitHead: string
  gitTag: string | null
  builtAt: string
}

type ReleasePackageMetadata = {
  application: string
  releaseVersion: string
}

export async function releaseManifestGenerate(
  packageDirectory: string,
  options?: ReleaseManifestGenerateOptions,
): Promise<Result<ReleaseManifest>> {
  const testMode = Bun.env.ONEWARDEN_RELEASE_TEST_MODE === "1"
  const gitResult = releaseGitMetadataRead(
    options?.gitDirectory ?? Bun.env.ONEWARDEN_RELEASE_GIT_DIRECTORY ?? process.cwd(),
    testMode && (options?.allowDirtyWorktree === true || Bun.env.ONEWARDEN_RELEASE_ALLOW_DIRTY_FOR_TESTS === "1"),
  )
  if (!gitResult.success) return gitResult
  const packageResult = await releasePackageMetadataRead(packageDirectory)
  if (!packageResult.success) return packageResult
  const migrationsResult = await releaseMigrationsValidate(join(packageDirectory, "migrations"))
  if (!migrationsResult.success) return migrationsResult
  const filesResult = await releaseManifestFilesRead(packageDirectory)
  if (!filesResult.success) return filesResult
  const artifactResult = await releaseManifestArtifactHashCreate(filesResult.data)
  if (!artifactResult.success) return artifactResult
  const manifest: ReleaseManifest = {
    application: packageResult.data.application,
    releaseVersion: packageResult.data.releaseVersion,
    gitHead: gitResult.data.gitHead,
    gitTag: gitResult.data.gitTag,
    builtAt: gitResult.data.builtAt,
    bunVersion: options?.bunVersion ?? Bun.version,
    schemaVersion: migrationsResult.data.latestVersion,
    schemaIdentity: `onewarden-schema-${migrationsResult.data.latestVersion}`,
    artifactFormat: 1,
    artifactSha256: artifactResult.data,
    files: filesResult.data,
  }
  const writeResult = await releaseManifestWrite(packageDirectory, manifest)
  if (!writeResult.success) return writeResult
  return resultCreate(manifest)
}

function releaseGitMetadataRead(gitDirectory: string, allowDirtyWorktree: boolean): Result<ReleaseGitMetadata> {
  const op = "releaseGitMetadataRead"
  const commitResult = releaseGitCommandRead(gitDirectory, ["rev-parse", "HEAD"])
  if (!commitResult.success || !/^[0-9a-f]{40}$/.test(commitResult.data))
    return resultErrorCreate(op, "A readable full Git commit is required.")
  const timestampResult = releaseGitCommandRead(gitDirectory, ["show", "-s", "--format=%ct", "HEAD"])
  if (!timestampResult.success || !/^\d+$/.test(timestampResult.data))
    return resultErrorCreate(op, "A readable Git commit time is required.")
  const buildTime = new Date(Number(timestampResult.data) * 1_000)
  if (Number.isNaN(buildTime.getTime())) return resultErrorCreate(op, "Git commit time is invalid.")
  const tagResult = releaseGitCommandRead(gitDirectory, ["describe", "--tags", "--exact-match", "HEAD"])
  const tag = tagResult.success && tagResult.data.length > 0 ? tagResult.data : null
  if (!allowDirtyWorktree) {
    const statusResult = releaseGitCommandRead(gitDirectory, ["status", "--porcelain=v1", "--untracked-files=all"])
    if (!statusResult.success) return resultErrorCreate(op, "Git status could not be read.")
    if (statusResult.data.length > 0) return resultErrorCreate(op, "A release package requires a clean Git tree.")
  }
  return resultCreate({ gitHead: commitResult.data, gitTag: tag, builtAt: buildTime.toISOString() })
}

async function releasePackageMetadataRead(packageDirectory: string): Promise<Result<ReleasePackageMetadata>> {
  const op = "releasePackageMetadataRead"
  let contents: string
  try {
    contents = await readFile(join(packageDirectory, "package.json"), "utf8")
  } catch {
    return resultErrorCreate(op, "Packaged package.json could not be read.")
  }
  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    return resultErrorCreate(op, "Packaged package.json is not valid JSON.")
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    value.name.length === 0 ||
    !("version" in value) ||
    typeof value.version !== "string" ||
    value.version.length === 0
  )
    return resultErrorCreate(op, "Packaged package.json has no application or release version.")
  return resultCreate({ application: value.name, releaseVersion: value.version })
}

function releaseGitCommandRead(gitDirectory: string, args: string[]): Result<string> {
  const op = "releaseGitCommandRead"
  try {
    const process = Bun.spawnSync(["git", "-C", gitDirectory, ...args], { stderr: "pipe", stdout: "pipe" })
    if (process.exitCode !== 0) return resultErrorCreate(op, "Git metadata command failed.")
    return resultCreate(new TextDecoder().decode(process.stdout).trim())
  } catch {
    return resultErrorCreate(op, "Git metadata command failed.")
  }
}

async function releaseManifestFilesRead(packageDirectory: string): Promise<Result<ReleaseManifest["files"]>> {
  const op = "releaseManifestFilesRead"
  const files: ReleaseManifest["files"] = []
  const walkResult = await releaseManifestFilesWalk(packageDirectory, packageDirectory, files)
  if (!walkResult.success) return walkResult
  files.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
  if (files.length === 0) return resultErrorCreate(op, "Release package is empty.")
  return resultCreate(files)
}

async function releaseManifestFilesWalk(
  packageDirectory: string,
  currentDirectory: string,
  files: ReleaseManifest["files"],
): Promise<Result<void>> {
  const op = "releaseManifestFilesWalk"
  let entries: Dirent<string>[]
  try {
    entries = await readdir(currentDirectory, { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Release package could not be read.")
  }
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  for (const entry of entries) {
    const path = join(currentDirectory, entry.name)
    const relativePath = relative(packageDirectory, path).split(sep).join("/")
    if (relativePath === "release.json") continue
    let stats: Awaited<ReturnType<typeof lstat>>
    try {
      stats = await lstat(path)
    } catch {
      return resultErrorCreate(op, "Release package entry could not be inspected.")
    }
    if (stats.isSymbolicLink()) return resultErrorCreate(op, "Release packages must not contain symlinks.")
    if (stats.isDirectory()) {
      const childResult = await releaseManifestFilesWalk(packageDirectory, path, files)
      if (!childResult.success) return childResult
      continue
    }
    if (!stats.isFile()) return resultErrorCreate(op, "Release package contains an unsupported file type.")
    const bytesResult = await releaseManifestFileBytesRead(path)
    if (!bytesResult.success) return bytesResult
    const digestResult = await sha256Hex(bytesResult.data)
    if (!digestResult.success) return resultErrorCreate(op, "Release file integrity could not be calculated.")
    files.push({ path: relativePath, size: bytesResult.data.byteLength, sha256: digestResult.data })
  }
  return resultCreate(undefined)
}

async function releaseManifestFileBytesRead(path: string): Promise<Result<Uint8Array>> {
  const op = "releaseManifestFileBytesRead"
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

async function releaseManifestArtifactHashCreate(files: ReleaseManifest["files"]): Promise<Result<string>> {
  const canonical = JSON.stringify(files)
  const digestResult = await sha256Hex(new TextEncoder().encode(canonical))
  if (!digestResult.success)
    return resultErrorCreate("releaseManifestArtifactHashCreate", "Release artifact hash failed.")
  return digestResult
}

async function releaseManifestWrite(packageDirectory: string, manifest: ReleaseManifest): Promise<Result<void>> {
  const op = "releaseManifestWrite"
  const temporaryPath = join(packageDirectory, `.release-${manifest.gitHead}.json.tmp`)
  try {
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
    await rename(temporaryPath, join(packageDirectory, "release.json"))
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Release manifest could not be written.")
  }
}

if (import.meta.main) {
  const packageDirectory = process.argv[2]
  if (packageDirectory === undefined || process.argv.length > 3) {
    console.error("Usage: bun tools/release/releaseManifestGenerate.ts <package-directory>")
    process.exitCode = 1
  } else {
    const result = await releaseManifestGenerate(packageDirectory)
    if (!result.success) {
      console.error(`Release manifest generation failed: ${result.errorMessage}`)
      process.exitCode = 1
    } else {
      console.log(`Release manifest generated at ${join(packageDirectory, "release.json")}`)
    }
  }
}
