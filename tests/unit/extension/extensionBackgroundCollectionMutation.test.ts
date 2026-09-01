import { expect, test } from "bun:test"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import type { ExtensionCollection } from "../../../src/extension/crypto/extensionCollectionSchema.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenEncryptedCollection } from "../../../src/shared/api/bitwardenEncryptedCollectionSchema.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

const organizationId = "organization-id"
const collectionId = "collection-id"

function storageAreaCreate(): ExtensionStorageArea {
  const values = new Map<string, unknown>()
  return {
    async get<T extends Record<string, unknown> = Record<string, unknown>>(keys?: string | string[] | null) {
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
}

function collectionCreate(overrides: Partial<ExtensionCollection> = {}): ExtensionCollection {
  return {
    id: collectionId,
    organizationId,
    name: "Team collection",
    object: "collection",
    assigned: true,
    hidePasswords: false,
    manage: true,
    readOnly: false,
    unmanaged: false,
    ...overrides,
  }
}

function encryptedCollectionCreate(
  overrides: Partial<BitwardenEncryptedCollection> = {},
): BitwardenEncryptedCollection {
  return {
    ...collectionCreate(),
    name: "2.encrypted-collection-name",
    ...overrides,
  }
}

function syncEnvelopeCreate(): BitwardenSyncEnvelope {
  return {
    profile: {
      organizations: [
        {
          id: organizationId,
          status: 2,
          type: 4,
          permissions: {
            createNewCollections: true,
            editAnyCollection: true,
            deleteAnyCollection: true,
          },
        },
      ],
    },
    folders: [],
    collections: [],
    policies: [],
    ciphers: [],
    sends: [],
    object: "sync",
  }
}

test("extension background collection commands authenticate, authorize, encrypt/decrypt, serialize, and sync once", async () => {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const storage = extensionStorageCreate(extensionStorageAdapterCreate({ local, session }))
  let unlocked = false
  const payloads = new Map<string, Uint8Array>()
  let payloadId = 0
  let syncCalls = 0
  let updateFailure = false
  let activeUpdates = 0
  let maximumActiveUpdates = 0
  const encryptedNames: string[] = []
  const decryptedNames: string[] = []
  const apiCollection = encryptedCollectionCreate()
  const vaultSession = {
    isUnlocked: () => unlocked,
    collectionEncrypt: async (collection: ExtensionCollection) => {
      const encryptedName = "2.encrypted-collection-name"
      encryptedNames.push(collection.name)
      return resultCreate({ ...collection, name: encryptedName })
    },
    collectionDecrypt: async (collection: BitwardenEncryptedCollection) => {
      decryptedNames.push(collection.name)
      return resultCreate(collectionCreate({ id: collection.id, name: "Team collection", object: collection.object }))
    },
    organizationKeysReplace: async () => resultCreate(undefined),
    collectionsDecrypt: async () => resultCreate([]),
    foldersDecrypt: async () => resultCreate([]),
    cipherDecrypt: async () => resultErrorCreate("test.cipherDecrypt", "Unexpected cipher.", { statusCode: 500 }),
    encryptedPayloadEncrypt: async (value: unknown) => {
      const id = `payload-${payloadId++}`
      payloads.set(id, new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)))
      return resultCreate({ algorithm: "test", iv: id, ciphertext: "ciphertext" })
    },
    encryptedPayloadDecrypt: async (payload: { iv?: string }) => {
      const value = payload.iv === undefined ? undefined : payloads.get(payload.iv)
      if (value === undefined) return resultErrorCreate("test.payloadDecrypt", "Missing payload.", { statusCode: 500 })
      return resultCreate(value)
    },
  }
  const apiClient = {
    revisionDate: async () => resultCreate(1_756_368_000_000),
    sync: async () => {
      syncCalls += 1
      return resultCreate(syncEnvelopeCreate())
    },
    collectionList: async () =>
      resultCreate({
        data: [apiCollection, { ...apiCollection, id: "other-collection", organizationId: "other-organization" }],
        object: "list" as const,
        continuationToken: null,
      }),
    collectionRead: async () => resultCreate(apiCollection),
    collectionCreate: async (_organization: string, request: { name: string }) => {
      expect(request.name).not.toBe("Created collection")
      return resultCreate({ ...apiCollection, id: "created-collection" })
    },
    collectionUpdate: async (_organization: string, _id: string, request: { name: string }) => {
      expect(request.name).not.toBe("Updated collection")
      activeUpdates += 1
      maximumActiveUpdates = Math.max(maximumActiveUpdates, activeUpdates)
      await new Promise((resolve) => setTimeout(resolve, 1))
      activeUpdates -= 1
      if (updateFailure)
        return resultErrorCreate("test.collectionUpdate", "The collection is stale.", {
          code: "platform.conflict",
          statusCode: 409,
        })
      return resultCreate(apiCollection)
    },
    collectionDelete: async () => resultCreate(undefined),
  }
  const service = extensionBackgroundServiceCreate({
    storage,
    vaultSession: vaultSession as never,
    alarms: { create: async () => {}, clear: async () => true, onAlarm: () => {} },
    now: () => 1_756_368_000_000,
    apiClient: apiClient as never,
  })

  expect(await service.collectionList({ organizationId })).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
  unlocked = true
  await storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1_756_368_100_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: "user@example.test",
  })
  payloads.set("seed", new TextEncoder().encode(JSON.stringify(syncEnvelopeCreate())))
  await storage.syncCacheSave({
    snapshot: { algorithm: "test", iv: "seed", ciphertext: "ciphertext" },
    ciphers: [],
    lastRevisionDate: 1,
    lastSyncedAt: 1,
  })
  syncCalls = 0

  expect(await service.collectionList({ organizationId })).toEqual({
    success: true,
    data: [collectionCreate()],
  })
  expect(await service.collectionRead({ organizationId, collectionId })).toEqual({
    success: true,
    data: collectionCreate(),
  })
  expect(
    await service.collectionCreate({
      organizationId,
      collection: collectionCreate({ id: "created-collection", name: "Created collection" }),
    }),
  ).toMatchObject({ success: true, data: { id: "created-collection", name: "Team collection" } })
  expect(
    await service.collectionUpdate({
      organizationId,
      collectionId,
      collection: collectionCreate({ name: "Updated collection" }),
    }),
  ).toMatchObject({ success: true, data: { id: collectionId, name: "Team collection" } })
  expect(await service.collectionDelete({ organizationId, collectionId })).toEqual({ success: true, data: undefined })
  expect(syncCalls).toBe(3)
  expect(encryptedNames).toEqual(["Created collection", "Updated collection"])
  expect(decryptedNames.every((name) => name !== "Team collection")).toBe(true)

  syncCalls = 0
  expect(
    await Promise.all([
      service.collectionUpdate({
        organizationId,
        collectionId,
        collection: collectionCreate({ name: "First update" }),
      }),
      service.collectionUpdate({
        organizationId,
        collectionId,
        collection: collectionCreate({ name: "Second update" }),
      }),
    ]),
  ).toHaveLength(2)
  expect(maximumActiveUpdates).toBe(1)
  expect(syncCalls).toBe(2)

  updateFailure = true
  syncCalls = 0
  expect(
    await service.collectionUpdate({
      organizationId,
      collectionId,
      collection: collectionCreate({ name: "Failed update" }),
    }),
  ).toMatchObject({ success: false, code: "platform.conflict", statusCode: 409 })
  expect(syncCalls).toBe(0)

  unlocked = false
  expect(await service.collectionDelete({ organizationId, collectionId })).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
})

