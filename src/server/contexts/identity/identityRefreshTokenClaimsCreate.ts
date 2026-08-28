import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceIsMobile } from "./identityDeviceIsMobile.js"
import type { IdentityRefreshTokenClaims } from "./identityRefreshTokenClaimsSchema.js"

const IDENTITY_DEFAULT_REFRESH_VALIDITY_SECONDS = 30 * 24 * 60 * 60
const IDENTITY_MOBILE_REFRESH_VALIDITY_SECONDS = 90 * 24 * 60 * 60

export function identityRefreshTokenClaimsCreate(
  device: IdentityDevice,
  nbf: number,
  issuer: string,
): IdentityRefreshTokenClaims {
  const validity = identityDeviceIsMobile(device)
    ? IDENTITY_MOBILE_REFRESH_VALIDITY_SECONDS
    : IDENTITY_DEFAULT_REFRESH_VALIDITY_SECONDS
  return {
    nbf,
    exp: nbf + validity,
    iss: `${issuer}|login`,
    sub: "password",
    device_token: device.refreshToken,
    token: null,
  }
}
