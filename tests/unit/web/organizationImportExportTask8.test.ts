import { expect, test } from "bun:test"
import * as v from "valibot"
import { extensionEncStringDecryptText } from "../../../src/extension/crypto/extensionEncStringDecryptText.js"
import { extensionEncStringEncrypt } from "../../../src/extension/crypto/extensionEncStringEncrypt.js"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import type { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"
import { bitwardenOrganizationCsvExportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationCsvExportExecute.js"
import { bitwardenOrganizationCsvFormat } from "../../../src/web/organizations/model/bitwardenOrganizationCsvFormat.js"
import { bitwardenOrganizationCsvImportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationCsvImportExecute.js"
import { bitwardenOrganizationCsvLossyWarning } from "../../../src/web/organizations/model/bitwardenOrganizationCsvLossyWarning.js"
import { bitwardenOrganizationCsvParse } from "../../../src/web/organizations/model/bitwardenOrganizationCsvParse.js"
import { bitwardenOrganizationJsonExportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationJsonExportExecute.js"
import { bitwardenOrganizationJsonFormat } from "../../../src/web/organizations/model/bitwardenOrganizationJsonFormat.js"
import { bitwardenOrganizationJsonImportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationJsonImportExecute.js"
import { bitwardenOrganizationJsonParse } from "../../../src/web/organizations/model/bitwardenOrganizationJsonParse.js"
import { organizationCipherMap } from "../../../src/web/organizations/model/organizationCipherMap.js"
import type { OrganizationImportRequest } from "../../../src/web/organizations/schemas/organizationImportRequestSchema.js"
import { bitwardenJsonPayloadSchema } from "../../../src/web/settings/model/bitwardenJsonPayloadSchema.js"
import organizationJsonFixture from "../../fixtures/bitwardenOrganizationJsonTask8.json"

const jsonFixture = JSON.stringify(organizationJsonFixture)
const csvFixtureUrl = new URL("../../fixtures/bitwardenOrganizationCsvTask8.csv", import.meta.url)

function invalidJsonPayload(change: (payload: Record<string, unknown>) => void): string {
  const payload = JSON.parse(jsonFixture) as Record<string, unknown>
  change(payload)
  return JSON.stringify(payload)
}

function organizationJsonPayloadWithOrganizationId(organizationId: string): string {
  return invalidJsonPayload((payload) => {
    for (const collection of payload.collections as Array<Record<string, unknown>>)
      collection.organizationId = organizationId
    for (const item of payload.items as Array<Record<string, unknown>>) item.organizationId = organizationId
  })
}

function sessionCreate(): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      accessToken: "organization-token",
      email: "test@example.com",
      encryptedUserKey: "encrypted-user-key",
      expiresAt: Date.now() + 60_000,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      userId: "user-id",
    }),
  } as ReturnType<typeof webAuthSessionCreate>
}

function organizationImportClientCreate(
  onImport: (organizationId: string, input: OrganizationImportRequest) => void,
): ReturnType<typeof organizationApiClientCreate> {
  return {
    organizationImport: async (organizationId: string, input: OrganizationImportRequest) => {
      onImport(organizationId, input)
      return resultCreate(undefined)
    },
  } as unknown as ReturnType<typeof organizationApiClientCreate>
}

function organizationExportClientCreate(
  onExport: () => { ciphers: Record<string, unknown>[]; collections: Record<string, unknown>[] },
): ReturnType<typeof organizationApiClientCreate> {
  return {
    organizationExport: async () => resultCreate(onExport()),
  } as unknown as ReturnType<typeof organizationApiClientCreate>
}

test("organization JSON validates collections and preserves all local cipher types", () => {
  const parsed = bitwardenOrganizationJsonParse(jsonFixture, { organizationId: "organization-test" })

  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data.collections.map((collection) => collection.name)).toEqual(["Engineering", "Shared"])
  expect(parsed.data.items.map((item) => item.type)).toEqual([1, 2, 3, 4])
  expect(parsed.data.items[0]?.collectionIds).toEqual(["collection-engineering", "collection-shared"])

  const formatted = bitwardenOrganizationJsonFormat(parsed.data, { organizationId: "organization-test" })
  expect(formatted.success).toBe(true)
  if (!formatted.success) return
  const roundTrip = bitwardenOrganizationJsonParse(formatted.data, { organizationId: "organization-test" })
  expect(roundTrip.success).toBe(true)
  if (!roundTrip.success) return
  expect(roundTrip.data.items[0]?.creationDate).toBe("2026-08-01T12:00:00.000Z")
  expect(roundTrip.data.items[1]?.creationDate).toBeUndefined()
  expect(v.safeParse(bitwardenJsonPayloadSchema, JSON.parse(formatted.data)).success).toBe(false)
})

