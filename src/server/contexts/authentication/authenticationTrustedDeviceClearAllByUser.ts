import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function authenticationTrustedDeviceClearAllByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<void> {
  const op = "authenticationTrustedDeviceClearAllByUser"
  try {
    database.run("UPDATE devices SET twofactor_remember = NULL WHERE user_uuid = ?", [userUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Trusted-device token clear failed.")
  }
}
