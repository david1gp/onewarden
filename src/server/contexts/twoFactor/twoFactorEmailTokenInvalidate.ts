import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function twoFactorEmailTokenInvalidate(
  database: DatabaseConnection,
  userUuid: string,
  providerType: number,
  expectedData: string,
  invalidatedData: string,
): Result<void> {
  const op = "twoFactorEmailTokenInvalidate"
  try {
    database.run("UPDATE twofactor SET data = ? WHERE user_uuid = ? AND atype = ? AND data = ?", [
      invalidatedData,
      userUuid,
      providerType,
      expectedData,
    ])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor email token invalidation failed.")
  }
}
