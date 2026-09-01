import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { twoFactorIncomplete } from "../../database/schema/twoFactorIncomplete.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"
import { eq } from "drizzle-orm"

export function twoFactorRecordDeleteAllByUser(database: DatabaseConnection, userUuid: string): Result<void> {
  const op = "twoFactorRecordDeleteAllByUser"
  try {
    database.drizzle.delete(twoFactor).where(eq(twoFactor.userUuid, userUuid)).run()
    database.drizzle.delete(twoFactorIncomplete).where(eq(twoFactorIncomplete.userUuid, userUuid)).run()
    const clearResult = authenticationTrustedDeviceClearAllByUser(database, userUuid)
    if (!clearResult.success) return clearResult
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor provider delete failed.")
  }
}
