import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EventAdapter } from "../events/eventAdapter.js"
import { eventType } from "../events/eventType.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"
import type { TwoFactorAdapters } from "../twoFactor/twoFactorAdapters.js"
import { twoFactorLogin } from "../twoFactor/twoFactorLogin.js"
import { identityAuthRequestAccessCodeCheck } from "./identityAuthRequestAccessCodeCheck.js"
import { identityAuthRequestFindByUuidAndUser } from "./identityAuthRequestFindByUuidAndUser.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDeviceResolve } from "./identityDeviceResolve.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityDeviceTypeParse } from "./identityDeviceTypeParse.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import type { IdentityPasswordTokenResponse } from "./identityPasswordTokenResponseSchema.js"
import { identityTokenBundleCreate } from "./identityTokenBundleCreate.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"
import type { IdentityUser } from "./identityUser.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import { identityUserSave } from "./identityUserSave.js"
import { identityUserTokenResponseCreate } from "./identityUserTokenResponseCreate.js"
import { identityVerifyEmailTokenCreate } from "./identityVerifyEmailTokenCreate.js"

type IdentityPasswordLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  identifier: Identifier
  issuer: string
  mail: IdentityMailAdapter
  privateKey: KeyInput | undefined
  rateLimiter: { check: (key: string) => Result<void> }
  clientIp: string
  push?: PushRelayAdapter
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
  clientVersion?: string
  twoFactor?: TwoFactorAdapters
  event?: EventAdapter
}

async function identityPasswordVerificationRequire(
  user: IdentityUser,
  options: IdentityPasswordLoginOptions,
): Promise<Result<void>> {
  if (!options.config.MAIL_ENABLED || !options.config.SIGNUPS_VERIFY || user.verifiedAt !== null)
    return resultCreate(undefined)
  const now = options.clock.now()
  const lastVerifyingAt = user.lastVerifyingAt === null ? null : new Date(user.lastVerifyingAt)
  const elapsedSeconds =
    lastVerifyingAt === null ? Number.POSITIVE_INFINITY : (now.getTime() - lastVerifyingAt.getTime()) / 1_000
  if (lastVerifyingAt === null || elapsedSeconds > options.config.SIGNUPS_VERIFY_RESEND_TIME) {
    const resendLimit = options.config.SIGNUPS_VERIFY_RESEND_LIMIT
    if (resendLimit === 0 || user.loginVerifyCount < resendLimit) {
      user.lastVerifyingAt = now.toISOString()
      user.loginVerifyCount += 1
      identityUserSave(options.database as DatabaseConnection, user)
      try {
        const tokenResult = await identityVerifyEmailTokenCreate(
          user.uuid,
          options.issuer,
          options.privateKey,
          options.clock,
          options.config.INVITATION_EXPIRATION_HOURS,
        )
        if (tokenResult.success) await options.mail.sendVerifyEmail?.(user.email, user.uuid, tokenResult.data)
      } catch {
        void 0
      }
    }
  }
  return identityDomainErrorCreate("identityPasswordLogin", "Please verify your email before trying again")
}

