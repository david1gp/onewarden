import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function twoFactorIncompleteComplete(
  database: DatabaseConnection,
  userUuid: string,
  deviceUuid: string,
): Result<void> {
  const op = "twoFactorIncompleteComplete"
  try {
    database.run("DELETE FROM twofactor_incomplete WHERE user_uuid = ? AND device_uuid = ?", [userUuid, deviceUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Incomplete two-factor login delete failed.")
  }
}
