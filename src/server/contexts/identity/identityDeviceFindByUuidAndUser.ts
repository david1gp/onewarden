import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"
import type { IdentityDeviceRow } from "./identityDeviceRow.js"
import { identityDeviceFromRow } from "./identityDeviceFromRow.js"

export function identityDeviceFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByUuidAndUser"
  try {
    const row = database
      .query<IdentityDeviceRow, [string, string]>(
        `SELECT uuid, created_at, updated_at, user_uuid, name, atype, push_uuid,
           push_token, refresh_token, twofactor_remember
         FROM devices WHERE uuid = ? AND user_uuid = ? LIMIT 1`,
      )
      .get(uuid, userUuid)
    return resultCreate(row === null ? null : identityDeviceFromRow(row))
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
