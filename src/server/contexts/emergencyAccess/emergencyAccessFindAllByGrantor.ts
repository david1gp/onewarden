import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindAllByGrantor(
  database: DatabaseConnection,
  grantorUuid: string,
): Result<EmergencyAccess[]> {
  const op = "emergencyAccessFindAllByGrantor"
  try {
    const rows = database
      .query<EmergencyAccess, [string]>(
        `SELECT ${emergencyAccessSelect}
           FROM emergency_access WHERE grantor_uuid = ? ORDER BY created_at, uuid`,
      )
      .all(grantorUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
