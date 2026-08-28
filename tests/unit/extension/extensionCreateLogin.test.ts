import { expect, test } from "bun:test"
import type { Result } from "#result"
import type { ExtensionAlarmsAdapter } from "../../../src/extension/background/extensionAlarmsAdapter.js"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import type { ExtensionPersonalLoginCipher } from "../../../src/extension/crypto/extensionPersonalLoginCipherSchema.js"
import { extensionEncStringDecryptText } from "../../../src/extension/crypto/extensionEncStringDecryptText.js"
import { extensionPersonalLoginCipherEncrypt } from "../../../src/extension/crypto/extensionPersonalLoginCipherEncrypt.js"
import { extensionVaultSessionCreate } from "../../../src/extension/session/extensionVaultSessionCreate.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenEncryptedLoginCipherCreateRequest } from "../../../src/shared/api/bitwardenEncryptedLoginCipherCreateRequestSchema.js"
import type { BitwardenEncryptedLoginCipherResponse } from "../../../src/shared/api/bitwardenEncryptedLoginCipherResponseSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenRefreshTokenResponse } from "../../../src/shared/api/bitwardenRefreshTokenResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"

const passwordLogin = fixtures.passwordLogin
const userKey = new Uint8Array(passwordLogin.userKey)
const nowValue = 1_756_368_000_000

const prelogin: BitwardenPreloginResponse = {
  kdf: 0,
  kdfIterations: 1,
  kdfMemory: null,
  kdfParallelism: null,
  kdfSettings: { iterations: 1, kdfType: 0, memory: null, parallelism: null },
  salt: null,
}

const refreshResponse: BitwardenRefreshTokenResponse = {
  access_token: "refreshed-access-token",
  expires_in: 3600,
  token_type: "Bearer",
  refresh_token: "refreshed-refresh-token",
  scope: "api offline_access",
}

function tokenCreate(): BitwardenPasswordTokenResponse {
  return {
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
}

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

function contextCreate() {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  const storage = extensionStorageCreate(adapter)
  const vaultSession = extensionVaultSessionCreate(storage, () => nowValue)
  const alarms: ExtensionAlarmsAdapter = {
    create: async () => undefined,
    clear: async () => true,
    onAlarm: () => undefined,
  }
  return { local, storage, vaultSession, alarms }
}

function plainCipherCreate(): ExtensionPersonalLoginCipher {
  return {
    object: "cipherDetails",
    id: "cipher-id",
    type: 1,
    creationDate: "2026-08-28T00:00:00.000Z",
    revisionDate: "2026-08-28T00:00:01.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: "folder-id",
    name: "Example Login",
    notes: "Private notes",
    favorite: true,
    login: {
      username: "user@example.com",
      password: "private password",
      uris: [
        { uri: "https://example.test/login", match: null },
        { uri: "https://example.test/account", match: 0 },
      ],
      uri: "https://example.test/login",
      totp: null,
    },
    fields: [
      { name: "Text field", value: "text value", type: 0, linkedId: null },
      { name: "Hidden field", value: "hidden value", type: 1, linkedId: null },
      { name: "Boolean field", value: "true", type: 2, linkedId: null },
    ],
  }
}

async function vaultUnlock(context: ReturnType<typeof contextCreate>): Promise<void> {
  const authResult = await context.storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: nowValue + 3_600_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: passwordLogin.email,
  })
  if (!authResult.success) throw new Error(authResult.errorMessage)
  const unlockResult = await context.vaultSession.unlock({
    email: passwordLogin.email,
    password: passwordLogin.password,
    token: tokenCreate(),
  })
  if (!unlockResult.success) throw new Error(unlockResult.errorMessage)
}

function syncEnvelopeCreate(cipher: BitwardenEncryptedLoginCipherResponse): BitwardenSyncEnvelope {
  return {
    profile: {},
    folders: [],
    collections: [],
    policies: [],
    ciphers: [cipher],
    sends: [],
    object: "sync",
  }
}

