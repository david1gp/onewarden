import { type Result, type ResultErr } from "#result"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "./database.js"

class DatabaseTransactionRollback extends Error {}

export function databaseTransaction<T>(database: DatabaseConnection, operation: () => Result<T>): Result<T> {
  const op = "databaseTransaction"
  let operationError: ResultErr | undefined

  try {
    const transaction = database.transaction(() => {
      const result = operation()
      if (!result.success) {
        operationError = result
        throw new DatabaseTransactionRollback()
      }
      return result
    })
    return transaction()
  } catch {
    if (operationError !== undefined) return operationError
    return resultErrorCreate(op, "Database transaction failed.")
  }
}
