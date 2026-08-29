import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceSelect } from "./identityDeviceSelect.js"

export function identityDeviceFindByRefreshToken(
  database: DatabaseConnection,
  refreshToken: string,
): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByRefreshToken"
  try {
    const row = database
      .query<IdentityDevice, [string]>(`SELECT ${identityDeviceSelect} FROM devices WHERE refresh_token = ? LIMIT 1`)
      .get(refreshToken)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
