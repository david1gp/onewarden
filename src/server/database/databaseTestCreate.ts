import { type Result } from "#result"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"
import { databaseClose } from "./databaseClose.js"
import { databaseMigrate } from "./databaseMigrate.js"
import { databaseOpen } from "./databaseOpen.js"

export function databaseTestCreate(migrationsPath?: string): Result<DatabaseConnection> {
  const databaseResult = databaseOpen(":memory:")
  if (!databaseResult.success) return databaseResult

  const migrationResult = databaseMigrate(databaseResult.data, migrationsPath)
  if (migrationResult.success) return databaseResult

  const closeResult = databaseClose(databaseResult.data)
  if (!closeResult.success) return resultErrorCreate("databaseTestCreate", "Database test setup failed.")
  return migrationResult
}
