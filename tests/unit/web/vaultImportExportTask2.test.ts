import { expect, test } from "bun:test"
import * as v from "valibot"
import { extensionFido2CredentialEncrypt } from "../../../src/extension/crypto/extensionFido2CredentialEncrypt.js"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import {
  type BitwardenJsonPayload,
  bitwardenJsonPayloadSchema,
} from "../../../src/web/settings/model/bitwardenJsonPayloadSchema.js"
import { vaultExportExecute } from "../../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"
import task2Fixture from "../../fixtures/bitwardenJsonTask2.json"

const userKey = new Uint8Array(64)

type FixtureItem = (typeof task2Fixture.items)[number]

function testSession(): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      email: "user@example.test",
      accessToken: "test-token",
      refreshToken: "test-refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
      userId: "user-id",
      kdf: 0,
      kdfIterations: 1_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "wrapped-user-key",
    }),
    getUserKey: () => userKey,
  } as ReturnType<typeof webAuthSessionCreate>
}

async function encrypted(value: string | null | undefined): Promise<string | null> {
  if (value === null || value === undefined) return null
  const result = await bitwardenCipherStringEncrypt(value, userKey)
  expect(result.success).toBe(true)
  return result.success ? result.data : null
}

async function encryptedItem(item: FixtureItem): Promise<Record<string, unknown>> {
  const login = item.login
  const card = item.card
  const identity = item.identity
  const encryptedFido2Credentials =
    login?.fido2Credentials === undefined || login.fido2Credentials === null
      ? login?.fido2Credentials
      : await Promise.all(
          login.fido2Credentials.map(async (credential) => {
            const result = await extensionFido2CredentialEncrypt(credential, userKey)
            expect(result.success).toBe(true)
            return result.success ? result.data : null
          }),
        )
  return {
    id: item.id,
    organizationId: null,
    folderId: item.folderId,
    type: item.type,
    reprompt: item.reprompt,
    name: await encrypted(item.name),
    notes: await encrypted(item.notes),
    favorite: item.favorite,
    login:
      login === null || login === undefined
        ? null
        : {
            uris: await Promise.all(
              (login.uris ?? []).map(async (uri) => ({ uri: await encrypted(uri.uri), match: uri.match ?? null })),
            ),
            username: await encrypted(login.username),
            password: await encrypted(login.password),
            totp: await encrypted(login.totp),
            passwordRevisionDate: login.passwordRevisionDate,
            fido2Credentials: encryptedFido2Credentials,
          },
    secureNote: item.secureNote,
    card:
      card === null || card === undefined
        ? null
        : {
            cardholderName: await encrypted(card.cardholderName),
            brand: await encrypted(card.brand),
            number: await encrypted(card.number),
            expMonth: await encrypted(card.expMonth),
            expYear: await encrypted(card.expYear),
            code: await encrypted(card.code),
          },
    identity:
      identity === null || identity === undefined
        ? null
        : {
            title: await encrypted(identity.title),
            firstName: await encrypted(identity.firstName),
            middleName: await encrypted(identity.middleName),
            lastName: await encrypted(identity.lastName),
            address1: await encrypted(identity.address1),
            address2: await encrypted(identity.address2),
            address3: await encrypted(identity.address3),
            city: await encrypted(identity.city),
            state: await encrypted(identity.state),
            postalCode: await encrypted(identity.postalCode),
            country: await encrypted(identity.country),
            company: await encrypted(identity.company),
            email: await encrypted(identity.email),
            phone: await encrypted(identity.phone),
            ssn: await encrypted(identity.ssn),
            username: await encrypted(identity.username),
            passportNumber: await encrypted(identity.passportNumber),
            licenseNumber: await encrypted(identity.licenseNumber),
          },
    fields: await Promise.all(
      (item.fields ?? []).map(async (field) => ({
        name: await encrypted(field.name),
        value: await encrypted(field.value),
        type: field.type,
        linkedId: field.linkedId,
      })),
    ),
    passwordHistory: await Promise.all(
      (item.passwordHistory ?? []).map(async (entry) => ({
        password: (await encrypted(entry.password)) ?? "",
        lastUsedDate: entry.lastUsedDate,
      })),
    ),
    creationDate: item.creationDate,
    revisionDate: item.revisionDate,
    deletedDate: item.deletedDate,
    archivedDate: item.archivedDate,
  }
}

