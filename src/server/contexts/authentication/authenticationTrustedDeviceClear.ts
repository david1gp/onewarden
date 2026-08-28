import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityDeviceSave } from "../identity/identityDeviceSave.js"
import type { IdentityDevice } from "../identity/identityDevice.js"

export function authenticationTrustedDeviceClear(
  database: DatabaseConnection,
  device: IdentityDevice,
  clock: Clock,
): Result<void> {
  if (device.twoFactorRemember === null) return resultCreate(undefined)
  const previousToken = device.twoFactorRemember
  device.twoFactorRemember = null
  const saveResult = identityDeviceSave(database, device, clock, true)
  if (!saveResult.success) device.twoFactorRemember = previousToken
  return saveResult
}
