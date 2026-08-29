import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"

export function twoFactorRecoveryCodeConsume(
  database: DatabaseConnection,
  user: IdentityUser,
  token?: string,
): Result<void> {
  return databaseTransaction(database, () => {
    try {
      database.run("DELETE FROM twofactor WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM twofactor_incomplete WHERE user_uuid = ?", [user.uuid])
      const rememberResult = authenticationTrustedDeviceClearAllByUser(database, user.uuid)
      if (!rememberResult.success) return rememberResult
      const updateResult =
        token === undefined
          ? database.run("UPDATE users SET totp_recover = NULL WHERE uuid = ?", [user.uuid])
          : database.run("UPDATE users SET totp_recover = NULL WHERE uuid = ? AND lower(totp_recover) = lower(?)", [
              user.uuid,
              token,
            ])
      if (token !== undefined && updateResult.changes !== 1)
        return resultErrorCreate("twoFactorRecoveryCodeConsume", "Recovery code is incorrect or has already been used.")
      user.totpRecover = null
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("twoFactorRecoveryCodeConsume", "Recovery code recovery failed.")
    }
  })
}