function apiClientCreate(options: { sync?: Record<string, unknown>; imported?: { value: unknown } }) {
  return webSettingsApiClientCreate({
    fetch: async (input, init) => {
      const url = String(input)
      if (url.endsWith("/api/sync")) {
        return new Response(JSON.stringify(options.sync), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      if (url.endsWith("/api/ciphers/import")) {
        options.imported!.value = JSON.parse(String(init?.body ?? ""))
        return new Response(JSON.stringify({ revisionDate: "2026-08-31T12:00:00.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return new Response("Not found", { status: 404 })
    },
  })
}

test("validated Bitwarden JSON import preserves supported types, relationships, and fields", async () => {
  const imported = { value: null as unknown }
  const result = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(task2Fixture),
    format: "json",
    apiClient: apiClientCreate({ imported }),
  })

  expect(result.success).toBe(true)
  expect(imported.value).toMatchObject({
    folders: [{ id: null }],
    folderRelationships: [
      { key: 0, value: 0 },
      { key: 1, value: 0 },
      { key: 2, value: 0 },
      { key: 3, value: 0 },
    ],
  })
  if (!result.success || imported.value === null || typeof imported.value !== "object") return

  const payload = imported.value as { ciphers: Array<Record<string, unknown>> }
  const login = payload.ciphers[0]
  if (login === undefined) return
  expect(login).toMatchObject({
    type: 1,
    favorite: true,
    reprompt: 1,
    archivedDate: "2026-08-31T10:00:00.000Z",
  })
  expect(login.fields).toEqual([
    { name: expect.any(String), value: expect.any(String), type: 0, linkedId: null },
    { name: expect.any(String), value: expect.any(String), type: 1, linkedId: 2 },
  ])
  expect(login.login).toMatchObject({
    uris: [{ match: 0 }, { match: 5 }],
    passwordRevisionDate: "2026-08-30T12:00:00.000Z",
    fido2Credentials: [{ credentialId: expect.stringMatching(/^2\./) }],
  })
  expect(login.passwordHistory).toEqual([
    { password: expect.stringMatching(/^2\./), lastUsedDate: "2026-08-29T12:00:00.000Z" },
  ])
  expect(payload.ciphers[1]?.secureNote).toEqual({ type: 0 })
  expect(payload.ciphers[2]?.card).toMatchObject({ brand: expect.any(String) })
  expect(payload.ciphers[3]?.identity).toMatchObject({ address3: expect.any(String) })
})

test("validated Bitwarden JSON export round-trips supported data and excludes organization and trashed items", async () => {
  const encryptedItems = await Promise.all(task2Fixture.items.map(encryptedItem))
  const sync = {
    folders: [{ id: "folder-personal", name: await encrypted("Personal") }],
    ciphers: [
      ...encryptedItems,
      { ...encryptedItems[0], id: "organization-item", organizationId: "organization-id" },
      { ...encryptedItems[0], id: "trashed-item", deletedDate: "2026-08-31T11:00:00.000Z" },
    ],
  }
  const result = await vaultExportExecute({
    session: testSession(),
    format: "json-decrypted",
    apiClient: apiClientCreate({ sync }),
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  const payload = JSON.parse(result.data.content) as typeof task2Fixture
  expect(payload.items).toHaveLength(4)
  expect(payload.items.map((item) => item.type)).toEqual([1, 2, 3, 4])
  expect(payload.items[0]?.login?.uris).toEqual([
    { uri: "https://example.test", match: 0 },
    { uri: "https://login.example.test", match: 5 },
  ])
  expect(payload.items[0]?.fields?.[1]).toMatchObject({ type: 1, linkedId: 2 })
  expect(payload.items[0]?.passwordHistory?.[0]?.password).toBe("old-not-a-real-password")
  expect(payload.items[0]?.favorite).toBe(true)
  expect(payload.items[0]?.reprompt).toBe(1)
  expect(payload.items[3]?.identity?.address3).toBe("Mailbox 3")
  expect(payload.items[0]?.creationDate).toBe("2026-08-01T12:00:00.000Z")
  expect(payload.items[0]?.archivedDate).toBe("2026-08-31T10:00:00.000Z")
  expect(payload.items[0]?.login?.fido2Credentials?.[0]?.counter).toBe(7)
})

test("vault exports omit attachment metadata and URLs for every supported format", async () => {
  const encryptedItems = await Promise.all(task2Fixture.items.map(encryptedItem))
  const sync = {
    folders: [{ id: "folder-personal", name: await encrypted("Personal") }],
    ciphers: [
      {
        ...encryptedItems[0],
        attachments: [
          {
            fileName: "attachment-secret-name",
            id: "attachment-secret-id",
            key: "attachment-secret-key",
            url: "https://vault.example/attachments/cipher-id/attachment-secret-id?token=attachment-secret-token",
          },
        ],
      },
      ...encryptedItems.slice(1),
    ],
  }

  for (const format of ["json-decrypted", "csv-decrypted", "json-encrypted"] as const) {
    const result = await vaultExportExecute({
      session: testSession(),
      format,
      password: format === "json-encrypted" ? "export-password" : undefined,
      apiClient: apiClientCreate({ sync }),
    })

    expect(result.success).toBe(true)
    if (!result.success) continue
    expect(result.data.content).not.toContain("attachment-secret-name")
    expect(result.data.content).not.toContain("attachment-secret-id")
    expect(result.data.content).not.toContain("attachment-secret-key")
    expect(result.data.content).not.toContain("https://vault.example/attachments/")
    expect(result.data.content).not.toContain("attachment-secret-token")
  }
})

test("validated Bitwarden JSON FIDO2 counter boundaries round-trip and invalid counters never persist", async () => {
  for (const counter of [0, Number.MAX_SAFE_INTEGER]) {
    const payload = structuredClone(task2Fixture) as BitwardenJsonPayload
    payload.items[0]!.login!.fido2Credentials![0]!.counter = counter
    expect(v.safeParse(bitwardenJsonPayloadSchema, payload).success).toBe(true)

    const imported = { value: null as unknown }
    const importResult = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(payload),
      format: "json",
      apiClient: apiClientCreate({ imported }),
    })
    expect(importResult.success).toBe(true)
    if (!importResult.success || imported.value === null || typeof imported.value !== "object") return

    const importedPayload = imported.value as {
      folders: Array<Record<string, unknown>>
      ciphers: Array<Record<string, unknown>>
    }
    const exportResult = await vaultExportExecute({
      session: testSession(),
      format: "json-decrypted",
      apiClient: apiClientCreate({
        sync: {
          folders: importedPayload.folders.map((folder, index) => ({ ...folder, id: `folder-${index}` })),
          ciphers: importedPayload.ciphers.map((cipher, index) => ({ ...cipher, id: `cipher-${index}` })),
        },
      }),
    })
    expect(exportResult.success).toBe(true)
    if (!exportResult.success) return
    const exportedPayload = JSON.parse(exportResult.data.content) as BitwardenJsonPayload
    expect(exportedPayload.items[0]!.login!.fido2Credentials![0]!.counter).toBe(counter)
  }

  for (const counter of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const payload = structuredClone(task2Fixture) as BitwardenJsonPayload
    payload.items[0]!.login!.fido2Credentials![0]!.counter = counter
    expect(v.safeParse(bitwardenJsonPayloadSchema, payload).success).toBe(false)

    const imported = { value: null as unknown }
    const importResult = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(payload),
      format: "json",
      apiClient: apiClientCreate({ imported }),
    })
    expect(importResult.success).toBe(false)
    expect(imported.value).toBeNull()
  }
})

test("validated Bitwarden JSON import and export distinguish empty strings from null", async () => {
  const payload = structuredClone(task2Fixture) as BitwardenJsonPayload
  payload.folders[0]!.name = ""
  payload.items[0]!.name = ""
  payload.items[0]!.notes = ""
  delete payload.items[0]!.login!.fido2Credentials
  payload.items[0]!.login!.uris![0]!.uri = ""
  payload.items[0]!.login!.username = ""
  payload.items[0]!.login!.password = ""
  payload.items[0]!.login!.totp = ""
  payload.items[0]!.fields![0]!.name = ""
  payload.items[0]!.fields![0]!.value = ""
  payload.items[0]!.fields![1]!.name = null
  payload.items[0]!.fields![1]!.value = null
  payload.items[0]!.passwordHistory![0]!.password = ""
  payload.items[2]!.card!.brand = ""
  payload.items[2]!.card!.number = null
  payload.items[3]!.notes = ""
  payload.items[3]!.identity!.firstName = ""
  payload.items[3]!.identity!.middleName = null

  const imported = { value: null as unknown }
  const importResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(payload),
    format: "json",
    apiClient: apiClientCreate({ imported }),
  })

  expect(importResult.success).toBe(true)
  if (!importResult.success || imported.value === null || typeof imported.value !== "object") return

  const importedPayload = imported.value as {
    folders: Array<Record<string, unknown>>
    ciphers: Array<Record<string, unknown>>
  }
  expect(importedPayload.folders[0]?.name).toEqual(expect.any(String))
  expect(importedPayload.ciphers[0]?.notes).toEqual(expect.any(String))
  expect(importedPayload.ciphers[2]?.card).toMatchObject({ brand: expect.any(String), number: null })
  expect(importedPayload.ciphers[3]?.identity).toMatchObject({ firstName: expect.any(String), middleName: null })

  for (const item of payload.items) item.folderId = "folder-id"
  const roundTripSync = {
    folders: [{ id: "folder-id", name: await encrypted(payload.folders[0]!.name) }],
    ciphers: await Promise.all(payload.items.map((item) => encryptedItem(item as FixtureItem))),
  }

  const exportResult = await vaultExportExecute({
    session: testSession(),
    format: "json-decrypted",
    apiClient: apiClientCreate({
      sync: {
        ...roundTripSync,
      },
    }),
  })

  expect(exportResult.success).toBe(true)
  if (!exportResult.success) return
  const exportedPayload = JSON.parse(exportResult.data.content) as typeof task2Fixture
  expect(exportedPayload.folders[0]?.name).toBe("")
  expect(exportedPayload.items[0]).toMatchObject({
    name: "",
    notes: "",
  })
  expect(exportedPayload.items[0]?.login).toMatchObject({ username: "", password: "", totp: "" })
  expect(exportedPayload.items[0]?.login?.uris?.[0]?.uri).toBe("")
  expect(exportedPayload.items[0]?.fields?.[0]).toMatchObject({ name: "", value: "" })
  expect(exportedPayload.items[0]?.fields?.[1]).toMatchObject({ name: null, value: null })
  expect(exportedPayload.items[0]?.passwordHistory?.[0]?.password).toBe("")
  expect(exportedPayload.items[2]?.card).toMatchObject({ brand: "", number: null })
  expect(exportedPayload.items[3]).toMatchObject({ notes: "", identity: { firstName: "", middleName: null } })
})

