import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { and, eq } from "drizzle-orm"

export function twoFactorEmailTokenInvalidate(
  database: DatabaseConnection,
  userUuid: string,
  providerType: number,
  expectedData: string,
  invalidatedData: string,
): Result<void> {
  const op = "twoFactorEmailTokenInvalidate"
  try {
    database.drizzle
      .update(twoFactor)
      .set({ data: invalidatedData })
      .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.atype, providerType), eq(twoFactor.data, expectedData)))
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor email token invalidation failed.")
  }
}