export async function identityPasswordLogin(
  data: IdentityTokenRequest,
  options: IdentityPasswordLoginOptions,
): Promise<Result<IdentityPasswordTokenResponse>> {
  const op = "identityPasswordLogin"
  const database = options.database
  if (database === undefined) {
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  }
  if (data.scope === undefined) return identityDomainErrorCreate(op, "Missing scope")
  if (data.scope !== "api offline_access") return identityDomainErrorCreate(op, `Scope (${data.scope}) not supported`)
  const rateLimitResult = options.rateLimiter.check(options.clientIp)
  if (!rateLimitResult.success) return rateLimitResult
  const username = data.username?.trim()
  if (username === undefined) return identityDomainErrorCreate(op, "username cannot be blank")
  const userResult = identityUserFindByEmail(database, username)
  if (!userResult.success) return userResult
  const user = userResult.data
  if (user === null) return identityDomainErrorCreate(op, "Username or password is incorrect. Try again")
  const eventContext = {
    deviceType: identityDeviceTypeParse(data.deviceType),
    ipAddress: options.clientIp,
  }
  if (!user.enabled) {
    options.event?.userEventCreate(eventType.userFailedLogin, user.uuid, eventContext)
    return identityDomainErrorCreate(op, "This user has been disabled")
  }
  const password = data.password
  if (password === undefined) return identityDomainErrorCreate(op, "password cannot be blank")
  if (data.authRequest === undefined) {
    const passwordResult = await passwordHashVerify(password, user.salt, user.passwordHash, user.passwordIterations)
    if (!passwordResult.success) return passwordResult
    if (!passwordResult.data) {
      options.event?.userEventCreate(eventType.userFailedLogin, user.uuid, eventContext)
      return identityDomainErrorCreate(op, "Username or password is incorrect. Try again")
    }

    if (user.passwordIterations < options.config.PASSWORD_ITERATIONS) {
      const upgradedHashResult = await passwordHashCreate(password, user.salt, options.config.PASSWORD_ITERATIONS)
      if (upgradedHashResult.success) {
        user.passwordHash = upgradedHashResult.data
        user.passwordIterations = options.config.PASSWORD_ITERATIONS
        user.updatedAt = options.clock.now().toISOString()
        identityUserSave(database, user)
      }
    }
  } else {
    const authRequestResult = identityAuthRequestFindByUuidAndUser(database, data.authRequest, user.uuid)
    if (!authRequestResult.success) return authRequestResult
    if (authRequestResult.data === null) {
      options.event?.userEventCreate(eventType.userFailedLogin, user.uuid, eventContext)
      return identityDomainErrorCreate(op, "Auth request not found. Try again.")
    }
    const authRequest = authRequestResult.data
    const accessCodeMatches = identityAuthRequestAccessCodeCheck(authRequest, password)
    const creationTime = Date.parse(authRequest.creationDate)
    const requestAge = options.clock.now().getTime() - creationTime
    const requestIsFresh = Number.isFinite(requestAge) && requestAge < 5 * 60 * 1_000
    if (
      !requestIsFresh ||
      authRequest.approved !== true ||
      authRequest.requestIp !== options.clientIp ||
      !accessCodeMatches
    ) {
      options.event?.userEventCreate(eventType.userFailedLogin, user.uuid, eventContext)
      return identityDomainErrorCreate(op, "Username or access code is incorrect. Try again")
    }
  }

  const verificationResult = await identityPasswordVerificationRequire(user, options)
  if (!verificationResult.success) {
    options.event?.userEventCreate(eventType.userFailedLogin, user.uuid, eventContext)
    return verificationResult
  }

  const deviceResult = identityDeviceResolve(database, data, user.uuid, options.clock, options.identifier)
  if (!deviceResult.success) return deviceResult
  const device = deviceResult.data
  const deviceIsNew = device.createdAt === device.updatedAt

  const twoFactorResult = await twoFactorLogin(user, data, {
    clientIp: options.clientIp,
    clientVersion: options.clientVersion,
    clock: options.clock,
    config: options.config,
    database,
    device,
    issuer: options.issuer,
    privateKey: options.privateKey,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
    identifier: options.identifier,
    twoFactor: options.twoFactor,
    event: options.event,
  })
  if (!twoFactorResult.success) {
    return twoFactorResult
  }

  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    data.clientId,
    options.issuer,
    options.privateKey,
    options.clock,
    options.config,
  )
  if (!bundleResult.success) return bundleResult
  const saveResult = identityDeviceSave(database, device, options.clock, true)
  if (!saveResult.success) return saveResult
  if (!deviceIsNew && options.push !== undefined) {
    const registerResult = await options.push.registerDevice(device)
    if (!registerResult.success) return registerResult
    const pushUuidSaveResult = identityDeviceSave(database, device, options.clock, false)
    if (!pushUuidSaveResult.success) return pushUuidSaveResult
  }
  const response = identityUserTokenResponseCreate(user, bundleResult.data)
  if (twoFactorResult.data !== null) response.TwoFactorToken = twoFactorResult.data
  options.event?.userEventCreate(eventType.userLoggedIn, user.uuid, { ...eventContext, deviceType: device.type })
  return resultCreate(response)
}
