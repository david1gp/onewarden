import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"

export function databaseClose(database: DatabaseConnection): Result<void> {
  const op = "databaseClose"
  try {
    database.close()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Database close failed.")
  }
}
