import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"

export function twoFactorProtectedActionInvalidate(
  database: DatabaseConnection,
  userUuid: string,
  expectedData: string,
): Result<void> {
  try {
    database.run("DELETE FROM twofactor WHERE user_uuid = ? AND atype = ? AND data = ?", [
      userUuid,
      twoFactorProviderType.protectedActions,
      expectedData,
    ])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("twoFactorProtectedActionInvalidate", "Protected action token invalidation failed.")
  }
}
