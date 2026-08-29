import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindByGrantorAndGranteeOrEmail(
  database: DatabaseConnection,
  grantorUuid: string,
  granteeUuid: string,
  email: string,
): Result<EmergencyAccess | null> {
  const op = "emergencyAccessFindByGrantorAndGranteeOrEmail"
  try {
    const row = database
      .query<EmergencyAccess, [string, string, string]>(
        `SELECT ${emergencyAccessSelect}
           FROM emergency_access
          WHERE grantor_uuid = ? AND (grantee_uuid = ? OR email = ?)
          LIMIT 1`,
      )
      .get(grantorUuid, granteeUuid, email.toLowerCase())
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
