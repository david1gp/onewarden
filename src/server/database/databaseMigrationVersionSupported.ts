import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const databaseMigrationsPath = fileURLToPath(new URL("../../../migrations/", import.meta.url))

export function databaseMigrationVersionSupported(version: number): Result<boolean> {
  const op = "databaseMigrationVersionSupported"
  try {
    const migrationsPath = databaseMigrationsPathResolve()
    const supported = readdirSync(migrationsPath, { withFileTypes: true }).some((entry) => {
      if (!entry.isFile()) return false
      const versionText = /^([0-9]+)_[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*\.sql$/.exec(entry.name)?.[1]
      return versionText !== undefined && Number(versionText) === version
    })
    return resultCreate(supported)
  } catch {
    return resultErrorCreate(op, "Database migrations could not be inspected.")
  }
}

function databaseMigrationsPathResolve(): string {
  const workingDirectoryPath = join(process.cwd(), "migrations")
  return existsSync(workingDirectoryPath) ? workingDirectoryPath : databaseMigrationsPath
}
