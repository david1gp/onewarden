import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindAllByGrantee(
  database: DatabaseConnection,
  granteeUuid: string,
): Result<EmergencyAccess[]> {
  const op = "emergencyAccessFindAllByGrantee"
  try {
    const rows = database
      .query<EmergencyAccess, [string]>(
        `SELECT ${emergencyAccessSelect}
           FROM emergency_access WHERE grantee_uuid = ? ORDER BY created_at, uuid`,
      )
      .all(granteeUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
