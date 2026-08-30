import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const databaseMigrationsPath = fileURLToPath(new URL("../../../migrations/", import.meta.url))

export function databaseMigrationsLatestVersionRead(migrationsPath = databaseMigrationsPathResolve()): Result<number> {
  const op = "databaseMigrationsLatestVersionRead"
  try {
    const versions = readdirSync(migrationsPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => /^([0-9]+)_[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*\.sql$/.exec(entry.name)?.[1])
      .filter((version): version is string => version !== undefined)
      .map(Number)
      .filter((version) => Number.isSafeInteger(version) && version > 0)

    const latestVersion = Math.max(...versions)
    if (!Number.isSafeInteger(latestVersion) || latestVersion < 1)
      return resultErrorCreate(op, "Database migrations could not be inspected.")
    return resultCreate(latestVersion)
  } catch {
    return resultErrorCreate(op, "Database migrations could not be inspected.")
  }
}

function databaseMigrationsPathResolve(): string {
  const workingDirectoryPath = join(process.cwd(), "migrations")
  return existsSync(workingDirectoryPath) ? workingDirectoryPath : databaseMigrationsPath
}
