import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceTypeName } from "./identityDeviceTypeName.js"
import type { IdentityUser } from "./identityUser.js"
import type { IdentityAccessTokenClaims } from "./identityAccessTokenClaimsSchema.js"

export function identityAccessTokenClaimsCreate(
  device: IdentityDevice,
  user: IdentityUser,
  nbf: number,
  exp: number,
  clientId: string | undefined,
  issuer: string,
  config: IdentityConfig,
  scope: string[] = ["api", "offline_access"],
): IdentityAccessTokenClaims {
  return {
    nbf,
    exp,
    iss: `${issuer}|login`,
    sub: user.uuid,
    premium: true,
    name: user.name,
    email: user.email,
    email_verified: !config.MAIL_ENABLED || user.verifiedAt !== null,
    sstamp: user.securityStamp,
    device: device.uuid,
    devicetype: identityDeviceTypeName(device.type),
    client_id: clientId ?? "undefined",
    scope,
    amr: ["Application"],
  }
}
