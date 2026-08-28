import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import type { IdentityDevice } from "./identityDevice.js"

export function identityDeviceCreate(
  uuid: string,
  userUuid: string,
  name: string,
  type: number,
  clock: Clock,
  identifier: Identifier,
): Result<IdentityDevice> {
  const randomResult = secureRandomBytes(64)
  if (!randomResult.success) return randomResult
  const now = clock.now().toISOString()
  return resultCreate({
    uuid,
    createdAt: now,
    updatedAt: now,
    userUuid,
    name,
    type,
    pushUuid: identifier.uuid(),
    pushToken: null,
    refreshToken: base64UrlEncode(randomResult.data),
    twoFactorRemember: null,
  })
}
