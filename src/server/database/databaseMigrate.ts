import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"
import { databaseTransaction } from "./databaseTransaction.js"

const databaseMigrationsPath = fileURLToPath(new URL("../../../migrations/", import.meta.url))
const databaseSchemaVersionTableSql = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`

type DatabaseMigration = {
  name: string
  path: string
  version: number
}

function databaseMigrationParse(name: string, migrationsPath: string): DatabaseMigration | undefined {
  const match = /^(\d+)_([A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*)\.sql$/.exec(name)
  if (match === null) return undefined

  const versionText = match[1]
  if (versionText === undefined) return undefined
  const version = Number(versionText)
  if (!Number.isSafeInteger(version) || version < 1) return undefined

  return { name, path: join(migrationsPath, name), version }
}

function databaseMigrationsRead(migrationsPath: string): DatabaseMigration[] {
  const migrations: DatabaseMigration[] = []
  for (const entry of readdirSync(migrationsPath, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const migration = databaseMigrationParse(entry.name, migrationsPath)
    if (migration !== undefined) migrations.push(migration)
  }
  migrations.sort((left, right) => left.version - right.version || left.name.localeCompare(right.name))
  return migrations
}

function databaseMigrationVersionsRead(database: DatabaseConnection): Set<number> {
  const rows = database.query<{ version: number }, []>("SELECT version FROM schema_version").all()
  return new Set(rows.map((row) => row.version))
}

export function databaseMigrate(database: DatabaseConnection, migrationsPath = databaseMigrationsPath): Result<void> {
  const op = "databaseMigrate"
  try {
    database.exec(databaseSchemaVersionTableSql)
    const migrations = databaseMigrationsRead(migrationsPath)
    const versions = new Set<number>()
    for (const migration of migrations) {
      if (versions.has(migration.version)) return resultErrorCreate(op, "Database migration versions must be unique.")
      versions.add(migration.version)
    }

    const appliedVersions = databaseMigrationVersionsRead(database)
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) continue
      const sql = readFileSync(migration.path, "utf8")
      const migrationResult = databaseTransaction(database, () => {
        try {
          database.exec(sql)
          database.run("INSERT INTO schema_version (version, applied_at) VALUES (?, CURRENT_TIMESTAMP)", [
            migration.version,
          ])
          return resultCreate(undefined)
        } catch {
          return resultErrorCreate(op, "Database migration failed.")
        }
      })
      if (!migrationResult.success) return migrationResult
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Database migration failed.")
  }
}
