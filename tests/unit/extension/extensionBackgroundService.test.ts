import { expect, test } from "bun:test"
import type { Result } from "#result"
import type { ExtensionAlarmsAdapter } from "../../../src/extension/background/extensionAlarmsAdapter.js"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import { extensionTimeoutAlarmName } from "../../../src/extension/background/extensionTimeoutAlarmName.js"
import { extensionPersonalLoginCipherEncrypt } from "../../../src/extension/crypto/extensionPersonalLoginCipherEncrypt.js"
import { extensionVaultSessionCreate } from "../../../src/extension/session/extensionVaultSessionCreate.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenEncryptedLoginCipher } from "../../../src/shared/api/bitwardenEncryptedLoginCipherSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenRefreshTokenResponse } from "../../../src/shared/api/bitwardenRefreshTokenResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"
import organizationFixture from "../../fixtures/extensionOrganizationFixtures.json"

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

function organizationTokenCreate(): BitwardenPasswordTokenResponse {
  return {
    ...tokenCreate(),
    AccountKeys: {
      publicKeyEncryptionKeyPair: {
        wrappedPrivateKey: organizationFixture.userPrivateKeyEnc,
        publicKey: null,
        Object: "publicKeyEncryptionKeyPair",
      },
      Object: "privateKeys",
    },
  }
}

const refreshResponse: BitwardenRefreshTokenResponse = {
  access_token: "refreshed-access-token",
  expires_in: 3600,
  token_type: "Bearer",
  refresh_token: "refreshed-refresh-token",
  scope: "api offline_access",
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

function serviceCreate(now: () => number = () => nowValue) {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  const storage = extensionStorageCreate(adapter)
  const vaultSession = extensionVaultSessionCreate(storage, now)
  const alarmCalls: { name: string; delayInMinutes: number }[] = []
  const clearCalls: string[] = []
  let alarmListener: ((alarm: { name: string }) => void) | null = null
  const alarms: ExtensionAlarmsAdapter = {
    create: async (name, alarmInfo) => {
      alarmCalls.push({ name, ...alarmInfo })
    },
    clear: async (name) => {
      clearCalls.push(name)
      return true
    },
    onAlarm: (listener) => {
      alarmListener = listener
    },
  }
  return {
    local,
    session,
    storage,
    vaultSession,
    alarms,
    alarmCalls,
    clearCalls,
    alarmListenerRead: () => alarmListener,
  }
}

function plainCipherCreate() {
  return {
    object: "cipherDetails" as const,
    id: "cipher-id",
    type: 1 as const,
    creationDate: "2026-08-28T00:00:00.000Z",
    revisionDate: "2026-08-28T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: null,
    name: "Synthetic login",
    notes: "Synthetic notes",
    favorite: false,
    login: {
      username: "synthetic-user",
      password: "synthetic-password",
      uris: [{ uri: "https://example.test/login", match: 0 }],
      uri: "https://example.test/login",
      totp: null,
    },
    fields: [{ name: "Synthetic field", value: "Synthetic value", type: 0, linkedId: null }],
  }
}

test("extensionBackgroundServiceCreate logs in and coalesces concurrent refreshes", async () => {
  const context = serviceCreate()
  let refreshCalls = 0
  let refreshResolve!: (result: Result<BitwardenRefreshTokenResponse>) => void
  const refreshPromise = new Promise<Result<BitwardenRefreshTokenResponse>>((resolve) => {
    refreshResolve = resolve
  })
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => {
        refreshCalls += 1
        return refreshPromise
      },
      revisionDate: async () => resultCreate(nowValue),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
    },
  })

  const loginResult = await service.passwordLogin({ email: passwordLogin.email, password: passwordLogin.password })
  expect(loginResult.success).toBe(true)
  expect(context.vaultSession.isUnlocked()).toBe(false)
  expect((await context.storage.authSessionLoad()).success).toBe(true)

  const expiredAuth = await context.storage.authSessionLoad()
  expect(expiredAuth.success).toBe(true)
  if (!expiredAuth.success || expiredAuth.data === null) return
  await context.storage.authSessionSave({ ...expiredAuth.data, expiresAt: 0 })

  const firstRefresh = service.refreshToken()
  const secondRefresh = service.refreshToken()
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(refreshCalls).toBe(1)
  refreshResolve(resultCreate(refreshResponse))
  expect(await firstRefresh).toEqual(await secondRefresh)
  const refreshedAuth = await context.storage.authSessionLoad()
  expect(refreshedAuth.success).toBe(true)
  if (!refreshedAuth.success) return
  expect(refreshedAuth.data?.accessToken).toBe("refreshed-access-token")
})

