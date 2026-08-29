import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"

export function twoFactorRecordDeleteAllByUser(database: DatabaseConnection, userUuid: string): Result<void> {
  const op = "twoFactorRecordDeleteAllByUser"
  try {
    database.run("DELETE FROM twofactor WHERE user_uuid = ?", [userUuid])
    database.run("DELETE FROM twofactor_incomplete WHERE user_uuid = ?", [userUuid])
    const clearResult = authenticationTrustedDeviceClearAllByUser(database, userUuid)
    if (!clearResult.success) return clearResult
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor provider delete failed.")
  }
}
