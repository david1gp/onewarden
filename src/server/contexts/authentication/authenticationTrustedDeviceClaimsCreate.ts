import type { Clock } from "../../../shared/clock/clock.js"
import type { AuthenticationTrustedDeviceClaims } from "./authenticationTrustedDeviceClaimsSchema.js"

export function authenticationTrustedDeviceClaimsCreate(
  deviceUuid: string,
  userUuid: string,
  issuer: string,
  clock: Clock,
): AuthenticationTrustedDeviceClaims {
  const nbf = Math.floor(clock.now().getTime() / 1_000)
  return {
    exp: nbf + 30 * 24 * 60 * 60,
    iss: `${issuer}|2faremember`,
    nbf,
    sub: deviceUuid,
    user_uuid: userUuid,
  }
}
