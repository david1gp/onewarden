import { lstat, readFile, realpath } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, isAbsolute, join, resolve, sep } from "node:path"
import { type Result } from "#result"
import { backupBundleCreate } from "../../src/server/backup/backupBundleCreate.js"
import { backupManifestValidate } from "../../src/server/backup/backupManifestValidate.js"
import { serverConfigLoad } from "../../src/server/config/serverConfigLoad.js"
import { type ReleaseManifest } from "../../src/server/release/releaseManifestSchema.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { releaseDatabaseValidate } from "./releaseDatabaseValidate.js"
import { releaseEnvironmentRead } from "./releaseEnvironmentRead.js"
import { releaseMigrationsValidate } from "./releaseMigrationsValidate.js"
import { releasePackageValidate } from "./releasePackageValidate.js"
import { releaseRequiredCommandsValidate } from "./releaseRequiredCommandsValidate.js"

type ReleasePredeployVerifyOptions = {
  packageDirectory: string
  runtimeDirectory: string
  unitFile: string
  port: number
  sourceDirectory?: string
  installedUnitFile?: string
  environmentFile?: string
  backupCreate?: typeof backupBundleCreate
  backupValidate?: typeof backupManifestValidate
  commandExists?: (command: string) => boolean
}

export async function releasePredeployVerify(options: ReleasePredeployVerifyOptions): Promise<
  Result<{
    release: ReleaseManifest
    backupPath?: string
    backupStoragePath: string
    databasePath: string
    sendsPath: string
    attachmentsPath: string
    iconCachePath: string
  }>
