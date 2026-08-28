import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { bitwardenPasswordTokenResponseSchema } from "../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import { bitwardenPreloginResponseSchema } from "../../shared/api/bitwardenPreloginResponseSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionPersonalLoginCipherDecrypt } from "../crypto/extensionPersonalLoginCipherDecrypt.js"
import { extensionPersonalLoginCipherEncrypt } from "../crypto/extensionPersonalLoginCipherEncrypt.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionEncryptedPayloadDecrypt } from "../crypto/extensionEncryptedPayloadDecrypt.js"
import { extensionEncryptedPayloadEncrypt } from "../crypto/extensionEncryptedPayloadEncrypt.js"
import type { ExtensionEncryptedPayload } from "../storage/extensionEncryptedPayloadSchema.js"
import { extensionUserKeyUnlock } from "../crypto/extensionUserKeyUnlock.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"

const extensionVaultUnlockRequestSchema = v.object({
  email: v.pipe(v.string(), v.minLength(1)),
  password: v.pipe(v.string(), v.minLength(1)),
  prelogin: v.optional(bitwardenPreloginResponseSchema),
  token: bitwardenPasswordTokenResponseSchema,
})

type ExtensionStorage = ReturnType<typeof extensionStorageCreate>

export function extensionVaultSessionCreate(storage: ExtensionStorage, now: () => number = Date.now) {
  let userKey: Uint8Array | null = null
  let operationChain: Promise<void> = Promise.resolve()

  const clearUserKey = (): void => {
    userKey?.fill(0)
    userKey = null
  }

  const operationRun = <T>(operation: () => Promise<Result<T>>): Promise<Result<T>> => {
    const result = operationChain.then(operation, operation)
    operationChain = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const isUnlocked = (): boolean => userKey !== null

  const unlock = (request: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionVaultSession.unlock"
      const parsed = v.safeParse(extensionVaultUnlockRequestSchema, request)
      if (!parsed.success) {
        return resultErrorCreate(op, "Vault unlock request is invalid.", {
          code: "platform.invalid-request",
          statusCode: 400,
          errorData: v.summarize(parsed.issues),
        })
      }
      const userKeyResult = await extensionUserKeyUnlock(parsed.output)
      if (!userKeyResult.success) return userKeyResult
      const stateResult = await storage.sessionStateSave({ status: "unlocked", unlockedAt: now() })
      if (!stateResult.success) {
        userKeyResult.data.fill(0)
        return stateResult
      }
      clearUserKey()
      userKey = userKeyResult.data
      return resultCreate(undefined)
    })

  const lock = (): Promise<Result<void>> =>
    operationRun(async () => {
      clearUserKey()
      return storage.lock()
    })

  const logout = (): Promise<Result<void>> =>
    operationRun(async () => {
      clearUserKey()
      return storage.logout()
    })

  const personalLoginCipherDecrypt = (
    cipher: BitwardenEncryptedLoginCipher,
  ): Promise<Result<ExtensionPersonalLoginCipher>> =>
    operationRun(async () => {
      if (userKey === null) {
        return resultErrorCreate("extensionVaultSession.personalLoginCipherDecrypt", "Vault is locked.", {
          code: "platform.unauthorized",
          statusCode: 401,
        })
      }
      return extensionPersonalLoginCipherDecrypt(cipher, userKey)
    })

  const personalLoginCipherEncrypt = (
    cipher: ExtensionPersonalLoginCipher,
  ): Promise<Result<BitwardenEncryptedLoginCipher>> =>
    operationRun(async () => {
      if (userKey === null) {
        return resultErrorCreate("extensionVaultSession.personalLoginCipherEncrypt", "Vault is locked.", {
          code: "platform.unauthorized",
          statusCode: 401,
        })
      }
      return extensionPersonalLoginCipherEncrypt(cipher, userKey)
    })

  const encryptedPayloadEncrypt = (plaintext: unknown): Promise<Result<ExtensionEncryptedPayload>> =>
    operationRun(async () => {
      if (userKey === null) {
        return resultErrorCreate("extensionVaultSession.encryptedPayloadEncrypt", "Vault is locked.", {
          code: "platform.unauthorized",
          statusCode: 401,
        })
      }
      return extensionEncryptedPayloadEncrypt(plaintext, userKey)
    })

  const encryptedPayloadDecrypt = (payload: unknown): Promise<Result<Uint8Array>> =>
    operationRun(async () => {
      if (userKey === null) {
        return resultErrorCreate("extensionVaultSession.encryptedPayloadDecrypt", "Vault is locked.", {
          code: "platform.unauthorized",
          statusCode: 401,
        })
      }
      return extensionEncryptedPayloadDecrypt(payload, userKey)
    })

  return {
    isUnlocked,
    unlock,
    lock,
    logout,
    personalLoginCipherDecrypt,
    personalLoginCipherEncrypt,
    encryptedPayloadEncrypt,
    encryptedPayloadDecrypt,
  }
}
