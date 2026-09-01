import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { and, eq } from "drizzle-orm"

export function twoFactorProtectedActionInvalidate(
  database: DatabaseConnection,
  userUuid: string,
  expectedData: string,
): Result<void> {
  try {
    database.drizzle
      .delete(twoFactor)
      .where(
        and(
          eq(twoFactor.userUuid, userUuid),
          eq(twoFactor.atype, twoFactorProviderType.protectedActions),
          eq(twoFactor.data, expectedData),
        ),
      )
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("twoFactorProtectedActionInvalidate", "Protected action token invalidation failed.")
  }
}
