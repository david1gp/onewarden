import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindByUuidAndGrantee(
  database: DatabaseConnection,
  uuid: string,
  granteeUuid: string,
): Result<EmergencyAccess | null> {
  const op = "emergencyAccessFindByUuidAndGrantee"
  try {
    const row = database
      .query<EmergencyAccess, [string, string]>(
        `SELECT ${emergencyAccessSelect}
           FROM emergency_access WHERE uuid = ? AND grantee_uuid = ? LIMIT 1`,
      )
      .get(uuid, granteeUuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
