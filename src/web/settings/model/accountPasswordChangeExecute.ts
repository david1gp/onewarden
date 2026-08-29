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

export interface AccountPasswordChangeExecuteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  currentPassword: string
  newPassword: string
  newHint?: string | null
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

export async function accountPasswordChangeExecute(
  options: AccountPasswordChangeExecuteOptions,
): Promise<Result<void>> {
  const op = "accountPasswordChangeExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to change your password.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  if (options.currentPassword.length === 0) {
    return resultErrorCreate(op, "Current master password is required.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (options.newPassword.length < 8) {
    return resultErrorCreate(op, "New master password must be at least 8 characters.", {
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
      return resultErrorCreate(op, "Current master password is incorrect.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    userKey = unlockResult.data
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

  // Derive new master key and password hash
  const newMasterKeyResult = await webAuthMasterKeyDerive(options.newPassword, currentSession.email, kdfMetadata)
  if (!newMasterKeyResult.success) return newMasterKeyResult
  const newMasterHashResult = await webAuthMasterPasswordHashDerive(options.newPassword, newMasterKeyResult.data)
  if (!newMasterHashResult.success) {
    newMasterKeyResult.data.fill(0)
    return newMasterHashResult
  }

  // Stretch new master key to wrap existing user key
  const encResult = await hkdfSha256Expand(newMasterKeyResult.data, new TextEncoder().encode("enc"), 32)
  const macResult = await hkdfSha256Expand(newMasterKeyResult.data, new TextEncoder().encode("mac"), 32)
  newMasterKeyResult.data.fill(0)
  if (!encResult.success || !macResult.success) {
    return resultErrorCreate(op, "Failed to stretch new master key.")
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
  const changeResult = await client.passwordChange(currentSession.accessToken, {
    masterPasswordHash: currentMasterHashResult.data,
    newMasterPasswordHash: newMasterHashResult.data,
    key: wrappedUserKeyResult.data,
    masterPasswordHint: options.newHint ?? null,
  })

  if (!changeResult.success) return changeResult
  return resultCreate(undefined)
}
