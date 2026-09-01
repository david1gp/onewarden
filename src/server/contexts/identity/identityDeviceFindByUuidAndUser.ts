import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices } from "../../database/schema/devices.js"
import type { IdentityDevice } from "./identityDevice.js"
import { and, eq } from "drizzle-orm"

export function identityDeviceFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByUuidAndUser"
  try {
    const row = database.drizzle
      .select({
        uuid: devices.uuid,
        createdAt: devices.createdAt,
        updatedAt: devices.updatedAt,
        userUuid: devices.userUuid,
        name: devices.name,
        type: devices.atype,
        pushUuid: devices.pushUuid,
        pushToken: devices.pushToken,
        refreshToken: devices.refreshToken,
        twoFactorRemember: devices.twofactorRemember,
      })
      .from(devices)
      .where(and(eq(devices.uuid, uuid), eq(devices.userUuid, userUuid)))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
