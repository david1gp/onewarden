import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceSelect } from "./identityDeviceSelect.js"

export function identityDeviceFindByUser(database: DatabaseConnection, userUuid: string): Result<IdentityDevice[]> {
  const op = "identityDeviceFindByUser"
  try {
    const rows = database
      .query<IdentityDevice, [string]>(`SELECT ${identityDeviceSelect} FROM devices WHERE user_uuid = ?`)
      .all(userUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
