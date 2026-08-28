import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import type { EmergencyAccessRow } from "./emergencyAccessRow.js"
import { emergencyAccessFromRow } from "./emergencyAccessFromRow.js"

export function emergencyAccessFindAllByGrantee(
  database: DatabaseConnection,
  granteeUuid: string,
): Result<EmergencyAccess[]> {
  const op = "emergencyAccessFindAllByGrantee"
  try {
    const rows = database
      .query<EmergencyAccessRow, [string]>(
        `SELECT uuid, grantor_uuid, grantee_uuid, email, key_encrypted, atype, status,
                wait_time_days, recovery_initiated_at, last_notification_at, updated_at, created_at
           FROM emergency_access WHERE grantee_uuid = ? ORDER BY created_at, uuid`,
      )
      .all(granteeUuid)
    return resultCreate(rows.map(emergencyAccessFromRow))
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