test("extensionBackgroundServiceCreate performs conditional and manual sync while persisting only encrypted data", async () => {
  const context = serviceCreate()
  const encryptedCipherResult = await extensionPersonalLoginCipherEncrypt(plainCipherCreate(), userKey)
  expect(encryptedCipherResult.success).toBe(true)
  if (!encryptedCipherResult.success) return
  const envelope: BitwardenSyncEnvelope = {
    profile: {},
    folders: [],
    collections: [],
    policies: [],
    ciphers: [encryptedCipherResult.data],
    sends: [],
    object: "sync",
  }
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
      revisionDate: async () => resultCreate(123),
      sync: async () => {
        syncCalls += 1
        return resultCreate(envelope)
      },
    },
  })

  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  const fullResult = await service.fullSync()
  expect(fullResult).toMatchObject({ success: true, data: { status: "synced", changed: true, revisionDate: 123 } })
  expect(syncCalls).toBe(1)
  const rawCache = context.local.values.get("onewarden.sync-cache") as {
    snapshot: { ciphertext: string }
    ciphers: unknown[]
  }
  expect(rawCache.snapshot.ciphertext).not.toContain("Synthetic login")
  expect(JSON.stringify(rawCache)).not.toContain("synthetic-password")
  expect(rawCache.ciphers).toHaveLength(1)

  const conditionalResult = await service.conditionalSync()
  expect(conditionalResult).toMatchObject({ success: true, data: { status: "unchanged", changed: false } })
  expect(syncCalls).toBe(1)
  expect((await service.manualSync()).success).toBe(true)
  expect(syncCalls).toBe(2)
})

test("extensionBackgroundServiceCreate accepts valid decrypted sync cache payloads and rejects malformed ones", async () => {
  const context = serviceCreate()
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(123),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
    },
  })

  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)

  const validSnapshotPayloadResult = await context.vaultSession.encryptedPayloadEncrypt(
    JSON.stringify({
      profile: {},
      folders: [],
      collections: [],
      policies: [],
      sends: [],
      object: "sync",
      ciphers: [{ legacy: true }],
    }),
  )
  const validCipherPayloadResult = await context.vaultSession.encryptedPayloadEncrypt(
    JSON.stringify(plainCipherCreate()),
  )
  expect(validSnapshotPayloadResult.success).toBe(true)
  expect(validCipherPayloadResult.success).toBe(true)
  if (!validSnapshotPayloadResult.success || !validCipherPayloadResult.success) return
  expect(
    await context.storage.syncCacheSave({
      snapshot: validSnapshotPayloadResult.data,
      ciphers: [
        { id: "cipher-id", revisionDate: plainCipherCreate().revisionDate, payload: validCipherPayloadResult.data },
      ],
      lastRevisionDate: 123,
      lastSyncedAt: nowValue,
    }),
  ).toMatchObject({ success: true })

  const validResult = await service.syncSnapshotLoad()
  expect(validResult).toMatchObject({ success: true, data: { object: "sync", ciphers: [{ id: "cipher-id" }] } })

  const malformedSnapshotPayloadResult = await context.vaultSession.encryptedPayloadEncrypt("not-json")
  expect(malformedSnapshotPayloadResult.success).toBe(true)
  if (!malformedSnapshotPayloadResult.success) return
  expect(
    await context.storage.syncCacheSave({
      snapshot: malformedSnapshotPayloadResult.data,
      ciphers: [],
      lastRevisionDate: 123,
      lastSyncedAt: nowValue,
    }),
  ).toMatchObject({ success: true })
  const malformedSnapshotResult = await service.syncSnapshotLoad()
  expect(malformedSnapshotResult).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })

  const malformedCipherPayloadResult = await context.vaultSession.encryptedPayloadEncrypt(
    JSON.stringify({ ...plainCipherCreate(), login: { ...plainCipherCreate().login, username: 42 } }),
  )
  expect(malformedCipherPayloadResult.success).toBe(true)
  if (!malformedCipherPayloadResult.success || !validSnapshotPayloadResult.success) return
  expect(
    await context.storage.syncCacheSave({
      snapshot: validSnapshotPayloadResult.data,
      ciphers: [
        { id: "cipher-id", revisionDate: plainCipherCreate().revisionDate, payload: malformedCipherPayloadResult.data },
      ],
      lastRevisionDate: 123,
      lastSyncedAt: nowValue,
    }),
  ).toMatchObject({ success: true })
  const malformedCipherResult = await service.syncSnapshotLoad()
  expect(malformedCipherResult).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })
})

test("extensionBackgroundServiceCreate validates the sync profile before replacing organization keys", async () => {
  const context = serviceCreate()
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(123),
      sync: async () =>
        resultCreate({
          profile: { organizations: "malformed" },
          folders: [],
          collections: [],
          policies: [],
          ciphers: [],
          sends: [],
          object: "sync",
        } as unknown as BitwardenSyncEnvelope),
    },
  })

  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  const result = await service.fullSync()
  expect(result).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })
})

