import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { SessionHandoffOperation } from "../../shared/sessionHandoff/sessionHandoffOperationSchema.js"
import { sessionHandoffUserKeyEncrypt } from "../../shared/sessionHandoff/sessionHandoffUserKeyEncrypt.js"
import { extensionVaultUnlockRequestSchema } from "../extensionVaultUnlockRequestSchema.js"
import { extensionOrganizationKeyDecrypt } from "../crypto/extensionOrganizationKeyDecrypt.js"
import { extensionPersonalLoginCipherDecrypt } from "../crypto/extensionPersonalLoginCipherDecrypt.js"
import { extensionPersonalLoginCipherEncrypt } from "../crypto/extensionPersonalLoginCipherEncrypt.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionEncryptedPayloadDecrypt } from "../crypto/extensionEncryptedPayloadDecrypt.js"
import { extensionEncryptedPayloadEncrypt } from "../crypto/extensionEncryptedPayloadEncrypt.js"
import type { ExtensionEncryptedPayload } from "../storage/extensionEncryptedPayloadSchema.js"
import { extensionUserKeyUnlock } from "../crypto/extensionUserKeyUnlock.js"
import { extensionUserPrivateKeyDecrypt } from "../crypto/extensionUserPrivateKeyDecrypt.js"
import { extensionProfileSchema } from "../crypto/extensionProfileSchema.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"

type ExtensionStorage = ReturnType<typeof extensionStorageCreate>

export function extensionVaultSessionCreate(storage: ExtensionStorage, now: () => number = Date.now) {
  let userKey: Uint8Array | null = null
  let userPrivateKey: Uint8Array | null = null
  let organizationKeys = new Map<string, Uint8Array>()
  let operationChain: Promise<void> = Promise.resolve()

  const clearUserKey = (): void => {
    userKey?.fill(0)
    userPrivateKey?.fill(0)
    for (const key of organizationKeys.values()) key.fill(0)
    userKey = null
    userPrivateKey = null
    organizationKeys = new Map()
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
      const accountPrivateKey = parsed.output.token.AccountKeys?.publicKeyEncryptionKeyPair.wrappedPrivateKey
      const encryptedPrivateKey =
        accountPrivateKey !== undefined && accountPrivateKey !== null && accountPrivateKey.length > 0
          ? accountPrivateKey
          : parsed.output.token.PrivateKey
      let userPrivateKeyResult: Result<Uint8Array> | null = null
      if (encryptedPrivateKey !== null && encryptedPrivateKey !== undefined && encryptedPrivateKey.length > 0) {
        userPrivateKeyResult = await extensionUserPrivateKeyDecrypt(encryptedPrivateKey, userKeyResult.data)
        if (!userPrivateKeyResult.success) {
          userKeyResult.data.fill(0)
          return userPrivateKeyResult
        }
      }
      const privateKeyBytes = userPrivateKeyResult?.success ? userPrivateKeyResult.data : null
      const stateResult = await storage.sessionStateSave({ status: "unlocked", unlockedAt: now() })
      if (!stateResult.success) {
        userKeyResult.data.fill(0)
        privateKeyBytes?.fill(0)
        return stateResult
      }
      clearUserKey()
      userKey = userKeyResult.data
      userPrivateKey = privateKeyBytes
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
      return extensionPersonalLoginCipherDecrypt(cipher, userKey, organizationKeys)
    })

  const organizationKeysReplace = (profile: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionVaultSession.organizationKeysReplace"
      if (userKey === null) {
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      }
      const parsed = v.safeParse(extensionProfileSchema, profile)
      if (!parsed.success) {
        return resultErrorCreate(op, "Sync profile is invalid.", {
          code: "platform.invalid-request",
          statusCode: 400,
          errorData: v.summarize(parsed.issues),
        })
      }
      const nextKeys = new Map<string, Uint8Array>()
      for (const organization of parsed.output.organizations) {
        if (organization.status !== 2) continue
        if (organization.key === undefined || organization.key === null || organization.key.length === 0) continue
        if (userPrivateKey === null) {
          return resultErrorCreate(op, "Organization private key is unavailable.", {
            code: "platform.unauthorized",
            statusCode: 401,
          })
        }
        const keyResult = await extensionOrganizationKeyDecrypt(organization.key, userPrivateKey)
        if (!keyResult.success) return keyResult
        nextKeys.set(organization.id, keyResult.data)
      }
      for (const key of organizationKeys.values()) key.fill(0)
      organizationKeys = nextKeys
      return resultCreate(undefined)
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

  const sessionHandoffEncrypt = (operation: SessionHandoffOperation, cipherId: string | null) =>
    operationRun(async () => {
      if (userKey === null) {
        return resultErrorCreate("extensionVaultSession.sessionHandoffEncrypt", "Vault is locked.", {
          code: "platform.unauthorized",
          statusCode: 401,
        })
      }
      return sessionHandoffUserKeyEncrypt(userKey, operation, cipherId)
    })

  return {
    isUnlocked,
    unlock,
    lock,
    logout,
    personalLoginCipherDecrypt,
    organizationKeysReplace,
    personalLoginCipherEncrypt,
    encryptedPayloadEncrypt,
    encryptedPayloadDecrypt,
    sessionHandoffEncrypt,
  }
}
