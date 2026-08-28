import type { IdentityAccessTokenClaims } from "./identityAccessTokenClaimsSchema.js"
import type { IdentityRefreshTokenClaims } from "./identityRefreshTokenClaimsSchema.js"

export type IdentityTokenBundle = {
  accessClaims: IdentityAccessTokenClaims
  accessToken: string
  expiresIn: number
  refreshClaims: IdentityRefreshTokenClaims
  refreshToken: string
}
