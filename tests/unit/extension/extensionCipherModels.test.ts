import { expect, test } from "bun:test"
import * as v from "valibot"
import { extensionCipherDecrypt } from "../../../src/extension/crypto/extensionCipherDecrypt.js"
import { extensionCipherEncrypt } from "../../../src/extension/crypto/extensionCipherEncrypt.js"
import { extensionCollectionDecrypt } from "../../../src/extension/crypto/extensionCollectionDecrypt.js"
import { extensionCollectionEncrypt } from "../../../src/extension/crypto/extensionCollectionEncrypt.js"
import { extensionFolderDecrypt } from "../../../src/extension/crypto/extensionFolderDecrypt.js"
import { extensionFolderEncrypt } from "../../../src/extension/crypto/extensionFolderEncrypt.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import { extensionStorageKeys } from "../../../src/extension/storage/extensionStorageKeys.js"
import { extensionSyncStorageMigrate } from "../../../src/extension/storage/extensionSyncStorageMigrate.js"
import { extensionSyncStorageSchemaVersion } from "../../../src/extension/storage/extensionSyncStorageSchemaVersion.js"
import { bitwardenEncryptedCipherSchema } from "../../../src/shared/api/bitwardenEncryptedCipherSchema.js"

const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)

function cipherCreate(type: 2 | 3 | 4 | 5) {
  return {
    object: "cipherDetails" as const,
    id: `cipher-${type}`,
    type,
    creationDate: "2026-08-31T00:00:00.000Z",
    revisionDate: "2026-08-31T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: "folder-id",
    name: `Example ${type}`,
    notes: "private notes",
    favorite: true,
    collectionIds: ["collection-id"],
    fields: [{ name: "field name", value: "field value", type: 0, linkedId: null }],
    attachments: [
      {
        id: "attachment-id",
        fileName: "private.txt",
        key: "attachment-key",
        size: "10",
        sizeName: "10 bytes",
        url: "https://example.test/attachment",
      },
    ],
    passwordHistory: [{ password: "old password", lastUsedDate: "2026-08-30T00:00:00.000Z" }],
    ...(type === 2 ? { secureNote: { type: 0 } } : {}),
    ...(type === 3
      ? {
          card: {
            cardholderName: "Alice Example",
            brand: "Visa",
            number: "4111111111111111",
            expMonth: "12",
            expYear: "2030",
            code: "123",
          },
        }
      : {}),
    ...(type === 4
      ? {
          identity: {
            firstName: "Alice",
            lastName: "Example",
            email: "alice@example.test",
            passportNumber: "passport-secret",
          },
        }
      : {}),
    ...(type === 5
      ? {
          sshKey: {
            privateKey: "private-key",
            publicKey: "public-key",
            keyFingerprint: "fingerprint",
          },
        }
      : {}),
  }
}

