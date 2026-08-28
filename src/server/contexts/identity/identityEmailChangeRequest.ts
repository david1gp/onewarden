import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityAccountEmailTokenData } from "./identityAccountEmailTokenDataSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityEmailChangeDomainAllowed } from "./identityEmailChangeDomainAllowed.js"
import { identityEmailTokenCreate } from "./identityEmailTokenCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import type { IdentityUser } from "./identityUser.js"
import { identityUserSave } from "./identityUserSave.js"

type IdentityEmailChangeRequestOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection
  mail: IdentityMailAdapter
}

export async function identityEmailChangeRequest(
  user: IdentityUser,
  data: IdentityAccountEmailTokenData,
  options: IdentityEmailChangeRequestOptions,
): Promise<Result<void>> {
  const op = "identityEmailChangeRequest"
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
  const existingUser = existingUserResult.data
  if (existingUser !== null) {
    if (options.config.MAIL_ENABLED) {
      try {
        if (existingUser.passwordHash.byteLength === 0) {
          await options.mail.sendChangeEmailInvited?.(data.newEmail, user.email, user.uuid)
        } else {
          await options.mail.sendChangeEmailExisting?.(data.newEmail, user.email, user.uuid)
        }
      } catch {
        void 0
      }
    }
    return identityDomainErrorCreate(op, "Email already in use")
  }

  if (!identityEmailChangeDomainAllowed(options.config, data.newEmail))
    return identityDomainErrorCreate(op, "Email domain not allowed")

  const tokenResult = identityEmailTokenCreate()
  if (!tokenResult.success) return tokenResult
  if (options.config.MAIL_ENABLED) {
    try {
      await options.mail.sendChangeEmail?.(data.newEmail, tokenResult.data, user.uuid)
    } catch {
      void 0
    }
  }

  user.emailNew = data.newEmail
  user.emailNewToken = tokenResult.data
  user.updatedAt = options.clock.now().toISOString()
  const saveResult = identityUserSave(options.database, user)
  if (!saveResult.success) return saveResult
  return resultCreate(undefined)
}
