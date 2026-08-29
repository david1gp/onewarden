import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationMembershipTwoFactorEnabledFind(
  database: DatabaseConnection,
  userUuid: string,
): Result<boolean> {
  const op = "organizationMembershipTwoFactorEnabledFind"
  try {
    const row = database
      .query<{ count: number }, [string]>("SELECT COUNT(*) AS count FROM twofactor WHERE user_uuid = ? AND enabled = 1")
      .get(userUuid)
    return resultCreate((row?.count ?? 0) > 0)
  } catch {
    return resultErrorCreate(op, "Two-factor status lookup failed.")
  }
}
