import { expect, test } from "bun:test"
import type { ExtensionAlarmsAdapter } from "../../../src/extension/background/extensionAlarmsAdapter.js"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import { extensionCipherEncrypt } from "../../../src/extension/crypto/extensionCipherEncrypt.js"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import { extensionVaultSessionCreate } from "../../../src/extension/session/extensionVaultSessionCreate.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenEncryptedCipher } from "../../../src/shared/api/bitwardenEncryptedCipherSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { base64Decode } from "../../../src/shared/crypto/base64Decode.js"
import { base64Encode } from "../../../src/shared/crypto/base64Encode.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
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

function storageAreaCreate() {
  const values = new Map<string, unknown>()
  const area: ExtensionStorageArea = {
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
  return area
}

function cipherCreate(type: 1 | 2 | 3 | 4 | 5, id: string): ExtensionCipher {
  const common = {
    object: "cipherDetails" as const,
    id,
    type,
    creationDate: "2026-08-28T00:00:00.000Z",
    revisionDate: "2026-08-28T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: null,
    name: `Cipher ${type}`,
    notes: `Notes ${type}`,
    favorite: false,
    fields: [{ name: "Field", value: `Value ${type}`, type: 0, linkedId: null }],
  }
  if (type === 1)
    return {
      ...common,
      type,
      login: {
        username: `user-${type}`,
        password: `secret-${type}`,
        uris: [{ uri: "https://example.test", match: 0 }],
        uri: "https://example.test",
        totp: null,
      },
    }
  if (type === 2) return { ...common, type, secureNote: { type: 0 } }
  if (type === 3)
    return {
      ...common,
      type,
      card: {
        cardholderName: "Example User",
        brand: "Visa",
        number: "4111111111111111",
        expMonth: "12",
        expYear: "2030",
        code: "123",
      },
    }
  if (type === 4)
    return {
      ...common,
      type,
      identity: { firstName: "Example", lastName: "User", email: "user@example.test" },
    }
  return {
    ...common,
    type,
    sshKey: { privateKey: "private-key", publicKey: "public-key", keyFingerprint: "fingerprint" },
  }
}

function serviceCreate(apiClient: Record<string, unknown>) {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local, session })
  const storage = extensionStorageCreate(adapter)
  const vaultSession = extensionVaultSessionCreate(storage, () => nowValue)
  const alarms: ExtensionAlarmsAdapter = {
    create: async () => {},
    clear: async () => true,
    onAlarm: () => {},
  }
  const service = extensionBackgroundServiceCreate({
    storage,
    vaultSession,
    alarms,
    now: () => nowValue,
    apiClient: apiClient as never,
  })
  return { service, storage }
}

function syncEnvelopeCreate(): BitwardenSyncEnvelope {
  return { profile: {}, folders: [], collections: [], policies: [], ciphers: [], sends: [], object: "sync" }
}

test("extension background cipher mutations encrypt and round-trip every synchronized cipher type", async () => {
  const encrypted = new Map<string, BitwardenEncryptedCipher>()
  const createRequests: Record<string, unknown>[] = []
  const updateRequests: Record<string, unknown>[] = []
  for (const type of [1, 2, 3, 4, 5] as const) {
    const cipher = cipherCreate(type, `cipher-${type}`)
    const encryptedResult = await extensionCipherEncrypt(cipher, userKey)
    expect(encryptedResult.success).toBe(true)
    if (encryptedResult.success)
      encrypted.set(
        cipher.id,
        type === 1 ? { ...encryptedResult.data, collectionIds: ["existing-collection"] } : encryptedResult.data,
      )
  }
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate({ ...token, access_token: "refreshed-access-token" }),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => resultCreate(syncEnvelopeCreate()),
    cipherRead: async (cipherId: string) => resultCreate(encrypted.get(cipherId) as BitwardenEncryptedCipher),
    cipherCreate: async (request: Record<string, unknown>) => {
      createRequests.push(request)
      return resultCreate(encrypted.get(request.id as string) as BitwardenEncryptedCipher)
    },
    cipherUpdate: async (cipherId: string, request: Record<string, unknown>) => {
      updateRequests.push(request)
      return resultCreate(encrypted.get(cipherId) as BitwardenEncryptedCipher)
    },
  }
  const { service } = serviceCreate(apiClient)
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)

  for (const type of [1, 2, 3, 4, 5] as const) {
    const cipher = cipherCreate(type, `cipher-${type}`)
    const created = await service.cipherCreate({ cipher })
    expect(created).toMatchObject({ success: true, data: { id: cipher.id, type } })
    const updated = await service.cipherUpdate({ cipherId: cipher.id, cipher })
    expect(updated).toMatchObject({ success: true, data: { id: cipher.id, type } })
  }
  expect(createRequests).toHaveLength(5)
  expect(updateRequests).toHaveLength(5)
  expect(JSON.stringify(createRequests)).not.toContain("secret-")
  expect(JSON.stringify(updateRequests)).not.toContain("secret-")
  expect(createRequests.map((request) => request.type)).toEqual([1, 2, 3, 4, 5])
  expect(updateRequests[0]?.collectionIds).toEqual(["existing-collection"])
  expect(updateRequests.map((request) => request.lastKnownRevisionDate)).toEqual([
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
  ])
})

