import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authenticationTrustedDeviceCreate } from "../authentication/authenticationTrustedDeviceCreate.js"
import { authenticationTrustedDeviceValidate } from "../authentication/authenticationTrustedDeviceValidate.js"
import type { EventAdapter } from "../events/eventAdapter.js"
import { eventType } from "../events/eventType.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import type { IdentityTokenRequest } from "../identity/identityTokenRequestSchema.js"
import type { IdentityUser } from "../identity/identityUser.js"
import type { TwoFactorAdapters } from "./twoFactorAdapters.js"
import { twoFactorAdaptersCreate } from "./twoFactorAdaptersCreate.js"
import { twoFactorDuoCredentialsResolve } from "./twoFactorDuoCredentialsResolve.js"
import { twoFactorEmailDataSchema } from "./twoFactorEmailDataSchema.js"
import { twoFactorEmailLoginValidate } from "./twoFactorEmailLoginValidate.js"
import { twoFactorIncompleteComplete } from "./twoFactorIncompleteComplete.js"
import { twoFactorIncompleteMark } from "./twoFactorIncompleteMark.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorProviderUsable } from "./twoFactorProviderUsable.js"
import type { TwoFactorRecord } from "./twoFactorRecord.js"
import { twoFactorRecordFindByUser } from "./twoFactorRecordFindByUser.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"
import { twoFactorRecoveryCodeConsume } from "./twoFactorRecoveryCodeConsume.js"
import { twoFactorTotpCodeValidate } from "./twoFactorTotpCodeValidate.js"
import type { TwoFactorWebAuthnAuthentication } from "./twoFactorWebAuthnAuthentication.js"
import { twoFactorWebAuthnChallengeConsume } from "./twoFactorWebAuthnChallengeConsume.js"
import { twoFactorWebAuthnChallengeCreate } from "./twoFactorWebAuthnChallengeCreate.js"
import { twoFactorWebAuthnRegistrationCounterUpdate } from "./twoFactorWebAuthnRegistrationCounterUpdate.js"
import { twoFactorWebAuthnStateRead } from "./twoFactorWebAuthnStateRead.js"
import { twoFactorYubikeyLoginValidate } from "./twoFactorYubikeyLoginValidate.js"

type TwoFactorLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection
  device: IdentityDevice
  issuer: string
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
  clientIp: string
  clientVersion?: string
  identifier: Identifier
  twoFactor?: TwoFactorAdapters
  event?: EventAdapter
}

type TwoFactorLoginChallenge = {
  providers: number[]
  providers2: Record<string, unknown>
}

