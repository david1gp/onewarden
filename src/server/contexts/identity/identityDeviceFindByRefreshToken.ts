import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices } from "../../database/schema/devices.js"
import type { IdentityDevice } from "./identityDevice.js"
import { eq } from "drizzle-orm"

export function identityDeviceFindByRefreshToken(
  database: DatabaseConnection,
  refreshToken: string,
): Result<IdentityDevice | null> {
  const op = "identityDeviceFindByRefreshToken"
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
      .where(eq(devices.refreshToken, refreshToken))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Device lookup failed.")
  }
}