test("extensionBackgroundServiceCreate syncs authorized organization login ciphers with their permissions", async () => {
  const context = serviceCreate()
  const envelope: BitwardenSyncEnvelope = {
    profile: {
      organizations: [
        { id: organizationFixture.organizationId, key: organizationFixture.organizationKeyEnc, status: 2 },
      ],
    },
    folders: [],
    collections: [],
    policies: [],
    ciphers: [organizationFixture.cipher as unknown as BitwardenEncryptedLoginCipher],
    sends: [],
    object: "sync",
  }
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(organizationTokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(123),
      sync: async () => resultCreate(envelope),
    },
  })

  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  const syncResult = await service.fullSync()
  expect(syncResult.success).toBe(true)
  if (!syncResult.success) return
  expect(syncResult.data.snapshot.ciphers).toHaveLength(1)
  expect(syncResult.data.snapshot.ciphers[0]).toMatchObject({
    id: "organization-cipher",
    organizationId: organizationFixture.organizationId,
    name: "Organization fixture login",
    login: { username: "organization-user", password: "organization-password" },
    edit: true,
    viewPassword: true,
  })
})

test("extensionBackgroundServiceCreate excludes ciphers from unconfirmed organizations", async () => {
  const context = serviceCreate()
  const pendingCipher = {
    ...organizationFixture.cipher,
    id: "pending-organization-cipher",
    organizationId: "00000000-0000-4000-8000-000000000011",
  } as unknown as BitwardenEncryptedLoginCipher
  const missingStatusCipher = {
    ...organizationFixture.cipher,
    id: "missing-status-organization-cipher",
    organizationId: "00000000-0000-4000-8000-000000000012",
  } as unknown as BitwardenEncryptedLoginCipher
  const envelope: BitwardenSyncEnvelope = {
    profile: {
      organizations: [
        { id: organizationFixture.organizationId, key: organizationFixture.organizationKeyEnc, status: 2 },
        {
          id: "00000000-0000-4000-8000-000000000011",
          key: organizationFixture.organizationKeyEnc,
          status: 1,
        },
        { id: "00000000-0000-4000-8000-000000000012", key: organizationFixture.organizationKeyEnc },
      ],
    },
    folders: [],
    collections: [],
    policies: [],
    ciphers: [
      organizationFixture.cipher as unknown as BitwardenEncryptedLoginCipher,
      pendingCipher,
      missingStatusCipher,
    ],
    sends: [],
    object: "sync",
  }
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => nowValue,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(organizationTokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(123),
      sync: async () => resultCreate(envelope),
    },
  })

  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  const syncResult = await service.fullSync()
  expect(syncResult).toMatchObject({ success: true, data: { snapshot: { ciphers: [{ id: "organization-cipher" }] } } })
})

test("extensionBackgroundServiceCreate applies inactivity and restart lock/logout actions through alarms", async () => {
  let now = nowValue
  const context = serviceCreate(() => now)
  const service = extensionBackgroundServiceCreate({
    storage: context.storage,
    vaultSession: context.vaultSession,
    alarms: context.alarms,
    now: () => now,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(nowValue),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
    },
  })

  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  const unlockedAt = now
  now += 30_000
  expect((await service.lockPolicySave({ action: "lock", timeoutMinutes: 1 })).success).toBe(true)
  expect(await service.lockPolicyLoad()).toEqual({ success: true, data: { action: "lock", timeoutMinutes: 1 } })
  expect(context.alarmCalls.at(-1)).toEqual({ name: extensionTimeoutAlarmName, delayInMinutes: 0.5 })
  expect(await context.storage.sessionStateLoad()).toEqual({
    success: true,
    data: { status: "unlocked", unlockedAt },
  })
  now = unlockedAt + 60_000
  expect((await service.timeoutAlarmHandle({ name: extensionTimeoutAlarmName })).success).toBe(true)
  expect(context.vaultSession.isUnlocked()).toBe(false)
  const lockedAuth = await context.storage.authSessionLoad()
  expect(lockedAuth.success).toBe(true)
  if (!lockedAuth.success) return
  expect(lockedAuth.data).not.toBeNull()

  const restartedContext = serviceCreate(() => now)
  await restartedContext.storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: now + 60_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: passwordLogin.email,
  })
  await restartedContext.storage.sessionStateSave({ status: "unlocked", unlockedAt: now })
  await restartedContext.storage.lockPolicySave({ action: "logout", timeoutMinutes: null })
  const restartedService = extensionBackgroundServiceCreate({
    storage: restartedContext.storage,
    vaultSession: restartedContext.vaultSession,
    alarms: restartedContext.alarms,
    now: () => now,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(tokenCreate()),
      refreshToken: async () => resultCreate(refreshResponse),
      revisionDate: async () => resultCreate(nowValue),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
    },
  })
  expect((await restartedService.start()).success).toBe(true)
  const restartedAuth = await restartedContext.storage.authSessionLoad()
  const restartedState = await restartedContext.storage.sessionStateLoad()
  expect(restartedAuth.success).toBe(true)
  expect(restartedState.success).toBe(true)
  if (!restartedAuth.success || !restartedState.success) return
  expect(restartedAuth.data).toBeNull()
  expect(restartedState.data).toBeNull()
  expect(restartedContext.clearCalls).toContain(extensionTimeoutAlarmName)
  expect(restartedContext.alarmListenerRead()).not.toBeNull()
})