test("extension background attachment flows encrypt bytes, decrypt downloads, delete metadata, and sync writes", async () => {
  const cipher = cipherCreate(1, "attachment-cipher")
  const encryptedResult = await extensionCipherEncrypt(cipher, userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  let encryptedCipher = encryptedResult.data
  let encryptedBytes = new Uint8Array()
  let syncCalls = 0
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate({ ...token, access_token: "refreshed-access-token" }),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => {
      syncCalls += 1
      return resultCreate(syncEnvelopeCreate())
    },
    cipherRead: async () => resultCreate(encryptedCipher),
    attachmentUpload: async (_cipherId: string, data: Uint8Array, fileName: string, key: string) => {
      encryptedBytes = new Uint8Array(data)
      encryptedCipher = {
        ...encryptedCipher,
        attachments: [{ id: "attachment-id", fileName, key, size: String(data.byteLength) }],
      }
      return resultCreate(encryptedCipher)
    },
    attachmentDownload: async () => resultCreate(new Uint8Array(encryptedBytes)),
    attachmentDelete: async () => {
      encryptedCipher = { ...encryptedCipher, attachments: [] }
      return resultCreate({ cipher: encryptedCipher })
    },
  }
  const { service } = serviceCreate(apiClient)
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)

  const uploaded = await service.attachmentUpload({
    cipherId: cipher.id,
    fileName: "secret.txt",
    dataBase64: base64Encode(new TextEncoder().encode("private attachment")),
  })
  expect(uploaded).toMatchObject({
    success: true,
    data: { attachments: [{ id: "attachment-id", fileName: "secret.txt" }] },
  })
  expect(new TextDecoder().decode(encryptedBytes)).not.toContain("private attachment")

  const downloaded = await service.attachmentDownload({ cipherId: cipher.id, attachmentId: "attachment-id" })
  expect(downloaded.success).toBe(true)
  if (downloaded.success) {
    const bytesResult = base64Decode(downloaded.data.dataBase64)
    expect(bytesResult.success).toBe(true)
    if (bytesResult.success) expect(new TextDecoder().decode(bytesResult.data)).toBe("private attachment")
  }

  const deleted = await service.attachmentDelete({ cipherId: cipher.id, attachmentId: "attachment-id" })
  expect(deleted).toMatchObject({ success: true, data: { attachments: [] } })
  expect(syncCalls).toBe(2)
})