test("extension background collection mutations reject read-only, unmanaged, and unassigned collections", async () => {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const storage = extensionStorageCreate(extensionStorageAdapterCreate({ local, session }))
  await storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1_756_368_100_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: "user@example.test",
  })
  let target = encryptedCollectionCreate({ readOnly: true, manage: false, unmanaged: true, assigned: true })
  const snapshot = syncEnvelopeCreate()
  await storage.syncCacheSave({
    snapshot: { algorithm: "test", iv: "snapshot", ciphertext: "ciphertext" },
    ciphers: [],
    lastRevisionDate: 1,
    lastSyncedAt: 1,
  })
  const vaultSession = {
    isUnlocked: () => true,
    collectionDecrypt: async () =>
      resultCreate(
        collectionCreate({
          readOnly: target.readOnly,
          manage: target.manage,
          unmanaged: target.unmanaged,
          assigned: target.assigned,
          hidePasswords: true,
        }),
      ),
    encryptedPayloadDecrypt: async () => resultCreate(new TextEncoder().encode(JSON.stringify(snapshot))),
  }
  const service = extensionBackgroundServiceCreate({
    storage,
    vaultSession: vaultSession as never,
    alarms: { create: async () => {}, clear: async () => true, onAlarm: () => {} },
    now: () => 1_756_368_000_000,
    apiClient: {
      revisionDate: async () => resultCreate(1),
      collectionRead: async () => resultCreate(target),
      collectionUpdate: async () => resultCreate(target),
      collectionDelete: async () => resultCreate(undefined),
    } as never,
  })

  expect(
    await service.collectionUpdate({ organizationId, collectionId, collection: collectionCreate() }),
  ).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
  expect(await service.collectionDelete({ organizationId, collectionId })).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
  target = { ...target, assigned: false }
  expect(await service.collectionRead({ organizationId, collectionId })).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
})
