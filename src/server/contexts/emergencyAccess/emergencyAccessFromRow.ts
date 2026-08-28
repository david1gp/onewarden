import type { EmergencyAccess } from "./emergencyAccess.js"
import type { EmergencyAccessRow } from "./emergencyAccessRow.js"

export function emergencyAccessFromRow(row: EmergencyAccessRow): EmergencyAccess {
  return {
    uuid: row.uuid,
    grantorUuid: row.grantor_uuid,
    granteeUuid: row.grantee_uuid,
    email: row.email,
    keyEncrypted: row.key_encrypted,
    type: row.atype,
    status: row.status,
    waitTimeDays: row.wait_time_days,
    recoveryInitiatedAt: row.recovery_initiated_at,
    lastNotificationAt: row.last_notification_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}