test("validated Bitwarden JSON import rejects unsupported types and malformed folder references", async () => {
  const unsupported = structuredClone(task2Fixture)
  unsupported.items[0]!.type = 5
  const unsupportedResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(unsupported),
    format: "json",
    apiClient: apiClientCreate({ imported: { value: null } }),
  })
  expect(unsupportedResult.success).toBe(false)

  const missingFolder = structuredClone(task2Fixture)
  missingFolder.items[0]!.folderId = "missing-folder"
  const missingFolderResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(missingFolder),
    format: "json",
    apiClient: apiClientCreate({ imported: { value: null } }),
  })
  expect(missingFolderResult.success).toBe(false)

  const invalidMatch = structuredClone(task2Fixture)
  invalidMatch.items[0]!.login!.uris![0]!.match = 6
  const invalidMatchResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(invalidMatch),
    format: "json",
    apiClient: apiClientCreate({ imported: { value: null } }),
  })
  expect(invalidMatchResult.success).toBe(false)

  const duplicateFolder = structuredClone(task2Fixture)
  duplicateFolder.folders.push({ id: "folder-personal", name: "Duplicate" })
  const duplicateFolderResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(duplicateFolder),
    format: "json",
    apiClient: apiClientCreate({ imported: { value: null } }),
  })
  expect(duplicateFolderResult.success).toBe(false)
})

