import { and, eq, isNull } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import type { EmergencyAccess } from "./emergencyAccess.js"

export function emergencyAccessNotificationDateUpdate(
  database: DatabaseConnection,
  access: EmergencyAccess,
  updatedAt: string,
): Result<boolean> {
  const op = "emergencyAccessNotificationDateUpdate"
  try {
    const update = database.drizzle
      .update(emergencyAccess)
      .set({ lastNotificationAt: updatedAt, updatedAt })
      .where(
        and(
          eq(emergencyAccess.uuid, access.uuid),
          eq(emergencyAccess.status, access.status),
          access.lastNotificationAt === null
            ? isNull(emergencyAccess.lastNotificationAt)
            : eq(emergencyAccess.lastNotificationAt, access.lastNotificationAt),
        ),
      )
      .returning({ uuid: emergencyAccess.uuid })
      .all()
    if (update.length === 0) return resultCreate(false)
    access.lastNotificationAt = updatedAt
    access.updatedAt = updatedAt
    return resultCreate(true)
  } catch {
    return resultErrorCreate(op, "Emergency access notification date update failed.")
  }
}