> {
  const op = "releasePredeployVerify"
  const packageDirectory = resolve(options.packageDirectory)
  const runtimeDirectory = resolve(options.runtimeDirectory)
  const sourceDirectory = options.sourceDirectory === undefined ? undefined : resolve(options.sourceDirectory)
  const commandsResult = releaseRequiredCommandsValidate({ commandExists: options.commandExists })
  if (!commandsResult.success) return commandsResult
  if (runtimeDirectory.includes("%") || releasePathContainsControl(runtimeDirectory))
    return resultErrorCreate(op, "Managed runtime path contains unsafe systemd characters.")
  if (sourceDirectory !== undefined) {
    const sourceResult = await releaseSourceDirectoryValidate(sourceDirectory)
    if (!sourceResult.success) return sourceResult
  }
  if (packageDirectory === runtimeDirectory || releasePathsOverlap(packageDirectory, runtimeDirectory))
    return resultErrorCreate(op, "Release package and managed runtime paths must be distinct.")
  if (
    sourceDirectory !== undefined &&
    (sourceDirectory === runtimeDirectory || releasePathsOverlap(sourceDirectory, runtimeDirectory))
  )
    return resultErrorCreate(op, "Source checkout and managed runtime paths must be distinct.")
  if (sourceDirectory !== undefined && sourceDirectory === packageDirectory)
    return resultErrorCreate(op, "Release package must not be the source checkout.")
  const packageResult = await releasePackageValidate(packageDirectory)
  if (!packageResult.success) return packageResult
  const migrationsResult = await releaseMigrationsValidate(join(packageDirectory, "migrations"))
  if (!migrationsResult.success) return migrationsResult
  const runtimeResult = await releaseRuntimeDirectoryValidate(runtimeDirectory)
  if (!runtimeResult.success) return runtimeResult
  const unitResult = await releaseServiceUnitValidate(options.unitFile, runtimeDirectory, options.port)
  if (!unitResult.success) return unitResult
  const generatedUnitPath = resolve(options.unitFile)
  if (
    releasePathsOverlap(generatedUnitPath, packageDirectory) ||
    releasePathsOverlap(generatedUnitPath, runtimeDirectory)
  )
    return resultErrorCreate(op, "Generated systemd unit must be outside the release and runtime directories.")
  if (sourceDirectory !== undefined && releasePathsOverlap(generatedUnitPath, sourceDirectory))
    return resultErrorCreate(op, "Generated systemd unit must be outside the source checkout.")
  if (options.installedUnitFile !== undefined) {
    const installedUnitPath = resolve(options.installedUnitFile)
    if (
      releasePathsOverlap(installedUnitPath, packageDirectory) ||
      releasePathsOverlap(installedUnitPath, runtimeDirectory) ||
      (sourceDirectory !== undefined && releasePathsOverlap(installedUnitPath, sourceDirectory))
    )
      return resultErrorCreate(
        op,
        "Installed systemd unit must be outside the release, runtime, and source directories.",
      )
    const installedUnitResult = await releaseInstalledUnitValidate(installedUnitPath, runtimeDirectory, options.port)
    if (!installedUnitResult.success) return installedUnitResult
  }

  const environmentPath = resolve(options.environmentFile ?? join(runtimeDirectory, ".env"))
  const environmentPathResult = await releaseEnvironmentPathValidate(environmentPath)
  if (!environmentPathResult.success) return environmentPathResult
  if (releasePathsOverlap(environmentPath, packageDirectory))
    return resultErrorCreate(op, "Production environment must not overlap the release package.")
  if (sourceDirectory !== undefined && releasePathsOverlap(environmentPath, sourceDirectory))
    return resultErrorCreate(op, "Production environment must not overlap the source checkout.")
  const environmentResult = await releaseEnvironmentRead(environmentPath)
  if (!environmentResult.success) return environmentResult
  const configuration = { ...unitResult.data.environment, ...environmentResult.data }
  const configResult = serverConfigLoad(configuration)
  if (!configResult.success)
    return resultErrorCreate(op, `Production environment is invalid: ${configResult.errorMessage}`)
  if (configResult.data.HOST !== "127.0.0.1" && configResult.data.HOST !== "::1")
    return resultErrorCreate(op, "Production service must bind to loopback.")
  if (configResult.data.PORT !== options.port)
    return resultErrorCreate(op, "Production service and deployment port do not match.")
  if (configResult.data.PUBLIC_ORIGIN === undefined)
    return resultErrorCreate(op, "PUBLIC_ORIGIN is required for a release deployment.")
  if (new URL(configResult.data.PUBLIC_ORIGIN).protocol !== "https:")
    return resultErrorCreate(op, "PUBLIC_ORIGIN must use HTTPS for a release deployment.")

  const databasePath = releaseConfiguredPathResolve(runtimeDirectory, configResult.data.DATABASE_PATH)
  const sendsPath = releaseConfiguredPathResolve(runtimeDirectory, configResult.data.SENDS_FOLDER)
  const attachmentsAreS3 = configResult.data.ATTACHMENTS_FOLDER.startsWith("s3://")
  const attachmentsPath = attachmentsAreS3
    ? configResult.data.ATTACHMENTS_FOLDER
    : releaseConfiguredPathResolve(runtimeDirectory, configResult.data.ATTACHMENTS_FOLDER)
  const backupPath = releaseConfiguredPathResolve(runtimeDirectory, configResult.data.BACKUP_FOLDER)
  const iconCachePath = releaseConfiguredPathResolve(
    runtimeDirectory,
    environmentResult.data.ICON_CACHE_FOLDER ?? "data/icon_cache",
  )
  const pathsResult = await releaseStoragePathsValidate(
    packageDirectory,
    runtimeDirectory,
    [
      { label: "database", path: databasePath, file: true },
      { label: "Sends", path: sendsPath, file: false },
      ...(attachmentsAreS3 ? [] : [{ label: "attachments", path: attachmentsPath, file: false }]),
      { label: "backup", path: backupPath, file: false },
      { label: "icon cache", path: iconCachePath, file: false },
    ],
    sourceDirectory,
  )
  if (!pathsResult.success) return pathsResult

  const databaseResult = await releaseDatabaseValidate(
    databasePath,
    packageResult.data.schemaVersion,
    new Set(migrationsResult.data.migrations.map((migration) => migration.version)),
  )
  if (!databaseResult.success) return databaseResult
  if (!databaseResult.data.exists)
    return resultCreate({
      attachmentsPath,
      backupStoragePath: backupPath,
      databasePath,
      release: packageResult.data,
      sendsPath,
      iconCachePath,
    })

  const createBackup = options.backupCreate ?? backupBundleCreate
  const validateBackup = options.backupValidate ?? backupManifestValidate
  const backupResult = await createBackup({
    attachmentsFolder: attachmentsPath,
    databasePath,
    destinationRoot: backupPath,
    sendsFolder: sendsPath,
  })
  if (!backupResult.success) return resultErrorCreate(op, `Predeploy backup failed: ${backupResult.errorMessage}`)
  const validationResult = await validateBackup(backupResult.data)
  if (!validationResult.success)
    return resultErrorCreate(op, `Predeploy backup validation failed: ${validationResult.errorMessage}`)
  if (validationResult.data.schemaVersion !== databaseResult.data.schemaVersion)
    return resultErrorCreate(op, "Predeploy backup schema does not match the current database.")
  return resultCreate({
    attachmentsPath,
    backupPath: backupResult.data,
    backupStoragePath: backupPath,
    databasePath,
    release: packageResult.data,
    sendsPath,
    iconCachePath,
  })
}

