import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { EmergencyAccess } from "./emergencyAccess.js"

export function emergencyAccessStatusUpdate(
  database: DatabaseConnection,
  access: EmergencyAccess,
  status: number,
  updatedAt: string,
): Result<boolean> {
  const op = "emergencyAccessStatusUpdate"
  const updateResult = databaseTransaction(database, () => {
    try {
      const update = database.run(
        `UPDATE emergency_access
         SET status = ?, updated_at = ?
         WHERE uuid = ? AND status = ?`,
        [status, updatedAt, access.uuid, access.status],
      )
      if (update.changes === 0) return resultCreate(false)
      if (access.granteeUuid !== null)
        database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [updatedAt, access.granteeUuid])
      return resultCreate(true)
    } catch {
      return resultErrorCreate(op, "Emergency access status update failed.")
    }
  })
  if (!updateResult.success) return updateResult
  if (!updateResult.data) return updateResult
  access.status = status
  access.updatedAt = updatedAt
  return updateResult
}
