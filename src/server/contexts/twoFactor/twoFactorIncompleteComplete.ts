import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactorIncomplete } from "../../database/schema/twoFactorIncomplete.js"
import { and, eq } from "drizzle-orm"

export function twoFactorIncompleteComplete(
  database: DatabaseConnection,
  userUuid: string,
  deviceUuid: string,
): Result<void> {
  const op = "twoFactorIncompleteComplete"
  try {
    database.drizzle
      .delete(twoFactorIncomplete)
      .where(and(eq(twoFactorIncomplete.userUuid, userUuid), eq(twoFactorIncomplete.deviceUuid, deviceUuid)))
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Incomplete two-factor login delete failed.")
  }
}
