import { expect, test } from "bun:test"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { type ExtensionAuthSession } from "../../../src/extension/storage/extensionAuthSessionStorageSchema.js"
import { type ExtensionCreateDraft } from "../../../src/extension/storage/extensionCreateDraftStorageSchema.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import { extensionStorageKeys } from "../../../src/extension/storage/extensionStorageKeys.js"
import type { ExtensionSyncStorage } from "../../../src/extension/storage/extensionSyncStorageSchema.js"

function storageAreaCreate() {
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
  return { area, values }
}

function storageCreate() {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({
    local: local.area,
    session: session.area,
  })
  return { local, session, storage: extensionStorageCreate(adapter) }
}

const authSession: ExtensionAuthSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 1_756_368_000_000,
  tokenType: "Bearer",
  scope: "api offline_access",
  accountId: "account-id",
  email: "user@example.com",
}

const encryptedPayload = {
  algorithm: "AES-GCM",
  iv: "base64-iv",
  ciphertext: "base64-ciphertext",
}

const syncCache: ExtensionSyncStorage = {
  snapshot: encryptedPayload,
  ciphers: [{ id: "cipher-id", revisionDate: "2026-08-28T00:00:00.000Z", payload: encryptedPayload }],
  lastRevisionDate: 1_756_368_000_000,
  lastSyncedAt: 1_756_368_000_001,
}

const createDraft: ExtensionCreateDraft = {
  id: "draft-id",
  updatedAt: 1_756_368_000_002,
  payload: encryptedPayload,
}

test("extensionStorageCreate keeps settings/cache durable and auth/session state in session storage", async () => {
  const { local, session, storage } = storageCreate()

  expect(await storage.environmentSettingsSave("eu")).toEqual({ success: true, data: undefined })
  expect(await storage.authSessionSave(authSession)).toEqual({ success: true, data: undefined })
  expect(await storage.sessionStateSave({ status: "unlocked", unlockedAt: 1_756_368_000_003 })).toEqual({
    success: true,
    data: undefined,
  })
  expect(await storage.syncCacheSave(syncCache)).toEqual({ success: true, data: undefined })
  expect(await storage.createDraftSave(createDraft)).toEqual({ success: true, data: undefined })

  expect(local.values.has(extensionStorageKeys.authSession)).toBe(false)
  expect(session.values.has(extensionStorageKeys.authSession)).toBe(true)
  expect(await storage.environmentSettingsLoad()).toEqual({ success: true, data: "eu" })
  expect(await storage.authSessionLoad()).toEqual({ success: true, data: authSession })
  expect(await storage.sessionStateLoad()).toEqual({
    success: true,
    data: { status: "unlocked", unlockedAt: 1_756_368_000_003 },
  })
  expect(await storage.syncCacheLoad()).toEqual({ success: true, data: syncCache })
  expect(await storage.createDraftsLoad()).toEqual({ success: true, data: [createDraft] })
})

test("extensionStorageCreate only accepts opaque encrypted payloads for sync data and drafts", async () => {
  const { local, storage } = storageCreate()
  const invalidSync = {
    ...syncCache,
    ciphers: [{ id: "cipher-id", revisionDate: "revision", password: "decrypted password" }],
  } as unknown as ExtensionSyncStorage
  const invalidDraft = {
    ...createDraft,
    password: "decrypted password",
    fields: [{ value: "decrypted field" }],
  } as unknown as ExtensionCreateDraft

  expect(await storage.syncCacheSave(invalidSync)).toMatchObject({
    success: false,
    code: "platform.invalid-request",
    statusCode: 400,
  })
  expect(await storage.createDraftSave(invalidDraft)).toMatchObject({
    success: false,
    code: "platform.invalid-request",
    statusCode: 400,
  })
  expect(local.values.has(extensionStorageKeys.syncCache)).toBe(false)
  expect(local.values.has(extensionStorageKeys.createDrafts)).toBe(false)
})

test("extensionStorageCreate rejects unknown stored schema versions without throwing", async () => {
  const { local, storage } = storageCreate()
  local.values.set(extensionStorageKeys.syncCache, {
    schemaVersion: 99,
    ...syncCache,
  })

  expect(await storage.syncCacheLoad()).toMatchObject({
    success: false,
    code: "platform.internal",
    statusCode: 500,
  })
})

test("extensionStorageCreate locks only the unlock state and logout clears session and user cache but keeps settings", async () => {
  const { local, session, storage } = storageCreate()
  await storage.environmentSettingsSave("us")
  await storage.lockPolicySave({ action: "logout", timeoutMinutes: 15 })
  await storage.authSessionSave(authSession)
  await storage.sessionStateSave({ status: "unlocked", unlockedAt: 1_756_368_000_003 })
  await storage.syncCacheSave(syncCache)
  await storage.createDraftSave(createDraft)

  expect(await storage.lock()).toEqual({ success: true, data: undefined })
  expect(session.values.has(extensionStorageKeys.authSession)).toBe(true)
  expect(session.values.has(extensionStorageKeys.sessionState)).toBe(false)
  expect(local.values.has(extensionStorageKeys.syncCache)).toBe(true)
  expect(local.values.has(extensionStorageKeys.createDrafts)).toBe(true)

  await storage.sessionStateSave({ status: "unlocked", unlockedAt: 1_756_368_000_004 })
  expect(await storage.logout()).toEqual({ success: true, data: undefined })
  expect(session.values.has(extensionStorageKeys.authSession)).toBe(false)
  expect(session.values.has(extensionStorageKeys.sessionState)).toBe(false)
  expect(local.values.has(extensionStorageKeys.syncCache)).toBe(false)
  expect(local.values.has(extensionStorageKeys.createDrafts)).toBe(false)
  expect(await storage.environmentSettingsLoad()).toEqual({ success: true, data: "us" })
  expect(await storage.lockPolicyLoad()).toEqual({ success: true, data: { action: "logout", timeoutMinutes: 15 } })
})

test("extensionStorageCreate converts storage failures into Results", async () => {
  const failingArea: ExtensionStorageArea = {
    async get() {
      throw new Error("read failed")
    },
    async set() {
      throw new Error("write failed")
    },
    async remove() {
      throw new Error("remove failed")
    },
  }
  const storage = extensionStorageCreate({ local: failingArea, session: failingArea })

  expect(await storage.environmentSettingsLoad()).toMatchObject({ success: false, code: "platform.unavailable" })
  expect(await storage.environmentSettingsSave("us")).toMatchObject({ success: false, code: "platform.unavailable" })
  expect(await storage.logout()).toMatchObject({ success: false, code: "platform.unavailable" })
})
