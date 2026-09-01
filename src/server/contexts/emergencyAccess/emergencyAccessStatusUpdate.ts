import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import { users } from "../../database/schema/users.js"
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
      const update = database.drizzle
        .update(emergencyAccess)
        .set({ status, updatedAt })
        .where(and(eq(emergencyAccess.uuid, access.uuid), eq(emergencyAccess.status, access.status)))
        .returning({ uuid: emergencyAccess.uuid })
        .all()
      if (update.length === 0) return resultCreate(false)
      if (access.granteeUuid !== null)
        database.drizzle.update(users).set({ updatedAt }).where(eq(users.uuid, access.granteeUuid)).run()
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
