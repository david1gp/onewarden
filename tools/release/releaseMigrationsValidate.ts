import { type Dirent } from "node:fs"
import { lstat, readdir } from "node:fs/promises"
import { join } from "node:path"
import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"

type ReleaseMigration = {
  name: string
  version: number
}

export async function releaseMigrationsValidate(
  migrationsDirectory: string,
): Promise<Result<{ latestVersion: number; migrations: ReleaseMigration[] }>> {
  const op = "releaseMigrationsValidate"
  let entries: Dirent<string>[]
  try {
    entries = await readdir(migrationsDirectory, { encoding: "utf8", withFileTypes: true })
  } catch {
    return resultErrorCreate(op, "Packaged migrations could not be read.")
  }

  const migrations: ReleaseMigration[] = []
  for (const entry of entries) {
    if (entry.name.endsWith(".sql")) {
      if (!entry.isFile()) return resultErrorCreate(op, "Packaged migrations must be regular files.")
      const match = /^(\d+)_([A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*)\.sql$/.exec(entry.name)
      if (match === null) return resultErrorCreate(op, `Invalid migration filename: ${entry.name}.`)
      const versionText = match[1]
      if (versionText === undefined) return resultErrorCreate(op, "Migration number is missing.")
      const version = Number(versionText)
      if (!Number.isSafeInteger(version) || version < 1)
        return resultErrorCreate(op, `Invalid migration number: ${entry.name}.`)
      const pathResult = await releaseMigrationPathValidate(join(migrationsDirectory, entry.name))
      if (!pathResult.success) return pathResult
      migrations.push({ name: entry.name, version })
    }
  }

  migrations.sort((left, right) => left.version - right.version || releaseMigrationNameCompare(left.name, right.name))
  for (let index = 1; index < migrations.length; index += 1) {
    const previous = migrations[index - 1]
    const current = migrations[index]
    if (previous === undefined || current === undefined) continue
    if (previous.version === current.version) return resultErrorCreate(op, "Migration numbers must be unique.")
    if (previous.name === current.name) return resultErrorCreate(op, "Migration filenames must be unique.")
  }
  const latestVersion = migrations.at(-1)?.version
  if (latestVersion === undefined) return resultErrorCreate(op, "No SQL migrations were packaged.")
  return resultCreate({ latestVersion, migrations })
}

async function releaseMigrationPathValidate(path: string): Promise<Result<void>> {
  const op = "releaseMigrationPathValidate"
  try {
    const stats = await lstat(path)
    if (stats.isSymbolicLink() || !stats.isFile())
      return resultErrorCreate(op, "Migration paths must be regular files.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Migration path could not be inspected.")
  }
}

function releaseMigrationNameCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
