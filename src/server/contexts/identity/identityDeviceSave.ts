import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices, type DeviceInsert } from "../../database/schema/devices.js"
import type { IdentityDevice } from "./identityDevice.js"

export function identityDeviceSave(
  database: DatabaseConnection,
  device: IdentityDevice,
  clock: Clock,
  updateTime: boolean,
): Result<void> {
  const op = "identityDeviceSave"
  try {
    const updatedAt = updateTime ? clock.now().toISOString() : device.updatedAt
    const values: DeviceInsert = {
      uuid: device.uuid,
      createdAt: device.createdAt,
      updatedAt,
      userUuid: device.userUuid,
      name: device.name,
      atype: device.type,
      pushUuid: device.pushUuid,
      pushToken: device.pushToken,
      refreshToken: device.refreshToken,
      twofactorRemember: device.twoFactorRemember,
    }
    database.drizzle
      .insert(devices)
      .values(values)
      .onConflictDoUpdate({
        target: [devices.uuid, devices.userUuid],
        set: {
          createdAt: values.createdAt,
          updatedAt: values.updatedAt,
          name: values.name,
          atype: values.atype,
          pushUuid: values.pushUuid,
          pushToken: values.pushToken,
          refreshToken: values.refreshToken,
          twofactorRemember: values.twofactorRemember,
        },
      })
      .run()
    if (updateTime) device.updatedAt = updatedAt
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Device save failed.")
  }
}
