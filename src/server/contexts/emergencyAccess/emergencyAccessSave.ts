import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"

export function emergencyAccessSave(database: DatabaseConnection, access: EmergencyAccess, now: string): Result<void> {
  const op = "emergencyAccessSave"
  try {
    access.updatedAt = now
    database.run(
      `INSERT INTO emergency_access (
        uuid, grantor_uuid, grantee_uuid, email, key_encrypted, atype, status,
        wait_time_days, recovery_initiated_at, last_notification_at, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        grantor_uuid = excluded.grantor_uuid,
        grantee_uuid = excluded.grantee_uuid,
        email = excluded.email,
        key_encrypted = excluded.key_encrypted,
        atype = excluded.atype,
        status = excluded.status,
        wait_time_days = excluded.wait_time_days,
        recovery_initiated_at = excluded.recovery_initiated_at,
        last_notification_at = excluded.last_notification_at,
        updated_at = excluded.updated_at`,
      [
        access.uuid,
        access.grantorUuid,
        access.granteeUuid,
        access.email,
        access.keyEncrypted,
        access.type,
        access.status,
        access.waitTimeDays,
        access.recoveryInitiatedAt,
        access.lastNotificationAt,
        access.updatedAt,
        access.createdAt,
      ],
    )
    database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [now, access.grantorUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Emergency access save failed.")
  }
}
