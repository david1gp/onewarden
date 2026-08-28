import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityInvitationExists } from "./identityInvitationExists.js"
import { identityInvitationTake } from "./identityInvitationTake.js"
import { identityRegistrationDataNormalize } from "./identityRegistrationDataNormalize.js"
import type { IdentityRegistrationData } from "./identityRegistrationDataSchema.js"
import { identityRegistrationInviteTokenDecode } from "./identityRegistrationInviteTokenDecode.js"
import { identityRegistrationVerifyTokenDecode } from "./identityRegistrationVerifyTokenDecode.js"
import { identityVerifyEmailTokenCreate } from "./identityVerifyEmailTokenCreate.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import type { IdentityUser } from "./identityUser.js"
import { identityUserSave } from "./identityUserSave.js"

type IdentityRegistrationOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  identifier: Identifier
  issuer: string
  mail: IdentityMailAdapter
  privateKey?: KeyInput
  publicKey: KeyInput | undefined
}

function identityKdfDataEqual(
  left: { kdf: number; kdfIterations: number; kdfMemory: number | null; kdfParallelism: number | null },
  right: { kdf: number; kdfIterations: number; kdfMemory: number | null; kdfParallelism: number | null },
): boolean {
  return (
    left.kdf === right.kdf &&
    left.kdfIterations === right.kdfIterations &&
    left.kdfMemory === right.kdfMemory &&
    left.kdfParallelism === right.kdfParallelism
  )
}

function identityEmailIsValid(email: string): boolean {
  const separator = email.lastIndexOf("@")
  if (separator < 1 || separator !== email.indexOf("@") || separator === email.length - 1 || /[\s]/u.test(email))
    return false
  const domain = email.slice(separator + 1)
  try {
    const domainUrl = new URL(`https://${domain}`)
    return domainUrl.pathname === "/" && domainUrl.search === "" && domainUrl.hostname.length > 0
  } catch {
    return false
  }
}