test("organization JSON rejects bad collection relationships, folders, and organization ownership", () => {
  const duplicateCollection = invalidJsonPayload((payload) => {
    const collections = payload.collections as Array<Record<string, unknown>>
    collections[1] = { ...collections[1], id: collections[0]?.id }
  })
  const missingCollection = invalidJsonPayload((payload) => {
    const items = payload.items as Array<Record<string, unknown>>
    items[0] = { ...items[0], collectionIds: ["missing-collection"] }
  })
  const duplicateReference = invalidJsonPayload((payload) => {
    const items = payload.items as Array<Record<string, unknown>>
    items[0] = { ...items[0], collectionIds: ["collection-engineering", "collection-engineering"] }
  })
  const folderPayload = invalidJsonPayload((payload) => {
    payload.folders = []
  })
  const folderItem = invalidJsonPayload((payload) => {
    const items = payload.items as Array<Record<string, unknown>>
    items[0] = { ...items[0], folderId: "individual-folder" }
  })
  const mismatchedItem = invalidJsonPayload((payload) => {
    const items = payload.items as Array<Record<string, unknown>>
    items[0] = { ...items[0], organizationId: "other-organization" }
  })
  const mismatchedCollection = invalidJsonPayload((payload) => {
    const collections = payload.collections as Array<Record<string, unknown>>
    collections[0] = { ...collections[0], organizationId: "other-organization" }
  })
  const unsupportedType = invalidJsonPayload((payload) => {
    const items = payload.items as Array<Record<string, unknown>>
    items[0] = { ...items[0], type: 5 }
  })

  for (const input of [
    duplicateCollection,
    missingCollection,
    duplicateReference,
    folderPayload,
    folderItem,
    mismatchedItem,
    mismatchedCollection,
    unsupportedType,
  ])
    expect(bitwardenOrganizationJsonParse(input, { organizationId: "organization-test" }).success).toBe(false)
})

test("organization JSON import maps collections and encrypts all supported cipher types with the organization key", async () => {
  const organizationKey = new Uint8Array(64).fill(2)
  const personalKey = new Uint8Array(64).fill(1)
  let imported: OrganizationImportRequest | null = null
  const result = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate((_organizationId, input) => {
      imported = input
    }),
    organizationId: "organization-test",
    organizationKey,
    rawContent: jsonFixture,
    session: sessionCreate(),
  })

  expect(result).toMatchObject({ success: true, data: { cipherCount: 4, collectionCount: 2, warnings: [] } })
  expect(imported).not.toBeNull()
  if (imported === null) return
  expect(imported.collections).toEqual([
    { externalId: null, groups: [], id: null, name: "Engineering", users: [] },
    { externalId: "shared-external", groups: [], id: null, name: "Shared", users: [] },
  ])
  expect(imported.collectionRelationships).toEqual([
    { key: 0, value: 0 },
    { key: 0, value: 1 },
    { key: 1, value: 1 },
    { key: 2, value: 0 },
    { key: 3, value: 0 },
  ])
  expect(imported.ciphers.every((cipher) => cipher.key === null)).toBe(true)
  const organizationName = await extensionEncStringDecryptText(imported.ciphers[0]?.name, organizationKey)
  const personalName = await extensionEncStringDecryptText(imported.ciphers[0]?.name, personalKey)
  expect(organizationName).toMatchObject({ success: true, data: "Example Organization Login" })
  expect(personalName.success).toBe(false)
})

test("organization JSON import rejects trashed items before calling the import API", async () => {
  let importCallCount = 0
  const result = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate(() => {
      importCallCount += 1
    }),
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: invalidJsonPayload((payload) => {
      const items = payload.items as Array<Record<string, unknown>>
      if (items[0] !== undefined) items[0].deletedDate = "2026-08-31T11:00:00.000Z"
    }),
    session: sessionCreate(),
  })

  expect(result.success).toBe(false)
  expect(importCallCount).toBe(0)
})

