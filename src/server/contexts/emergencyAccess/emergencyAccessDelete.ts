import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import { users } from "../../database/schema/users.js"

export function emergencyAccessDelete(database: DatabaseConnection, uuid: string, updatedAt: string): Result<void> {
  const op = "emergencyAccessDelete"
  return databaseTransaction(database, () => {
    try {
      const access = database.drizzle
        .select({ grantorUuid: emergencyAccess.grantorUuid })
        .from(emergencyAccess)
        .where(eq(emergencyAccess.uuid, uuid))
        .limit(1)
        .get()
      database.drizzle.delete(emergencyAccess).where(eq(emergencyAccess.uuid, uuid)).run()
      if (access !== undefined)
        database.drizzle.update(users).set({ updatedAt }).where(eq(users.uuid, access.grantorUuid)).run()
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Emergency access delete failed.")
    }
  })
}
