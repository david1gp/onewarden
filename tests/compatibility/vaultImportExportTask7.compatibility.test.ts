import { afterEach, expect, test } from "bun:test"
import { cipherSave } from "../../src/server/contexts/ciphers/cipherSave.js"
import { identityConfigCreate } from "../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../src/server/contexts/identity/identityTokenBundleCreate.js"
import { identityUserSave } from "../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../src/server/database/database.js"
import { databaseClose } from "../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { bitwardenCipherStringEncrypt } from "../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../src/shared/identifier/identifierTestCreate.js"
import type { webAuthSessionCreate } from "../../src/web/auth/model/webAuthSessionCreate.js"
import { bitwardenCsvParse } from "../../src/web/settings/model/bitwardenCsvParse.js"
import { bitwardenPortableEncryptedJsonEnvelopeDecrypt } from "../../src/web/settings/model/bitwardenPortableEncryptedJsonEnvelopeDecrypt.js"
import { vaultExportExecute } from "../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../src/web/settings/model/webSettingsApiClientCreate.js"
import task2Fixture from "../fixtures/bitwardenJsonTask2.json"
import portableFixtures from "../fixtures/bitwardenPortableEncryptedJsonTask4.json"
import { identityTestDeviceCreate } from "../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const userKey = new Uint8Array(64)
const userUuid = "import-export-user"
const date = "2026-08-31T12:00:00.000Z"
const csvFixtureUrl = new URL("../fixtures/bitwardenCsvTask3.csv", import.meta.url)
const databases: DatabaseConnection[] = []

async function encrypted(value: string): Promise<string> {
  const result = await bitwardenCipherStringEncrypt(value, userKey)
  expect(result.success).toBe(true)
  return result.success ? result.data : ""
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)

  const user = identityTestUserCreate(userUuid, { name: "Import/export user", passwordIterations: 600_000 })
  const device = identityTestDeviceCreate(user.uuid, {
    uuid: "import-export-device",
    name: "Import/export device",
    pushUuid: null,
    pushToken: null,
  })
  const clock = clockTestCreate(date)
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clock, false).success).toBe(true)
  expect(
    cipherSave(database, {
      uuid: "existing-cipher",
      createdAt: date,
      updatedAt: date,
      userUuid,
      organizationUuid: null,
      key: null,
      type: 1,
      name: await encrypted("Existing login"),
      notes: await encrypted("Existing notes"),
      fields: "[]",
      data: JSON.stringify({
        uris: [{ uri: await encrypted("https://existing.example"), match: 0 }],
        username: await encrypted("existing-user"),
        password: await encrypted("existing-password"),
        totp: null,
      }),
      passwordHistory: null,
      deletedAt: null,
      reprompt: 0,
    }).success,
  ).toBe(true)

  const config = identityConfigCreate()
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "import-export-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)

  return {
    app: serverAppCreate({
      clock,
      database,
      identity: {
        clock,
        config,
        database,
        identifier: identifierTestCreate([
          "json-folder",
          "json-login",
          "json-note",
          "json-card",
          "json-identity",
          "csv-folder",
          "csv-login",
          "csv-note",
          "portable-folder",
          "portable-login",
        ]),
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example",
      },
    }),
    database,
    token: tokenResult.data.accessToken,
  }
}

function sessionCreate(accessToken: string): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      email: `${userUuid}@example.com`,
      accessToken,
      refreshToken: "test-refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
      userId: userUuid,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "akey",
    }),
    getUserKey: () => userKey,
  } as ReturnType<typeof webAuthSessionCreate>
}

function apiClientCreate(app: ReturnType<typeof serverAppCreate>) {
  return webSettingsApiClientCreate({
    baseUrl: "https://vault.example",
    fetch: async (input, init) => app.request(String(input), init),
  })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("Bitwarden fixtures cross adapters, client, and server with additive round trips", async () => {
  const context = await contextCreate()
  const session = sessionCreate(context.token)
  const apiClient = apiClientCreate(context.app)

  const jsonImport = await vaultImportExecute({
    session,
    rawContent: JSON.stringify(task2Fixture),
    format: "json",
    apiClient,
  })
  expect(jsonImport).toMatchObject({ success: true, data: { cipherCount: 4, folderCount: 1, warnings: [] } })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 5 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM folders").get()).toEqual({ count: 1 })

  const jsonExport = await vaultExportExecute({ session, format: "json-decrypted", apiClient })
  expect(jsonExport.success).toBe(true)
  if (!jsonExport.success) return
  const jsonPayload = JSON.parse(jsonExport.data.content) as typeof task2Fixture
  expect(jsonPayload.folders).toHaveLength(1)
  expect(jsonPayload.items).toHaveLength(5)
  expect(jsonPayload.items.map((item) => item.name)).toEqual(
    expect.arrayContaining(["Existing login", "Example Login", "Example Note", "Example Card", "Example Identity"]),
  )
  expect(jsonPayload.items.find((item) => item.name === "Example Login")).toMatchObject({
    favorite: true,
    reprompt: 1,
    login: {
      uris: [
        { uri: "https://example.test", match: 0 },
        { uri: "https://login.example.test", match: 5 },
      ],
    },
  })

  const csvImport = await vaultImportExecute({
    session,
    rawContent: await Bun.file(csvFixtureUrl).text(),
    format: "csv",
    apiClient,
  })
  expect(csvImport).toMatchObject({ success: true, data: { cipherCount: 2, folderCount: 1 } })
  if (!csvImport.success) return
  expect(csvImport.data.warnings).toHaveLength(1)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 7 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM folders").get()).toEqual({ count: 2 })

  const csvExport = await vaultExportExecute({ session, format: "csv-decrypted", apiClient })
  expect(csvExport.success).toBe(true)
  if (!csvExport.success) return
  const csvPayload = bitwardenCsvParse(csvExport.data.content)
  expect(csvPayload.success).toBe(true)
  if (!csvPayload.success) return
  expect(csvPayload.data).toHaveLength(5)
  expect(csvPayload.data.every((record) => record.type === "login" || record.type === "note")).toBe(true)
  expect(csvPayload.data.map((record) => record.name)).toEqual(
    expect.arrayContaining(["Existing login", "Example Login", "Example Note", 'Portal, "Primary"', "Secure Note"]),
  )

  const portableImport = await vaultImportExecute({
    session,
    rawContent: JSON.stringify(portableFixtures.pbkdf2),
    format: "json",
    password: "fixture-password",
    apiClient,
  })
  expect(portableImport).toMatchObject({ success: true, data: { cipherCount: 1, folderCount: 1, warnings: [] } })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 8 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM folders").get()).toEqual({ count: 3 })

  const portableExport = await vaultExportExecute({
    session,
    format: "json-encrypted",
    password: "fixture-password",
    apiClient,
  })
  expect(portableExport.success).toBe(true)
  if (!portableExport.success) return
  const portablePayload = await bitwardenPortableEncryptedJsonEnvelopeDecrypt(
    JSON.parse(portableExport.data.content),
    "fixture-password",
  )
  expect(portablePayload.success).toBe(true)
  if (!portablePayload.success) return
  expect(portablePayload.data.folders).toHaveLength(3)
  expect(portablePayload.data.items).toHaveLength(8)
  expect(portablePayload.data.items.map((item) => item.name)).toEqual(
    expect.arrayContaining(["Existing login", "Example Login", 'Portal, "Primary"', "Fixture Login"]),
  )
})
