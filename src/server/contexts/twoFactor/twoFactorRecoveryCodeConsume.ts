import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { twoFactorIncomplete } from "../../database/schema/twoFactorIncomplete.js"
import { users } from "../../database/schema/users.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"
import { and, eq, sql } from "drizzle-orm"

export function twoFactorRecoveryCodeConsume(
  database: DatabaseConnection,
  user: IdentityUser,
  token?: string,
): Result<void> {
  return databaseTransaction(database, () => {
    try {
      database.drizzle.delete(twoFactor).where(eq(twoFactor.userUuid, user.uuid)).run()
      database.drizzle.delete(twoFactorIncomplete).where(eq(twoFactorIncomplete.userUuid, user.uuid)).run()
      const rememberResult = authenticationTrustedDeviceClearAllByUser(database, user.uuid)
      if (!rememberResult.success) return rememberResult
      const updateResult =
        token === undefined
          ? database.drizzle
              .update(users)
              .set({ totpRecover: null })
              .where(eq(users.uuid, user.uuid))
              .returning({ uuid: users.uuid })
              .all()
          : database.drizzle
              .update(users)
              .set({ totpRecover: null })
              .where(and(eq(users.uuid, user.uuid), sql`lower(${users.totpRecover}) = lower(${token})`))
              .returning({ uuid: users.uuid })
              .all()
      if (token !== undefined && updateResult.length !== 1)
        return resultErrorCreate("twoFactorRecoveryCodeConsume", "Recovery code is incorrect or has already been used.")
      user.totpRecover = null
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("twoFactorRecoveryCodeConsume", "Recovery code recovery failed.")
    }
  })
}
