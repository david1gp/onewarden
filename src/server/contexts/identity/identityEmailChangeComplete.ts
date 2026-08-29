import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAccountChangeEmailData } from "./identityAccountChangeEmailDataSchema.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import type { IdentityUser } from "./identityUser.js"
import { identityDeviceRefreshTokensRotateByUser } from "./identityDeviceRefreshTokensRotateByUser.js"
import { identityUserSave } from "./identityUserSave.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"

type IdentityEmailChangeCompleteOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection
  identifier: Identifier
}

export async function identityEmailChangeComplete(
  user: IdentityUser,
  data: IdentityAccountChangeEmailData,
  options: IdentityEmailChangeCompleteOptions,
): Promise<Result<void>> {
  const op = "identityEmailChangeComplete"
  if (!options.config.EMAIL_CHANGE_ALLOWED) return identityDomainErrorCreate(op, "Email change is not allowed.")

  const passwordResult = await passwordHashVerify(
    data.masterPasswordHash,
    user.salt,
    user.passwordHash,
    user.passwordIterations,
  )
  if (!passwordResult.success) return passwordResult
  if (!passwordResult.data) return identityDomainErrorCreate(op, "Invalid password")

  const existingUserResult = identityUserFindByEmail(options.database, data.newEmail)
  if (!existingUserResult.success) return existingUserResult
  if (existingUserResult.data !== null) return identityDomainErrorCreate(op, "Email already in use")

  if (user.emailNew === null) return identityDomainErrorCreate(op, "No email change pending")
  if (user.emailNew !== data.newEmail) return identityDomainErrorCreate(op, "Email change mismatch")

  if (options.config.MAIL_ENABLED) {
    if (user.emailNewToken === null) return identityDomainErrorCreate(op, "No email change pending")
    if (user.emailNewToken !== String(data.token)) return identityDomainErrorCreate(op, "Token mismatch")
    user.verifiedAt = options.clock.now().toISOString()
  } else {
    user.verifiedAt = null
  }

  const passwordHashResult = await passwordHashCreate(data.newMasterPasswordHash, user.salt, user.passwordIterations)
  if (!passwordHashResult.success) return passwordHashResult
  user.email = data.newEmail
  user.emailNew = null
  user.emailNewToken = null
  user.passwordHash = passwordHashResult.data
  user.akey = data.key
  user.securityStamp = options.identifier.uuid()
  user.updatedAt = options.clock.now().toISOString()
  return databaseTransaction(options.database, () => {
    const rotateResult = identityDeviceRefreshTokensRotateByUser(options.database, user.uuid, options.clock)
    if (!rotateResult.success) return rotateResult
    const rememberResult = authenticationTrustedDeviceClearAllByUser(options.database, user.uuid)
    if (!rememberResult.success) return rememberResult
    return identityUserSave(options.database, user)
  })
}
