import { expect, test } from "bun:test"
import { extensionBiometricAdapterCreate } from "../../../src/extension/biometric/extensionBiometricAdapterCreate.js"
import { extensionBiometricCapabilityRead } from "../../../src/extension/biometric/extensionBiometricCapabilityRead.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import { extensionStorageKeys } from "../../../src/extension/storage/extensionStorageKeys.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"

function storageCreate() {
  const values = new Map<string, unknown>()
  const area: ExtensionStorageArea = {
    async get<T extends Record<string, unknown> = Record<string, unknown>>(
      keys?: string | string[] | null,
    ): Promise<T> {
      const requestedKeys =
        keys === undefined || keys === null ? [...values.keys()] : typeof keys === "string" ? [keys] : keys
      const result: Record<string, unknown> = {}
      for (const key of requestedKeys) {
        const value = values.get(key)
        if (value !== undefined) result[key] = value
      }
      return result as T
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) values.set(key, value)
    },
    async remove(keys) {
      for (const key of typeof keys === "string" ? [keys] : keys) values.delete(key)
    },
  }
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: area, session: area })
  return { values, storage: extensionStorageCreate(adapter) }
}

function biometricPlatformCreate() {
  const credentialIds = [Uint8Array.from([1, 2, 3, 4]), Uint8Array.from([5, 6, 7, 8])]
  const prfOutput = Uint8Array.from({ length: 32 }, (_, index) => index + 1)
  let credentialCreateCount = 0
  let lastGetSalt: Uint8Array | null = null
  let activeCredentialId: Uint8Array | null = null
  const credentials = {
    async create() {
      const rawId = credentialIds[credentialCreateCount] ?? credentialIds[0]
      credentialCreateCount += 1
      activeCredentialId = rawId
      return {
        rawId: rawId.slice().buffer,
        getClientExtensionResults: () => ({ prf: { enabled: true } }),
      }
    },
    async get(options: unknown) {
      const publicKey = (options as { publicKey: { extensions: { prf: { eval: { first: ArrayBuffer } } } } }).publicKey
      lastGetSalt = new Uint8Array(publicKey.extensions.prf.eval.first)
      return {
        rawId: activeCredentialId?.slice().buffer,
        getClientExtensionResults: () => ({ prf: { results: { first: prfOutput.slice().buffer } } }),
      }
    },
  }
  const publicKeyCredential = {
    isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
    getClientCapabilities: async () => ({ prf: true }),
  }
  return {
    credentials,
    publicKeyCredential,
    prfOutput,
    getSaltRead: () => lastGetSalt,
  }
}

test("extension biometric capability detection requires a platform authenticator and WebAuthn PRF", async () => {
  const missingResult = await extensionBiometricCapabilityRead({})
  expect(missingResult).toEqual({ success: true, data: { status: "unsupported" } })

  const credentials = { create: () => Promise.resolve(null), get: () => Promise.resolve(null) }
  const unavailableResult = await extensionBiometricCapabilityRead({
    credentials,
    publicKeyCredential: {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => false,
      getClientCapabilities: async () => ({ prf: true }),
    },
  })
  expect(unavailableResult).toEqual({ success: true, data: { status: "unavailable" } })

  const noPrfResult = await extensionBiometricCapabilityRead({
    credentials,
    publicKeyCredential: {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      getClientCapabilities: async () => ({ prf: false }),
    },
  })
  expect(noPrfResult).toEqual({ success: true, data: { status: "unsupported" } })

  const availableResult = await extensionBiometricCapabilityRead({
    credentials,
    publicKeyCredential: {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      getClientCapabilities: async () => ({ prf: true }),
    },
  })
  expect(availableResult).toEqual({
    success: true,
    data: { status: "available", platformAuthenticator: true, prf: true },
  })
})

test("extension biometric enrollment wraps only the user key and supports authenticated unwrap", async () => {
  const { storage, values } = storageCreate()
  const platform = biometricPlatformCreate()
  const adapter = extensionBiometricAdapterCreate({
    storage,
    credentials: platform.credentials,
    publicKeyCredential: platform.publicKeyCredential,
    rpId: "extension.example",
    origin: "chrome-extension://extension-id",
    now: () => 1_756_368_000_000,
  })
  const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)

  const invalidEnrollResult = await adapter.enroll("user-id", new Uint8Array(63))
  expect(invalidEnrollResult.success).toBe(false)
  expect(values.has(extensionStorageKeys.biometricEnrollment)).toBe(false)

  const enrollResult = await adapter.enroll("user-id", userKey)
  expect(enrollResult.success).toBe(true)
  if (!enrollResult.success) return
  const stored = values.get(extensionStorageKeys.biometricEnrollment)
  expect(stored).toMatchObject({
    schemaVersion: 1,
    userId: "user-id",
    rpId: "extension.example",
    origin: "chrome-extension://extension-id",
  })
  expect(JSON.stringify(stored)).not.toContain(base64UrlEncode(userKey))
  expect(stored).not.toHaveProperty("userKey")
  expect(stored).not.toHaveProperty("prfOutput")

  const unwrapResult = await adapter.unwrap("user-id")
  expect(unwrapResult).toEqual({ success: true, data: userKey })
  const storedRecord = stored as { salt: string }
  expect(platform.getSaltRead()).not.toBeNull()
  expect(base64UrlEncode(platform.getSaltRead() as Uint8Array)).toBe(storedRecord.salt)

  platform.prfOutput[0] ^= 0xff
  const wrongPrfResult = await adapter.unwrap("user-id")
  expect(wrongPrfResult.success).toBe(false)

  platform.prfOutput[0] ^= 0xff
  const mutableStored = stored as { ciphertext: string }
  const originalCiphertext = mutableStored.ciphertext
  mutableStored.ciphertext = `${originalCiphertext.slice(0, -1)}${originalCiphertext.endsWith("A") ? "B" : "A"}`
  const tamperedResult = await adapter.unwrap("user-id")
  expect(tamperedResult.success).toBe(false)
  mutableStored.ciphertext = originalCiphertext
})

test("extension biometric replacement invalidates the prior wrapped-key record and revocation is idempotent", async () => {
  const { storage, values } = storageCreate()
  const platform = biometricPlatformCreate()
  const adapter = extensionBiometricAdapterCreate({
    storage,
    credentials: platform.credentials,
    publicKeyCredential: platform.publicKeyCredential,
    rpId: "extension.example",
    origin: "chrome-extension://extension-id",
    now: () => 1_756_368_000_000,
  })
  const firstKey = Uint8Array.from({ length: 64 }, (_, index) => index)
  const secondKey = Uint8Array.from({ length: 64 }, (_, index) => 255 - index)

  expect((await adapter.enroll("user-id", firstKey)).success).toBe(true)
  const firstRecord = values.get(extensionStorageKeys.biometricEnrollment)
  expect((await adapter.enroll("user-id", secondKey)).success).toBe(true)
  const secondRecord = values.get(extensionStorageKeys.biometricEnrollment)
  expect(secondRecord).not.toEqual(firstRecord)
  expect((await adapter.revoke("user-id")).success).toBe(true)
  expect(values.has(extensionStorageKeys.biometricEnrollment)).toBe(false)
  expect(await adapter.revoke("user-id")).toEqual({ success: true, data: undefined })
})
