import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import type { EmergencyAccessRow } from "./emergencyAccessRow.js"
import { emergencyAccessFromRow } from "./emergencyAccessFromRow.js"

export function emergencyAccessFindByUuidAndGrantee(
  database: DatabaseConnection,
  uuid: string,
  granteeUuid: string,
): Result<EmergencyAccess | null> {
  const op = "emergencyAccessFindByUuidAndGrantee"
  try {
    const row = database
      .query<EmergencyAccessRow, [string, string]>(
        `SELECT uuid, grantor_uuid, grantee_uuid, email, key_encrypted, atype, status,
                wait_time_days, recovery_initiated_at, last_notification_at, updated_at, created_at
           FROM emergency_access WHERE uuid = ? AND grantee_uuid = ? LIMIT 1`,
      )
      .get(uuid, granteeUuid)
    return resultCreate(row === null ? null : emergencyAccessFromRow(row))
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