test("organization JSON import remaps a cross-organization source to the selected organization", async () => {
  let imported: OrganizationImportRequest | null = null
  const sourceCollectionId = "00000000-0000-4000-8000-000000000899"
  let requestedOrganizationId: string | null = null
  const rawContent = invalidJsonPayload((payload) => {
    const collections = payload.collections as Array<Record<string, unknown>>
    const items = payload.items as Array<Record<string, unknown>>
    const sourceCollection = collections[0]
    if (sourceCollection !== undefined) sourceCollection.id = sourceCollectionId
    for (const item of items) {
      if (Array.isArray(item.collectionIds))
        item.collectionIds = item.collectionIds.map((collectionId) =>
          collectionId === "collection-engineering" ? sourceCollectionId : collectionId,
        )
    }
    for (const collection of collections) collection.organizationId = "source-organization"
    for (const item of items) item.organizationId = "source-organization"
  })
  const result = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate((organizationId, input) => {
      requestedOrganizationId = organizationId
      imported = input
    }),
    organizationId: "destination-organization",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent,
    session: sessionCreate(),
  })

  expect(result.success).toBe(true)
  expect(requestedOrganizationId).toBe("destination-organization")
  expect(imported).not.toBeNull()
  if (imported === null) return
  expect(imported.ciphers.every((cipher) => cipher.organizationId === "destination-organization")).toBe(true)
  expect(imported.collections.every((collection) => collection.id === null)).toBe(true)
})

test("organization JSON import accepts a source from the selected organization", async () => {
  let importCallCount = 0
  const result = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate(() => {
      importCallCount += 1
    }),
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: organizationJsonPayloadWithOrganizationId("organization-test"),
    session: sessionCreate(),
  })

  expect(result.success).toBe(true)
  expect(importCallCount).toBe(1)
})

test("organization JSON import ignores null ownership while checking non-null source consistency", async () => {
  let importCallCount = 0
  const payload = invalidJsonPayload((value) => {
    for (const collection of value.collections as Array<Record<string, unknown>>)
      collection.organizationId = "source-organization"
    for (const item of value.items as Array<Record<string, unknown>>) item.organizationId = "source-organization"
    const firstCollection = (value.collections as Array<Record<string, unknown>>)[0]
    const firstItem = (value.items as Array<Record<string, unknown>>)[0]
    if (firstCollection !== undefined) firstCollection.organizationId = null
    if (firstItem !== undefined) firstItem.organizationId = null
  })
  const result = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate(() => {
      importCallCount += 1
    }),
    organizationId: "destination-organization",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: payload,
    session: sessionCreate(),
  })

  expect(result.success).toBe(true)
  expect(importCallCount).toBe(1)
})

test("organization JSON import rejects mixed source organizations before calling the import API", async () => {
  let importCallCount = 0
  const mixedSourcePayload = invalidJsonPayload((payload) => {
    const items = payload.items as Array<Record<string, unknown>>
    const firstItem = items[0]
    if (firstItem !== undefined) firstItem.organizationId = "another-source-organization"
  })
  const result = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate(() => {
      importCallCount += 1
    }),
    organizationId: "destination-organization",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: mixedSourcePayload,
    session: sessionCreate(),
  })

  expect(result.success).toBe(false)
  expect(importCallCount).toBe(0)
})

