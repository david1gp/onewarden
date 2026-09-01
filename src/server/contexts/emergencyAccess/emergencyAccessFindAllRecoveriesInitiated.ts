import { and, asc, eq, isNotNull } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindAllRecoveriesInitiated(database: DatabaseConnection): Result<EmergencyAccess[]> {
  const op = "emergencyAccessFindAllRecoveriesInitiated"
  try {
    const rows = database.drizzle
      .select(emergencyAccessSelect)
      .from(emergencyAccess)
      .where(and(eq(emergencyAccess.status, 3), isNotNull(emergencyAccess.recoveryInitiatedAt)))
      .orderBy(asc(emergencyAccess.recoveryInitiatedAt), asc(emergencyAccess.uuid))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
