import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDeviceFindByRefreshToken } from "./identityDeviceFindByRefreshToken.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import type { IdentityRefreshTokenResponse } from "./identityRefreshTokenResponseSchema.js"
import { identityRefreshTokenClaimsDecode } from "./identityRefreshTokenClaimsDecode.js"
import { identityTokenBundleCreate } from "./identityTokenBundleCreate.js"
import { identityUserFindByUuid } from "./identityUserFindByUuid.js"

type IdentityRefreshLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  issuer: string
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
}

export async function identityRefreshLogin(
  refreshToken: string | undefined,
  clientId: string | undefined,
  options: IdentityRefreshLoginOptions,
): Promise<Result<IdentityRefreshTokenResponse>> {
  const op = "identityRefreshLogin"
  const database = options.database
  if (database === undefined) {
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  }
  if (refreshToken === undefined) return resultErrorCreate(op, "Missing refresh_token")
  const claimsResult = await identityRefreshTokenClaimsDecode(
    refreshToken,
    options.publicKey,
    options.issuer,
    options.clock,
  )
  if (!claimsResult.success) return resultErrorCreate(op, "Invalid refresh token")
  const deviceResult = identityDeviceFindByRefreshToken(database, claimsResult.data.device_token)
  if (!deviceResult.success) return resultErrorCreate(op, "Invalid refresh token")
  if (deviceResult.data === null) return resultErrorCreate(op, "Invalid refresh token")
  const device = deviceResult.data

  // Vaultwarden refreshes the signed JWT but keeps the device secret unchanged.
  const deviceSaveResult = identityDeviceSave(database, device, options.clock, true)
  if (!deviceSaveResult.success) return resultErrorCreate(op, "Invalid refresh token")
  const userResult = identityUserFindByUuid(database, device.userUuid)
  if (!userResult.success) return resultErrorCreate(op, "Impossible to find user")
  if (userResult.data === null) return resultErrorCreate(op, "Impossible to find user")
  const bundleResult = await identityTokenBundleCreate(
    userResult.data,
    device,
    clientId,
    options.issuer,
    options.privateKey,
    options.clock,
    options.config,
  )
  if (!bundleResult.success) return resultErrorCreate(op, "Invalid refresh token")
  const finalDeviceSaveResult = identityDeviceSave(database, device, options.clock, true)
  if (!finalDeviceSaveResult.success) return resultErrorCreate(op, "Invalid refresh token")
  return resultCreate({
    refresh_token: bundleResult.data.refreshToken,
    access_token: bundleResult.data.accessToken,
    expires_in: bundleResult.data.expiresIn,
    token_type: "Bearer",
    scope: "api offline_access",
  })
}