test("organization JSON export decrypts an organization import without a personal key", async () => {
  const organizationKey = new Uint8Array(64).fill(2)
  let imported: OrganizationImportRequest | null = null
  const importResult = await bitwardenOrganizationJsonImportExecute({
    apiClient: organizationImportClientCreate((_organizationId, input) => {
      imported = input
    }),
    organizationId: "organization-test",
    organizationKey,
    rawContent: jsonFixture,
    session: sessionCreate(),
  })
  expect(importResult.success).toBe(true)
  expect(imported).not.toBeNull()
  if (imported === null) return

  const cipherKey = new Uint8Array(64).fill(4)
  const wrappedKeyResult = await bitwardenCipherStringEncrypt(cipherKey, organizationKey)
  expect(wrappedKeyResult.success).toBe(true)
  if (!wrappedKeyResult.success) return
  const wrappedCiphers: Record<string, unknown>[] = []
  for (const cipher of imported.ciphers) {
    const plainResult = await organizationCipherMap(cipher, (value) =>
      extensionEncStringDecryptText(value, organizationKey),
    )
    expect(plainResult.success).toBe(true)
    if (!plainResult.success) return
    const encryptedResult = await organizationCipherMap(plainResult.data, (value) =>
      extensionEncStringEncrypt(value, cipherKey),
    )
    expect(encryptedResult.success).toBe(true)
    if (!encryptedResult.success) return
    wrappedCiphers.push({ ...encryptedResult.data, key: wrappedKeyResult.data })
  }
  const deletedCipher = wrappedCiphers[0]
  if (deletedCipher !== undefined)
    wrappedCiphers.push({ ...deletedCipher, deletedDate: "2026-08-31T11:00:00.000Z", id: "deleted-cipher" })

  const exportResult = await bitwardenOrganizationJsonExportExecute({
    apiClient: {
      organizationExport: async () =>
        resultCreate({
          ciphers: wrappedCiphers,
          collections:
            imported?.collections.map((collection, index) => ({
              ...collection,
              id: organizationJsonFixture.collections[index]?.id ?? `collection-${index}`,
            })) ?? [],
        }),
    } as unknown as ReturnType<typeof organizationApiClientCreate>,
    organizationId: "organization-test",
    organizationKey,
    session: sessionCreate(),
  })

  expect(exportResult.success).toBe(true)
  if (!exportResult.success) return
  const exported = JSON.parse(exportResult.data.content) as typeof organizationJsonFixture
  expect(exported.collections.map((collection) => collection.name)).toEqual(["Engineering", "Shared"])
  expect(exported.items.map((item) => item.name)).toEqual([
    "Example Organization Login",
    "Example Organization Note",
    "Example Organization Card",
    "Example Organization Identity",
  ])
  expect(exported.items[0]?.creationDate).toBe("2026-08-01T12:00:00.000Z")
  expect(exported.items[1]?.creationDate).toBeNull()
  expect(exported.items[0]?.login).toMatchObject({
    password: "not-a-real-password",
    uris: [{ match: 0, uri: "https://example.test" }],
    username: "user@example.test",
  })
  expect(exported.items[1]?.secureNote).toEqual({ type: 0 })
  expect(exported.items[2]?.card).toMatchObject({ number: "4111111111111111" })
  expect(exported.items[3]?.identity).toMatchObject({ email: "user@example.test" })
})

test("organization JSON execution rejects missing or incorrect keys and never calls import for invalid payloads", async () => {
  let importCallCount = 0
  let imported: OrganizationImportRequest | null = null
  const apiClient = organizationImportClientCreate(() => {
    importCallCount += 1
  })
  const captureApiClient = organizationImportClientCreate((_organizationId, input) => {
    imported = input
  })
  const missingKey = await bitwardenOrganizationJsonImportExecute({
    apiClient,
    organizationId: "organization-test",
    rawContent: jsonFixture,
    session: sessionCreate(),
  })
  expect(missingKey.success).toBe(false)
  expect(importCallCount).toBe(0)

  const invalidPayload = await bitwardenOrganizationJsonImportExecute({
    apiClient,
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: invalidJsonPayload((payload) => {
      const items = payload.items as Array<Record<string, unknown>>
      items[0] = { ...items[0], collectionIds: ["missing-collection"] }
    }),
    session: sessionCreate(),
  })
  expect(invalidPayload.success).toBe(false)
  expect(importCallCount).toBe(0)

  const validImport = await bitwardenOrganizationJsonImportExecute({
    apiClient: captureApiClient,
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: jsonFixture,
    session: sessionCreate(),
  })
  expect(validImport.success).toBe(true)
  expect(imported).not.toBeNull()
  if (imported === null) return

  const wrongKeyExport = await bitwardenOrganizationJsonExportExecute({
    apiClient: {
      organizationExport: async () =>
        resultCreate({
          ciphers: imported?.ciphers ?? [],
          collections:
            imported?.collections.map((collection, index) => ({
              ...collection,
              id: organizationJsonFixture.collections[index]?.id ?? `collection-${index}`,
            })) ?? [],
        }),
    } as unknown as ReturnType<typeof organizationApiClientCreate>,
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(3),
    session: sessionCreate(),
  })
  expect(wrongKeyExport.success).toBe(false)
})