test("extension background cipher mutations enforce permissions, conflicts, soft-delete defaults, and lock state", async () => {
  const cipher = cipherCreate(1, "protected-cipher")
  const encryptedResult = await extensionCipherEncrypt(cipher, userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  let target = encryptedResult.data
  let updateCalls = 0
  let deleteHard: boolean | null = null
  let archiveValue: boolean | null = null
  let movedIds: string[] = []
  let syncCalls = 0
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate(token),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => {
      syncCalls += 1
      return resultCreate(syncEnvelopeCreate())
    },
    cipherRead: async () => resultCreate(target),
    cipherUpdate: async () => {
      updateCalls += 1
      return resultErrorCreate("test.cipherUpdate", "The client copy is stale.", {
        code: "platform.conflict",
        statusCode: 409,
      })
    },
    cipherDelete: async (_cipherId: string, hard: boolean) => {
      deleteHard = hard
      return resultCreate(undefined)
    },
    cipherRestore: async () => resultCreate(target),
    cipherArchive: async (_cipherId: string, archived: boolean) => {
      archiveValue = archived
      return resultCreate(target)
    },
    cipherMove: async (ids: string[]) => {
      movedIds = ids
      return resultCreate(undefined)
    },
  }
  const { service } = serviceCreate(apiClient)
  expect(await service.cipherCreate({ cipher })).toMatchObject({
    success: false,
    code: "platform.unauthorized",
    statusCode: 401,
  })
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)

  target = { ...target, edit: false }
  expect(await service.cipherUpdate({ cipherId: cipher.id, cipher })).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
  expect(updateCalls).toBe(0)

  target = { ...encryptedResult.data, edit: true }
  expect(await service.cipherUpdate({ cipherId: cipher.id, cipher })).toMatchObject({
    success: false,
    code: "platform.conflict",
    statusCode: 409,
  })
  expect(updateCalls).toBe(1)
  expect(syncCalls).toBe(0)

  expect(await service.cipherDelete({ cipherId: cipher.id })).toMatchObject({ success: true })
  expect(deleteHard).toBe(false)
  expect(await service.cipherDelete({ cipherId: cipher.id, hard: true })).toMatchObject({ success: true })
  expect(deleteHard).toBe(true)

  target = { ...encryptedResult.data, edit: true, permissions: { restore: false } }
  expect(await service.cipherRestore({ cipherId: cipher.id })).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
  target = { ...encryptedResult.data, edit: true }
  expect(await service.cipherRestore({ cipherId: cipher.id })).toMatchObject({ success: true })
  expect(await service.cipherArchive({ cipherId: cipher.id })).toMatchObject({ success: true })
  expect(archiveValue).toBe(true)
  expect(await service.cipherArchive({ cipherId: cipher.id, archived: false })).toMatchObject({ success: true })
  expect(archiveValue).toBe(false)
  expect(await service.cipherMove({ ids: [cipher.id], folderId: null })).toMatchObject({ success: true })
  expect(movedIds).toEqual([cipher.id])
})

test("extension background collection assignment rejects personal ciphers and preserves serialized operations", async () => {
  const cipher = cipherCreate(1, "collection-cipher")
  const encryptedResult = await extensionCipherEncrypt(cipher, userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  let active = 0
  let maximumActive = 0
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate(token),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => resultCreate(syncEnvelopeCreate()),
    cipherRead: async () => resultCreate(encryptedResult.data),
    cipherPartial: async () => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active -= 1
      return resultCreate(encryptedResult.data)
    },
  }
  const { service } = serviceCreate(apiClient)
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  expect(
    await service.cipherCollectionsUpdate({ cipherId: cipher.id, collectionIds: ["collection-id"] }),
  ).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
  expect(
    await Promise.all([
      service.cipherPartial({ cipherId: cipher.id, favorite: true }),
      service.cipherPartial({ cipherId: cipher.id, favorite: false }),
    ]),
  ).toHaveLength(2)
  expect(maximumActive).toBe(1)
})

test("extension background cipher mutations force exactly one sync for every supported cipher type", async () => {
  const encrypted = new Map<string, BitwardenEncryptedCipher>()
  const partialRequests: unknown[] = []
  let syncCalls = 0
  for (const type of [1, 2, 3, 4, 5] as const) {
    const plainCipher = cipherCreate(type, `mutation-cipher-${type}`)
    const encryptedResult = await extensionCipherEncrypt(plainCipher, userKey)
    expect(encryptedResult.success).toBe(true)
    if (encryptedResult.success) encrypted.set(plainCipher.id, encryptedResult.data)
  }
  const responseRead = (cipherId: string) => resultCreate(encrypted.get(cipherId) as BitwardenEncryptedCipher)
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate(token),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => {
      syncCalls += 1
      return resultCreate(syncEnvelopeCreate())
    },
    cipherRead: async (cipherId: string) => responseRead(cipherId),
    cipherCreate: async (request: BitwardenEncryptedCipher) => responseRead(request.id as string),
    cipherUpdate: async (cipherId: string) => responseRead(cipherId),
    cipherPartial: async (cipherId: string, request: unknown) => {
      partialRequests.push(request)
      return responseRead(cipherId)
    },
    cipherDelete: async () => resultCreate(undefined),
    cipherRestore: async (cipherId: string) => responseRead(cipherId),
    cipherArchive: async (cipherId: string) => responseRead(cipherId),
    cipherMove: async () => resultCreate(undefined),
  }
  const { service } = serviceCreate(apiClient)
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)

  for (const type of [1, 2, 3, 4, 5] as const) {
    const cipherId = `mutation-cipher-${type}`
    expect((await service.cipherPartial({ cipherId, folderId: null })).success).toBe(true)
    expect((await service.cipherDelete({ cipherId })).success).toBe(true)
    expect((await service.cipherDelete({ cipherId, hard: true })).success).toBe(true)
    expect((await service.cipherRestore({ cipherId })).success).toBe(true)
    expect((await service.cipherArchive({ cipherId })).success).toBe(true)
    expect((await service.cipherArchive({ cipherId, archived: false })).success).toBe(true)
    expect((await service.cipherMove({ ids: [cipherId], folderId: null })).success).toBe(true)
    expect(syncCalls).toBe((type - 1) * 7 + 7)
  }
  expect(partialRequests).toEqual([{}, {}, {}, {}, {}].map(() => ({ folderId: null })))
})

