import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDeleteAccountTokenCreate } from "./identityDeleteAccountTokenCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"

type IdentityAccountDeleteRecoverOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection
  issuer: string
  mail: IdentityMailAdapter
  privateKey: KeyInput | undefined
}

export async function identityAccountDeleteRecover(
  email: string,
  options: IdentityAccountDeleteRecoverOptions,
): Promise<Result<void>> {
  const op = "identityAccountDeleteRecover"
  if (!options.config.MAIL_ENABLED)
    return identityDomainErrorCreate(op, "Please contact the administrator to delete your account")

  const userResult = identityUserFindByEmail(options.database, email)
  if (!userResult.success) return userResult
  const user = userResult.data
  if (user === null) return resultCreate(undefined)

  const tokenResult = await identityDeleteAccountTokenCreate(
    user.uuid,
    options.issuer,
    options.privateKey,
    options.clock,
    options.config.INVITATION_EXPIRATION_HOURS,
  )
  if (!tokenResult.success) return tokenResult
  try {
    await options.mail.sendDeleteAccount?.(user.email, user.uuid, tokenResult.data)
  } catch {
    void 0
  }
  return resultCreate(undefined)
}
