import type { KeyInput } from "jose"
import type { Result, ResultErr } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDeviceFindByRefreshToken } from "./identityDeviceFindByRefreshToken.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityRefreshTokenClaimsDecode } from "./identityRefreshTokenClaimsDecode.js"
import type { IdentityRefreshTokenResponse } from "./identityRefreshTokenResponseSchema.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import { identitySsoOrganizationConfigResolve } from "./identitySsoOrganizationConfigResolve.js"
import { identitySsoTokenBundleCreate } from "./identitySsoTokenBundleCreate.js"
import { identityTokenBundleCreate } from "./identityTokenBundleCreate.js"
import { identityUserFindByUuid } from "./identityUserFindByUuid.js"

type IdentityRefreshLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  issuer: string
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  sso?: IdentitySsoAdapter
}

export async function identityRefreshLogin(
  refreshToken: string | undefined,
  clientId: string | undefined,
  options: IdentityRefreshLoginOptions,
): Promise<Result<IdentityRefreshTokenResponse>> {
  const op = "identityRefreshLogin"
  const database = options.database
  if (database === undefined) {
    return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
  }
  if (refreshToken === undefined) return resultErrorCreate(op, "Missing refresh_token")
  if (options.publicKey === undefined)
    return identityRefreshUnavailableErrorCreate(op, "Identity token verification is unavailable.")
  const claimsResult = await identityRefreshTokenClaimsDecode(
    refreshToken,
    options.publicKey,
    options.issuer,
    options.clock,
  )
  if (!claimsResult.success) return resultErrorCreate(op, "Invalid refresh token")
  const deviceResult = identityDeviceFindByRefreshToken(database, claimsResult.data.device_token)
  if (!deviceResult.success) return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
  if (deviceResult.data === null) return resultErrorCreate(op, "Invalid refresh token")
  const device = deviceResult.data

  // Vaultwarden refreshes the signed JWT but keeps the device secret unchanged.
  const deviceSaveResult = identityDeviceSave(database, device, options.clock, true)
  if (!deviceSaveResult.success) return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
  const userResult = identityUserFindByUuid(database, device.userUuid)
  if (!userResult.success) return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
  if (userResult.data === null) return resultErrorCreate(op, "Impossible to find user")
  const organizationUuid = claimsResult.data.organization_uuid ?? null
  let organizationConfig: IdentityConfig | undefined
  if (claimsResult.data.sub === "sso" && organizationUuid !== null) {
    const configResult = await identitySsoOrganizationConfigResolve(database, organizationUuid, options.config)
    if (!configResult.success) {
      if (identityRefreshTransientErrorIs(configResult)) return configResult
      if (configResult.code === undefined && configResult.statusCode === undefined)
        return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
      return resultErrorCreate(op, "Invalid refresh token")
    }
    organizationConfig = configResult.data
  }
  const ssoConfig = organizationConfig ?? options.config
  if (claimsResult.data.sub === "sso" && !options.config.SSO_ENABLED)
    return resultErrorCreate(op, "SSO is now disabled, Login again using email and master password")
  if (claimsResult.data.sub === "sso" && !options.config.SSO_AUTH_ONLY_NOT_SESSION) {
    const sso = options.sso
    const token = claimsResult.data.token
    if (sso === undefined) return identityRefreshUnavailableErrorCreate(op, "SSO refresh is unavailable")
    if (token !== null && token !== undefined && "Refresh" in token) {
      if (sso.refresh === undefined) return identityRefreshUnavailableErrorCreate(op, "SSO refresh is unavailable")
      const providerResult = await sso.refresh(token.Refresh, organizationConfig)
      if (!providerResult.success) {
        if (identityRefreshTransientErrorIs(providerResult)) return providerResult
        return resultErrorCreate(op, "Invalid refresh token")
      }
      const authenticatedUser: IdentitySsoAuthenticatedUser = {
        refresh_token: providerResult.data.refresh_token ?? token.Refresh,
        access_token: providerResult.data.access_token,
        expires_in: providerResult.data.expires_in,
        identifier: "refresh",
        email: userResult.data.email,
        email_verified: true,
        user_name: userResult.data.name,
      }
      const bundleResult = await identitySsoTokenBundleCreate(
        userResult.data,
        device,
        clientId,
        authenticatedUser,
        options.issuer,
        options.privateKey,
        options.clock,
        ssoConfig,
        organizationUuid,
      )
      if (!bundleResult.success)
        return identityRefreshUnavailableErrorCreate(op, "Identity token creation is unavailable.")
      const finalDeviceSaveResult = identityDeviceSave(database, device, options.clock, true)
      if (!finalDeviceSaveResult.success)
        return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
      return resultCreate({
        refresh_token: bundleResult.data.refreshToken,
        access_token: bundleResult.data.accessToken,
        expires_in: bundleResult.data.expiresIn,
        token_type: "Bearer",
        scope: "api offline_access",
      })
    }
    if (token !== null && token !== undefined && "Access" in token) {
      if (sso.validateAccessToken === undefined)
        return identityRefreshUnavailableErrorCreate(op, "SSO refresh is unavailable")
      const now = Math.floor(options.clock.now().getTime() / 1_000)
      if (claimsResult.data.exp < now + 5 * 60) return resultErrorCreate(op, "Invalid refresh token")
      const validationResult = await sso.validateAccessToken(token.Access, organizationConfig)
      if (!validationResult.success) {
        if (identityRefreshTransientErrorIs(validationResult)) return validationResult
        return resultErrorCreate(op, "Invalid refresh token")
      }
      const authenticatedUser: IdentitySsoAuthenticatedUser = {
        refresh_token: null,
        access_token: token.Access,
        expires_in: null,
        identifier: "refresh",
        email: userResult.data.email,
        email_verified: true,
        user_name: userResult.data.name,
      }
      const bundleResult = await identitySsoTokenBundleCreate(
        userResult.data,
        device,
        clientId,
        authenticatedUser,
        options.issuer,
        options.privateKey,
        options.clock,
        ssoConfig,
        organizationUuid,
      )
      if (!bundleResult.success)
        return identityRefreshUnavailableErrorCreate(op, "Identity token creation is unavailable.")
      const finalDeviceSaveResult = identityDeviceSave(database, device, options.clock, true)
      if (!finalDeviceSaveResult.success)
        return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
      return resultCreate({
        refresh_token: bundleResult.data.refreshToken,
        access_token: bundleResult.data.accessToken,
        expires_in: bundleResult.data.expiresIn,
        token_type: "Bearer",
        scope: "api offline_access",
      })
    }
    return resultErrorCreate(op, "Invalid refresh token")
  }
  const bundleResult = await identityTokenBundleCreate(
    userResult.data,
    device,
    clientId,
    options.issuer,
    options.privateKey,
    options.clock,
    options.config,
    claimsResult.data.sub,
  )
  if (!bundleResult.success) {
    if (options.privateKey === undefined)
      return identityRefreshUnavailableErrorCreate(op, "Identity token signing is unavailable.")
    return identityRefreshUnavailableErrorCreate(op, "Identity token creation is unavailable.")
  }
  const finalDeviceSaveResult = identityDeviceSave(database, device, options.clock, true)
  if (!finalDeviceSaveResult.success)
    return identityRefreshUnavailableErrorCreate(op, "Identity database is unavailable.")
  return resultCreate({
    refresh_token: bundleResult.data.refreshToken,
    access_token: bundleResult.data.accessToken,
    expires_in: bundleResult.data.expiresIn,
    token_type: "Bearer",
    scope: "api offline_access",
  })
}

function identityRefreshTransientErrorIs(error: ResultErr): boolean {
  return (
    error.code === "platform.rate-limited" ||
    error.code === "platform.unavailable" ||
    error.statusCode === 429 ||
    error.statusCode === 503
  )
}

function identityRefreshUnavailableErrorCreate(op: string, message: string): ResultErr {
  return resultErrorCreate(op, message, { code: "platform.unavailable", statusCode: 503 })
}