test("extension background failed cipher mutations do not sync", async () => {
  const cipher = cipherCreate(1, "failed-mutation-cipher")
  const encryptedResult = await extensionCipherEncrypt(cipher, userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  let syncCalls = 0
  const failure = () =>
    resultErrorCreate("test.cipherMutation", "Mutation failed.", {
      code: "platform.conflict" as const,
      statusCode: 409,
    })
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () => resultCreate(token),
    refreshToken: async () => resultCreate(token),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => {
      syncCalls += 1
      return resultCreate(syncEnvelopeCreate())
    },
    cipherRead: async () => resultCreate(encryptedResult.data),
    cipherCreate: async () => failure(),
    cipherUpdate: async () => failure(),
    cipherPartial: async () => failure(),
    cipherDelete: async () => failure(),
    cipherRestore: async () => failure(),
    cipherArchive: async () => failure(),
    cipherMove: async () => failure(),
  }
  const { service } = serviceCreate(apiClient)
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)

  expect((await service.cipherCreate({ cipher })).success).toBe(false)
  expect((await service.cipherUpdate({ cipherId: cipher.id, cipher })).success).toBe(false)
  expect((await service.cipherPartial({ cipherId: cipher.id, favorite: true })).success).toBe(false)
  expect((await service.cipherDelete({ cipherId: cipher.id })).success).toBe(false)
  expect((await service.cipherRestore({ cipherId: cipher.id })).success).toBe(false)
  expect((await service.cipherArchive({ cipherId: cipher.id })).success).toBe(false)
  expect((await service.cipherMove({ ids: [cipher.id], folderId: null })).success).toBe(false)
  expect((await service.cipherCollectionsUpdate({ cipherId: cipher.id, collectionIds: [] })).success).toBe(false)
  expect(syncCalls).toBe(0)
})

test("extension background organization collection assignment syncs after a permitted type-1 mutation", async () => {
  let syncCalls = 0
  const envelope: BitwardenSyncEnvelope = {
    profile: {
      organizations: [
        { id: organizationFixture.organizationId, key: organizationFixture.organizationKeyEnc, status: 2 },
      ],
    },
    folders: [],
    collections: [
      {
        id: "collection-id",
        organizationId: organizationFixture.organizationId,
        name: "Collection",
      },
    ],
    policies: [],
    ciphers: [organizationFixture.cipher as unknown as BitwardenEncryptedCipher],
    sends: [],
    object: "sync",
  }
  const apiClient = {
    prelogin: async () => resultCreate(prelogin),
    passwordToken: async () =>
      resultCreate({
        ...token,
        AccountKeys: {
          publicKeyEncryptionKeyPair: {
            wrappedPrivateKey: organizationFixture.userPrivateKeyEnc,
            publicKey: null,
            Object: "publicKeyEncryptionKeyPair",
          },
          Object: "privateKeys",
        },
      }),
    refreshToken: async () => resultCreate(token),
    revisionDate: async () => resultCreate(nowValue),
    sync: async () => {
      syncCalls += 1
      return resultCreate(envelope)
    },
    cipherRead: async () => resultCreate(organizationFixture.cipher as unknown as BitwardenEncryptedCipher),
    cipherCollectionsUpdate: async () =>
      resultCreate(organizationFixture.cipher as unknown as BitwardenEncryptedCipher),
  }
  const { service } = serviceCreate(apiClient)
  expect((await service.unlock({ email: passwordLogin.email, password: passwordLogin.password })).success).toBe(true)
  expect((await service.fullSync()).success).toBe(true)
  syncCalls = 0

  const result = await service.cipherCollectionsUpdate({
    cipherId: "organization-cipher",
    collectionIds: ["collection-id"],
  })
  expect(result).toMatchObject({ success: true, data: { id: "organization-cipher", type: 1 } })
  expect(syncCalls).toBe(1)
})
