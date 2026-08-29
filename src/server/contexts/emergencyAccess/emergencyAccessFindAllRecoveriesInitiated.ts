import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindAllRecoveriesInitiated(database: DatabaseConnection): Result<EmergencyAccess[]> {
  const op = "emergencyAccessFindAllRecoveriesInitiated"
  try {
    const rows = database
      .query<EmergencyAccess, []>(
        `SELECT ${emergencyAccessSelect}
           FROM emergency_access
          WHERE status = 3 AND recovery_initiated_at IS NOT NULL
          ORDER BY recovery_initiated_at, uuid`,
      )
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
