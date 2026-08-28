import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"

export function emergencyAccessNotificationDateUpdate(
  database: DatabaseConnection,
  access: EmergencyAccess,
  updatedAt: string,
): Result<boolean> {
  const op = "emergencyAccessNotificationDateUpdate"
  try {
    const update = database.run(
      `UPDATE emergency_access
       SET last_notification_at = ?, updated_at = ?
       WHERE uuid = ? AND status = ?
         AND ((last_notification_at IS NULL AND ? IS NULL) OR last_notification_at = ?)`,
      [updatedAt, updatedAt, access.uuid, access.status, access.lastNotificationAt, access.lastNotificationAt],
    )
    if (update.changes === 0) return resultCreate(false)
    access.lastNotificationAt = updatedAt
    access.updatedAt = updatedAt
    return resultCreate(true)
  } catch {
    return resultErrorCreate(op, "Emergency access notification date update failed.")
  }
}
