import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessSelect } from "./emergencyAccessSelect.js"

export function emergencyAccessFindByUuidAndGrantee(
  database: DatabaseConnection,
  uuid: string,
  granteeUuid: string,
): Result<EmergencyAccess | null> {
  const op = "emergencyAccessFindByUuidAndGrantee"
  try {
    const row = database.drizzle
      .select(emergencyAccessSelect)
      .from(emergencyAccess)
      .where(and(eq(emergencyAccess.uuid, uuid), eq(emergencyAccess.granteeUuid, granteeUuid)))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
