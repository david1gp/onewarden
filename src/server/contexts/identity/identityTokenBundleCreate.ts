import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityAccessTokenClaimsCreate } from "./identityAccessTokenClaimsCreate.js"
import { identityRefreshTokenClaimsCreate } from "./identityRefreshTokenClaimsCreate.js"
import type { IdentityTokenBundle } from "./identityTokenBundle.js"
import type { IdentityUser } from "./identityUser.js"

export async function identityTokenBundleCreate(
  user: IdentityUser,
  device: IdentityDevice,
  clientId: string | undefined,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
  config: IdentityConfig,
): Promise<Result<IdentityTokenBundle>> {
  const op = "identityTokenBundleCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Identity token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1000)
  const accessClaims = identityAccessTokenClaimsCreate(device, user, now, now + 2 * 60 * 60, clientId, issuer, config)
  const refreshClaims = identityRefreshTokenClaimsCreate(device, now, issuer)
  const accessTokenResult = await jwtSign(accessClaims, privateKey)
  if (!accessTokenResult.success) return resultErrorCreate(op, "Identity access token signing failed.")
  const refreshTokenResult = await jwtSign(refreshClaims, privateKey)
  if (!refreshTokenResult.success) return resultErrorCreate(op, "Identity refresh token signing failed.")
  return resultCreate({
    accessClaims,
    accessToken: accessTokenResult.data,
    expiresIn: accessClaims.exp - now,
    refreshClaims,
    refreshToken: refreshTokenResult.data,
  })
}
