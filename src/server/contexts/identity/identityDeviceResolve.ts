import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityDeviceCreate } from "./identityDeviceCreate.js"
import { identityDeviceFindByUuidAndUser } from "./identityDeviceFindByUuidAndUser.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityDeviceTypeParse } from "./identityDeviceTypeParse.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"

export function identityDeviceResolve(
  database: DatabaseConnection,
  data: IdentityTokenRequest,
  userUuid: string,
  clock: Clock,
  identifier: Identifier,
): Result<IdentityDevice> {
  const deviceIdentifier = data.deviceIdentifier
  const deviceName = data.deviceName
  const deviceType = data.deviceType
  if (deviceIdentifier === undefined)
    return identityDomainErrorCreate("identityDeviceResolve", "device_identifier cannot be blank")
  if (deviceName === undefined) return identityDomainErrorCreate("identityDeviceResolve", "device_name cannot be blank")
  if (deviceType === undefined) return identityDomainErrorCreate("identityDeviceResolve", "device_type cannot be blank")

  const deviceResult = identityDeviceFindByUuidAndUser(database, deviceIdentifier, userUuid)
  if (!deviceResult.success) return deviceResult
  if (deviceResult.data !== null) return resultCreate(deviceResult.data)

  const newDeviceResult = identityDeviceCreate(
    deviceIdentifier,
    userUuid,
    deviceName,
    identityDeviceTypeParse(deviceType),
    clock,
    identifier,
  )
  if (!newDeviceResult.success) return newDeviceResult
  const saveResult = identityDeviceSave(database, newDeviceResult.data, clock, false)
  if (!saveResult.success) return saveResult
  return newDeviceResult
}
