import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { authenticationTrustedDeviceClear } from "./authenticationTrustedDeviceClear.js"
import { authenticationTrustedDeviceTokenDecode } from "./authenticationTrustedDeviceTokenDecode.js"

type AuthenticationTrustedDeviceValidateOptions = {
  clock: Clock
  config?: Pick<IdentityConfig, "DISABLE_2FA_REMEMBER">
  database: DatabaseConnection
  disabled?: boolean
  issuer: string
  publicKey: KeyInput | undefined
}

export async function authenticationTrustedDeviceValidate(
  device: IdentityDevice,
  token: string | undefined,
  options: AuthenticationTrustedDeviceValidateOptions,
): Promise<Result<boolean>> {
  const storedToken = device.twoFactorRemember
  if (storedToken === null) return resultCreate(false)

  const disabled = options.disabled ?? options.config?.DISABLE_2FA_REMEMBER ?? false
  const invalidTokenResultCreate = (): Result<boolean> => {
    const clearResult = authenticationTrustedDeviceClear(options.database, device, options.clock)
    if (!clearResult.success) return clearResult
    return resultCreate(false)
  }
  if (disabled || token === undefined || !constantTimeStringsEqual(storedToken, token))
    return invalidTokenResultCreate()

  const claimsResult = await authenticationTrustedDeviceTokenDecode(
    token,
    options.issuer,
    options.publicKey,
    options.clock,
  )
  if (!claimsResult.success) return invalidTokenResultCreate()
  if (claimsResult.data.sub !== device.uuid || claimsResult.data.user_uuid !== device.userUuid)
    return invalidTokenResultCreate()
  return resultCreate(true)
}
