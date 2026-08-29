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

export interface AccountKdfChangeExecuteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  currentPassword: string
  kdfType: number
  iterations: number
  memory?: number | null
  parallelism?: number | null
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

export async function accountKdfChangeExecute(options: AccountKdfChangeExecuteOptions): Promise<Result<void>> {
  const op = "accountKdfChangeExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to change KDF settings.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  if (options.currentPassword.length === 0) {
    return resultErrorCreate(op, "Master password is required to change KDF settings.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const currentKdfMetadata = {
    kdfType: currentSession.kdf,
    iterations: currentSession.kdfIterations,
    memory: currentSession.kdfMemory,
    parallelism: currentSession.kdfParallelism,
  }

  const newKdfMetadata = {
    kdfType: options.kdfType,
    iterations: options.iterations,
    memory: options.memory ?? null,
    parallelism: options.parallelism ?? null,
  }

  // Derive current master key & password hash
  const currentMasterKeyResult = await webAuthMasterKeyDerive(
    options.currentPassword,
    currentSession.email,
    currentKdfMetadata,
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
      currentKdfMetadata,
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

  // Derive new master key with new KDF metadata
  const newMasterKeyResult = await webAuthMasterKeyDerive(options.currentPassword, currentSession.email, newKdfMetadata)
  if (!newMasterKeyResult.success) return newMasterKeyResult
  const newMasterHashResult = await webAuthMasterPasswordHashDerive(options.currentPassword, newMasterKeyResult.data)
  if (!newMasterHashResult.success) {
    newMasterKeyResult.data.fill(0)
    return newMasterHashResult
  }

  // Stretch new master key
  const encResult = await hkdfSha256Expand(newMasterKeyResult.data, new TextEncoder().encode("enc"), 32)
  const macResult = await hkdfSha256Expand(newMasterKeyResult.data, new TextEncoder().encode("mac"), 32)
  newMasterKeyResult.data.fill(0)
  if (!encResult.success || !macResult.success) {
    return resultErrorCreate(op, "Failed to stretch master key.")
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
  const changeResult = await client.kdfChange(currentSession.accessToken, {
    masterPasswordHash: currentMasterHashResult.data,
    authenticationData: {
      masterPasswordAuthenticationHash: newMasterHashResult.data,
      kdf: {
        kdfType: newKdfMetadata.kdfType,
        kdfIterations: newKdfMetadata.iterations,
        kdfMemory: newKdfMetadata.memory,
        kdfParallelism: newKdfMetadata.parallelism,
      },
      salt: currentSession.email,
    },
    unlockData: {
      masterKeyWrappedUserKey: wrappedUserKeyResult.data,
      kdf: {
        kdfType: newKdfMetadata.kdfType,
        kdfIterations: newKdfMetadata.iterations,
        kdfMemory: newKdfMetadata.memory,
        kdfParallelism: newKdfMetadata.parallelism,
      },
      salt: currentSession.email,
    },
  })

  if (!changeResult.success) return changeResult
  return resultCreate(undefined)
}