test("createLogin encrypts a compatible personal payload, refreshes the encrypted cache, and clears its draft", async () => {
  const context = contextCreate()
  await vaultUnlock(context)
  const encryptedCipherResult = await extensionPersonalLoginCipherEncrypt(plainCipherCreate(), userKey)
  expect(encryptedCipherResult.success).toBe(true)
  if (!encryptedCipherResult.success) return

  const createdRequests: BitwardenEncryptedLoginCipherCreateRequest[] = []
  let revisionCalls = 0
  let syncCalls = 0
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => {
        revisionCalls += 1
        return resultCreate(77)
      },
      sync: async () => {
        syncCalls += 1
        return resultCreate(syncEnvelopeCreate(encryptedCipherResult.data))
      },
      cipherCreate: async (request) => {
        createdRequests.push(request)
        return resultCreate(encryptedCipherResult.data)
      },
    },
  })

  const result = await service.createLogin({
    draftId: "draft-id",
    name: " Example Login ",
    uris: [" https://example.test/login ", { uri: "https://example.test/account", match: 0 }],
    username: "user@example.com",
    password: "private password",
    notes: "Private notes",
    favorite: true,
    folderId: "folder-id",
    fields: [
      { name: "Text field", type: "text", value: "text value" },
      { name: "Hidden field", type: 1, value: "hidden value" },
      { name: "Boolean field", type: "boolean", value: true },
    ],
  })

  expect(result).toMatchObject({ success: true, data: { sync: { status: "synced", revisionDate: 77 } } })
  expect(revisionCalls).toBe(1)
  expect(syncCalls).toBe(1)
  const createdRequest = createdRequests[0]
  expect(createdRequest).toBeDefined()
  if (createdRequest === undefined) return
  expect(createdRequest.type).toBe(1)
  expect(createdRequest.folderId).toBe("folder-id")
  expect(createdRequest.favorite).toBe(true)
  expect(createdRequest.fields.map((field) => field.type)).toEqual([0, 1, 2])
  expect(createdRequest.name).not.toContain("Example Login")
  expect(await extensionEncStringDecryptText(createdRequest.name, userKey)).toEqual({
    success: true,
    data: "Example Login",
  })
  expect(await extensionEncStringDecryptText(createdRequest.notes, userKey)).toEqual({
    success: true,
    data: "Private notes",
  })
  expect(await extensionEncStringDecryptText(createdRequest.login.username, userKey)).toEqual({
    success: true,
    data: "user@example.com",
  })
  expect(await extensionEncStringDecryptText(createdRequest.login.password, userKey)).toEqual({
    success: true,
    data: "private password",
  })
  expect(await extensionEncStringDecryptText(createdRequest.login.uris[1]?.uri, userKey)).toEqual({
    success: true,
    data: "https://example.test/account",
  })
  expect(await extensionEncStringDecryptText(createdRequest.fields[2]?.value, userKey)).toEqual({
    success: true,
    data: "true",
  })

  const rawLocal = JSON.stringify([...context.local.values.values()])
  expect(rawLocal).not.toContain("private password")
  expect(rawLocal).not.toContain("Private notes")
  expect(await context.storage.createDraftsLoad()).toEqual({ success: true, data: [] })
  const rawCache = context.local.values.get("onewarden.sync-cache") as { lastRevisionDate: number }
  expect(rawCache.lastRevisionDate).toBe(77)
})

test("createLogin preserves an encrypted draft when the personal create request fails", async () => {
  const context = contextCreate()
  await vaultUnlock(context)
  let createCalls = 0
  const failure: Result<BitwardenEncryptedLoginCipherResponse> = resultErrorCreate(
    "test.cipherCreate",
    "The server is unavailable.",
    { code: "platform.unavailable", statusCode: 503 },
  )
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(77),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
      cipherCreate: async () => {
        createCalls += 1
        return failure
      },
    },
  })

  const result = await service.createLogin({
    draftId: "failed-draft-id",
    name: "Failed login",
    uris: ["https://example.test"],
    username: "failed-user",
    password: "failed password",
    notes: "failed notes",
    fields: [{ name: "secret", type: "hidden", value: "failed secret" }],
  })

  expect(result).toMatchObject({ success: false, code: "platform.unavailable", statusCode: 503 })
  expect(createCalls).toBe(1)
  const draftsResult = await context.storage.createDraftsLoad()
  expect(draftsResult.success).toBe(true)
  if (!draftsResult.success) return
  expect(draftsResult.data).toHaveLength(1)
  expect(JSON.stringify(draftsResult.data)).not.toContain("failed password")
  expect(JSON.stringify(draftsResult.data)).not.toContain("failed secret")
})

test("createLogin validates the URI requirement and refuses a locked vault before durable writes", async () => {
  const context = contextCreate()
  let createCalls = 0
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(77),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
      cipherCreate: async () => {
        createCalls += 1
        return resultErrorCreate("test.cipherCreate", "unexpected", {
          code: "platform.internal",
          statusCode: 500,
        })
      },
    },
  })

  const invalidResult = await service.createLogin({ name: "No URI", uris: [] })
  expect(invalidResult).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })
  const lockedResult = await service.createLogin({ name: "Locked", uris: ["https://example.test"] })
  expect(lockedResult).toMatchObject({ success: false, code: "platform.unauthorized", statusCode: 401 })
  expect(createCalls).toBe(0)
  expect(await context.storage.createDraftsLoad()).toEqual({ success: true, data: [] })
})
