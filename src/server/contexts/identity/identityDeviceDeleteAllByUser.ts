import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function identityDeviceDeleteAllByUser(database: DatabaseConnection, userUuid: string): Result<void> {
  const op = "identityDeviceDeleteAllByUser"
  try {
    database.run("DELETE FROM devices WHERE user_uuid = ?", [userUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Device deletion failed.")
  }
}
