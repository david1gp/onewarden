import { expect, test } from "bun:test"
import * as v from "valibot"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"
import { bitwardenAccountEncryptedJsonEnvelopeDecrypt } from "../../../src/web/settings/model/bitwardenAccountEncryptedJsonEnvelopeDecrypt.js"
import { bitwardenAccountEncryptedJsonEnvelopeEncrypt } from "../../../src/web/settings/model/bitwardenAccountEncryptedJsonEnvelopeEncrypt.js"
import { bitwardenAccountEncryptedJsonEnvelopeKeyValidate } from "../../../src/web/settings/model/bitwardenAccountEncryptedJsonEnvelopeKeyValidate.js"
import { bitwardenAccountEncryptedJsonEnvelopeSchema } from "../../../src/web/settings/model/bitwardenAccountEncryptedJsonEnvelopeSchema.js"
import { bitwardenAccountEncryptedJsonSensitiveValueClear } from "../../../src/web/settings/model/bitwardenAccountEncryptedJsonSensitiveValueClear.js"
import type { BitwardenJsonPayload } from "../../../src/web/settings/model/bitwardenJsonPayloadSchema.js"
import { vaultExportExecute } from "../../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"
import accountFixture from "../../fixtures/bitwardenAccountEncryptedJsonTask9.json"
import task2Fixture from "../../fixtures/bitwardenJsonTask2.json"

const userKey = new Uint8Array(64)

function testSession(
  options: { userKey?: Uint8Array | null; encryptedUserKey?: string; kdfIterations?: number } = {},
): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      email: "user@example.test",
      accessToken: "test-token",
      refreshToken: "test-refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
      userId: "user-id",
      kdf: 0,
      kdfIterations: options.kdfIterations ?? 1_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: options.encryptedUserKey ?? "wrapped-user-key",
    }),
    getUserKey: () => (options.userKey === undefined ? userKey : options.userKey),
  } as ReturnType<typeof webAuthSessionCreate>
}

