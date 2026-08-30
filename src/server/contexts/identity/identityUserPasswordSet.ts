import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authenticationSecurityStampExceptionSet } from "../authentication/authenticationSecurityStampExceptionSet.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"
import { identityDeviceRefreshTokensRotateByUser } from "./identityDeviceRefreshTokensRotateByUser.js"
import type { IdentityUser } from "./identityUser.js"

type IdentityUserPasswordSetOptions = {
  clock: Clock
  database: DatabaseConnection
  identifier: Identifier
  clearTrustedDevices?: boolean
  resetSecurityStamp: boolean
  stampExceptionRoutes?: string[]
}

export async function identityUserPasswordSet(
  user: IdentityUser,
  password: string,
  newAkey: string | undefined,
  options: IdentityUserPasswordSetOptions,
): Promise<Result<void>> {
  const passwordHashResult = await passwordHashCreate(password, user.salt, user.passwordIterations)
  if (!passwordHashResult.success) return passwordHashResult
  user.passwordHash = passwordHashResult.data
  if (options.stampExceptionRoutes !== undefined)
    authenticationSecurityStampExceptionSet(user, options.stampExceptionRoutes, options.clock)
  if (newAkey !== undefined) user.akey = newAkey
  if (options.resetSecurityStamp) {
    user.securityStamp = options.identifier.uuid()
    const rotateResult = identityDeviceRefreshTokensRotateByUser(options.database, user.uuid, options.clock)
    if (!rotateResult.success) return rotateResult
    if (options.clearTrustedDevices ?? true) {
      const clearResult = authenticationTrustedDeviceClearAllByUser(options.database, user.uuid)
      if (!clearResult.success) return clearResult
    }
  }
  return resultCreate(undefined)
}
