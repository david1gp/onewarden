import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { users } from "../../database/schema/users.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { eq } from "drizzle-orm"

export function twoFactorRecoveryCodeClear(database: DatabaseConnection, user: IdentityUser): Result<void> {
  try {
    database.drizzle.update(users).set({ totpRecover: null }).where(eq(users.uuid, user.uuid)).run()
    user.totpRecover = null
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("twoFactorRecoveryCodeClear", "Recovery code clear failed.")
  }
}
