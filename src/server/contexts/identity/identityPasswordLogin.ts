import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { passwordHashCreate } from "../../../shared/crypto/passwordHashCreate.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDeviceCreate } from "./identityDeviceCreate.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceFindByUuidAndUser } from "./identityDeviceFindByUuidAndUser.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityDeviceTypeParse } from "./identityDeviceTypeParse.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityRegistrationVerifyTokenCreate } from "./identityRegistrationVerifyTokenCreate.js"
import type { IdentityPasswordTokenResponse } from "./identityPasswordTokenResponseSchema.js"
import type { IdentityTokenBundle } from "./identityTokenBundle.js"
import { identityTokenBundleCreate } from "./identityTokenBundleCreate.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import type { IdentityUser } from "./identityUser.js"
import { identityUserSave } from "./identityUserSave.js"

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
}

function identityPasswordTokenResponseCreate(
  user: IdentityUser,
  bundle: IdentityTokenBundle,
): IdentityPasswordTokenResponse {
  const hasMasterPassword = user.passwordHash.byteLength > 0
  const masterPasswordUnlock = hasMasterPassword
    ? {
        Kdf: {
          KdfType: user.clientKdfType,
          Iterations: user.clientKdfIter,
          Memory: user.clientKdfMemory,
          Parallelism: user.clientKdfParallelism,
        },
        MasterKeyEncryptedUserKey: user.akey,
        MasterKeyWrappedUserKey: user.akey,
        Salt: user.email,
      }
    : null
  const accountKeys =
    user.privateKey === null
      ? null
      : {
          publicKeyEncryptionKeyPair: {
            wrappedPrivateKey: user.privateKey,
            publicKey: user.publicKey,
            Object: "publicKeyEncryptionKeyPair" as const,
          },
          Object: "privateKeys" as const,
        }
  const response: IdentityPasswordTokenResponse = {
    access_token: bundle.accessToken,
    expires_in: bundle.expiresIn,
    token_type: "Bearer",
    refresh_token: bundle.refreshToken,
    PrivateKey: user.privateKey,
    Kdf: user.clientKdfType,
    KdfIterations: user.clientKdfIter,
    KdfMemory: user.clientKdfMemory,
    KdfParallelism: user.clientKdfParallelism,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
    AccountKeys: accountKeys,
    UserDecryptionOptions: {
      HasMasterPassword: hasMasterPassword,
      MasterPasswordUnlock: masterPasswordUnlock,
      Object: "userDecryptionOptions",
    },
  }
  if (user.akey !== "") response.Key = user.akey
  return response
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
        const tokenResult = await identityRegistrationVerifyTokenCreate(
          user.email,
          user.name,
          false,
          options.issuer,
          options.privateKey,
          options.clock,
        )
        if (tokenResult.success) await options.mail.sendRegisterVerifyEmail(user.email, tokenResult.data)
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
  if (!user.enabled) return identityDomainErrorCreate(op, "This user has been disabled")
  const password = data.password
  if (password === undefined) return identityDomainErrorCreate(op, "password cannot be blank")
  const passwordResult = await passwordHashVerify(password, user.salt, user.passwordHash, user.passwordIterations)
  if (!passwordResult.success) return passwordResult
  if (!passwordResult.data) return identityDomainErrorCreate(op, "Username or password is incorrect. Try again")

  if (user.passwordIterations < options.config.PASSWORD_ITERATIONS) {
    const upgradedHashResult = await passwordHashCreate(password, user.salt, options.config.PASSWORD_ITERATIONS)
    if (upgradedHashResult.success) {
      user.passwordHash = upgradedHashResult.data
      user.passwordIterations = options.config.PASSWORD_ITERATIONS
      user.updatedAt = options.clock.now().toISOString()
      identityUserSave(database, user)
    }
  }

  const verificationResult = await identityPasswordVerificationRequire(user, options)
  if (!verificationResult.success) return verificationResult

  const deviceIdentifier = data.deviceIdentifier
  const deviceName = data.deviceName
  const deviceType = data.deviceType
  if (deviceIdentifier === undefined) return identityDomainErrorCreate(op, "device_identifier cannot be blank")
  if (deviceName === undefined) return identityDomainErrorCreate(op, "device_name cannot be blank")
  if (deviceType === undefined) return identityDomainErrorCreate(op, "device_type cannot be blank")
  const type = identityDeviceTypeParse(deviceType)
  const deviceResult = identityDeviceFindByUuidAndUser(database, deviceIdentifier, user.uuid)
  if (!deviceResult.success) return deviceResult
  let device: IdentityDevice
  if (deviceResult.data === null) {
    const newDeviceResult = identityDeviceCreate(
      deviceIdentifier,
      user.uuid,
      deviceName,
      type,
      options.clock,
      options.identifier,
    )
    if (!newDeviceResult.success) return newDeviceResult
    device = newDeviceResult.data
    const saveResult = identityDeviceSave(database, device, options.clock, false)
    if (!saveResult.success) return saveResult
  } else {
    device = deviceResult.data
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
  return resultCreate(identityPasswordTokenResponseCreate(user, bundleResult.data))
}
