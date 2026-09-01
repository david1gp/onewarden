import { Database } from "bun:sqlite"
import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"
import { databaseClose } from "./databaseClose.js"
import { databaseConnectionStore } from "./databaseConnectionStore.js"
import { databaseMigrate } from "./databaseMigrate.js"

export function databaseTestCreate(migrationsPath?: string): Result<DatabaseConnection> {
  const databaseClient = new Database(":memory:")
  try {
    databaseClient.run("PRAGMA foreign_keys = ON")
    databaseClient.run("PRAGMA busy_timeout = 5000")
    const database = databaseConnectionStore.create(databaseClient)

    const migrationResult = databaseMigrate(database, migrationsPath)
    if (migrationResult.success) {
      Object.defineProperty(databaseClient, "drizzle", { value: database.drizzle, enumerable: false })
      return resultCreate(databaseClient as unknown as DatabaseConnection)
    }

    const closeResult = databaseClose(database)
    if (!closeResult.success) return resultErrorCreate("databaseTestCreate", "Database test setup failed.")
    return migrationResult
  } catch {
    databaseClient.close()
    return resultErrorCreate("databaseTestCreate", "Database test setup failed.")
  }
}
