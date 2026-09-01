import { expect, test } from "bun:test"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import { extensionFolderEncrypt } from "../../../src/extension/crypto/extensionFolderEncrypt.js"
import { extensionVaultSessionCreate } from "../../../src/extension/session/extensionVaultSessionCreate.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenEncryptedFolder } from "../../../src/shared/api/bitwardenEncryptedFolderSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"

const passwordLogin = fixtures.passwordLogin
const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)
const nowValue = 1_756_368_000_000

const prelogin: BitwardenPreloginResponse = {
  kdf: 0,
  kdfIterations: 1,
  kdfMemory: null,
  kdfParallelism: null,
  kdfSettings: { iterations: 1, kdfType: 0, memory: null, parallelism: null },
  salt: null,
}

const token: BitwardenPasswordTokenResponse = {
  access_token: "access-token",
  expires_in: 3600,
  token_type: "Bearer",
  refresh_token: "refresh-token",
  PrivateKey: null,
  Kdf: 0,
  KdfIterations: 1,
  KdfMemory: null,
  KdfParallelism: null,
  ResetMasterPassword: false,
  ForcePasswordReset: false,
  MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
  scope: "api offline_access",
  AccountKeys: null,
  UserDecryptionOptions: {
    HasMasterPassword: true,
    MasterPasswordUnlock: {
      Kdf: { KdfType: 0, Iterations: 1, Memory: null, Parallelism: null },
      MasterKeyEncryptedUserKey: passwordLogin.userKeyEnc,
      MasterKeyWrappedUserKey: "",
      Salt: passwordLogin.email,
    },
    Object: "userDecryptionOptions",
  },
}

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

function syncEnvelopeCreate(folders: BitwardenEncryptedFolder[] = []): BitwardenSyncEnvelope {
  return { profile: {}, folders, collections: [], policies: [], ciphers: [], sends: [], object: "sync" }
}

test("extension background folder commands authenticate, encrypt/decrypt, authorize targets, and sync writes once", async () => {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const storage = extensionStorageCreate(extensionStorageAdapterCreate({ local, session }))
  const vaultSession = extensionVaultSessionCreate(storage, () => nowValue)
  const initialFolder = { id: "folder-id", name: "Private folder", object: "folder" as const }
  const encryptedInitialResult = await extensionFolderEncrypt(initialFolder, userKey)
  expect(encryptedInitialResult.success).toBe(true)
  if (!encryptedInitialResult.success) return

  let storedFolder = encryptedInitialResult.data
  let syncCalls = 0
  const createBodies: unknown[] = []
  const updateBodies: unknown[] = []
  let activeUpdates = 0
  let maximumActiveUpdates = 0
  let updateFailure = false
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate(token),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => {
      syncCalls += 1
      return resultCreate(syncEnvelopeCreate([storedFolder]))
    },
    folderList: async () => resultCreate({ data: [storedFolder], object: "list" as const, continuationToken: null }),
    folderRead: async () => resultCreate(storedFolder),
    folderCreate: async (folder: { id?: string | null; name: string }) => {
      createBodies.push(folder)
      storedFolder = { ...folder, id: "created-folder", object: "folder" }
      return resultCreate(storedFolder)
    },
    folderUpdate: async (folderId: string, folder: { id?: string | null; name: string }) => {
      updateBodies.push(folder)
      activeUpdates += 1
      maximumActiveUpdates = Math.max(maximumActiveUpdates, activeUpdates)
      await new Promise((resolve) => setTimeout(resolve, 1))
      if (updateFailure) {
        activeUpdates -= 1
        return resultErrorCreate("test.folderUpdate", "The folder is stale.", {
          code: "platform.conflict",
          statusCode: 409,
        })
      }
      storedFolder = { ...folder, id: folderId, object: "folder" }
      activeUpdates -= 1
      return resultCreate(storedFolder)
    },
    folderDelete: async () => resultCreate(undefined),
  }
  const service = extensionBackgroundServiceCreate({
    storage,
    vaultSession,
    alarms: { create: async () => {}, clear: async () => true, onAlarm: () => {} },
    now: () => nowValue,
    apiClient,
  })

  expect(await service.folderList({})).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  expect(await service.folderList({})).toEqual({
    success: true,
    data: [initialFolder],
  })
  expect(await service.folderRead({ folderId: initialFolder.id })).toEqual({ success: true, data: initialFolder })
  expect(await service.folderCreate({ folder: { id: "new-folder", name: "New folder" } })).toMatchObject({
    success: true,
    data: { id: "created-folder", name: "New folder" },
  })
  expect(
    await service.folderUpdate({
      folderId: "created-folder",
      folder: { ...initialFolder, id: "created-folder" },
    }),
  ).toMatchObject({
    success: true,
    data: { id: "created-folder", name: initialFolder.name },
  })
  expect(await service.folderDelete({ folderId: "created-folder" })).toMatchObject({ success: true })
  expect(syncCalls).toBe(3)
  expect(JSON.stringify(createBodies)).not.toContain("New folder")
  expect(JSON.stringify(updateBodies)).not.toContain("Private folder")
  syncCalls = 0
  expect(
    await Promise.all([
      service.folderUpdate({ folderId: "created-folder", folder: { ...initialFolder, id: "created-folder" } }),
      service.folderUpdate({ folderId: "created-folder", folder: { ...initialFolder, id: "created-folder" } }),
    ]),
  ).toHaveLength(2)
  expect(maximumActiveUpdates).toBe(1)
  expect(syncCalls).toBe(2)

  expect(await service.folderRead({ folderId: "requested-folder" })).toMatchObject({
    success: false,
    code: "platform.internal",
    statusCode: 500,
  })
  updateFailure = true
  syncCalls = 0
  expect(
    await service.folderUpdate({
      folderId: "created-folder",
      folder: { ...initialFolder, id: "created-folder" },
    }),
  ).toMatchObject({
    success: false,
    code: "platform.conflict",
    statusCode: 409,
  })
  expect(syncCalls).toBe(0)
  expect((await service.lock()).success).toBe(true)
  expect(await service.folderList({})).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
})
