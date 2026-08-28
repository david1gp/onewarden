import { type Result } from "#result"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

const identityPasswordHintNoneMessage = "Sorry, you have no password hint..."

type IdentityPasswordHintSendOptions = {
  config: IdentityConfig
  database: DatabaseConnection
  mail: IdentityMailAdapter
}

export async function identityPasswordHintSend(
  email: string,
  options: IdentityPasswordHintSendOptions,
): Promise<Result<void>> {
  const op = "identityPasswordHintSend"
  if (!options.config.PASSWORD_HINTS_ALLOWED || (!options.config.MAIL_ENABLED && !options.config.SHOW_PASSWORD_HINT))
    return identityDomainErrorCreate(op, "This server is not configured to provide password hints.")

  const userResult = identityUserFindByEmail(options.database, email)
  if (!userResult.success) return userResult
  const user = userResult.data
  if (user === null) {
    if (options.config.MAIL_ENABLED) {
      await identityPasswordHintDelay()
      return resultCreate(undefined)
    }
    return identityDomainErrorCreate(op, identityPasswordHintNoneMessage)
  }

  if (options.config.MAIL_ENABLED) {
    try {
      const mailResult = await options.mail.sendPasswordHint?.(email, user.passwordHint)
      if (mailResult !== undefined && !mailResult.success) return mailResult
    } catch {
      return identityDomainErrorCreate(op, "Error sending password hint email.")
    }
    return resultCreate(undefined)
  }
  if (user.passwordHint !== null) return identityDomainErrorCreate(op, `Your password hint is: ${user.passwordHint}`)
  return identityDomainErrorCreate(op, identityPasswordHintNoneMessage)
}

async function identityPasswordHintDelay(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1_000))
}
