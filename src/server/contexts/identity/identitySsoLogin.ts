import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityPasswordTokenResponse } from "./identityPasswordTokenResponseSchema.js"
import { identityDeviceResolve } from "./identityDeviceResolve.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityEmailDomainAllowed } from "./identityEmailDomainAllowed.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"
import { identitySsoAuthDelete } from "./identitySsoAuthDelete.js"
import { identitySsoAuthFindByCode } from "./identitySsoAuthFindByCode.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import { identitySsoAuthSave } from "./identitySsoAuthSave.js"
import { identitySsoUserFindByEmail } from "./identitySsoUserFindByEmail.js"
import { identitySsoUserFindByIdentifier } from "./identitySsoUserFindByIdentifier.js"
import { identitySsoUserSave } from "./identitySsoUserSave.js"
import { identitySsoTokenBundleCreate } from "./identitySsoTokenBundleCreate.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"
import type { IdentityUser } from "./identityUser.js"
import { identityUserSave } from "./identityUserSave.js"
import { identityUserTokenResponseCreate } from "./identityUserTokenResponseCreate.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"

type IdentitySsoLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  identifier: Identifier
  issuer: string
  privateKey: KeyInput | undefined
  rateLimiter: { check: (key: string) => Result<void> }
  clientIp: string
  push?: PushRelayAdapter
  sso: IdentitySsoAdapter
}