export async function twoFactorLogin(
  user: IdentityUser,
  data: IdentityTokenRequest,
  options: TwoFactorLoginOptions,
): Promise<Result<string | null>> {
  const recordsResult = twoFactorRecordFindByUser(options.database, user.uuid)
  if (!recordsResult.success) return recordsResult
  if (recordsResult.data.length === 0) return resultCreate(null)

  const usableRecords = recordsResult.data.filter(
    (record) =>
      record.enabled && twoFactorProviderUsable(record.type, record.data, options.config, options.publicOrigin),
  )
  if (usableRecords.length === 0)
    return resultErrorCreate(
      "twoFactorLogin",
      "No enabled and usable two factor providers are available for this account",
    )

  const providers = usableRecords.map((record) => record.type)
  const incompleteResult = twoFactorIncompleteMark(
    options.database,
    user.uuid,
    options.device.uuid,
    options.device.name,
    options.device.type,
    options.clientIp,
    options.clock,
    options.config,
  )
  if (!incompleteResult.success) return incompleteResult

  const selected = data.twoFactorProvider === undefined ? providers[0] : twoFactorProviderParse(data.twoFactorProvider)
  if (
    selected === undefined ||
    selected === null ||
    (!providers.includes(selected) &&
      selected !== twoFactorProviderType.recoveryCode &&
      selected !== twoFactorProviderType.remember)
  )
    return twoFactorLoginRequired(
      await twoFactorLoginChallengeCreate(usableRecords, user, options),
      "Invalid two factor provider",
    )

  const token = data.twoFactorToken
  if (token === undefined)
    return twoFactorLoginRequired(
      await twoFactorLoginChallengeCreate(usableRecords, user, options),
      "2FA token not provided",
    )

  const adapters = twoFactorAdaptersCreate(options.twoFactor, options.config, options.clock)
  let validationResult: Result<undefined | TwoFactorWebAuthnAuthentication>
  if (selected === twoFactorProviderType.recoveryCode) {
    validationResult = twoFactorRecoveryValidate(user, token)
    if (validationResult.success) {
      const consumeResult = twoFactorRecoveryCodeConsume(options.database, user, token)
      if (!consumeResult.success) return consumeResult
      options.event?.userEventCreate(eventType.userRecoveredTwoFactor, user.uuid, {
        deviceType: options.device.type,
        ipAddress: options.clientIp,
      })
    }
  } else if (selected === twoFactorProviderType.remember) {
    const rememberResult = await authenticationTrustedDeviceValidate(options.device, token, {
      clock: options.clock,
      config: options.config,
      database: options.database,
      issuer: options.issuer,
      publicKey: options.publicKey,
    })
    validationResult =
      rememberResult.success && rememberResult.data
        ? resultCreate(undefined)
        : rememberResult.success
          ? resultErrorCreate("twoFactorLogin", "2FA Remember token not provided or expired")
          : rememberResult
  } else {
    const record = usableRecords.find((item) => item.type === selected)
    if (record === undefined)
      return twoFactorLoginRequired(
        await twoFactorLoginChallengeCreate(usableRecords, user, options),
        "Invalid two factor provider",
      )
    validationResult = await twoFactorRecordLoginValidate(record, token, user, options, adapters)
  }

  if (!validationResult.success) {
    options.event?.userEventCreate(eventType.userFailedLoginTwoFactor, user.uuid, {
      deviceType: options.device.type,
      ipAddress: options.clientIp,
    })
    return twoFactorLoginRequired(
      await twoFactorLoginChallengeCreate(usableRecords, user, options),
      validationResult.errorMessage,
    )
  }

  if (selected === twoFactorProviderType.webauthn && validationResult.data === undefined)
    return twoFactorLoginRequired(
      await twoFactorLoginChallengeCreate(usableRecords, user, options),
      "Webauthn credential validation is incomplete",
    )
  if (selected === twoFactorProviderType.webauthn && validationResult.data !== undefined) {
    if (!Number.isSafeInteger(validationResult.data.newCounter) || validationResult.data.newCounter < 0)
      return twoFactorLoginRequired(
        await twoFactorLoginChallengeCreate(usableRecords, user, options),
        "Webauthn credential counter is invalid",
      )
    const counterResult = twoFactorWebAuthnRegistrationCounterUpdate(options.database, user.uuid, validationResult.data)
    if (!counterResult.success) return counterResult
  }

  const completeResult = twoFactorIncompleteComplete(options.database, user.uuid, options.device.uuid)
  if (!completeResult.success) return completeResult

  if (data.twoFactorRemember === "1" && !options.config.DISABLE_2FA_REMEMBER) {
    const rememberResult = await authenticationTrustedDeviceCreate(options.device, {
      clock: options.clock,
      config: options.config,
      database: options.database,
      issuer: options.issuer,
      privateKey: options.privateKey,
    })
    if (!rememberResult.success) return rememberResult
    return resultCreate(rememberResult.data)
  }
  return resultCreate(null)
}

async function twoFactorRecordLoginValidate(
  record: TwoFactorRecord,
  token: string,
  user: IdentityUser,
  options: TwoFactorLoginOptions,
  adapters: TwoFactorAdapters,
): Promise<Result<undefined | TwoFactorWebAuthnAuthentication>> {
  if (record.type === twoFactorProviderType.email)
    return twoFactorEmailLoginValidate(options.database, record.userUuid, token, options.clock, options.config)
  if (record.type === twoFactorProviderType.duo || record.type === twoFactorProviderType.organizationDuo) {
    const credentialsResult = twoFactorDuoCredentialsResolve(record.data, options.config)
    if (!credentialsResult.success) return credentialsResult
    const validationResult = await adapters.duo?.loginValidate?.({
      credentials: credentialsResult.data,
      email: user.email,
      state: twoFactorDuoStateRead(token),
      token,
    })
    if (validationResult === undefined) return resultErrorCreate("twoFactorDuoLoginValidate", "Duo adapter unavailable")
    if (!validationResult.success) return validationResult
    return resultCreate(undefined)
  }
  if (record.type === twoFactorProviderType.webauthn) {
    const challengeResult = twoFactorWebAuthnChallengeConsume(
      options.database,
      user.uuid,
      twoFactorProviderType.webauthnLoginChallenge,
    )
    if (!challengeResult.success) return challengeResult
    if (challengeResult.data === null)
      return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Can't recover login challenge")
    const stateResult = twoFactorWebAuthnStateRead(challengeResult.data.data)
    if (!stateResult.success) return stateResult
    if (
      stateResult.data.kind !== "login" ||
      stateResult.data.userUuid !== user.uuid ||
      (stateResult.data.expiresAt !== undefined &&
        stateResult.data.expiresAt <= Math.floor(options.clock.now().getTime() / 1_000))
    )
      return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn challenge is invalid")
    let response: unknown
    try {
      response = JSON.parse(token)
    } catch {
      return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn assertion was invalid")
    }
    const validationResult = await adapters.webauthn?.loginValidate?.(response, stateResult.data)
    if (validationResult === undefined)
      return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn adapter unavailable")
    return validationResult
  }
  if (record.type === twoFactorProviderType.yubikey) {
    const validationResult = await twoFactorYubikeyLoginValidate(token, record.data, adapters)
    if (!validationResult.success) return validationResult
    return resultCreate(undefined)
  }
  if (record.type !== twoFactorProviderType.authenticator)
    return resultErrorCreate("twoFactorLogin", "Invalid two factor provider")
  const codeResult = await twoFactorTotpCodeValidate(
    record.data,
    token,
    Math.floor(options.clock.now().getTime() / 1_000),
    record.lastUsed,
    options.config.AUTHENTICATOR_DISABLE_TIME_DRIFT ?? false,
  )
  if (!codeResult.success) return codeResult
  const saveResult = twoFactorRecordSave(options.database, { ...record, lastUsed: codeResult.data })
  if (!saveResult.success) return saveResult
  return resultCreate(undefined)
}