test("validated Bitwarden JSON item payloads match their type", async () => {
  const payload = structuredClone(task2Fixture) as BitwardenJsonPayload
  const payloadKeys = ["login", "secureNote", "card", "identity"] as const
  const matchingPayloadKeyByType = {
    1: "login",
    2: "secureNote",
    3: "card",
    4: "identity",
  } as const

  const omittedUnrelatedPayload = structuredClone(payload)
  for (const item of omittedUnrelatedPayload.items) {
    const matchingPayloadKey = matchingPayloadKeyByType[item.type]
    for (const payloadKey of payloadKeys) {
      if (payloadKey !== matchingPayloadKey) delete (item as Record<string, unknown>)[payloadKey]
    }
  }
  expect(v.safeParse(bitwardenJsonPayloadSchema, omittedUnrelatedPayload).success).toBe(true)

  const discriminatorCases = [
    { itemIndex: 0, matching: "login", wrong: "card", wrongValue: payload.items[2]!.card },
    { itemIndex: 1, matching: "secureNote", wrong: "identity", wrongValue: payload.items[3]!.identity },
    { itemIndex: 2, matching: "card", wrong: "login", wrongValue: payload.items[0]!.login },
    { itemIndex: 3, matching: "identity", wrong: "secureNote", wrongValue: payload.items[1]!.secureNote },
  ] as const

  for (const discriminatorCase of discriminatorCases) {
    const missingPayload = structuredClone(payload)
    delete (missingPayload.items[discriminatorCase.itemIndex] as Record<string, unknown>)[discriminatorCase.matching]
    expect(v.safeParse(bitwardenJsonPayloadSchema, missingPayload).success).toBe(false)

    const inconsistentPayload = structuredClone(payload)
    ;(inconsistentPayload.items[discriminatorCase.itemIndex] as Record<string, unknown>)[discriminatorCase.wrong] =
      structuredClone(discriminatorCase.wrongValue)
    expect(v.safeParse(bitwardenJsonPayloadSchema, inconsistentPayload).success).toBe(false)

    for (const invalidPayload of [missingPayload, inconsistentPayload]) {
      const imported = { value: null as unknown }
      const importResult = await vaultImportExecute({
        session: testSession(),
        rawContent: JSON.stringify(invalidPayload),
        format: "json",
        apiClient: apiClientCreate({ imported }),
      })
      expect(importResult.success).toBe(false)
      expect(imported.value).toBeNull()
    }
  }
})

