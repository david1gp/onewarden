import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { authenticationTrustedDeviceClaimsCreate } from "./authenticationTrustedDeviceClaimsCreate.js"

export async function authenticationTrustedDeviceTokenCreate(
  device: IdentityDevice,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<string>> {
  if (privateKey === undefined) {
    return resultErrorCreate("authenticationTrustedDeviceTokenCreate", "2FA remember token signing is unavailable.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }
  return jwtSign(authenticationTrustedDeviceClaimsCreate(device.uuid, device.userUuid, issuer, clock), privateKey)
}
