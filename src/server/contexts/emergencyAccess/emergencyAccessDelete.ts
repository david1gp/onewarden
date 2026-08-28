import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"

export function emergencyAccessDelete(database: DatabaseConnection, uuid: string, updatedAt: string): Result<void> {
  const op = "emergencyAccessDelete"
  return databaseTransaction(database, () => {
    try {
      const access = database
        .query<{ grantor_uuid: string }, [string]>("SELECT grantor_uuid FROM emergency_access WHERE uuid = ?")
        .get(uuid)
      database.run("DELETE FROM emergency_access WHERE uuid = ?", [uuid])
      if (access !== null)
        database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [updatedAt, access.grantor_uuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Emergency access delete failed.")
    }
  })
}