test("organization CSV uses collection header, collection lists, and shared field adapters", async () => {
  const fixture = await Bun.file(csvFixtureUrl).text()
  const parsed = bitwardenOrganizationCsvParse(fixture.replaceAll("\n", "\r\n"))

  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data).toHaveLength(2)
  expect(parsed.data[0]).toMatchObject({
    collections: ["Engineering", "Shared"],
    favorite: true,
    type: "login",
    name: 'Portal, "Primary"',
    reprompt: 1,
    login_uri: "https://example.test",
  })
  expect(parsed.data[1]).toMatchObject({ collections: ["Shared"], type: "note", login_uri: null })

  const formatted = bitwardenOrganizationCsvFormat(parsed.data)
  expect(formatted.success).toBe(true)
  if (!formatted.success) return
  expect(formatted.data.startsWith("collections,favorite,type,")).toBe(true)
  expect(formatted.data).toContain('"Engineering, Shared"')
  expect(bitwardenOrganizationCsvParse(formatted.data).success).toBe(true)
})

test("organization CSV remains login/note-only and requires collections", () => {
  const header =
    "collections,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp"
  const validLogin = "Engineering,0,login,Portal,,,,0,,,,"
  const invalidInputs = [
    `${header}\n,0,login,Portal,,,,0,,,,`,
    `${header}\nEngineering,0,card,Card,,,,0,,,,`,
    `${header}\nEngineering,0,note,Note,,,,0,https://example.test,,,`,
    `${header}\nEngineering,0,login,Portal,,,,0,,,`,
    `folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n${validLogin}`,
  ]

  for (const input of invalidInputs) expect(bitwardenOrganizationCsvParse(input).success).toBe(false)
})

test("organization CSV import maps multiple and unknown collection names before encrypting", async () => {
  const rawContent = [
    "collections,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp",
    '"Engineering, Shared",1,login,"Portal, ""Primary""","First line\nSecond line",,1,https://example.test,user@example.test,password,totp',
    "Unknown,0,note,Runbook,Note,,0,,,,",
  ].join("\n")
  const organizationKey = new Uint8Array(64).fill(2)
  let imported: OrganizationImportRequest | null = null
  const result = await bitwardenOrganizationCsvImportExecute({
    apiClient: organizationImportClientCreate((_organizationId, input) => {
      imported = input
    }),
    organizationId: "organization-test",
    organizationKey,
    rawContent,
    session: sessionCreate(),
  })

  expect(result).toMatchObject({
    success: true,
    data: { cipherCount: 2, collectionCount: 3, warnings: [bitwardenOrganizationCsvLossyWarning] },
  })
  expect(imported).not.toBeNull()
  if (imported === null) return
  expect(imported.collections).toEqual([
    { externalId: null, groups: [], id: null, name: "Engineering", users: [] },
    { externalId: null, groups: [], id: null, name: "Shared", users: [] },
    { externalId: null, groups: [], id: null, name: "Unknown", users: [] },
  ])
  expect(imported.collectionRelationships).toEqual([
    { key: 0, value: 0 },
    { key: 0, value: 1 },
    { key: 1, value: 2 },
  ])
  const name = await extensionEncStringDecryptText(imported.ciphers[0]?.name, organizationKey)
  expect(name).toMatchObject({ success: true, data: 'Portal, "Primary"' })
  const notes = await extensionEncStringDecryptText(imported.ciphers[0]?.notes, organizationKey)
  expect(notes).toMatchObject({ success: true, data: "First line\nSecond line" })
})

