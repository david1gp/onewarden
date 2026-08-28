import { decodeJwt, type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceIsMobile } from "./identityDeviceIsMobile.js"
import { identityAccessTokenClaimsCreate } from "./identityAccessTokenClaimsCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import type { IdentityTokenBundle } from "./identityTokenBundle.js"
import type { IdentityUser } from "./identityUser.js"

type IdentitySsoProviderTokenClaims = {
  exp?: unknown
  iat?: unknown
  iss?: unknown
  nbf?: unknown
}

function identitySsoProviderTokenClaimsRead(
  token: string,
  issuer: string,
  now: number,
): { nbf: number; exp: number } | null {
  try {
    const claims = decodeJwt<IdentitySsoProviderTokenClaims>(token)
    if (claims.iss !== issuer || typeof claims.exp !== "number" || claims.exp < now - 60) return null
    const nbf = typeof claims.nbf === "number" ? claims.nbf : typeof claims.iat === "number" ? claims.iat : now
    return { nbf, exp: claims.exp }
  } catch {
    return null
  }
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
): Promise<Result<IdentityTokenBundle>> {
  const op = "identitySsoTokenBundleCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Identity token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const providerAccessClaims = identitySsoProviderTokenClaimsRead(
    authenticatedUser.access_token,
    config.SSO_AUTHORITY,
    now,
  )
  const effectiveProviderAccessClaims = config.SSO_AUTH_ONLY_NOT_SESSION ? null : providerAccessClaims
  const accessExpiration = config.SSO_AUTH_ONLY_NOT_SESSION
    ? now + 2 * 60 * 60
    : (effectiveProviderAccessClaims?.exp ??
      (authenticatedUser.expires_in === null ? null : now + authenticatedUser.expires_in))
  if (accessExpiration === null) return identityDomainErrorCreate(op, "Non jwt access_token and empty expires_in")
  const accessClaims = identityAccessTokenClaimsCreate(
    device,
    user,
    effectiveProviderAccessClaims?.nbf ?? now,
    accessExpiration,
    clientId,
    issuer,
    config,
  )
  const accessTokenResult = await jwtSign(accessClaims, privateKey)
  if (!accessTokenResult.success) return resultErrorCreate(op, "Identity access token signing failed.")

  const providerRefreshClaims =
    authenticatedUser.refresh_token === null
      ? null
      : identitySsoProviderTokenClaimsRead(authenticatedUser.refresh_token, config.SSO_AUTHORITY, now)
  const refreshToken = config.SSO_AUTH_ONLY_NOT_SESSION
    ? null
    : authenticatedUser.refresh_token === null
      ? { Access: authenticatedUser.access_token }
      : { Refresh: authenticatedUser.refresh_token }
  const refreshNbf = config.SSO_AUTH_ONLY_NOT_SESSION
    ? now
    : (providerRefreshClaims?.nbf ?? (authenticatedUser.refresh_token === null ? accessClaims.nbf : now))
  const refreshExp = config.SSO_AUTH_ONLY_NOT_SESSION
    ? now + (identityDeviceIsMobile(device) ? 90 : 30) * 24 * 60 * 60
    : (providerRefreshClaims?.exp ??
      (authenticatedUser.refresh_token === null ? accessClaims.exp : now + 30 * 24 * 60 * 60))
  const refreshClaims = {
    nbf: refreshNbf,
    exp: refreshExp,
    iss: `${issuer}|login`,
    sub: "sso" as const,
    device_token: device.refreshToken,
    token: refreshToken,
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
