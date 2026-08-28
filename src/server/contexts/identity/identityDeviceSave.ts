import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityDevice } from "./identityDevice.js"

export function identityDeviceSave(
  database: DatabaseConnection,
  device: IdentityDevice,
  clock: Clock,
  updateTime: boolean,
): Result<void> {
  const op = "identityDeviceSave"
  try {
    if (updateTime) device.updatedAt = clock.now().toISOString()
    database.run(
      `INSERT INTO devices (
         uuid, created_at, updated_at, user_uuid, name, atype, push_uuid,
         push_token, refresh_token, twofactor_remember
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid, user_uuid) DO UPDATE SET
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         name = excluded.name,
         atype = excluded.atype,
         push_uuid = excluded.push_uuid,
         push_token = excluded.push_token,
         refresh_token = excluded.refresh_token,
         twofactor_remember = excluded.twofactor_remember`,
      [
        device.uuid,
        device.createdAt,
        device.updatedAt,
        device.userUuid,
        device.name,
        device.type,
        device.pushUuid,
        device.pushToken,
        device.refreshToken,
        device.twoFactorRemember,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Device save failed.")
  }
}