async function releaseSourceDirectoryValidate(sourceDirectory: string): Promise<Result<void>> {
  const op = "releaseSourceDirectoryValidate"
  const pathResult = await releasePathComponentsValidate(sourceDirectory, "Source checkout")
  if (!pathResult.success) return pathResult
  try {
    const stats = await lstat(sourceDirectory)
    if (stats.isSymbolicLink() || !stats.isDirectory())
      return resultErrorCreate(op, "Source checkout must be a directory.")
    if ((await realpath(sourceDirectory)) !== sourceDirectory)
      return resultErrorCreate(op, "Source checkout must not be a symlink.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Source checkout could not be inspected.")
  }
}

async function releaseRuntimeDirectoryValidate(runtimeDirectory: string): Promise<Result<void>> {
  const op = "releaseRuntimeDirectoryValidate"
  const pathResult = await releasePathComponentsValidate(runtimeDirectory, "Managed runtime")
  if (!pathResult.success) return pathResult
  try {
    const stats = await lstat(runtimeDirectory)
    if (stats.isSymbolicLink() || !stats.isDirectory())
      return resultErrorCreate(op, "Managed runtime must be a directory.")
    if ((await realpath(runtimeDirectory)) !== runtimeDirectory)
      return resultErrorCreate(op, "Managed runtime must not be a symlink.")
    return resultCreate(undefined)
  } catch (error) {
    if (releasePathIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Managed runtime could not be inspected.")
  }
}

async function releaseServiceUnitValidate(
  unitFile: string,
  runtimeDirectory: string,
  port: number,
): Promise<Result<{ environment: Record<string, string> }>> {
  const op = "releaseServiceUnitValidate"
  const pathResult = await releasePathComponentsValidate(unitFile, "Production systemd unit")
  if (!pathResult.success) return pathResult
  let contents: string
  try {
    const stats = await lstat(unitFile)
    if (stats.isSymbolicLink() || !stats.isFile())
      return resultErrorCreate(op, "Production systemd unit must be a regular file.")
    contents = await readFile(unitFile, "utf8")
  } catch {
    return resultErrorCreate(op, "Production systemd unit is missing.")
  }
  return releaseServiceUnitContentsValidate(contents.replaceAll("%h", homedir()), runtimeDirectory, port, op)
}

async function releaseInstalledUnitValidate(
  unitFile: string,
  runtimeDirectory: string,
  port: number,
): Promise<Result<void>> {
  const op = "releaseInstalledUnitValidate"
  const pathResult = await releasePathComponentsValidate(unitFile, "Installed user systemd unit")
  if (!pathResult.success) return pathResult
  let contents: string
  try {
    const stats = await lstat(unitFile)
    if (stats.isSymbolicLink() || !stats.isFile())
      return resultErrorCreate(op, "Installed user systemd unit must be a regular file.")
    contents = await readFile(unitFile, "utf8")
  } catch (error) {
    if (releasePathIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Installed user systemd unit could not be read.")
  }
  const validationResult = releaseServiceUnitContentsValidate(
    contents.replaceAll("%h", homedir()),
    runtimeDirectory,
    port,
    op,
  )
  if (!validationResult.success)
    return resultErrorCreate(op, `Installed user systemd unit is invalid: ${validationResult.errorMessage}`)
  return resultCreate(undefined)
}

function releaseServiceUnitContentsValidate(
  contents: string,
  runtimeDirectory: string,
  port: number,
  op: string,
): Result<{ environment: Record<string, string> }> {
  if (contents.includes("%")) return resultErrorCreate(op, "Systemd unit contains an unresolved specifier.")
  const requiredLines = [
    "[Unit]",
    "[Service]",
    "Type=simple",
    `WorkingDirectory=${runtimeDirectory}`,
    `EnvironmentFile=-${join(runtimeDirectory, ".env")}`,
    "Environment=NODE_ENV=production",
    "Environment=HOST=127.0.0.1",
    `Environment=PORT=${port}`,
    "ExecStart=/usr/bin/env bun server/server.js",
    "Restart=on-failure",
    "UMask=0077",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "[Install]",
    "WantedBy=default.target",
  ]
  const lines = contents.split(/\r?\n/u)
  for (const line of requiredLines) {
    if (!lines.includes(line)) return resultErrorCreate(op, `Systemd unit is missing: ${line}.`)
  }
  for (const directive of [
    "[Unit]",
    "[Service]",
    "[Install]",
    "WorkingDirectory=",
    "EnvironmentFile=",
    "Environment=NODE_ENV=",
    "Environment=HOST=",
    "Environment=PORT=",
    "ExecStart=",
    "Restart=",
    "UMask=",
    "NoNewPrivileges=",
    "PrivateTmp=",
    "WantedBy=",
  ]) {
    if (lines.filter((line) => line.startsWith(directive)).length !== 1)
      return resultErrorCreate(op, `Systemd unit has an invalid number of ${directive} directives.`)
  }
  if (lines.some((line) => /^(?:ExecStartPre|ExecStartPost|ExecStop)=/u.test(line)))
    return resultErrorCreate(op, "Systemd unit contains unsupported lifecycle commands.")
  if (lines.some((line) => /^EnvironmentFile=/u.test(line) && !line.startsWith("EnvironmentFile=-")))
    return resultErrorCreate(op, "Systemd unit environment file must be optional and explicit.")
  if (lines.some((line) => /^ExecStart=/u.test(line) && line !== "ExecStart=/usr/bin/env bun server/server.js"))
    return resultErrorCreate(op, "Systemd unit executable is invalid.")
  if (lines.some((line) => /^WorkingDirectory=/u.test(line) && line !== `WorkingDirectory=${runtimeDirectory}`))
    return resultErrorCreate(op, "Systemd unit working directory is invalid.")
  if (
    lines.some(
      (line) => /^EnvironmentFile=/u.test(line) && line !== `EnvironmentFile=-${join(runtimeDirectory, ".env")}`,
    )
  )
    return resultErrorCreate(op, "Systemd unit environment file is invalid.")
  const environment: Record<string, string> = {}
  for (const line of lines) {
    const match = /^Environment=([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line)
    if (match !== null && match[1] !== undefined && match[2] !== undefined) environment[match[1]] = match[2]
  }
  if (environment.HOST !== "127.0.0.1" && environment.HOST !== "::1")
    return resultErrorCreate(op, "Systemd unit must bind to loopback.")
  if (environment.PORT !== String(port))
    return resultErrorCreate(op, "Systemd unit port does not match deployment port.")
  return resultCreate({ environment })
}

async function releaseEnvironmentPathValidate(environmentPath: string): Promise<Result<void>> {
  const op = "releaseEnvironmentPathValidate"
  const pathResult = await releasePathComponentsValidate(environmentPath, "Production environment")
  if (!pathResult.success) return pathResult
  try {
    const stats = await lstat(environmentPath)
    if (stats.isSymbolicLink() || !stats.isFile())
      return resultErrorCreate(op, "Production environment must be a regular file.")
    return resultCreate(undefined)
  } catch (error) {
    if (releasePathIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Production environment could not be inspected.")
  }
}

async function releaseStoragePathsValidate(
  packageDirectory: string,
  runtimeDirectory: string,
  paths: ReadonlyArray<{ label: string; path: string; file: boolean }>,
  sourceDirectory?: string,
): Promise<Result<void>> {
  const op = "releaseStoragePathsValidate"
  const roots = [packageDirectory, ...paths.map((item) => item.path)]
  if (paths.some((item) => item.path === runtimeDirectory))
    return resultErrorCreate(op, "Storage paths must not be the managed runtime directory.")
  if (paths.some((item) => releasePathsOverlap(item.path, packageDirectory)))
    return resultErrorCreate(op, "Storage paths must not overlap the release package.")
  if (sourceDirectory !== undefined && paths.some((item) => releasePathsOverlap(item.path, sourceDirectory)))
    return resultErrorCreate(op, "Storage paths must not overlap the source checkout.")
  for (let index = 0; index < roots.length; index += 1) {
    const current = roots[index]
    if (current === undefined) continue
    for (let otherIndex = index + 1; otherIndex < roots.length; otherIndex += 1) {
      const other = roots[otherIndex]
      if (other !== undefined && releasePathsOverlap(current, other))
        return resultErrorCreate(op, "Release, runtime, and storage paths must be distinct.")
    }
  }
  for (const item of paths) {
    const componentResult = await releasePathComponentsValidate(item.path, `${item.label} storage`)
    if (!componentResult.success) return componentResult
    try {
      const stats = await lstat(item.path)
      if (stats.isSymbolicLink()) return resultErrorCreate(op, `${item.label} path must not be a symlink.`)
      if (item.file ? !stats.isFile() : !stats.isDirectory())
        return resultErrorCreate(op, `${item.label} path has the wrong type.`)
      if ((await realpath(item.path)) !== item.path)
        return resultErrorCreate(op, `${item.label} path must not contain symlinks.`)
    } catch (error) {
      if (!releasePathIsNotFound(error)) return resultErrorCreate(op, `${item.label} path could not be inspected.`)
    }
  }
  return resultCreate(undefined)
}

async function releasePathComponentsValidate(path: string, label: string): Promise<Result<void>> {
  const op = "releasePathComponentsValidate"
  if (releasePathContainsControl(path)) return resultErrorCreate(op, `${label} path contains unsafe characters.`)
  let currentPath = path
  while (true) {
    try {
      const stats = await lstat(currentPath)
      if (stats.isSymbolicLink()) return resultErrorCreate(op, `${label} path must not contain symlinks.`)
      if (currentPath === path) {
        if ((await realpath(currentPath)) !== currentPath)
          return resultErrorCreate(op, `${label} path must not contain symlinks.`)
        return resultCreate(undefined)
      }
      if (!stats.isDirectory()) return resultErrorCreate(op, `${label} path has a non-directory parent.`)
      const parentPath = dirname(currentPath)
      if (parentPath === currentPath) return resultCreate(undefined)
      currentPath = parentPath
    } catch (error) {
      if (!releasePathIsNotFound(error)) return resultErrorCreate(op, `${label} path could not be inspected.`)
      const parentPath = dirname(currentPath)
      if (parentPath === currentPath) return resultCreate(undefined)
      currentPath = parentPath
    }
  }
}

function releasePathContainsControl(path: string): boolean {
  return [...path].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127)
  })
}

function releaseConfiguredPathResolve(runtimeDirectory: string, configuredPath: string): string {
  return isAbsolute(configuredPath) ? resolve(configuredPath) : resolve(runtimeDirectory, configuredPath)
}

function releasePathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}${sep}`) || right.startsWith(`${left}${sep}`)
}

function releasePathIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}

if (import.meta.main) {
  const values = releasePredeployArgumentsRead(process.argv.slice(2))
  if (values === undefined) {
    console.error(
      "Usage: bun tools/release/releasePredeployVerify.ts --package <dir> --runtime <dir> --unit <file> --port <port> [--source <dir>] [--installed-unit <file>]",
    )
    process.exitCode = 1
  } else {
    const result = await releasePredeployVerify(values)
    if (!result.success) {
      console.error(`Predeploy verification failed: ${result.errorMessage}`)
      process.exitCode = 1
    } else {
      console.log(`Predeploy verification passed for ${result.data.release.gitHead}.`)
      console.log(`PREDEPLOY_DATABASE_PATH=${result.data.databasePath}`)
      console.log(`PREDEPLOY_SENDS_PATH=${result.data.sendsPath}`)
      console.log(`PREDEPLOY_ATTACHMENTS_PATH=${result.data.attachmentsPath}`)
      console.log(`PREDEPLOY_ICON_CACHE_PATH=${result.data.iconCachePath}`)
      console.log(`PREDEPLOY_BACKUP_STORAGE_PATH=${result.data.backupStoragePath}`)
      if (result.data.backupPath !== undefined) console.log(`PREDEPLOY_BACKUP=${result.data.backupPath}`)
      else console.log("PREDEPLOY_BACKUP=none-existing-database")
    }
  }
}

function releasePredeployArgumentsRead(argumentsList: string[]): ReleasePredeployVerifyOptions | undefined {
  const values = new Map<string, string>()
  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index]
    const value = argumentsList[index + 1]
    if (name === undefined || value === undefined || !name.startsWith("--")) return undefined
    values.set(name.slice(2), value)
  }
  const packageDirectory = values.get("package")
  const runtimeDirectory = values.get("runtime")
  const unitFile = values.get("unit")
  const sourceDirectory = values.get("source")
  const installedUnitFile = values.get("installed-unit")
  const portText = values.get("port")
  const port = portText === undefined ? Number.NaN : Number(portText)
  if (packageDirectory === undefined || runtimeDirectory === undefined || unitFile === undefined) return undefined
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return undefined
  return { installedUnitFile, packageDirectory, runtimeDirectory, sourceDirectory, unitFile, port }
}