test("validated Bitwarden JSON import accepts valid dates and rejects malformed dates", async () => {
  const valid = structuredClone(task2Fixture) as BitwardenJsonPayload
  valid.folders[0]!.revisionDate = "2026-08-28T01:00:00.123456+01:00"
  valid.items[0]!.login!.passwordRevisionDate = "2026-08-28T01:00:00.123456+01:00"
  valid.items[0]!.passwordHistory![0]!.lastUsedDate = "2026-08-28T01:00:00.123456+01:00"
  valid.items[0]!.creationDate = null
  valid.items[0]!.revisionDate = "2026-08-28T01:00:00Z"
  valid.items[0]!.deletedDate = null
  valid.items[0]!.archivedDate = null
  expect(v.safeParse(bitwardenJsonPayloadSchema, valid).success).toBe(true)

  const invalidPayloads = [
    (payload: typeof valid) => {
      payload.folders[0]!.revisionDate = "invalid"
    },
    (payload: typeof valid) => {
      payload.items[0]!.login!.passwordRevisionDate = "2026-02-30T00:00:00Z"
    },
    (payload: typeof valid) => {
      payload.items[0]!.passwordHistory![0]!.lastUsedDate = "invalid"
    },
    (payload: typeof valid) => {
      payload.items[0]!.creationDate = "invalid"
    },
    (payload: typeof valid) => {
      payload.items[0]!.revisionDate = "invalid"
    },
    (payload: typeof valid) => {
      payload.items[0]!.deletedDate = "invalid"
    },
    (payload: typeof valid) => {
      payload.items[0]!.archivedDate = "invalid"
    },
  ]

  for (const mutate of invalidPayloads) {
    const payload = structuredClone(valid)
    mutate(payload)
    expect(v.safeParse(bitwardenJsonPayloadSchema, payload).success).toBe(false)
    const result = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(payload),
      format: "json",
      apiClient: apiClientCreate({ imported: { value: null } }),
    })
    expect(result.success).toBe(false)
  }
})

test("validated Bitwarden JSON export rejects unsupported personal cipher types", async () => {
  const encryptedItems = await Promise.all(task2Fixture.items.map(encryptedItem))
  const unsupported = { ...encryptedItems[0], type: 5 }
  const result = await vaultExportExecute({
    session: testSession(),
    format: "json-decrypted",
    apiClient: apiClientCreate({
      sync: { folders: [], ciphers: [unsupported] },
    }),
  })

  expect(result.success).toBe(false)
})
