import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenPasswordTokenResponse } from "../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../shared/api/bitwardenPreloginResponseSchema.js"
import { hkdfSha256Expand } from "../../shared/crypto/hkdfSha256Expand.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionVaultUnlockRequestSchema } from "../extensionVaultUnlockRequestSchema.js"
import { extensionEncStringDecrypt } from "./extensionEncStringDecrypt.js"
import { extensionMasterKeyDerive } from "./extensionMasterKeyDerive.js"

type KdfMetadata = {
  kdfType: number
  iterations: number
  memory: number | null
  parallelism: number | null
}

function invalidResult<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.invalid-request", statusCode: 400 })
}

function unsupportedResult<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "extension.unsupported", statusCode: 400 })
}

function normalizedEmailRead(email: string): string {
  return email.trim().toLowerCase()
}

function kdfEqual(left: KdfMetadata, right: KdfMetadata): boolean {
  return (
    left.kdfType === right.kdfType &&
    left.iterations === right.iterations &&
    left.memory === right.memory &&
    left.parallelism === right.parallelism
  )
}

function tokenKdfRead(token: BitwardenPasswordTokenResponse): KdfMetadata {
  return {
    kdfType: token.Kdf,
    iterations: token.KdfIterations,
    memory: token.KdfMemory,
    parallelism: token.KdfParallelism,
  }
}

function unlockKdfRead(token: BitwardenPasswordTokenResponse): KdfMetadata | null {
  const unlock = token.UserDecryptionOptions.MasterPasswordUnlock
  if (unlock === null) return null
  return {
    kdfType: unlock.Kdf.KdfType,
    iterations: unlock.Kdf.Iterations,
    memory: unlock.Kdf.Memory,
    parallelism: unlock.Kdf.Parallelism,
  }
}

function preloginKdfRead(prelogin: BitwardenPreloginResponse): KdfMetadata {
  return {
    kdfType: prelogin.kdfSettings.kdfType,
    iterations: prelogin.kdfSettings.iterations,
    memory: prelogin.kdfSettings.memory,
    parallelism: prelogin.kdfSettings.parallelism,
  }
}

function topLevelPreloginKdfRead(prelogin: BitwardenPreloginResponse): KdfMetadata {
  return {
    kdfType: prelogin.kdf,
    iterations: prelogin.kdfIterations,
    memory: prelogin.kdfMemory,
    parallelism: prelogin.kdfParallelism,
  }
}

export async function extensionUserKeyUnlock(request: unknown): Promise<Result<Uint8Array>> {
  const op = "extensionUserKeyUnlock"
  const parsed = v.safeParse(extensionVaultUnlockRequestSchema, request)
  if (!parsed.success) {
    return resultErrorCreate(op, "Vault unlock request is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }

  const email = normalizedEmailRead(parsed.output.email)
  const token = parsed.output.token
  const unlock = token.UserDecryptionOptions.MasterPasswordUnlock
  if (!token.UserDecryptionOptions.HasMasterPassword || unlock === null) {
    return unsupportedResult(op, "Only master-password vaults are supported.")
  }

  const tokenKdf = tokenKdfRead(token)
  const unlockKdf = unlockKdfRead(token)
  if (unlockKdf === null || !kdfEqual(tokenKdf, unlockKdf)) {
    return invalidResult(op, "Token KDF metadata is inconsistent.")
  }
  if (parsed.output.prelogin !== undefined) {
    const preloginKdf = preloginKdfRead(parsed.output.prelogin)
    if (!kdfEqual(preloginKdf, topLevelPreloginKdfRead(parsed.output.prelogin)) || !kdfEqual(tokenKdf, preloginKdf)) {
      return invalidResult(op, "Prelogin and token KDF metadata is inconsistent.")
    }
    if (parsed.output.prelogin.salt !== null && normalizedEmailRead(parsed.output.prelogin.salt) !== email) {
      return invalidResult(op, "Prelogin salt does not match the account email.")
    }
  }
  if (normalizedEmailRead(unlock.Salt) !== email)
    return invalidResult(op, "Vault unlock salt does not match the account email.")
  if (unlock.MasterKeyEncryptedUserKey.length === 0) {
    if (unlock.MasterKeyWrappedUserKey.length > 0) {
      return unsupportedResult(op, "Wrapped user keys are not supported by this extension path.")
    }
    return invalidResult(op, "Token does not contain an encrypted user key.")
  }

  const masterKeyResult = await extensionMasterKeyDerive(parsed.output.password, email, tokenKdf)
  if (!masterKeyResult.success) return masterKeyResult
  const masterKey = masterKeyResult.data
  const encryptionKeyResult = await hkdfSha256Expand(masterKey, new TextEncoder().encode("enc"), 32)
  if (!encryptionKeyResult.success) {
    masterKey.fill(0)
    return resultErrorCreate(op, "Master key stretching failed.", { code: "platform.internal", statusCode: 500 })
  }
  const authenticationKeyResult = await hkdfSha256Expand(masterKey, new TextEncoder().encode("mac"), 32)
  if (!authenticationKeyResult.success) {
    masterKey.fill(0)
    encryptionKeyResult.data.fill(0)
    return resultErrorCreate(op, "Master key stretching failed.", { code: "platform.internal", statusCode: 500 })
  }
  const stretchedMasterKey = new Uint8Array(64)
  stretchedMasterKey.set(encryptionKeyResult.data)
  stretchedMasterKey.set(authenticationKeyResult.data, 32)
  masterKey.fill(0)
  encryptionKeyResult.data.fill(0)
  authenticationKeyResult.data.fill(0)

  const userKeyResult = await extensionEncStringDecrypt(unlock.MasterKeyEncryptedUserKey, stretchedMasterKey)
  stretchedMasterKey.fill(0)
  if (!userKeyResult.success) return userKeyResult
  if (userKeyResult.data.byteLength !== 64) {
    userKeyResult.data.fill(0)
    return invalidResult(op, "Vault unlock returned an invalid user key.")
  }
  return resultCreate(userKeyResult.data)
}
