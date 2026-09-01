import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, count, eq } from "drizzle-orm"
import { twoFactor } from "../../database/schema/twoFactor.js"

export function organizationMembershipTwoFactorEnabledFind(
  database: DatabaseConnection,
  userUuid: string,
): Result<boolean> {
  const op = "organizationMembershipTwoFactorEnabledFind"
  try {
    const row = database.drizzle
      .select({ count: count() })
      .from(twoFactor)
      .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.enabled, true)))
      .get()
    return resultCreate((row?.count ?? 0) > 0)
  } catch {
    return resultErrorCreate(op, "Two-factor status lookup failed.")
  }
}