async function twoFactorLoginChallengeCreate(
  records: TwoFactorRecord[],
  user: IdentityUser,
  options: TwoFactorLoginOptions,
): Promise<Result<TwoFactorLoginChallenge>> {
  const providers = records.map((record) => record.type)
  const providers2: Record<string, unknown> = {}
  for (const record of records) {
    if (record.type === twoFactorProviderType.webauthn) {
      if (options.publicOrigin === undefined)
        return resultErrorCreate("twoFactorLoginChallengeCreate", "Configured `DOMAIN` is not compatible with Webauthn")
      const challengeResult = await twoFactorWebAuthnChallengeCreate(
        options.database,
        user,
        options.clock,
        options.identifier,
        "login",
        options.publicOrigin,
        options.config.WEBAUTHN_RP_NAME ?? "OneWarden",
      )
      if (!challengeResult.success) return challengeResult
      providers2[String(record.type)] = challengeResult.data
      continue
    }
    if (record.type !== twoFactorProviderType.email) {
      providers2[String(record.type)] = null
      continue
    }
    const email = twoFactorEmailAddressRead(record.data)
    providers2[String(record.type)] = email === null ? null : { Email: twoFactorEmailObscure(email) }
  }
  return resultCreate({ providers, providers2 })
}

function twoFactorLoginRequired(
  challengeResult: Result<TwoFactorLoginChallenge>,
  message: string,
): Result<string | null> {
  if (!challengeResult.success) return challengeResult
  return resultErrorCreate("twoFactorLogin", message, {
    code: "platform.invalid-request",
    errorData: JSON.stringify({ twoFactorLogin: challengeResult.data }),
    statusCode: 400,
  })
}

function twoFactorProviderParse(value: string): number | null {
  if (!/^-?\d+$/u.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function twoFactorRecoveryValidate(user: IdentityUser, token: string): Result<undefined> {
  if (
    user.totpRecover === undefined ||
    user.totpRecover === null ||
    !constantTimeStringsEqual(user.totpRecover.toLowerCase(), token.toLowerCase())
  )
    return resultErrorCreate("twoFactorRecoveryValidate", "Recovery code is incorrect. Try again.")
  return resultCreate(undefined)
}

function twoFactorEmailAddressRead(data: string): string | null {
  const dataResult = twoFactorPersistedJsonParse(
    "twoFactorEmailAddressRead",
    data,
    twoFactorEmailDataSchema,
    "Email token data is invalid",
  )
  return dataResult.success ? dataResult.data.email : null
}

function twoFactorEmailObscure(email: string): string {
  const separator = email.lastIndexOf("@")
  if (separator <= 0 || separator === email.length - 1) return email
  const name = email.slice(0, separator)
  const visibleName = name.length <= 3 ? "*".repeat(name.length) : `${name.slice(0, 2)}${"*".repeat(name.length - 2)}`
  return `${visibleName}${email.slice(separator)}`
}

function twoFactorDuoStateRead(token: string): string | null {
  const separator = token.indexOf("|")
  if (separator < 0 || token.indexOf("|", separator + 1) >= 0) return null
  const state = token.slice(separator + 1)
  return state === "" ? null : state
}