function syncApiClient(sync: unknown, calls = { count: 0 }) {
  return webSettingsApiClientCreate({
    fetch: async (input) => {
      if (!String(input).endsWith("/api/sync")) return new Response("Not found", { status: 404 })
      calls.count += 1
      return new Response(JSON.stringify(sync), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    },
  })
}

function importApiClient(calls: { count: number; payload: unknown }) {
  return webSettingsApiClientCreate({
    fetch: async (input, init) => {
      if (!String(input).endsWith("/api/ciphers/import")) return new Response("Not found", { status: 404 })
      calls.count += 1
      calls.payload = JSON.parse(String(init?.body ?? ""))
      return new Response(JSON.stringify({ revisionDate: "2026-08-31T12:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    },
  })
}

async function encrypted(value: string, key: Uint8Array): Promise<string> {
  const result = await bitwardenCipherStringEncrypt(value, key)
  expect(result.success).toBe(true)
  return result.success ? result.data : ""
}

async function syncCreate(key: Uint8Array) {
  return {
    folders: [{ id: "folder-id", name: await encrypted("Personal", key) }],
    ciphers: [
      {
        id: "cipher-id",
        organizationId: null,
        folderId: "folder-id",
        type: 1,
        reprompt: 0,
        name: await encrypted("Account Login", key),
        notes: await encrypted("Account Notes", key),
        favorite: true,
        login: {
          uris: [{ uri: await encrypted("https://account.example", key), match: 0 }],
          username: await encrypted("account-user", key),
          password: await encrypted("account-password", key),
          totp: null,
          passwordRevisionDate: null,
        },
        fields: [],
        passwordHistory: [],
        creationDate: "2026-08-01T12:00:00.000Z",
        revisionDate: "2026-08-31T12:00:00.000Z",
        deletedDate: null,
        archivedDate: null,
      },
    ],
  }
}

test("same account key validates and decrypts the restricted encrypted JSON fixture", async () => {
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, accountFixture).success).toBe(true)

  const keyResult = await bitwardenAccountEncryptedJsonEnvelopeKeyValidate(accountFixture, userKey)
  expect(keyResult.success).toBe(true)

  const result = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(accountFixture, userKey)
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toMatchObject({
    encrypted: false,
    folders: [{ id: "fixture-folder", name: "Personal" }],
    items: [
      {
        id: "fixture-item",
        folderId: "fixture-folder",
        type: 1,
        name: "Fixture Login",
        notes: "Notes",
        login: {
          uris: [{ uri: "https://example.test", match: 0 }],
          username: "fixture-user",
          password: "fixture-password",
          totp: null,
        },
      },
    ],
  })
})

test("account-encrypted JSON rejects the wrong key and tampered ciphertext", async () => {
  const wrongKey = new Uint8Array(64)
  wrongKey[0] = 1
  const wrongKeyResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(accountFixture, wrongKey)
  expect(wrongKeyResult.success).toBe(false)

  const invalidMarker = structuredClone(accountFixture)
  const invalidMarkerItem = invalidMarker.items.at(0)
  expect(invalidMarkerItem).toBeDefined()
  if (invalidMarkerItem === undefined) return
  invalidMarker.encKeyValidation_DO_NOT_EDIT = invalidMarkerItem.name
  const invalidMarkerResult = await bitwardenAccountEncryptedJsonEnvelopeKeyValidate(invalidMarker, userKey)
  expect(invalidMarkerResult.success).toBe(false)

  const tampered = structuredClone(accountFixture)
  const tamperedItem = tampered.items.at(0)
  expect(tamperedItem).toBeDefined()
  if (tamperedItem === undefined) return
  tamperedItem.name = `${tamperedItem.name.slice(0, -2)}${tamperedItem.name.endsWith("A=") ? "B=" : "A="}`
  const tamperedResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(tampered, userKey)
  expect(tamperedResult.success).toBe(false)
})

test("account-encrypted JSON rejects malformed and portable envelopes", async () => {
  const portableLike = {
    ...accountFixture,
    salt: "AAECAwQFBgcICQoLDA0ODw==",
    kdfIterations: 100_000,
    kdfType: 0,
    data: accountFixture.items.at(0)?.name,
  }
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, portableLike).success).toBe(false)

  const passwordProtected = { ...accountFixture, passwordProtected: true }
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, passwordProtected).success).toBe(false)

  const malformed = structuredClone(accountFixture)
  const malformedItem = malformed.items.at(0)
  expect(malformedItem).toBeDefined()
  if (malformedItem === undefined || malformedItem.login === undefined || malformedItem.login === null) return
  const malformedUri = malformedItem.login.uris?.at(0)
  expect(malformedUri).toBeDefined()
  if (malformedUri === undefined) return
  malformedUri.uri = "not-a-cipher-string"
  const malformedResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(malformed, userKey)
  expect(malformedResult.success).toBe(false)
})

test("account-encrypted temporary plaintext cleanup clears nested strings and bytes", () => {
  const temporary = {
    name: "secret-name",
    nested: { password: "secret-password" },
    bytes: Uint8Array.from([1, 2, 3]),
    values: ["secret-value"],
  }

  bitwardenAccountEncryptedJsonSensitiveValueClear(temporary)

  expect(temporary).toEqual({
    name: "",
    nested: { password: "" },
    bytes: new Uint8Array(3),
    values: [""],
  })
})

test("account-encrypted JSON rejects organization, trashed, unsupported, and unsafe data", async () => {
  const organizationOwned = structuredClone(accountFixture)
  const organizationOwnedItem = organizationOwned.items.at(0)
  expect(organizationOwnedItem).toBeDefined()
  if (organizationOwnedItem === undefined) return
  organizationOwnedItem.organizationId = "organization-id"
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, organizationOwned).success).toBe(false)

  const trashed = structuredClone(accountFixture)
  const trashedItem = trashed.items.at(0)
  expect(trashedItem).toBeDefined()
  if (trashedItem === undefined) return
  trashedItem.deletedDate = "2026-08-31T12:00:00.000Z"
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, trashed).success).toBe(false)

  const unsupported = structuredClone(accountFixture)
  const unsupportedItem = unsupported.items.at(0)
  expect(unsupportedItem).toBeDefined()
  if (unsupportedItem === undefined) return
  unsupportedItem.type = 5
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, unsupported).success).toBe(false)

  const missingFolder = structuredClone(accountFixture)
  const missingFolderItem = missingFolder.items.at(0)
  expect(missingFolderItem).toBeDefined()
  if (missingFolderItem === undefined) return
  missingFolderItem.folderId = "missing-folder"
  const missingFolderResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(missingFolder, userKey)
  expect(missingFolderResult.success).toBe(false)
})