test("organization CSV import rejects malformed relationships before calling the import API", async () => {
  let importCallCount = 0
  const apiClient = organizationImportClientCreate(() => {
    importCallCount += 1
  })
  const missingKey = await bitwardenOrganizationCsvImportExecute({
    apiClient,
    organizationId: "organization-test",
    rawContent: await Bun.file(csvFixtureUrl).text(),
    session: sessionCreate(),
  })
  expect(missingKey.success).toBe(false)
  expect(importCallCount).toBe(0)

  const invalidCsv =
    "collections,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n" +
    '"Engineering, Engineering",1,login,Portal,,,,0,,,,\n'
  const result = await bitwardenOrganizationCsvImportExecute({
    apiClient,
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    rawContent: invalidCsv,
    session: sessionCreate(),
  })

  expect(result.success).toBe(false)
  expect(importCallCount).toBe(0)
})

test("organization CSV export maps collection IDs, omits unsupported types, and round-trips values", async () => {
  const organizationKey = new Uint8Array(64).fill(2)
  let imported: OrganizationImportRequest | null = null
  const importResult = await bitwardenOrganizationCsvImportExecute({
    apiClient: organizationImportClientCreate((_organizationId, input) => {
      imported = input
    }),
    organizationId: "organization-test",
    organizationKey,
    rawContent: await Bun.file(csvFixtureUrl).text(),
    session: sessionCreate(),
  })
  expect(importResult.success).toBe(true)
  expect(imported).not.toBeNull()
  if (imported === null) return
  const importedPayload = imported

  const collectionIds = ["collection-engineering", "collection-shared"]
  const relationshipsByCipher = new Map<number, number[]>()
  for (const relationship of importedPayload.collectionRelationships) {
    const indexes = relationshipsByCipher.get(relationship.key) ?? []
    indexes.push(relationship.value)
    relationshipsByCipher.set(relationship.key, indexes)
  }
  const exportResult = await bitwardenOrganizationCsvExportExecute({
    apiClient: organizationExportClientCreate(() => ({
      ciphers: [
        ...importedPayload.ciphers.map((cipher, index) => ({
          ...cipher,
          collectionIds: (relationshipsByCipher.get(index) ?? []).map(
            (collectionIndex) => collectionIds[collectionIndex],
          ),
          id: `cipher-${index}`,
        })),
        {
          ...importedPayload.ciphers[0],
          collectionIds: [collectionIds[0]],
          deletedDate: "2026-08-31T11:00:00.000Z",
          id: "deleted-cipher",
        },
        { collectionIds: [collectionIds[0]], id: "card", organizationId: "organization-test", type: 3 },
      ],
      collections: [
        { id: collectionIds[0], name: "Engineering", organizationId: "organization-test" },
        { id: collectionIds[1], name: "Shared", organizationId: "organization-test" },
      ],
    })),
    organizationId: "organization-test",
    organizationKey,
    session: sessionCreate(),
  })

  expect(exportResult).toMatchObject({
    success: true,
    data: { cipherCount: 2, collectionCount: 2, skippedCipherCount: 1 },
  })
  if (!exportResult.success) return
  expect(exportResult.data.warnings).toContain(
    "1 organization cipher was omitted because organization CSV supports login and secure-note items only.",
  )
  const parsed = bitwardenOrganizationCsvParse(exportResult.data.content)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data).toMatchObject([
    {
      collections: ["Engineering", "Shared"],
      name: 'Portal, "Primary"',
      notes: "First line\nSecond line",
      type: "login",
    },
    { collections: ["Shared"], name: "Runbook", notes: "Sanitized secure note", type: "note" },
  ])
})

test("organization CSV export rejects unknown collections and ambiguous collection names", async () => {
  const apiClient = organizationExportClientCreate(() => ({
    ciphers: [
      {
        collectionIds: ["missing-collection"],
        organizationId: "organization-test",
        type: 1,
      },
    ],
    collections: [{ id: "collection-1", name: "Engineering", organizationId: "organization-test" }],
  }))
  const unknownCollection = await bitwardenOrganizationCsvExportExecute({
    apiClient,
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    session: sessionCreate(),
  })
  expect(unknownCollection.success).toBe(false)

  const ambiguousCollection = await bitwardenOrganizationCsvExportExecute({
    apiClient: organizationExportClientCreate(() => ({
      ciphers: [],
      collections: [{ id: "collection-1", name: "Engineering, Shared", organizationId: "organization-test" }],
    })),
    organizationId: "organization-test",
    organizationKey: new Uint8Array(64).fill(2),
    session: sessionCreate(),
  })
  expect(ambiguousCollection.success).toBe(false)
})
