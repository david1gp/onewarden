import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"
import type { IdentityDeviceRow } from "./identityDeviceRow.js"
import { identityDeviceFromRow } from "./identityDeviceFromRow.js"

export function identityDeviceFindByUser(database: DatabaseConnection, userUuid: string): Result<IdentityDevice[]> {
  const op = "identityDeviceFindByUser"
  try {
    const rows = database
      .query<IdentityDeviceRow, [string]>(
        `SELECT uuid, created_at, updated_at, user_uuid, name, atype, push_uuid,
           push_token, refresh_token, twofactor_remember
         FROM devices WHERE user_uuid = ?`,
      )
      .all(userUuid)
    return resultCreate(rows.map(identityDeviceFromRow))
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