test("same-account encrypted JSON imports additively without using a file password", async () => {
  const calls = { count: 0, payload: null as unknown }
  const result = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(accountFixture),
    format: "json",
    filePassword: "portable-file-password",
    apiClient: importApiClient(calls),
  })

  expect(result).toMatchObject({ success: true, data: { cipherCount: 1, folderCount: 1, warnings: [] } })
  expect(calls.count).toBe(1)
  expect(calls.payload).toMatchObject({
    ciphers: [{ type: 1 }],
    folders: [{ id: null }],
    folderRelationships: [{ key: 0, value: 0 }],
  })
})

test("wrong account, tampered account-encrypted data, and invalid input never call the import API", async () => {
  const wrongKeyCalls = { count: 0, payload: null as unknown }
  const wrongKey = new Uint8Array(64)
  wrongKey[0] = 1
  const wrongKeyResult = await vaultImportExecute({
    session: testSession({ userKey: wrongKey }),
    rawContent: JSON.stringify(accountFixture),
    format: "json",
    apiClient: importApiClient(wrongKeyCalls),
  })
  expect(wrongKeyResult.success).toBe(false)
  expect(wrongKeyCalls.count).toBe(0)

  for (const tamper of ["marker", "item"] as const) {
    const tampered = structuredClone(accountFixture)
    const item = tampered.items.at(0)
    expect(item).toBeDefined()
    if (item === undefined) return
    if (tamper === "marker") tampered.encKeyValidation_DO_NOT_EDIT = item.name
    else item.name = `${item.name.slice(0, -2)}${item.name.endsWith("A=") ? "B=" : "A="}`

    const calls = { count: 0, payload: null as unknown }
    const tamperedResult = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(tampered),
      format: "json",
      apiClient: importApiClient(calls),
    })
    expect(tamperedResult.success).toBe(false)
    expect(calls.count).toBe(0)
  }

  const malformed = structuredClone(accountFixture)
  const malformedItem = malformed.items.at(0)
  expect(malformedItem).toBeDefined()
  if (malformedItem === undefined) return
  malformedItem.folderId = "missing-folder"
  const malformedCalls = { count: 0, payload: null as unknown }
  const malformedResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(malformed),
    format: "json",
    apiClient: importApiClient(malformedCalls),
  })
  expect(malformedResult.success).toBe(false)
  expect(malformedCalls.count).toBe(0)

  for (const invalid of [
    { ...structuredClone(accountFixture), passwordProtected: true },
    { ...structuredClone(accountFixture), items: [{ ...structuredClone(accountFixture.items[0]), type: 5 }] },
    {
      ...structuredClone(accountFixture),
      items: [{ ...structuredClone(accountFixture.items[0]), organizationId: "organization-id" }],
    },
    {
      ...structuredClone(accountFixture),
      items: [{ ...structuredClone(accountFixture.items[0]), deletedDate: "2026-08-31T12:00:00.000Z" }],
    },
  ]) {
    const calls = { count: 0, payload: null as unknown }
    const invalidResult = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(invalid),
      format: "json",
      filePassword: "portable-file-password",
      apiClient: importApiClient(calls),
    })
    expect(invalidResult.success).toBe(false)
    expect(calls.count).toBe(0)
  }
})

