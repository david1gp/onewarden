import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices } from "../../database/schema/devices.js"
import type { IdentityDevice } from "./identityDevice.js"
import { eq } from "drizzle-orm"

export function identityDeviceFindByUuid(database: DatabaseConnection, uuid: string): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByUuid"
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
      .where(eq(devices.uuid, uuid))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
