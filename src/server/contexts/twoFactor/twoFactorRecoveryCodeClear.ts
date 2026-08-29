import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "../identity/identityUser.js"

export function twoFactorRecoveryCodeClear(database: DatabaseConnection, user: IdentityUser): Result<void> {
  try {
    database.run("UPDATE users SET totp_recover = NULL WHERE uuid = ?", [user.uuid])
    user.totpRecover = null
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("twoFactorRecoveryCodeClear", "Recovery code clear failed.")
  }
}
