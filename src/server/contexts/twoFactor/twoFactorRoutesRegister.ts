import type { Context, Hono } from "hono"
import * as v from "valibot"
import { type Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { requestValidationParse } from "../../../shared/validation/requestValidationParse.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { authenticationTrustedDeviceClearAllByUser } from "../authentication/authenticationTrustedDeviceClearAllByUser.js"
import type { IdentityRouteOptions } from "../identity/identityRouteOptions.js"
import { identityUserFindByEmail } from "../identity/identityUserFindByEmail.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import { twoFactorAdaptersCreate } from "./twoFactorAdaptersCreate.js"
import { twoFactorEmailTokenCreate } from "./twoFactorEmailTokenCreate.js"
import { twoFactorEmailLoginValidate } from "./twoFactorEmailLoginValidate.js"
import { twoFactorEmailTokenInvalidate } from "./twoFactorEmailTokenInvalidate.js"
import { twoFactorEmailTokenSend } from "./twoFactorEmailTokenSend.js"
import type { TwoFactorEmailData } from "./twoFactorEmailData.js"
import { twoFactorPasswordOrOtpValidate } from "./twoFactorPasswordOrOtpValidate.js"
import { twoFactorProtectedActionCreate } from "./twoFactorProtectedActionCreate.js"
import { twoFactorProtectedActionValidate } from "./twoFactorProtectedActionValidate.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorProviderUsable } from "./twoFactorProviderUsable.js"
import { twoFactorRecordDelete } from "./twoFactorRecordDelete.js"
import { twoFactorRecordFindByUser } from "./twoFactorRecordFindByUser.js"
import { twoFactorRecordFindByUserAndType } from "./twoFactorRecordFindByUserAndType.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"
import { twoFactorRecoveryCodeEnsure } from "./twoFactorRecoveryCodeEnsure.js"
import { twoFactorTotpCodeValidate } from "./twoFactorTotpCodeValidate.js"
import { twoFactorWebAuthnChallengeCreate } from "./twoFactorWebAuthnChallengeCreate.js"
import { twoFactorWebAuthnChallengeConsume } from "./twoFactorWebAuthnChallengeConsume.js"
import { twoFactorWebAuthnOriginResolve } from "./twoFactorWebAuthnOriginResolve.js"
import { twoFactorWebAuthnRegistrationsRead } from "./twoFactorWebAuthnRegistrationsRead.js"
import { twoFactorWebAuthnStateRead } from "./twoFactorWebAuthnStateRead.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { twoFactorBase32Decode } from "./twoFactorBase32Decode.js"
import { twoFactorBase32Encode } from "./twoFactorBase32Encode.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import { eventLogContextCreate } from "../events/eventLogContextCreate.js"
import { eventType } from "../events/eventType.js"

const passwordOrOtpSchema = v.object({
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const disableSchema = v.object({
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
  type: v.union([v.number(), v.string()]),
})
const authenticatorSchema = v.object({
  key: v.string(),
  token: v.union([v.number(), v.string()]),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const authenticatorDeleteSchema = v.object({
  key: v.string(),
  masterPasswordHash: v.string(),
  type: v.union([v.number(), v.string()]),
})
const emailSendSchema = v.object({
  email: v.string(),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const emailCompleteSchema = v.object({
  email: v.string(),
  token: v.string(),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const emailLoginSchema = v.object({
  deviceIdentifier: v.nullish(v.string()),
  email: v.nullish(v.string()),
  masterPasswordHash: v.nullish(v.string()),
  authRequestId: v.nullish(v.string()),
  authRequestAccessCode: v.nullish(v.string()),
})
const duoSchema = v.object({
  host: v.string(),
  clientSecret: v.string(),
  clientId: v.string(),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const yubikeySchema = v.object({
  key1: v.nullish(v.string()),
  key2: v.nullish(v.string()),
  key3: v.nullish(v.string()),
  key4: v.nullish(v.string()),
  key5: v.nullish(v.string()),
  nfc: v.boolean(),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const webauthnSchema = v.object({
  id: v.union([v.number(), v.string()]),
  name: v.string(),
  deviceResponse: v.unknown(),
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
})
const webauthnDeleteSchema = v.object({
  id: v.union([v.number(), v.string()]),
  masterPasswordHash: v.string(),
})
const protectedActionVerifySchema = v.object({ otp: v.string() })

const requestAliases: Record<string, string> = {
  masterpasswordhash: "masterPasswordHash",
  master_password_hash: "masterPasswordHash",
  otp: "otp",
  type: "type",
  key1: "key1",
  key2: "key2",
  key3: "key3",
  key4: "key4",
  key5: "key5",
  nfc: "nfc",
  host: "host",
  keys: "keys",
  Keys: "keys",
  deviceidentifier: "deviceIdentifier",
  authrequestid: "authRequestId",
  authrequestaccesscode: "authRequestAccessCode",
  auth_request_id: "authRequestId",
  auth_request_access_code: "authRequestAccessCode",
  clientsecret: "clientSecret",
  client_secret: "clientSecret",
  clientid: "clientId",
  client_id: "clientId",
  deviceresponse: "deviceResponse",
  device_response: "deviceResponse",
  clientdatajson: "clientDataJSON",
  clientdataJson: "clientDataJSON",
}

export function twoFactorRoutesRegister(app: Hono<AuthenticationEnvironment>, options: IdentityRouteOptions): void {
  const adapters = twoFactorAdaptersCreate(options.twoFactor, options.config, options.clock)
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const getTwoFactor = (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const recordsResult = twoFactorRecordFindByUser(request.data.database, request.data.authentication.user.uuid)
    if (!recordsResult.success) return apiErrorResponseCreate(recordsResult)
    const providers = recordsResult.data
      .filter(
        (record) =>
          record.enabled && twoFactorProviderUsable(record.type, record.data, options.config, options.publicOrigin),
      )
      .map((record) => ({ enabled: true, type: record.type, object: "twoFactorProvider" as const }))
    return context.json({ data: providers, object: "list" as const, continuationToken: null })
  }

  const getRecover = async (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const bodyResult = await twoFactorBodyParse(context, passwordOrOtpSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await twoFactorPasswordOrOtpValidate(
      request.data.database,
      request.data.authentication.user,
      bodyResult.data,
      options.clock,
      options.config,
      true,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const recoveryResult = twoFactorRecoveryCodeEnsure(request.data.database, request.data.authentication.user)
    if (!recoveryResult.success) return apiErrorResponseCreate(recoveryResult)
    return context.json({ code: recoveryResult.data, object: "twoFactorRecover" as const })
  }

  const disable = async (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const bodyResult = await twoFactorBodyParse(context, disableSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await twoFactorPasswordOrOtpValidate(
      request.data.database,
      request.data.authentication.user,
      bodyResult.data,
      options.clock,
      options.config,
      true,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const type = twoFactorNumberParse(bodyResult.data.type)
    if (type === null) return apiErrorResponseCreate(identityTwoFactorError("Invalid two factor provider"))
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.database,
      request.data.authentication.user.uuid,
      type,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    const deleteResult = databaseTransaction(request.data.database, () => {
      if (recordResult.data !== null) {
        const providerDeleteResult = twoFactorRecordDelete(request.data.database, recordResult.data.uuid)
        if (!providerDeleteResult.success) return providerDeleteResult
      }
      if (type === twoFactorProviderType.webauthn) {
        try {
          request.data.database.run("DELETE FROM twofactor WHERE user_uuid = ? AND atype IN (?, ?)", [
            request.data.authentication.user.uuid,
            twoFactorProviderType.webauthnRegisterChallenge,
            twoFactorProviderType.webauthnLoginChallenge,
          ])
        } catch {
          return resultErrorCreate("twoFactorDisable", "Webauthn challenge cleanup failed.")
        }
      }
      const rememberResult = authenticationTrustedDeviceClearAllByUser(
        request.data.database,
        request.data.authentication.user.uuid,
      )
      if (!rememberResult.success) return rememberResult
      return resultCreate(undefined)
    })
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    options.event?.userEventCreate(
      eventType.userDisabledTwoFactor,
      request.data.authentication.user.uuid,
      eventLogContextCreate(request.data.authentication),
    )
    return context.json({ enabled: false, type, object: "twoFactorProvider" as const })
  }

  const getAuthenticator = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, passwordOrOtpSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.authenticator,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    if (recordResult.data !== null)
      return context.json({ enabled: true, key: recordResult.data.data, object: "twoFactorAuthenticator" as const })
    const secretResult = secureRandomBytes(20)
    if (!secretResult.success) return apiErrorResponseCreate(secretResult)
    return context.json({
      enabled: false,
      key: twoFactorBase32Encode(secretResult.data),
      object: "twoFactorAuthenticator" as const,
    })
  }

  const activateAuthenticator = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, authenticatorSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const key = request.data.body.key
    const token = String(request.data.body.token)
    const secretResult = twoFactorBase32Decode(key)
    if (!secretResult.success) return apiErrorResponseCreate(identityTwoFactorError("Invalid totp secret"))
    if (secretResult.data.length !== 20) return apiErrorResponseCreate(identityTwoFactorError("Invalid key length"))
    const nowSeconds = Math.floor(options.clock.now().getTime() / 1_000)
    const codeResult = await twoFactorTotpCodeValidate(
      key,
      token,
      nowSeconds,
      0,
      options.config.AUTHENTICATOR_DISABLE_TIME_DRIFT ?? false,
    )
    if (!codeResult.success) return apiErrorResponseCreate(codeResult)
    const existingResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.authenticator,
    )
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    const saveResult = twoFactorProviderSaveAndRevokeRememberedDevices(
      request.data.authenticationDatabase.database,
      {
        uuid: existingResult.data?.uuid ?? options.identifier.uuid(),
        userUuid: request.data.authenticationDatabase.authentication.user.uuid,
        type: twoFactorProviderType.authenticator,
        enabled: true,
        data: key.toUpperCase(),
        lastUsed: codeResult.data,
      },
      request.data.authenticationDatabase.authentication.user,
    )
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    options.event?.userEventCreate(
      eventType.userUpdatedTwoFactor,
      request.data.authenticationDatabase.authentication.user.uuid,
      eventLogContextCreate(request.data.authenticationDatabase.authentication),
    )
    return context.json({ enabled: true, key, object: "twoFactorAuthenticator" as const })
  }

  const disableAuthenticator = async (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const bodyResult = await twoFactorBodyParse(context, authenticatorDeleteSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const passwordResult = await passwordHashVerify(
      bodyResult.data.masterPasswordHash,
      request.data.authentication.user.salt,
      request.data.authentication.user.passwordHash,
      request.data.authentication.user.passwordIterations,
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    if (!passwordResult.data) return apiErrorResponseCreate(identityTwoFactorError("Invalid password"))
    const type = twoFactorNumberParse(bodyResult.data.type)
    if (type === null) return apiErrorResponseCreate(identityTwoFactorError("Invalid two factor provider"))
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.database,
      request.data.authentication.user.uuid,
      type,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    if (recordResult.data !== null) {
      if (recordResult.data.data !== bodyResult.data.key)
        return apiErrorResponseCreate(
          identityTwoFactorError(
            `TOTP key for user ${request.data.authentication.user.email} does not match recorded value, cannot deactivate`,
          ),
        )
      const provider = recordResult.data
      const deleteResult = databaseTransaction(request.data.database, () => {
        const providerDeleteResult = twoFactorRecordDelete(request.data.database, provider.uuid)
        if (!providerDeleteResult.success) return providerDeleteResult
        const rememberResult = authenticationTrustedDeviceClearAllByUser(
          request.data.database,
          request.data.authentication.user.uuid,
        )
        if (!rememberResult.success) return rememberResult
        return resultCreate(undefined)
      })
      if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    }
    options.event?.userEventCreate(
      eventType.userDisabledTwoFactor,
      request.data.authentication.user.uuid,
      eventLogContextCreate(request.data.authentication),
    )
    return context.json({ enabled: false, keys: type, object: "twoFactorProvider" as const })
  }

  const getEmail = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, passwordOrOtpSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.email,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    let email: string | null = null
    if (recordResult.data !== null) {
      const dataResult = twoFactorEmailDataRead(recordResult.data.data)
      if (!dataResult.success) return apiErrorResponseCreate(dataResult)
      email = dataResult.data.email
    }
    return context.json({ email, enabled: recordResult.data !== null, object: "twoFactorEmail" as const })
  }

  const sendEmail = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, emailSendSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    if (!(options.config.ENABLE_EMAIL_2FA ?? false))
      return apiErrorResponseCreate(identityTwoFactorError("Email 2FA is disabled"))
    const email = request.data.body.email.trim()
    if (email === "") return apiErrorResponseCreate(identityTwoFactorError("Email cannot be blank"))
    const existingResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.email,
    )
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    const tokenResult = twoFactorEmailTokenCreate(options.config.EMAIL_TOKEN_SIZE ?? 6)
    if (!tokenResult.success) return apiErrorResponseCreate(tokenResult)
    const emailData = {
      email,
      last_token: tokenResult.data,
      token_sent: Math.floor(options.clock.now().getTime() / 1_000),
      attempts: 0,
    }
    const record = {
      uuid: options.identifier.uuid(),
      userUuid: request.data.authenticationDatabase.authentication.user.uuid,
      type: twoFactorProviderType.emailVerificationChallenge,
      enabled: true,
      data: JSON.stringify(emailData),
      lastUsed: 0,
    }
    const expectedData = record.data
    const saveResult = databaseTransaction(request.data.authenticationDatabase.database, () => {
      if (existingResult.data !== null) {
        const deleteResult = twoFactorRecordDelete(
          request.data.authenticationDatabase.database,
          existingResult.data.uuid,
        )
        if (!deleteResult.success) return deleteResult
      }
      const rememberResult = authenticationTrustedDeviceClearAllByUser(
        request.data.authenticationDatabase.database,
        request.data.authenticationDatabase.authentication.user.uuid,
      )
      if (!rememberResult.success) return rememberResult
      return twoFactorRecordSave(request.data.authenticationDatabase.database, record)
    })
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    let sendResult: Result<void> | undefined
    try {
      sendResult =
        options.mail.sendTwoFactorToken === undefined
          ? resultErrorCreate("twoFactorEmailTokenSend", "Two-factor token email failed.")
          : await options.mail.sendTwoFactorToken(email, tokenResult.data)
    } catch {
      const invalidateResult = twoFactorEmailTokenInvalidate(
        request.data.authenticationDatabase.database,
        record.userUuid,
        record.type,
        expectedData,
        JSON.stringify({ ...emailData, last_token: null, attempts: 0 }),
      )
      if (!invalidateResult.success) return apiErrorResponseCreate(invalidateResult)
      return apiErrorResponseCreate(identityTwoFactorError("Two-factor token email failed"))
    }
    if (sendResult !== undefined && !sendResult.success) {
      const invalidateResult = twoFactorEmailTokenInvalidate(
        request.data.authenticationDatabase.database,
        record.userUuid,
        record.type,
        expectedData,
        JSON.stringify({ ...emailData, last_token: null, attempts: 0 }),
      )
      if (!invalidateResult.success) return apiErrorResponseCreate(invalidateResult)
      return apiErrorResponseCreate(sendResult)
    }
    return new Response(null, { status: 200 })
  }

  const completeEmail = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, emailCompleteSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const challengeResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.emailVerificationChallenge,
    )
    if (!challengeResult.success) return apiErrorResponseCreate(challengeResult)
    if (challengeResult.data === null) return apiErrorResponseCreate(identityTwoFactorError("Two factor not found"))
    const validationResult = twoFactorEmailLoginValidate(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      request.data.body.token,
      options.clock,
      options.config,
      twoFactorProviderType.emailVerificationChallenge,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const emailDataResult = twoFactorEmailDataRead(challengeResult.data.data)
    if (!emailDataResult.success) return apiErrorResponseCreate(emailDataResult)
    const record = challengeResult.data
    record.type = twoFactorProviderType.email
    record.data = JSON.stringify({ ...emailDataResult.data, last_token: null, attempts: 0 })
    const saveResult = twoFactorProviderSaveAndRevokeRememberedDevices(
      request.data.authenticationDatabase.database,
      record,
      request.data.authenticationDatabase.authentication.user,
    )
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    options.event?.userEventCreate(
      eventType.userUpdatedTwoFactor,
      request.data.authenticationDatabase.authentication.user.uuid,
      eventLogContextCreate(request.data.authenticationDatabase.authentication),
    )
    return context.json({ email: emailDataResult.data.email, enabled: "true", object: "twoFactorEmail" as const })
  }

  const sendEmailLogin = async (context: Context<AuthenticationEnvironment>) => {
    if (!options.config.ENABLE_EMAIL_2FA) return apiErrorResponseCreate(identityTwoFactorError("Email 2FA is disabled"))
    if (options.database === undefined)
      return apiErrorResponseCreate(apiErrorCreate("twoFactorDatabase", "platform.internal", "Database unavailable."))
    const bodyResult = await twoFactorBodyParse(context, emailLoginSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const rateLimitResult = options.rateLimiter.check(twoFactorClientIpResolve(context))
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const email = bodyResult.data.email?.trim()
    let userResult: Result<IdentityUser | null>
    if (email !== undefined && email !== "") userResult = identityUserFindByEmail(options.database, email)
    else userResult = twoFactorUserFindByDevice(options.database, bodyResult.data.deviceIdentifier)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null)
      return apiErrorResponseCreate(identityTwoFactorError("Username or password is incorrect. Try again."))
    if (bodyResult.data.masterPasswordHash === undefined || bodyResult.data.masterPasswordHash === null)
      return apiErrorResponseCreate(identityTwoFactorError("No password hash has been submitted."))
    const passwordResult = await passwordHashVerify(
      bodyResult.data.masterPasswordHash,
      userResult.data.salt,
      userResult.data.passwordHash,
      userResult.data.passwordIterations,
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    if (!passwordResult.data)
      return apiErrorResponseCreate(identityTwoFactorError("Username or password is incorrect. Try again."))
    const sendResult = await twoFactorEmailTokenSend(
      options.database,
      userResult.data,
      options.clock,
      options.config,
      options.mail,
    )
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    return new Response(null, { status: 200 })
  }

  const getDuo = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, passwordOrOtpSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const status = twoFactorDuoStatus(
      request.data.authenticationDatabase.authentication.user.uuid,
      request.data.authenticationDatabase.database,
      options,
    )
    return context.json({
      enabled: status.enabled,
      host: status.host,
      clientSecret: status.clientSecret,
      clientId: status.clientId,
      object: "twoFactorDuo" as const,
    })
  }

  const activateDuo = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, duoSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const custom = [request.data.body.host, request.data.body.clientSecret, request.data.body.clientId].every(
      (value) => !twoFactorDuoFieldIsDefault(value),
    )
    let data = ""
    let response = { host: "<global_secret>", clientSecret: "<global_secret>", clientId: "<global_secret>" }
    if (custom) {
      const credentials = {
        host: request.data.body.host,
        clientId: request.data.body.clientId,
        clientSecret: request.data.body.clientSecret,
      }
      const validateResult = await adapters.duo?.credentialsValidate?.(credentials)
      if (validateResult === undefined) return apiErrorResponseCreate(identityTwoFactorError("Duo adapter unavailable"))
      if (!validateResult.success) return apiErrorResponseCreate(validateResult)
      data = JSON.stringify({ host: credentials.host, ik: credentials.clientId, sk: credentials.clientSecret })
      response = {
        host: maskValue(credentials.host),
        clientSecret: maskValue(credentials.clientSecret),
        clientId: maskValue(credentials.clientId),
      }
    }
    const existingResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.duo,
    )
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    const saveResult = twoFactorProviderSaveAndRevokeRememberedDevices(
      request.data.authenticationDatabase.database,
      {
        uuid: existingResult.data?.uuid ?? options.identifier.uuid(),
        userUuid: request.data.authenticationDatabase.authentication.user.uuid,
        type: twoFactorProviderType.duo,
        enabled: true,
        data,
        lastUsed: 0,
      },
      request.data.authenticationDatabase.authentication.user,
    )
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    options.event?.userEventCreate(
      eventType.userUpdatedTwoFactor,
      request.data.authenticationDatabase.authentication.user.uuid,
      eventLogContextCreate(request.data.authenticationDatabase.authentication),
    )
    return context.json({ enabled: true, ...response, object: "twoFactorDuo" as const })
  }

  const getYubikey = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, passwordOrOtpSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    if (!twoFactorYubikeyConfigured(options))
      return apiErrorResponseCreate(identityTwoFactorError("Yubico support is disabled"))
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.yubikey,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    if (recordResult.data === null) return context.json({ enabled: false, object: "twoFactorU2f" as const })
    const metadataResult = twoFactorYubikeyDataRead(recordResult.data.data)
    if (!metadataResult.success) return apiErrorResponseCreate(metadataResult)
    return context.json({
      ...yubikeyResponseKeys(metadataResult.data.keys),
      enabled: true,
      nfc: metadataResult.data.nfc,
      object: "twoFactorU2f" as const,
    })
  }

  const activateYubikey = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, yubikeySchema)
    if (!request.success) return apiErrorResponseCreate(request)
    if (!twoFactorYubikeyConfigured(options))
      return apiErrorResponseCreate(identityTwoFactorError("Yubico support is disabled"))
    const keys = [
      request.data.body.key1,
      request.data.body.key2,
      request.data.body.key3,
      request.data.body.key4,
      request.data.body.key5,
    ].filter((value): value is string => value !== undefined && value !== null && value !== "")
    if (keys.length === 0) return apiErrorResponseCreate(identityTwoFactorError("A key is required."))
    for (const key of keys) {
      if (new TextEncoder().encode(key).byteLength === 12) continue
      const validateResult = await adapters.yubikey?.otpValidate?.(key)
      if (validateResult === undefined)
        return apiErrorResponseCreate(identityTwoFactorError("Yubikey adapter unavailable"))
      if (!validateResult.success) return apiErrorResponseCreate(identityTwoFactorError("Invalid Yubikey OTP provided"))
    }
    const publicIds = keys.map((key) => key.slice(0, 12))
    const existingResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.yubikey,
    )
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    const saveResult = twoFactorProviderSaveAndRevokeRememberedDevices(
      request.data.authenticationDatabase.database,
      {
        uuid: existingResult.data?.uuid ?? options.identifier.uuid(),
        userUuid: request.data.authenticationDatabase.authentication.user.uuid,
        type: twoFactorProviderType.yubikey,
        enabled: true,
        data: JSON.stringify({ keys: publicIds, nfc: request.data.body.nfc }),
        lastUsed: 0,
      },
      request.data.authenticationDatabase.authentication.user,
    )
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    options.event?.userEventCreate(
      eventType.userUpdatedTwoFactor,
      request.data.authenticationDatabase.authentication.user.uuid,
      eventLogContextCreate(request.data.authenticationDatabase.authentication),
    )
    return context.json({
      ...yubikeyResponseKeys(publicIds),
      enabled: true,
      nfc: request.data.body.nfc,
      object: "twoFactorU2f" as const,
    })
  }

  const getWebAuthn = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, passwordOrOtpSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    if (!twoFactorWebAuthnConfigured(options))
      return apiErrorResponseCreate(identityTwoFactorError("Configured `DOMAIN` is not compatible with Webauthn"))
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.webauthn,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    const keysResult = recordResult.data === null ? resultCreate([]) : twoFactorWebAuthnKeysRead(recordResult.data.data)
    if (!keysResult.success) return apiErrorResponseCreate(keysResult)
    return context.json({
      enabled: recordResult.data?.enabled === true && keysResult.data.length > 0,
      keys: keysResult.data,
      object: "twoFactorWebAuthn" as const,
    })
  }

  const getWebAuthnChallenge = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, passwordOrOtpSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    if (!twoFactorWebAuthnConfigured(options))
      return apiErrorResponseCreate(identityTwoFactorError("Configured `DOMAIN` is not compatible with Webauthn"))
    const challengeResult = await twoFactorWebAuthnChallengeCreate(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user,
      options.clock,
      options.identifier,
      "registration",
      options.publicOrigin as string,
      options.config.WEBAUTHN_RP_NAME ?? "OneWarden",
    )
    if (!challengeResult.success) return apiErrorResponseCreate(challengeResult)
    return context.json(challengeResult.data)
  }

  const activateWebAuthn = async (context: Context<AuthenticationEnvironment>) => {
    const request = await twoFactorProtectedRequestResolve(context, options, webauthnSchema)
    if (!request.success) return apiErrorResponseCreate(request)
    const challengeResult = twoFactorWebAuthnChallengeConsume(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.webauthnRegisterChallenge,
    )
    if (!challengeResult.success) return apiErrorResponseCreate(challengeResult)
    if (challengeResult.data === null) return apiErrorResponseCreate(identityTwoFactorError("Can't recover challenge"))
    const stateResult = twoFactorWebAuthnStateRead(challengeResult.data.data)
    if (!stateResult.success) return apiErrorResponseCreate(stateResult)
    if (
      stateResult.data.kind !== "registration" ||
      stateResult.data.userUuid !== request.data.authenticationDatabase.authentication.user.uuid ||
      (stateResult.data.expiresAt !== undefined &&
        stateResult.data.expiresAt <= Math.floor(options.clock.now().getTime() / 1_000))
    )
      return apiErrorResponseCreate(identityTwoFactorError("Webauthn challenge is invalid"))
    const response = webauthnResponseNormalize(request.data.body.deviceResponse)
    const credentialResult = await adapters.webauthn?.registrationValidate?.(response, stateResult.data)
    if (credentialResult === undefined)
      return apiErrorResponseCreate(identityTwoFactorError("Webauthn adapter unavailable"))
    if (!credentialResult.success) return apiErrorResponseCreate(credentialResult)
    const credentialId = credentialResult.data.id
    const existingResult = twoFactorRecordFindByUserAndType(
      request.data.authenticationDatabase.database,
      request.data.authenticationDatabase.authentication.user.uuid,
      twoFactorProviderType.webauthn,
    )
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    const registrationsResult =
      existingResult.data === null ? resultCreate([]) : twoFactorWebAuthnRegistrationsRead(existingResult.data.data)
    if (!registrationsResult.success) return apiErrorResponseCreate(registrationsResult)
    const registrations = registrationsResult.data
    const id = twoFactorNumberParse(request.data.body.id)
    if (id === null || id < 1 || id > 5) return apiErrorResponseCreate(identityTwoFactorError("Invalid Webauthn id"))
    if (registrations.some((registration) => registration.id === id || registration.credentialId === credentialId))
      return apiErrorResponseCreate(identityTwoFactorError("Webauthn entry already exists"))
    registrations.push({
      credential: credentialResult.data,
      credentialId,
      id,
      migrated: false,
      name: request.data.body.name,
    })
    const saveResult = twoFactorProviderSaveAndRevokeRememberedDevices(
      request.data.authenticationDatabase.database,
      {
        uuid: existingResult.data?.uuid ?? options.identifier.uuid(),
        userUuid: request.data.authenticationDatabase.authentication.user.uuid,
        type: twoFactorProviderType.webauthn,
        enabled: true,
        data: JSON.stringify(registrations),
        lastUsed: 0,
      },
      request.data.authenticationDatabase.authentication.user,
    )
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    options.event?.userEventCreate(
      eventType.userUpdatedTwoFactor,
      request.data.authenticationDatabase.authentication.user.uuid,
      eventLogContextCreate(request.data.authenticationDatabase.authentication),
    )
    return context.json({
      enabled: true,
      keys: registrations.map(webauthnRegistrationToJson),
      object: "twoFactorU2f" as const,
    })
  }

  const deleteWebAuthn = async (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const bodyResult = await twoFactorBodyParse(context, webauthnDeleteSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const passwordResult = await passwordHashVerify(
      bodyResult.data.masterPasswordHash,
      request.data.authentication.user.salt,
      request.data.authentication.user.passwordHash,
      request.data.authentication.user.passwordIterations,
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    if (!passwordResult.data) return apiErrorResponseCreate(identityTwoFactorError("Invalid password"))
    const recordResult = twoFactorRecordFindByUserAndType(
      request.data.database,
      request.data.authentication.user.uuid,
      twoFactorProviderType.webauthn,
    )
    if (!recordResult.success) return apiErrorResponseCreate(recordResult)
    if (recordResult.data === null) return apiErrorResponseCreate(identityTwoFactorError("Webauthn data not found!"))
    const id = twoFactorNumberParse(bodyResult.data.id)
    if (id === null || id < 1 || id > 5)
      return apiErrorResponseCreate(identityTwoFactorError("Webauthn entry not found"))
    const registrationsResult = twoFactorWebAuthnRegistrationsRead(recordResult.data.data)
    if (!registrationsResult.success) return apiErrorResponseCreate(registrationsResult)
    const registrations = registrationsResult.data
    const index = registrations.findIndex((registration) => registration.id === id)
    if (index < 0) return apiErrorResponseCreate(identityTwoFactorError("Webauthn entry not found"))
    const removedRegistration = registrations[index]
    if (removedRegistration === undefined)
      return apiErrorResponseCreate(identityTwoFactorError("Webauthn entry not found"))
    const provider = recordResult.data
    registrations.splice(index, 1)
    const saveResult = databaseTransaction(request.data.database, () => {
      if (registrations.length === 0) {
        const deleteResult = twoFactorRecordDelete(request.data.database, provider.uuid)
        if (!deleteResult.success) return deleteResult
      } else {
        provider.data = JSON.stringify(registrations)
        const providerSaveResult = twoFactorRecordSave(request.data.database, provider)
        if (!providerSaveResult.success) return providerSaveResult
      }
      try {
        request.data.database.run("DELETE FROM twofactor WHERE user_uuid = ? AND atype IN (?, ?)", [
          request.data.authentication.user.uuid,
          twoFactorProviderType.webauthnRegisterChallenge,
          twoFactorProviderType.webauthnLoginChallenge,
        ])
      } catch {
        return resultErrorCreate("deleteWebAuthn", "Webauthn challenge cleanup failed.")
      }
      const u2fResult = removedRegistration.migrated
        ? twoFactorWebAuthnU2fRegistrationDelete(
            request.data.database,
            request.data.authentication.user.uuid,
            removedRegistration.credentialId,
          )
        : resultCreate(undefined)
      if (!u2fResult.success) return u2fResult
      const rememberResult = authenticationTrustedDeviceClearAllByUser(
        request.data.database,
        request.data.authentication.user.uuid,
      )
      if (!rememberResult.success) return rememberResult
      return resultCreate(undefined)
    })
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    options.event?.userEventCreate(
      eventType.userDisabledTwoFactor,
      request.data.authentication.user.uuid,
      eventLogContextCreate(request.data.authentication),
    )
    return context.json({
      enabled: registrations.length > 0,
      keys: registrations.map(webauthnRegistrationToJson),
      object: "twoFactorU2f" as const,
    })
  }

  const deviceVerificationSettings = (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    return context.json({
      isDeviceVerificationSectionEnabled: false,
      unknownDeviceVerificationEnabled: false,
      object: "deviceVerificationSettings" as const,
    })
  }

  const requestOtp = async (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const result = await twoFactorProtectedActionCreate(
      request.data.database,
      request.data.authentication.user,
      options.clock,
      options.identifier,
      options.config,
      options.mail,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const verifyOtp = async (context: Context<AuthenticationEnvironment>) => {
    const request = twoFactorRequestContextResolve(context, options)
    if (!request.success) return apiErrorResponseCreate(request)
    const bodyResult = await twoFactorBodyParse(context, protectedActionVerifySchema, { otp: "otp", OTP: "otp" })
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = twoFactorProtectedActionValidate(
      request.data.database,
      request.data.authentication.user.uuid,
      bodyResult.data.otp,
      options.clock,
      options.config,
      true,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  app.get("/api/two-factor", authenticate("get_twofactor"), getTwoFactor)
  app.post("/api/two-factor/get-recover", authenticate("get_recover"), getRecover)
  app.post("/api/two-factor/disable", authenticate("disable_twofactor"), disable)
  app.put("/api/two-factor/disable", authenticate("disable_twofactor_put"), disable)
  app.get(
    "/api/two-factor/get-device-verification-settings",
    authenticate("get_device_verification_settings"),
    deviceVerificationSettings,
  )
  app.post("/api/two-factor/get-authenticator", authenticate("generate_authenticator"), getAuthenticator)
  app.post("/api/two-factor/authenticator", authenticate("activate_authenticator"), activateAuthenticator)
  app.put("/api/two-factor/authenticator", authenticate("activate_authenticator_put"), activateAuthenticator)
  app.delete("/api/two-factor/authenticator", authenticate("disable_authenticator"), disableAuthenticator)
  app.post("/api/two-factor/send-email-login", sendEmailLogin)
  app.post("/api/two-factor/get-email", authenticate("get_email"), getEmail)
  app.post("/api/two-factor/send-email", authenticate("send_email"), sendEmail)
  app.put("/api/two-factor/email", authenticate("email"), completeEmail)
  app.post("/api/two-factor/get-duo", authenticate("get_duo"), getDuo)
  app.post("/api/two-factor/duo", authenticate("activate_duo"), activateDuo)
  app.put("/api/two-factor/duo", authenticate("activate_duo_put"), activateDuo)
  app.post("/api/two-factor/get-yubikey", authenticate("generate_yubikey"), getYubikey)
  app.post("/api/two-factor/yubikey", authenticate("activate_yubikey"), activateYubikey)
  app.put("/api/two-factor/yubikey", authenticate("activate_yubikey_put"), activateYubikey)
  app.post("/api/two-factor/get-webauthn", authenticate("get_webauthn"), getWebAuthn)
  app.post("/api/two-factor/get-webauthn-challenge", authenticate("generate_webauthn_challenge"), getWebAuthnChallenge)
  app.post("/api/two-factor/webauthn", authenticate("activate_webauthn"), activateWebAuthn)
  app.put("/api/two-factor/webauthn", authenticate("activate_webauthn_put"), activateWebAuthn)
  app.delete("/api/two-factor/webauthn", authenticate("delete_webauthn"), deleteWebAuthn)
  app.post("/api/accounts/request-otp", authenticate("request_otp"), requestOtp)
  app.post("/api/accounts/verify-otp", authenticate("verify_otp"), verifyOtp)
}

function twoFactorProviderSaveAndRevokeRememberedDevices(
  database: NonNullable<IdentityRouteOptions["database"]>,
  record: TwoFactorRecord,
  user: IdentityUser,
): Result<void> {
  return databaseTransaction(database, () => {
    const saveResult = twoFactorRecordSave(database, record)
    if (!saveResult.success) return saveResult
    const rememberResult = authenticationTrustedDeviceClearAllByUser(database, user.uuid)
    if (!rememberResult.success) return rememberResult
    const recoveryResult = twoFactorRecoveryCodeEnsure(database, user)
    if (!recoveryResult.success) return recoveryResult
    return resultCreate(undefined)
  })
}

type TwoFactorRequestContext = {
  authentication: AuthenticationContext
  database: NonNullable<IdentityRouteOptions["database"]>
}

function twoFactorRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
): Result<TwoFactorRequestContext> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("twoFactorAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorCreate("twoFactorDatabase", "platform.internal", "Database unavailable.")
  return resultCreate({ authentication, database })
}

async function twoFactorProtectedRequestResolve<TSchema extends v.GenericSchema>(
  context: Context<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
  schema: TSchema,
): Promise<Result<{ authenticationDatabase: TwoFactorRequestContext; body: v.InferOutput<TSchema>; record: never }>> {
  const request = twoFactorRequestContextResolve(context, options)
  if (!request.success) return request
  const bodyResult = await twoFactorBodyParse(context, schema)
  if (!bodyResult.success) return bodyResult
  const validationResult = await twoFactorPasswordOrOtpValidate(
    request.data.database,
    request.data.authentication.user,
    bodyResult.data as never,
    options.clock,
    options.config,
    false,
  )
  if (!validationResult.success) return validationResult
  return resultCreate({ authenticationDatabase: request.data, body: bodyResult.data, record: undefined as never })
}

async function twoFactorBodyParse<TSchema extends v.GenericSchema>(
  context: Context<AuthenticationEnvironment>,
  schema: TSchema,
  extraAliases: Record<string, string> = {},
): Promise<Result<v.InferOutput<TSchema>>> {
  let input: unknown
  try {
    input = await context.req.json()
  } catch {
    return apiErrorCreate("twoFactorBodyParse", "platform.invalid-request", "Request body must be valid JSON.")
  }
  const normalized: Record<string, unknown> = {}
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    for (const [key, value] of Object.entries(input)) {
      const alias = extraAliases[key] ?? requestAliases[key.toLowerCase()] ?? key
      if (normalized[alias] === undefined) normalized[alias] = value
    }
  }
  return requestValidationParse("twoFactorBodyParse", normalized, schema)
}

function identityTwoFactorError(message: string) {
  return resultErrorCreate("twoFactor", message, { code: "platform.invalid-request", statusCode: 400 })
}

function twoFactorNumberParse(value: number | string): number | null {
  const parsed = typeof value === "number" ? value : /^\d+$/u.test(value) ? Number(value) : Number.NaN
  return Number.isSafeInteger(parsed) ? parsed : null
}

function twoFactorClientIpResolve(context: Context): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown"
}

function twoFactorUserFindByDevice(
  database: IdentityRouteOptions["database"],
  deviceIdentifier: string | null | undefined,
): Result<IdentityUser | null> {
  if (database === undefined) return resultErrorCreate("twoFactorUserFindByDevice", "Identity database is unavailable.")
  if (deviceIdentifier === undefined || deviceIdentifier === null || deviceIdentifier === "") return resultCreate(null)
  try {
    const row = database
      .query<{ user_uuid: string }, [string]>(
        "SELECT user_uuid FROM devices WHERE uuid = ? ORDER BY updated_at DESC LIMIT 1",
      )
      .get(deviceIdentifier)
    if (row === null) return resultCreate(null)
    return identityUserFindByUuid(database, row.user_uuid)
  } catch {
    return resultErrorCreate("twoFactorUserFindByDevice", "User lookup failed.")
  }
}

function twoFactorEmailDataRead(data: string): Result<TwoFactorEmailData> {
  try {
    const parsed = JSON.parse(data) as Partial<TwoFactorEmailData>
    if (
      typeof parsed.email !== "string" ||
      (typeof parsed.last_token !== "string" && parsed.last_token !== null) ||
      typeof parsed.token_sent !== "number" ||
      typeof parsed.attempts !== "number"
    )
      return resultErrorCreate("twoFactorEmailDataRead", "Could not decode EmailTokenData from string")
    return resultCreate(parsed as TwoFactorEmailData)
  } catch {
    return resultErrorCreate("twoFactorEmailDataRead", "Could not decode EmailTokenData from string")
  }
}

function twoFactorDuoStatus(
  userUuid: string,
  database: NonNullable<IdentityRouteOptions["database"]>,
  options: IdentityRouteOptions,
): { enabled: boolean; host: string | null; clientSecret: string | null; clientId: string | null } {
  const recordResult = twoFactorRecordFindByUserAndType(database, userUuid, twoFactorProviderType.duo)
  if (recordResult.success && recordResult.data !== null && recordResult.data.data !== "") {
    try {
      const data = JSON.parse(recordResult.data.data) as { host?: unknown; ik?: unknown; sk?: unknown }
      if (
        typeof data.host !== "string" ||
        data.host.trim() === "" ||
        typeof data.ik !== "string" ||
        data.ik.trim() === "" ||
        typeof data.sk !== "string" ||
        data.sk.trim() === ""
      )
        return twoFactorDuoGlobalStatus(options, undefined, true)
      return {
        enabled: true,
        host: maskValue(data.host.trim()),
        clientSecret: maskValue(data.sk.trim()),
        clientId: maskValue(data.ik.trim()),
      }
    } catch {
      return twoFactorDuoGlobalStatus(options, undefined, true)
    }
  }
  const global = twoFactorDuoGlobalConfigured(options)
  if (recordResult.success && recordResult.data !== null && global)
    return {
      enabled: true,
      host: "<global_secret>",
      clientSecret: "<global_secret>",
      clientId: "<global_secret>",
    }
  return twoFactorDuoGlobalStatus(options, global)
}

function twoFactorDuoGlobalStatus(
  options: IdentityRouteOptions,
  configured = twoFactorDuoGlobalConfigured(options),
  activeRecord = false,
): { enabled: boolean; host: string | null; clientSecret: string | null; clientId: string | null } {
  if (configured && activeRecord)
    return { enabled: true, host: "<global_secret>", clientSecret: "<global_secret>", clientId: "<global_secret>" }
  return configured
    ? {
        enabled: false,
        host: "<To use the global Duo keys, please leave these fields untouched>",
        clientSecret: "<To use the global Duo keys, please leave these fields untouched>",
        clientId: "<To use the global Duo keys, please leave these fields untouched>",
      }
    : { enabled: false, host: null, clientSecret: null, clientId: null }
}

function maskValue(value: string): string {
  return value.length <= 4 ? value : `${value.slice(0, 4)}************`
}

function twoFactorYubikeyConfigured(options: IdentityRouteOptions): boolean {
  return (
    (options.config.YUBICO_ENABLED ?? false) &&
    (options.config.YUBICO_CLIENT_ID ?? "") !== "" &&
    (options.config.YUBICO_SECRET_KEY ?? "") !== ""
  )
}

function twoFactorYubikeyDataRead(data: string): Result<{ keys: string[]; nfc: boolean }> {
  try {
    const parsed = JSON.parse(data) as { keys?: unknown; Keys?: unknown; nfc?: unknown; Nfc?: unknown }
    const keys = parsed.keys ?? parsed.Keys
    const nfc = parsed.nfc ?? parsed.Nfc
    if (!Array.isArray(keys) || !keys.every((key) => typeof key === "string") || typeof nfc !== "boolean")
      return resultErrorCreate("twoFactorYubikeyDataRead", "Yubikey metadata is invalid")
    return resultCreate({ keys: keys as string[], nfc })
  } catch {
    return resultErrorCreate("twoFactorYubikeyDataRead", "Yubikey metadata is invalid")
  }
}

function yubikeyResponseKeys(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key, index) => [`Key${index + 1}`, key]))
}

function twoFactorWebAuthnConfigured(options: IdentityRouteOptions): boolean {
  return (options.config.WEBAUTHN_ENABLED ?? true) && twoFactorWebAuthnOriginResolve(options.publicOrigin).success
}

function twoFactorDuoGlobalConfigured(options: IdentityRouteOptions): boolean {
  return (
    (options.config.DUO_ENABLED ?? true) &&
    (options.config.DUO_HOST ?? "").trim() !== "" &&
    (options.config.DUO_IKEY ?? "").trim() !== "" &&
    (options.config.DUO_SKEY ?? "").trim() !== ""
  )
}

function twoFactorDuoFieldIsDefault(value: string): boolean {
  return value.trim() === "" || value === "<To use the global Duo keys, please leave these fields untouched>"
}

function webauthnResponseNormalize(response: unknown): unknown {
  if (typeof response !== "object" || response === null || Array.isArray(response)) return response
  const normalized = { ...(response as Record<string, unknown>) }
  if (normalized.rawId === undefined && normalized.raw_id !== undefined) normalized.rawId = normalized.raw_id
  if (normalized.clientExtensionResults === undefined && normalized.client_extension_results !== undefined)
    normalized.clientExtensionResults = normalized.client_extension_results
  const nested = normalized.response
  if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
    const value = { ...(nested as Record<string, unknown>) }
    if (value.clientDataJSON === undefined && value.clientDataJson !== undefined)
      value.clientDataJSON = value.clientDataJson
    if (value.clientDataJSON === undefined && value.client_data_json !== undefined)
      value.clientDataJSON = value.client_data_json
    if (value.attestationObject === undefined && value.AttestationObject !== undefined)
      value.attestationObject = value.AttestationObject
    if (value.attestationObject === undefined && value.attestation_object !== undefined)
      value.attestationObject = value.attestation_object
    if (value.authenticatorData === undefined && value.authenticator_data !== undefined)
      value.authenticatorData = value.authenticator_data
    if (value.userHandle === undefined && value.user_handle !== undefined) value.userHandle = value.user_handle
    normalized.response = value
  }
  return normalized
}

function twoFactorWebAuthnKeysRead(data: string): Result<Array<{ id: number; name: string; migrated: boolean }>> {
  try {
    const parsedResult = twoFactorWebAuthnRegistrationsRead(data)
    if (!parsedResult.success) return parsedResult
    return resultCreate(parsedResult.data.map(webauthnRegistrationToJson))
  } catch {
    return resultErrorCreate("twoFactorWebAuthnKeysRead", "Webauthn data is invalid")
  }
}

function webauthnRegistrationToJson(registration: { id: number; name: string; migrated: boolean }) {
  return { id: registration.id, name: registration.name, migrated: registration.migrated }
}

function twoFactorWebAuthnU2fRegistrationDelete(
  database: NonNullable<IdentityRouteOptions["database"]>,
  userUuid: string,
  credentialId: string,
): Result<void> {
  const recordResult = twoFactorRecordFindByUserAndType(database, userUuid, twoFactorProviderType.u2f)
  if (!recordResult.success) return recordResult
  if (recordResult.data === null) return resultCreate(undefined)
  let registrations: unknown
  try {
    registrations = JSON.parse(recordResult.data.data)
  } catch {
    return resultErrorCreate("twoFactorWebAuthnU2fRegistrationDelete", "Error parsing U2F data")
  }
  if (!Array.isArray(registrations))
    return resultErrorCreate("twoFactorWebAuthnU2fRegistrationDelete", "Error parsing U2F data")
  const filtered = registrations.filter(
    (registration) => !twoFactorWebAuthnU2fCredentialMatches(registration, credentialId),
  )
  if (filtered.length === registrations.length) return resultCreate(undefined)
  recordResult.data.data = JSON.stringify(filtered)
  return twoFactorRecordSave(database, recordResult.data)
}

function twoFactorWebAuthnU2fCredentialMatches(registration: unknown, credentialId: string): boolean {
  if (typeof registration !== "object" || registration === null || Array.isArray(registration)) return false
  const value = registration as Record<string, unknown>
  const nested = value.reg
  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) return false
  const keyHandle = (nested as Record<string, unknown>).keyHandle ?? (nested as Record<string, unknown>).key_handle
  if (typeof keyHandle === "string") {
    if (keyHandle === credentialId) return true
    const decoded = base64Decode(keyHandle)
    return decoded.success && base64UrlEncode(decoded.data) === credentialId
  }
  if (!Array.isArray(keyHandle) || !keyHandle.every((byte) => typeof byte === "number" && Number.isInteger(byte)))
    return false
  return base64UrlEncode(Uint8Array.from(keyHandle as number[])) === credentialId
}
