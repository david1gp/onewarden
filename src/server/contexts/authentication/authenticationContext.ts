import type { IdentityAccessTokenClaims } from "../identity/identityAccessTokenClaimsSchema.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import type { IdentityUser } from "../identity/identityUser.js"

export type AuthenticationContext = {
  accessToken: string
  claims: IdentityAccessTokenClaims
  device: IdentityDevice
  host: string
  ip: string
  user: IdentityUser
}
