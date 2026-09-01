import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { identityAccessTokenClaimsCreate } from "./identityAccessTokenClaimsCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceIsMobile } from "./identityDeviceIsMobile.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import type { IdentityTokenBundle } from "./identityTokenBundle.js"
import type { IdentityUser } from "./identityUser.js"

const identitySsoAccessTokenDefaultLifetimeSeconds = 60 * 60
const identitySsoRefreshTokenDefaultLifetimeSeconds = 30 * 24 * 60 * 60

function identitySsoAccessTokenLifetimeResolve(expiresIn: number | null): number {
  if (expiresIn === null || !Number.isSafeInteger(expiresIn) || expiresIn <= 0)
    return identitySsoAccessTokenDefaultLifetimeSeconds
  return expiresIn
}

export async function identitySsoTokenBundleCreate(
  user: IdentityUser,
  device: IdentityDevice,
  clientId: string | undefined,
  authenticatedUser: IdentitySsoAuthenticatedUser,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
  config: IdentityConfig,
  organizationUuid?: string | null,
): Promise<Result<IdentityTokenBundle>> {
  const op = "identitySsoTokenBundleCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Identity token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const accessExpiration = config.SSO_AUTH_ONLY_NOT_SESSION
    ? now + 2 * 60 * 60
    : now + identitySsoAccessTokenLifetimeResolve(authenticatedUser.expires_in)
  const accessClaims = identityAccessTokenClaimsCreate(device, user, now, accessExpiration, clientId, issuer, config)
  const accessTokenResult = await jwtSign(accessClaims, privateKey)
  if (!accessTokenResult.success) return resultErrorCreate(op, "Identity access token signing failed.")

  const refreshToken = config.SSO_AUTH_ONLY_NOT_SESSION
    ? null
    : authenticatedUser.refresh_token === null
      ? { Access: authenticatedUser.access_token }
      : { Refresh: authenticatedUser.refresh_token }
  const refreshNbf = now
  const refreshExp = config.SSO_AUTH_ONLY_NOT_SESSION
    ? now + (identityDeviceIsMobile(device) ? 90 : 30) * 24 * 60 * 60
    : authenticatedUser.refresh_token === null
      ? accessClaims.exp
      : now + identitySsoRefreshTokenDefaultLifetimeSeconds
  const refreshClaims = {
    nbf: refreshNbf,
    exp: refreshExp,
    iss: `${issuer}|login`,
    sub: "sso" as const,
    device_token: device.refreshToken,
    token: refreshToken,
    ...(organizationUuid === undefined || organizationUuid === null ? {} : { organization_uuid: organizationUuid }),
  }
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