test("locked same-account encrypted JSON import unlocks only with the correct master password", async () => {
  const masterPassword = "account-master-password"
  const keysResult = await webAuthUserKeysGenerate(masterPassword, "user@example.test", {
    kdfType: 0,
    iterations: 1_000,
    memory: null,
    parallelism: null,
  })
  expect(keysResult.success).toBe(true)
  if (!keysResult.success) return

  const envelopeResult = await bitwardenAccountEncryptedJsonEnvelopeEncrypt(
    structuredClone(task2Fixture) as BitwardenJsonPayload,
    keysResult.data.userKey,
  )
  expect(envelopeResult.success).toBe(true)
  if (!envelopeResult.success) return

  const calls = { count: 0, payload: null as unknown }
  const result = await vaultImportExecute({
    session: testSession({
      userKey: null,
      encryptedUserKey: keysResult.data.wrappedUserKey,
      kdfIterations: 1_000,
    }),
    rawContent: JSON.stringify(envelopeResult.data),
    format: "json",
    filePassword: "must-not-unlock-account-key",
    masterPassword,
    apiClient: importApiClient(calls),
  })
  expect(result).toMatchObject({ success: true, data: { cipherCount: 4, folderCount: 1 } })
  expect(calls.count).toBe(1)

  const wrongPasswordCalls = { count: 0, payload: null as unknown }
  const wrongPasswordResult = await vaultImportExecute({
    session: testSession({
      userKey: null,
      encryptedUserKey: keysResult.data.wrappedUserKey,
      kdfIterations: 1_000,
    }),
    rawContent: JSON.stringify(envelopeResult.data),
    format: "json",
    filePassword: "must-not-unlock-account-key",
    masterPassword: "wrong-master-password",
    apiClient: importApiClient(wrongPasswordCalls),
  })
  expect(wrongPasswordResult.success).toBe(false)
  expect(wrongPasswordCalls.count).toBe(0)

  const filePasswordOnlyCalls = { count: 0, payload: null as unknown }
  const filePasswordOnlyResult = await vaultImportExecute({
    session: testSession({
      userKey: null,
      encryptedUserKey: keysResult.data.wrappedUserKey,
      kdfIterations: 1_000,
    }),
    rawContent: JSON.stringify(envelopeResult.data),
    format: "json",
    filePassword: masterPassword,
    apiClient: importApiClient(filePasswordOnlyCalls),
  })
  expect(filePasswordOnlyResult.success).toBe(false)
  expect(filePasswordOnlyCalls.count).toBe(0)
})

