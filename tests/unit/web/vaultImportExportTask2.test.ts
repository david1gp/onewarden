import { expect, test } from "bun:test"
import { extensionFido2CredentialEncrypt } from "../../../src/extension/crypto/extensionFido2CredentialEncrypt.js"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
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
