import { and, eq, or } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
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
    const row = database.drizzle
      .select(emergencyAccessSelect)
      .from(emergencyAccess)
      .where(
        and(
          eq(emergencyAccess.grantorUuid, grantorUuid),
          or(eq(emergencyAccess.granteeUuid, granteeUuid), eq(emergencyAccess.email, email.toLowerCase())),
        ),
      )
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Emergency access lookup failed.")
  }
}