function storageAreaCreate() {
  const values = new Map<string, unknown>()
  const area: ExtensionStorageArea = {
    async get<T extends Record<string, unknown> = Record<string, unknown>>(key?: string | string[] | null) {
      const keys = key === undefined || key === null ? [...values.keys()] : typeof key === "string" ? [key] : key
      const result: Record<string, unknown> = {}
      for (const currentKey of keys) {
        const value = values.get(currentKey)
        if (value !== undefined) result[currentKey] = value
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
  return { area, values }
}

test("extensionCipherEncrypt encrypts and decrypts every non-login cipher family and nested secrets", async () => {
  for (const type of [2, 3, 4, 5] as const) {
    const plainCipher = cipherCreate(type)
    const encryptedResult = await extensionCipherEncrypt(plainCipher, userKey)
    expect(encryptedResult.success).toBe(true)
    if (!encryptedResult.success) continue
    expect(JSON.stringify(encryptedResult.data)).not.toContain("private notes")
    expect(JSON.stringify(encryptedResult.data)).not.toContain("private-key")
    expect(JSON.stringify(encryptedResult.data)).not.toContain("old password")

    const decryptedResult = await extensionCipherDecrypt(encryptedResult.data, userKey)
    expect(decryptedResult).toEqual({ success: true, data: plainCipher })
  }
})

test("extension generic cipher crypto uses the organization key without changing login behavior", async () => {
  const plainCipher = { ...cipherCreate(3), organizationId: "organization-id" }
  const organizationKeys = new Map([["organization-id", userKey]])
  const encryptedResult = await extensionCipherEncrypt(plainCipher, userKey, organizationKeys)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  const decryptedResult = await extensionCipherDecrypt(encryptedResult.data, userKey, organizationKeys)
  expect(decryptedResult).toEqual({ success: true, data: plainCipher })
  expect(await extensionCipherDecrypt(encryptedResult.data, userKey)).toMatchObject({
    success: false,
    code: "platform.unauthorized",
  })
})

test("extension folder and collection models encrypt their names with the correct key", async () => {
  const folder = { id: "folder-id", name: "Private folder", revisionDate: "2026-08-31T00:00:00.000Z", object: "folder" as const }
  const folderEncrypted = await extensionFolderEncrypt(folder, userKey)
  expect(folderEncrypted.success).toBe(true)
  if (!folderEncrypted.success) return
  expect(folderEncrypted.data.name).not.toBe(folder.name)
  expect(await extensionFolderDecrypt(folderEncrypted.data, userKey)).toEqual({ success: true, data: folder })

  const collection = {
    id: "collection-id",
    organizationId: "organization-id",
    name: "Private collection",
    object: "collection" as const,
    hidePasswords: true,
    readOnly: true,
  }
  const organizationKeys = new Map([[collection.organizationId, userKey]])
  const collectionEncrypted = await extensionCollectionEncrypt(collection, organizationKeys)
  expect(collectionEncrypted.success).toBe(true)
  if (!collectionEncrypted.success) return
  expect(collectionEncrypted.data.name).not.toBe(collection.name)
  expect(await extensionCollectionDecrypt(collectionEncrypted.data, organizationKeys)).toEqual({
    success: true,
    data: collection,
  })
})

test("extension sync storage migrates login-only version one caches and rejects unknown versions", () => {
  const encryptedPayload = { algorithm: "AES-GCM", iv: "base64-iv", ciphertext: "base64-ciphertext" }
  const legacy = {
    schemaVersion: 1,
    snapshot: encryptedPayload,
    ciphers: [{ id: "login-id", revisionDate: "2026-08-31T00:00:00.000Z", payload: encryptedPayload }],
    lastRevisionDate: 10,
    lastSyncedAt: 11,
  }
  expect(extensionSyncStorageMigrate(legacy)).toEqual({
    success: true,
    data: {
      snapshot: encryptedPayload,
      ciphers: [{ ...legacy.ciphers[0], type: 1 }],
      lastRevisionDate: 10,
      lastSyncedAt: 11,
    },
  })
  expect(extensionSyncStorageMigrate({ ...legacy, schemaVersion: 99 })).toMatchObject({
    success: false,
    code: "platform.internal",
  })
})

test("extension storage persists migrated sync caches at the current version without plaintext", async () => {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  const storage = extensionStorageCreate(adapter)
  const payload = { algorithm: "AES-GCM", iv: "iv", ciphertext: "ciphertext" }
  local.values.set(extensionStorageKeys.syncCache, {
    schemaVersion: 1,
    snapshot: payload,
    ciphers: [{ id: "login-id", revisionDate: "revision", payload }],
    lastRevisionDate: 1,
    lastSyncedAt: 2,
  })

  const result = await storage.syncCacheLoad()
  expect(result).toMatchObject({ success: true, data: { ciphers: [{ id: "login-id", type: 1 }] } })
  expect(local.values.get(extensionStorageKeys.syncCache)).toMatchObject({ schemaVersion: extensionSyncStorageSchemaVersion })
  expect(JSON.stringify(local.values.get(extensionStorageKeys.syncCache))).not.toContain("password")
})

test("encrypted cipher schema keeps type discriminators and rejects mismatched payloads", () => {
  for (const type of [2, 3, 4, 5] as const) {
    const parsed = v.safeParse(bitwardenEncryptedCipherSchema, {
      ...cipherCreate(type),
      name: "2.fake|cipher|value",
      notes: null,
    })
    expect(parsed.success).toBe(true)
  }
  expect(
    v.safeParse(bitwardenEncryptedCipherSchema, {
      ...cipherCreate(2),
      type: 3,
      card: null,
    }).success,
  ).toBe(false)
})
