import { asc, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindAllByGrantor(
  database: DatabaseConnection,
  grantorUuid: string,
): Result<EmergencyAccess[]> {
  const op = "emergencyAccessFindAllByGrantor"
  try {
    const rows = database.drizzle
      .select(emergencyAccessSelect)
      .from(emergencyAccess)
      .where(eq(emergencyAccess.grantorUuid, grantorUuid))
      .orderBy(asc(emergencyAccess.createdAt), asc(emergencyAccess.uuid))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
