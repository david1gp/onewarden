import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceSelect } from "./identityDeviceSelect.js"

export function identityDeviceFindByUuid(database: DatabaseConnection, uuid: string): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByUuid"
  try {
    const row = database
      .query<IdentityDevice, [string]>(`SELECT ${identityDeviceSelect} FROM devices WHERE uuid = ? LIMIT 1`)
      .get(uuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
