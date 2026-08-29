import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindByUuidAndEmail(
  database: DatabaseConnection,
  uuid: string,
  email: string,
): Result<EmergencyAccess | null> {
  const op = "emergencyAccessFindByUuidAndEmail"
  try {
    const row = database
      .query<EmergencyAccess, [string, string]>(
        `SELECT ${emergencyAccessSelect}
           FROM emergency_access WHERE uuid = ? AND email = ? LIMIT 1`,
      )
      .get(uuid, email.toLowerCase())
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
