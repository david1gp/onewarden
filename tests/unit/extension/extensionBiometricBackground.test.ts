import { expect, test } from "bun:test"
import type { ExtensionAlarmsAdapter } from "../../../src/extension/background/extensionAlarmsAdapter.js"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import { extensionVaultSessionCreate } from "../../../src/extension/session/extensionVaultSessionCreate.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"
import organizationFixture from "../../fixtures/extensionOrganizationFixtures.json"

const passwordLogin = fixtures.passwordLogin
const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)
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

function tokenWithPrivateKeyCreate(): BitwardenPasswordTokenResponse {
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

function serviceCreate(token: BitwardenPasswordTokenResponse = tokenCreate()) {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  const storage = extensionStorageCreate(adapter)
  const vaultSession = extensionVaultSessionCreate(storage, () => 1_756_368_000_000)
  const capability = { status: "available" as const, platformAuthenticator: true as const, prf: true as const }
  let enrolledKey: Uint8Array | null = null
  let unwrapFailure = false
  let lastUserId = ""
  const biometric = {
    capabilityRead: async () => resultCreate(capability),
    enroll: async (userId: string, key: Uint8Array) => {
      lastUserId = userId
      enrolledKey = key.slice()
      const enrollment = {
        userId,
        credentialId: "credential-id",
        rpId: "extension.example",
        origin: "chrome-extension://extension-id",
        salt: "salt",
        iv: "iv",
        ciphertext: "ciphertext",
        createdAt: 1,
        updatedAt: 1,
      }
      const saveResult = await storage.biometricEnrollmentSave(enrollment)
      if (!saveResult.success) return saveResult
      return resultCreate(enrollment)
    },
    unwrap: async (userId: string) => {
      lastUserId = userId
      if (unwrapFailure) {
        return resultErrorCreate("extensionBiometric.unwrap", "Biometric authentication was canceled.", {
          code: "platform.unauthorized",
          statusCode: 401,
        })
      }
      return resultCreate(enrolledKey?.slice() ?? userKey.slice())
    },
    revoke: async (userId: string) => {
      lastUserId = userId
      enrolledKey = null
      return storage.biometricEnrollmentClear(userId)
    },
  }
  const alarms: ExtensionAlarmsAdapter = {
    create: async () => undefined,
    clear: async () => true,
    onAlarm: () => undefined,
  }
  const service = extensionBackgroundServiceCreate({
    storage,
    vaultSession,
    biometric,
    alarms,
    now: () => 1_756_368_000_000,
    apiClient: {
      prelogin: async () => resultCreate(prelogin),
      passwordToken: async () => resultCreate(token),
      refreshToken: async () =>
        resultCreate({
          access_token: "refreshed-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          refresh_token: "refreshed-refresh-token",
          scope: "api offline_access",
        }),
      revisionDate: async () => resultCreate(1),
      sync: async () => resultCreate({} as BitwardenSyncEnvelope),
    },
  })
  return {
    local,
    session,
    storage,
    vaultSession,
    service,
    biometric,
    lastUserIdRead: () => lastUserId,
    unwrapFailureSet: (value: boolean) => (unwrapFailure = value),
  }
}

test("extension background biometric enrollment and unlock use the authenticated account and retain lock enrollment", async () => {
  const context = serviceCreate(tokenWithPrivateKeyCreate())
  expect(await context.service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).toEqual({
    success: true,
    data: { status: "authenticated" },
  })
  expect(await context.storage.authSessionLoad()).toMatchObject({
    success: true,
    data: { encryptedPrivateKey: organizationFixture.userPrivateKeyEnc },
  })

  expect(await context.service.biometricStatusRead()).toEqual({
    success: true,
    data: { capability: { status: "available", platformAuthenticator: true, prf: true }, enrolled: false },
  })
  expect(await context.service.biometricEnroll()).toEqual({ success: true, data: { enrolled: true } })
  expect(await context.service.biometricStatusRead()).toMatchObject({
    success: true,
    data: { enrolled: true },
  })
  expect(context.lastUserIdRead()).toBe("user@example.com")
  expect(await context.service.lock()).toEqual({ success: true, data: undefined })
  expect(context.vaultSession.isUnlocked()).toBe(false)
  expect(await context.service.biometricUnlock()).toEqual({ success: true, data: { status: "authenticated" } })
  expect(context.vaultSession.isUnlocked()).toBe(true)
  expect(context.lastUserIdRead()).toBe("user@example.com")
  expect(await context.service.biometricRevoke()).toEqual({ success: true, data: { enrolled: false } })
  expect(await context.service.biometricStatusRead()).toMatchObject({
    success: true,
    data: { enrolled: false },
  })
})

test("extension background biometric cancellation leaves the vault locked and password unlock remains available", async () => {
  const context = serviceCreate()
  await context.storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1_756_368_000_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: passwordLogin.email,
  })
  context.unwrapFailureSet(true)

  expect(await context.service.biometricUnlock()).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
  expect(context.vaultSession.isUnlocked()).toBe(false)
  context.unwrapFailureSet(false)
  expect(await context.service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).toEqual({
    success: true,
    data: { status: "authenticated" },
  })
  expect(context.vaultSession.isUnlocked()).toBe(true)
})

test("extension background logout clears the vault session and biometric enrollment", async () => {
  const context = serviceCreate()
  await context.storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1_756_368_000_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: "User@example.com",
  })
  await context.vaultSession.unlockWithUserKey(userKey)
  await context.service.biometricEnroll()

  expect(await context.service.logout()).toEqual({ success: true, data: undefined })
  expect(context.vaultSession.isUnlocked()).toBe(false)
  expect(await context.storage.authSessionLoad()).toEqual({ success: true, data: null })
  expect(await context.storage.biometricEnrollmentLoad("user@example.com")).toEqual({ success: true, data: null })
  expect(await context.service.biometricUnlock()).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
})
