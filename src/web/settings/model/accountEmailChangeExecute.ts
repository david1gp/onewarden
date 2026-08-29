import { type Result } from "#result"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { hkdfSha256Expand } from "../../../shared/crypto/hkdfSha256Expand.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { webAuthMasterKeyDerive } from "../../auth/model/webAuthMasterKeyDerive.js"
import { webAuthMasterPasswordHashDerive } from "../../auth/model/webAuthMasterPasswordHashDerive.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthUserKeyUnlock } from "../../auth/model/webAuthUserKeyUnlock.js"
import { webSettingsApiClientCreate } from "./webSettingsApiClientCreate.js"

export interface AccountEmailChangeTokenOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  currentPassword: string
  newEmail: string
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

export interface AccountEmailChangeCompleteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  currentPassword: string
  newEmail: string
  token: string
  masterPasswordHint?: string | null
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

export async function accountEmailChangeRequestToken(options: AccountEmailChangeTokenOptions): Promise<Result<void>> {
  const op = "accountEmailChangeRequestToken"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to change your email.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  const normalizedNewEmail = options.newEmail.trim().toLowerCase()
  if (normalizedNewEmail.length === 0) {
    return resultErrorCreate(op, "New email cannot be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const kdfMetadata = {
    kdfType: currentSession.kdf,
    iterations: currentSession.kdfIterations,
    memory: currentSession.kdfMemory,
    parallelism: currentSession.kdfParallelism,
  }

  const masterKeyResult = await webAuthMasterKeyDerive(options.currentPassword, currentSession.email, kdfMetadata)
  if (!masterKeyResult.success) return masterKeyResult
  const masterHashResult = await webAuthMasterPasswordHashDerive(options.currentPassword, masterKeyResult.data)
  masterKeyResult.data.fill(0)
  if (!masterHashResult.success) return masterHashResult

  const client = options.apiClient ?? webSettingsApiClientCreate()
  return client.emailTokenRequest(currentSession.accessToken, {
    masterPasswordHash: masterHashResult.data,
    newEmail: normalizedNewEmail,
    token: "",
  })
}

export async function accountEmailChangeComplete(options: AccountEmailChangeCompleteOptions): Promise<Result<void>> {
  const op = "accountEmailChangeComplete"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to change your email.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  const normalizedNewEmail = options.newEmail.trim().toLowerCase()
  if (normalizedNewEmail.length === 0 || options.token.trim().length === 0) {
    return resultErrorCreate(op, "New email and verification token are required.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const kdfMetadata = {
    kdfType: currentSession.kdf,
    iterations: currentSession.kdfIterations,
    memory: currentSession.kdfMemory,
    parallelism: currentSession.kdfParallelism,
  }

  // Derive current master password hash
  const currentMasterKeyResult = await webAuthMasterKeyDerive(
    options.currentPassword,
    currentSession.email,
    kdfMetadata,
  )
  if (!currentMasterKeyResult.success) return currentMasterKeyResult
  const currentMasterHashResult = await webAuthMasterPasswordHashDerive(
    options.currentPassword,
    currentMasterKeyResult.data,
  )
  currentMasterKeyResult.data.fill(0)
  if (!currentMasterHashResult.success) return currentMasterHashResult

  // Unlock user key
  let userKey = options.session.getUserKey()
  if (userKey === null) {
    const unlockResult = await webAuthUserKeyUnlock(
      options.currentPassword,
      currentSession.email,
      kdfMetadata,
      currentSession.encryptedUserKey,
    )
    if (!unlockResult.success) {
      return resultErrorCreate(op, "Invalid master password.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    userKey = unlockResult.data
  }

  // Derive new master key using new email as salt
  const newMasterKeyResult = await webAuthMasterKeyDerive(options.currentPassword, normalizedNewEmail, kdfMetadata)
  if (!newMasterKeyResult.success) return newMasterKeyResult

  // Stretch new master key and wrap user key
  const encResult = await hkdfSha256Expand(newMasterKeyResult.data, new TextEncoder().encode("enc"), 32)
  const macResult = await hkdfSha256Expand(newMasterKeyResult.data, new TextEncoder().encode("mac"), 32)
  newMasterKeyResult.data.fill(0)
  if (!encResult.success || !macResult.success) {
    return resultErrorCreate(op, "Failed to stretch master key for new email.")
  }

  const stretchedKey = new Uint8Array(64)
  stretchedKey.set(encResult.data)
  stretchedKey.set(macResult.data, 32)
  encResult.data.fill(0)
  macResult.data.fill(0)

  const wrappedUserKeyResult = await bitwardenCipherStringEncrypt(userKey, stretchedKey)
  stretchedKey.fill(0)
  if (!wrappedUserKeyResult.success) return wrappedUserKeyResult

  const client = options.apiClient ?? webSettingsApiClientCreate()
  const completeResult = await client.emailChangeComplete(currentSession.accessToken, {
    masterPasswordHash: currentMasterHashResult.data,
    newEmail: normalizedNewEmail,
    token: options.token.trim(),
    key: wrappedUserKeyResult.data,
    masterPasswordHint: options.masterPasswordHint ?? null,
  })

  if (!completeResult.success) return completeResult
  return resultCreate(undefined)
}
