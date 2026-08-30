import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"

export function identityAuthRequestCreate(
  userUuid: string,
  requestDeviceIdentifier: string,
  deviceType: number,
  requestIp: string,
  accessCode: string,
  publicKey: string,
  clock: Clock,
  identifier: Identifier,
): Result<IdentityAuthRequest> {
  const now = clock.now().toISOString()
  return resultCreate({
    uuid: identifier.uuid(),
    userUuid,
    organizationUuid: null,
    requestDeviceIdentifier,
    deviceType,
    requestIp,
    responseDeviceId: null,
    accessCode,
    publicKey,
    encKey: null,
    masterPasswordHash: null,
    approved: null,
    creationDate: now,
    responseDate: null,
    authenticationDate: null,
  })
}