function identitySsoUserCreate(
  authenticatedUser: IdentitySsoAuthenticatedUser,
  clock: Clock,
  identifier: Identifier,
  passwordIterations: number,
  salt: Uint8Array,
): IdentityUser {
  const now = clock.now().toISOString()
  return {
    uuid: identifier.uuid(),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    verifiedAt: now,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: authenticatedUser.email,
    emailNew: null,
    emailNewToken: null,
    name: authenticatedUser.user_name ?? authenticatedUser.email,
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

function identitySsoEmailVerificationError(
  authenticatedUser: IdentitySsoAuthenticatedUser,
  config: IdentityConfig,
  existing: boolean,
): string | null {
  if (authenticatedUser.email_verified === null && !config.SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION) {
    return existing
      ? "Email verification status is unknown"
      : "Your provider does not send email verification status.\nYou will need to change the server configuration (check `SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION`) to log in."
  }
  if (authenticatedUser.email_verified === false)
    return existing
      ? "Email is not verified by the SSO provider"
      : "You need to verify your email with your provider before you can log in"
  return null
}

export async function identitySsoLogin(
  data: IdentityTokenRequest,
  options: IdentitySsoLoginOptions,
): Promise<Result<IdentityPasswordTokenResponse>> {
  const op = "identitySsoLogin"
  const database = options.database
  if (database === undefined) {
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  }
  if (data.scope === undefined) return identityDomainErrorCreate(op, "Missing scope")
  if (data.scope !== "api offline_access") return identityDomainErrorCreate(op, `Scope (${data.scope}) not supported`)
  const rateLimitResult = options.rateLimiter.check(options.clientIp)
  if (!rateLimitResult.success) return rateLimitResult
  if (data.code === undefined) return identityDomainErrorCreate(op, "Got no code in OIDC data")
  if (data.codeVerifier === undefined) return identityDomainErrorCreate(op, "Got no code verifier in OIDC data")
  const authResult = identitySsoAuthFindByCode(database, data.code, options.clock)
  if (!authResult.success) return authResult
  if (authResult.data === null) return identityDomainErrorCreate(op, "Invalid code cannot retrieve sso auth")
  const auth = authResult.data
  let authenticatedUser = auth.authResponse
  if (authenticatedUser === null) {
    if (auth.codeResponseError !== null) {
      const error = auth.codeResponseError
      const deleteResult = identitySsoAuthDelete(database, auth.state)
      if (!deleteResult.success) return deleteResult
      return identityDomainErrorCreate(op, `SSO authorization failed: ${error.error}, ${error.error_description ?? ""}`)
    }
    if (auth.codeResponse === null) {
      const deleteResult = identitySsoAuthDelete(database, auth.state)
      if (!deleteResult.success) return deleteResult
      return identityDomainErrorCreate(op, "Missing authorization provider return")
    }
    const exchangeResult = await options.sso.exchange({
      auth,
      code: auth.codeResponse,
      codeVerifier: data.codeVerifier,
    })
    if (!exchangeResult.success) return exchangeResult
    authenticatedUser = exchangeResult.data
    auth.authResponse = authenticatedUser
    auth.updatedAt = options.clock.now().toISOString()
    const saveResult = identitySsoAuthSave(database, auth)
    if (!saveResult.success) return saveResult
  }

  const linkedResult = identitySsoUserFindByIdentifier(database, authenticatedUser.identifier)
  if (!linkedResult.success) return linkedResult
  let user: IdentityUser
  if (linkedResult.data !== null) {
    user = linkedResult.data.user
    if (!user.enabled) return identityDomainErrorCreate(op, "This user has been disabled")
  } else {
    const emailResult = identitySsoUserFindByEmail(database, authenticatedUser.email)
    if (!emailResult.success) return emailResult
    if (emailResult.data === null) {
      if (!identityEmailDomainAllowed(options.config, authenticatedUser.email))
        return identityDomainErrorCreate(op, "Email domain not allowed")
      const verificationError = identitySsoEmailVerificationError(authenticatedUser, options.config, false)
      if (verificationError !== null) return identityDomainErrorCreate(op, verificationError)
      const saltResult = secureRandomBytes(64)
      if (!saltResult.success) return saltResult
      user = identitySsoUserCreate(
        authenticatedUser,
        options.clock,
        options.identifier,
        options.config.PASSWORD_ITERATIONS,
        saltResult.data,
      )
      const userSaveResult = identityUserSave(database, user)
      if (!userSaveResult.success) return userSaveResult
    } else {
      if (!emailResult.data.user.enabled) return identityDomainErrorCreate(op, "This user has been disabled")
      if (emailResult.data.identifier !== null)
        return identityDomainErrorCreate(op, "Existing SSO user with same email")
      user = emailResult.data.user
      if (user.privateKey !== null && !options.config.SSO_SIGNUPS_MATCH_EMAIL)
        return identityDomainErrorCreate(op, "Existing non SSO user with same email")
      const verificationError = identitySsoEmailVerificationError(authenticatedUser, options.config, true)
      if (verificationError !== null) return identityDomainErrorCreate(op, verificationError)
      if (user.passwordHash.byteLength === 0) {
        user.verifiedAt = options.clock.now().toISOString()
        if (authenticatedUser.user_name !== null) user.name = authenticatedUser.user_name
        user.updatedAt = options.clock.now().toISOString()
        const userSaveResult = identityUserSave(database, user)
        if (!userSaveResult.success) return userSaveResult
      }
    }
    const ssoUserSaveResult = identitySsoUserSave(database, {
      userUuid: user.uuid,
      identifier: authenticatedUser.identifier,
    })
    if (!ssoUserSaveResult.success) return ssoUserSaveResult
  }

  const deviceResult = identityDeviceResolve(database, data, user.uuid, options.clock, options.identifier)
  if (!deviceResult.success) return deviceResult
  const deviceIsNew = deviceResult.data.createdAt === deviceResult.data.updatedAt
  const bundleResult = await identitySsoTokenBundleCreate(
    user,
    deviceResult.data,
    data.clientId,
    authenticatedUser,
    options.issuer,
    options.privateKey,
    options.clock,
    options.config,
  )
  if (!bundleResult.success) return bundleResult
  const deviceSaveResult = identityDeviceSave(database, deviceResult.data, options.clock, true)
  if (!deviceSaveResult.success) return deviceSaveResult
  if (!deviceIsNew && options.push !== undefined) {
    const registerResult = await options.push.registerDevice(deviceResult.data)
    if (!registerResult.success) return registerResult
    const pushUuidSaveResult = identityDeviceSave(database, deviceResult.data, options.clock, false)
    if (!pushUuidSaveResult.success) return pushUuidSaveResult
  }
  const deleteResult = identitySsoAuthDelete(database, auth.state)
  if (!deleteResult.success) return deleteResult
  return resultCreate(identityUserTokenResponseCreate(user, bundleResult.data))
}
