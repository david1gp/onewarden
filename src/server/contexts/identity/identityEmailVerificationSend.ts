import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityVerifyEmailTokenCreate } from "./identityVerifyEmailTokenCreate.js"
import type { IdentityUser } from "./identityUser.js"

type IdentityEmailVerificationSendOptions = {
  clock: Clock
  config: IdentityConfig
  issuer: string
  mail: IdentityMailAdapter
  privateKey: KeyInput | undefined
}

export async function identityEmailVerificationSend(
  user: IdentityUser,
  options: IdentityEmailVerificationSendOptions,
): Promise<Result<void>> {
  const op = "identityEmailVerificationSend"
  if (!options.config.MAIL_ENABLED) return identityDomainErrorCreate(op, "Cannot verify email address")

  const tokenResult = await identityVerifyEmailTokenCreate(
    user.uuid,
    options.issuer,
    options.privateKey,
    options.clock,
    options.config.INVITATION_EXPIRATION_HOURS,
  )
  if (!tokenResult.success) return tokenResult
  try {
    await options.mail.sendVerifyEmail?.(user.email, user.uuid, tokenResult.data)
  } catch {
    void 0
  }
  return resultCreate(undefined)
}
