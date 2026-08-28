import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityDeviceFindByUser } from "./identityDeviceFindByUser.js"
import { identityDeviceRefreshTokenCreate } from "./identityDeviceRefreshTokenCreate.js"
import { identityDeviceSave } from "./identityDeviceSave.js"

export function identityDeviceRefreshTokensRotateByUser(
  database: DatabaseConnection,
  userUuid: string,
  clock: Clock,
): Result<void> {
  const op = "identityDeviceRefreshTokensRotateByUser"
  const devicesResult = identityDeviceFindByUser(database, userUuid)
  if (!devicesResult.success) return devicesResult
  for (const device of devicesResult.data) {
    const refreshTokenResult = identityDeviceRefreshTokenCreate()
    if (!refreshTokenResult.success) return refreshTokenResult
    device.refreshToken = refreshTokenResult.data
    const saveResult = identityDeviceSave(database, device, clock, false)
    if (!saveResult.success) return resultErrorCreate(op, saveResult.errorMessage)
  }
  return resultCreate(undefined)
}
