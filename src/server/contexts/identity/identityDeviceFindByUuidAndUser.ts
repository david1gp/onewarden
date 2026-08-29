import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceSelect } from "./identityDeviceSelect.js"

export function identityDeviceFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByUuidAndUser"
  try {
    const row = database
      .query<IdentityDevice, [string, string]>(
        `SELECT ${identityDeviceSelect} FROM devices WHERE uuid = ? AND user_uuid = ? LIMIT 1`,
      )
      .get(uuid, userUuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