test("account-encrypted JSON encrypts and decrypts the supported personal payload", async () => {
  const payload = structuredClone(task2Fixture) as BitwardenJsonPayload
  const encryptedResult = await bitwardenAccountEncryptedJsonEnvelopeEncrypt(payload, userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return

  expect(encryptedResult.data).toMatchObject({ encrypted: true, folders: [{ id: "folder-personal" }] })
  expect(encryptedResult.data.passwordProtected).toBe(false)
  expect(encryptedResult.data.items.every((item) => item.organizationId === null && item.deletedDate === null)).toBe(
    true,
  )

  const decryptedResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(encryptedResult.data, userKey)
  expect(decryptedResult.success).toBe(true)
  if (decryptedResult.success) expect(decryptedResult.data.items).toHaveLength(4)
})

test("account-restricted vault export preserves encrypted fields and is decryptable with the same key", async () => {
  const sync = { folders: structuredClone(accountFixture.folders), ciphers: structuredClone(accountFixture.items) }
  const result = await vaultExportExecute({
    session: testSession(),
    format: "json-account-encrypted",
    password: "not-a-file-password",
    apiClient: syncApiClient(sync),
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  const envelope = JSON.parse(result.data.content) as Record<string, unknown>
  expect(v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, envelope).success).toBe(true)
  expect(envelope).toMatchObject({ encrypted: true, passwordProtected: false })
  expect(envelope).not.toHaveProperty("salt")
  expect(envelope).not.toHaveProperty("data")
  expect((envelope.items as Array<Record<string, unknown>>)[0]?.name).toBe(accountFixture.items[0]?.name)
  expect(result.data.content).not.toContain("Fixture Login")
  expect(result.data.content).not.toContain("fixture-password")
  expect(result.data.content).not.toContain("https://example.test")

  const decryptedResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(envelope, userKey)
  expect(decryptedResult.success).toBe(true)
  if (decryptedResult.success) expect(decryptedResult.data.items[0]).toMatchObject({ name: "Fixture Login" })
})

test("account-restricted vault export authenticates every retained encrypted field without mutating sync data", async () => {
  const tamperedItem = structuredClone(accountFixture.items[0])
  expect(tamperedItem).toBeDefined()
  if (tamperedItem === undefined || tamperedItem.login === undefined || tamperedItem.login === null) return
  expect(tamperedItem.login.password).toBeDefined()
  if (tamperedItem.login.password === undefined || tamperedItem.login.password === null) return
  tamperedItem.login.password = `${tamperedItem.login.password.slice(0, -2)}${
    tamperedItem.login.password.endsWith("A=") ? "B=" : "A="
  }`

  const sync = {
    folders: structuredClone(accountFixture.folders),
    ciphers: [structuredClone(accountFixture.items[0]), { ...tamperedItem, id: "tampered-later-item" }],
  }
  const originalSync = structuredClone(sync)
  const result = await vaultExportExecute({
    session: testSession(),
    format: "json-account-encrypted",
    apiClient: syncApiClient(sync),
  })

  expect(result.success).toBe(false)
  expect(sync).toEqual(originalSync)
})

test("account-restricted vault export excludes organization, trashed, keyed, collection-linked, and attachment data", async () => {
  const baseItem = structuredClone(accountFixture.items[0])
  const sync = {
    folders: structuredClone(accountFixture.folders),
    ciphers: [
      baseItem,
      { ...structuredClone(baseItem), id: "organization-item", organizationId: "organization-id" },
      { ...structuredClone(baseItem), id: "trashed-item", deletedDate: "2026-08-31T12:00:00.000Z" },
      { ...structuredClone(baseItem), id: "keyed-item", key: baseItem.name },
      { ...structuredClone(baseItem), id: "collection-item", collectionIds: ["collection-id"] },
      {
        ...structuredClone(baseItem),
        id: "attachment-item",
        attachments: [{ id: "attachment-id", url: "https://vault.example/attachment-secret" }],
      },
    ],
  }
  const result = await vaultExportExecute({
    session: testSession(),
    format: "json-account-encrypted",
    apiClient: syncApiClient(sync),
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  const envelope = JSON.parse(result.data.content) as { items: Array<Record<string, unknown>> }
  expect(envelope.items).toHaveLength(2)
  expect(envelope.items.map((item) => item.id)).toEqual(["fixture-item", "attachment-item"])
  expect(result.data.content).not.toContain("attachment-id")
  expect(result.data.content).not.toContain("https://vault.example/attachment-secret")
})

test("account-restricted vault export unlocks with the master password and rejects missing or wrong keys", async () => {
  const masterPassword = "account-master-password"
  const keysResult = await webAuthUserKeysGenerate(masterPassword, "user@example.test", {
    kdfType: 0,
    iterations: 1_000,
    memory: null,
    parallelism: null,
  })
  expect(keysResult.success).toBe(true)
  if (!keysResult.success) return

  const sync = await syncCreate(keysResult.data.userKey)
  const unlockedResult = await vaultExportExecute({
    session: testSession({
      userKey: null,
      encryptedUserKey: keysResult.data.wrappedUserKey,
      kdfIterations: 1_000,
    }),
    format: "json-account-encrypted",
    masterPassword,
    apiClient: syncApiClient(sync),
  })
  expect(unlockedResult.success).toBe(true)
  if (unlockedResult.success) {
    const envelope = JSON.parse(unlockedResult.data.content)
    const decryptResult = await bitwardenAccountEncryptedJsonEnvelopeDecrypt(envelope, keysResult.data.userKey)
    expect(decryptResult.success).toBe(true)
  }

  const missingKeyCalls = { count: 0 }
  const missingKeyResult = await vaultExportExecute({
    session: testSession({ userKey: null }),
    format: "json-account-encrypted",
    apiClient: syncApiClient(sync, missingKeyCalls),
  })
  expect(missingKeyResult.success).toBe(false)
  expect(missingKeyCalls.count).toBe(0)

  const wrongKeyCalls = { count: 0 }
  const wrongKeyResult = await vaultExportExecute({
    session: testSession({ userKey: new Uint8Array(64).fill(1) }),
    format: "json-account-encrypted",
    apiClient: syncApiClient(sync, wrongKeyCalls),
  })
  expect(wrongKeyResult.success).toBe(false)
  expect(wrongKeyCalls.count).toBe(1)
})
