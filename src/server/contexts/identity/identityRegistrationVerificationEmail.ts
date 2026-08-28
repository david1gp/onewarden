import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityInvitationExists } from "./identityInvitationExists.js"
import { identityRegistrationVerifyTokenCreate } from "./identityRegistrationVerifyTokenCreate.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"

type IdentityRegistrationVerificationEmailOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  issuer: string
  mail: IdentityMailAdapter
  privateKey: KeyInput | undefined
}

export async function identityRegistrationVerificationEmail(
  email: string,
  name: string | null,
  options: IdentityRegistrationVerificationEmailOptions,
): Promise<Result<{ kind: "noContent" } | { kind: "token"; token: string }>> {
  const op = "identityRegistrationVerificationEmail"
  const database = options.database
  const signupAllowed = identityEmailDomainAllowed(options.config, email)
  if (!signupAllowed) {
    if (options.config.MAIL_ENABLED || database === undefined) {
      return resultErrorCreate(op, "Registration not allowed or user already exists", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    const invitationResult = identityInvitationExists(database, email)
    if (!invitationResult.success) return invitationResult
    if (!invitationResult.data) {
      return resultErrorCreate(op, "Registration not allowed or user already exists", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
  }

  const shouldSendMail = options.config.MAIL_ENABLED && options.config.SIGNUPS_VERIFY
  const tokenResult = await identityRegistrationVerifyTokenCreate(
    email,
    name,
    shouldSendMail,
    options.issuer,
    options.privateKey,
    options.clock,
  )
  if (!tokenResult.success) return tokenResult
  if (!shouldSendMail) return resultCreate({ kind: "token", token: tokenResult.data })

  if (database !== undefined) {
    const userResult = identityUserFindByEmail(database, email)
    if (!userResult.success) return userResult
    if (userResult.data?.privateKey !== null && userResult.data?.privateKey !== undefined) {
      return resultCreate({ kind: "noContent" })
    }
  }
  const mailResult = await options.mail.sendRegisterVerifyEmail(email, tokenResult.data)
  if (!mailResult.success)
    return resultErrorCreate(op, "Error sending verification email.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return resultCreate({ kind: "noContent" })
}

function identityEmailDomainAllowed(config: IdentityConfig, email: string): boolean {
  const whitelist = config.SIGNUPS_DOMAINS_WHITELIST.split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => domain.length > 0)
  if (whitelist.length === 0) return config.SIGNUPS_ALLOWED
  const at = email.lastIndexOf("@")
  if (at < 1 || at === email.length - 1) return false
  return whitelist.includes(email.slice(at + 1).toLowerCase())
}