function identityPasswordHintClean(passwordHint: string | null): string | null {
  if (passwordHint === null) return null
  const cleanPasswordHint = passwordHint.trim()
  return cleanPasswordHint === "" ? null : cleanPasswordHint
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

function identityKdfValidate(
  kdf: number,
  iterations: number,
  memory: number | null,
  parallelism: number | null,
): string | null {
  if (kdf === 0 && iterations < 100_000) return "PBKDF2 KDF iterations must be at least 100000."
  if (kdf !== 1) return null
  if (iterations < 1) return "Argon2 KDF iterations must be at least 1."
  if (memory === null) return "Argon2 memory parameter is required."
  if (memory < 15 || memory > 1024) return "Argon2 memory must be between 15 MB and 1024 MB."
  if (parallelism === null) return "Argon2 parallelism parameter is required."
  if (parallelism < 1 || parallelism > 16) return "Argon2 parallelism must be between 1 and 16."
  return null
}

function identityUserCreate(
  email: string,
  name: string | null,
  salt: Uint8Array,
  now: string,
  identifier: Identifier,
  passwordIterations: number,
): IdentityUser {
  return {
    uuid: identifier.uuid(),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name: name ?? email,
    passwordHash: new Uint8Array(),
    salt,
    passwordIterations,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: identifier.uuid(),
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function identityRegistrationResponse() {
  return { object: "register" as const, captchaBypassToken: "" }
}

export async function identityRegistration(
  data: IdentityRegistrationData,
  emailVerification: boolean,
  options: IdentityRegistrationOptions,
): Promise<Result<{ object: "register"; captchaBypassToken: string }>> {
  const op = "identityRegistration"
  const database = options.database
  if (database === undefined)
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })

  const normalizedResult = identityRegistrationDataNormalize(data)
  if (!normalizedResult.success) return normalizedResult
  const normalized = normalizedResult.data
  if (
    normalized.currentFormat &&
    (normalized.currentAuthenticationSalt !== data.email.trim().toLowerCase() ||
      normalized.currentUnlockSalt !== data.email.trim().toLowerCase() ||
      normalized.currentUnlockKdf === null ||
      !identityKdfDataEqual(
        {
          kdf: normalized.kdf,
          kdfIterations: normalized.kdfIterations,
          kdfMemory: normalized.kdfMemory,
          kdfParallelism: normalized.kdfParallelism,
        },
        normalized.currentUnlockKdf,
      ))
  ) {
    return identityDomainErrorCreate(op, "Unexpected RegisterData format", 422)
  }
  let emailVerified = false
  let registrationName = normalized.name
  let hasOrganizationInvite = false
  let hasEmergencyAccessInvite = false
  if (emailVerification) {
    const isNormalVerification =
      normalized.emailVerificationToken !== null &&
      normalized.acceptEmergencyAccessId === null &&
      normalized.acceptEmergencyAccessInviteToken === null &&
      normalized.organizationUserId === null &&
      normalized.orgInviteToken === null
    if (isNormalVerification) {
      const verificationToken = normalized.emailVerificationToken
      if (verificationToken === null)
        return identityDomainErrorCreate(op, "Registration is missing required parameters")
      const claimsResult = await identityRegistrationVerifyTokenDecode(
        verificationToken,
        options.issuer,
        options.publicKey,
        options.clock,
      )
      if (!claimsResult.success) return claimsResult
      if (claimsResult.data.sub !== data.email)
        return identityDomainErrorCreate(op, "Email verification token does not match email")
      if (claimsResult.data.name !== null) registrationName = claimsResult.data.name
      emailVerified = claimsResult.data.verified
    } else if (
      normalized.emailVerificationToken === null &&
      normalized.acceptEmergencyAccessId !== null &&
      normalized.acceptEmergencyAccessInviteToken !== null &&
      normalized.organizationUserId === null &&
      normalized.orgInviteToken === null
    ) {
      if (!options.config.EMERGENCY_ACCESS_ALLOWED)
        return identityDomainErrorCreate(op, "Emergency access is not enabled.")
      const inviteResult = await identityRegistrationInviteTokenDecode(
        normalized.acceptEmergencyAccessInviteToken,
        "emergency",
        options.issuer,
        options.publicKey,
        options.clock,
      )
      if (!inviteResult.success) return inviteResult
      if (inviteResult.data.email !== data.email)
        return identityDomainErrorCreate(op, "Claim email does not match email")
      if (inviteResult.data.id !== normalized.acceptEmergencyAccessId)
        return identityDomainErrorCreate(op, "Claim emer_id does not match accept_emergency_access_id")
      hasEmergencyAccessInvite = true
      emailVerified = true
    } else if (
      normalized.emailVerificationToken === null &&
      normalized.acceptEmergencyAccessId === null &&
      normalized.acceptEmergencyAccessInviteToken === null &&
      normalized.organizationUserId !== null &&
      normalized.orgInviteToken !== null
    ) {
      const inviteResult = await identityRegistrationInviteTokenDecode(
        normalized.orgInviteToken,
        "organization",
        options.issuer,
        options.publicKey,
        options.clock,
      )
      if (!inviteResult.success) return inviteResult
      if (inviteResult.data.email !== data.email)
        return identityDomainErrorCreate(op, "Claim email does not match email")
      if (inviteResult.data.id !== normalized.organizationUserId)
        return identityDomainErrorCreate(op, "Claim org_user_id does not match organization_user_id")
      hasOrganizationInvite = true
      emailVerified = true
    } else {
      return identityDomainErrorCreate(op, "Registration is missing required parameters")
    }
  }

  if (registrationName !== null && new TextEncoder().encode(registrationName).byteLength > 50) {
    return identityDomainErrorCreate(op, "The field Name must be a string with a maximum length of 50.")
  }
  const passwordHint = identityPasswordHintClean(normalized.passwordHint)
  if (passwordHint !== null && !options.config.PASSWORD_HINTS_ALLOWED) {
    return identityDomainErrorCreate(
      op,
      "Password hints have been disabled by the administrator. Remove the hint and try again.",
    )
  }
  const email = data.email.toLowerCase()
  const userResult = identityUserFindByEmail(database, email)
  if (!userResult.success) return userResult
  const user = userResult.data
  if (user !== null && user.passwordHash.byteLength > 0)
    return identityDomainErrorCreate(op, "Registration not allowed or user already exists")
  const invitationResult = identityInvitationExists(database, email)
  if (!invitationResult.success) return invitationResult
  const hasInvitation = invitationResult.data

  if (
    !hasInvitation &&
    !hasOrganizationInvite &&
    !hasEmergencyAccessInvite &&
    !identityEmailDomainAllowed(options.config, email)
  ) {
    return identityDomainErrorCreate(op, "Registration not allowed or user already exists")
  }
  if (!identityEmailIsValid(data.email)) {
    return identityDomainErrorCreate(op, `User email ${data.email.toLowerCase()} is not a valid email address`)
  }
  if (hasInvitation) {
    const invitationTakeResult = identityInvitationTake(database, email)
    if (!invitationTakeResult.success) return invitationTakeResult
  }

  const kdfError = identityKdfValidate(
    normalized.kdf,
    normalized.kdfIterations,
    normalized.kdfMemory,
    normalized.kdfParallelism,
  )
  if (kdfError !== null) return identityDomainErrorCreate(op, kdfError)

  const randomSaltResult = user === null ? secureRandomBytes(64) : resultCreate(user.salt)
  if (!randomSaltResult.success) return randomSaltResult
  const account =
    user ??
    identityUserCreate(
      email,
      registrationName,
      randomSaltResult.data,
      options.clock.now().toISOString(),
      options.identifier,
      options.config.PASSWORD_ITERATIONS,
    )
  const now = options.clock.now().toISOString()
  const serverPasswordHashResult = await passwordHashCreate(
    normalized.passwordHash,
    account.salt,
    account.passwordIterations,
  )
  if (!serverPasswordHashResult.success) return serverPasswordHashResult

  account.updatedAt = now
  account.passwordHash = serverPasswordHashResult.data
  account.akey = normalized.key
  account.clientKdfType = normalized.kdf
  account.clientKdfIter = normalized.kdfIterations
  account.clientKdfMemory = normalized.kdfMemory
  account.clientKdfParallelism = normalized.kdfParallelism
  account.securityStamp = options.identifier.uuid()
  account.passwordHint = passwordHint
  if (registrationName !== null) account.name = registrationName
  if (normalized.keys !== null) {
    account.privateKey = normalized.keys.encryptedPrivateKey
    account.publicKey = normalized.keys.publicKey
  }
  if (emailVerified) account.verifiedAt = now
  if (options.config.MAIL_ENABLED) {
    if (options.config.SIGNUPS_VERIFY && !emailVerified) {
      account.lastVerifyingAt = account.createdAt
      const tokenResult = await identityVerifyEmailTokenCreate(
        account.uuid,
        options.issuer,
        options.privateKey,
        options.clock,
        options.config.INVITATION_EXPIRATION_HOURS,
      )
      try {
        await options.mail.sendWelcomeMustVerify(
          account.email,
          account.uuid,
          tokenResult.success ? tokenResult.data : undefined,
        )
      } catch {
        void 0
      }
    } else {
      try {
        await options.mail.sendWelcome(account.email)
      } catch {
        void 0
      }
    }
  }

  const saveResult = databaseTransaction(database, () => identityUserSave(database, account))
  if (!saveResult.success) return saveResult
  return resultCreate(identityRegistrationResponse())
}
