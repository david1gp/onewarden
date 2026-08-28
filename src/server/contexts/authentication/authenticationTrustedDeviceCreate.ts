import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { identityDeviceSave } from "../identity/identityDeviceSave.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { authenticationTrustedDeviceTokenCreate } from "./authenticationTrustedDeviceTokenCreate.js"

type AuthenticationTrustedDeviceCreateOptions = {
  clock: Clock
  config?: Pick<IdentityConfig, "DISABLE_2FA_REMEMBER">
  database: DatabaseConnection
  disabled?: boolean
  issuer: string
  privateKey: KeyInput | undefined
}

export async function authenticationTrustedDeviceCreate(
  device: IdentityDevice,
  options: AuthenticationTrustedDeviceCreateOptions,
): Promise<Result<string>> {
  const op = "authenticationTrustedDeviceCreate"
  const disabled = options.disabled ?? options.config?.DISABLE_2FA_REMEMBER ?? false
  if (disabled) {
    return resultErrorCreate(op, "2FA remember is disabled.", { code: "platform.invalid-request", statusCode: 400 })
  }
  const tokenResult = await authenticationTrustedDeviceTokenCreate(
    device,
    options.issuer,
    options.privateKey,
    options.clock,
  )
  if (!tokenResult.success) return tokenResult
  const previousToken = device.twoFactorRemember
  device.twoFactorRemember = tokenResult.data
  const saveResult = identityDeviceSave(options.database, device, options.clock, true)
  if (!saveResult.success) {
    device.twoFactorRemember = previousToken
    return saveResult
  }
  return tokenResult
}
