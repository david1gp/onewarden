import { afterEach, expect, test } from "bun:test"
import { attachmentFileStorageAdapterCreate } from "../../src/server/contexts/attachments/attachmentFileStorageAdapterCreate.js"
import { attachmentSave } from "../../src/server/contexts/attachments/attachmentSave.js"
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
import { aesCbcEncrypt } from "../../src/shared/crypto/aesCbcEncrypt.js"
import { bitwardenCipherStringEncrypt } from "../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import { hmacSha256Digest } from "../../src/shared/crypto/hmacSha256Digest.js"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../src/shared/identifier/identifierTestCreate.js"
import type { webAuthSessionCreate } from "../../src/web/auth/model/webAuthSessionCreate.js"
import { bitwardenCsvParse } from "../../src/web/settings/model/bitwardenCsvParse.js"
import { bitwardenPortableEncryptedJsonEnvelopeDecrypt } from "../../src/web/settings/model/bitwardenPortableEncryptedJsonEnvelopeDecrypt.js"
import { vaultExportExecute } from "../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../src/web/settings/model/webSettingsApiClientCreate.js"
import accountFixture from "../fixtures/bitwardenAccountEncryptedJsonTask9.json"
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
  storage: ReturnType<typeof attachmentFileStorageAdapterCreate>
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
  const storage = attachmentFileStorageAdapterCreate()

  return {
    app: serverAppCreate({
      attachments: { storage },
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
    storage,
    token: tokenResult.data.accessToken,
  }
}

function sessionCreate(accessToken: string, sessionUserKey = userKey): ReturnType<typeof webAuthSessionCreate> {
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
    getUserKey: () => sessionUserKey,
  } as ReturnType<typeof webAuthSessionCreate>
}

function apiClientCreate(app: ReturnType<typeof serverAppCreate>, requests: string[] = []) {
  return webSettingsApiClientCreate({
    baseUrl: "https://vault.example",
    fetch: async (input, init) => {
      requests.push(`${init?.method ?? "GET"} ${String(input)}`)
      return app.request(String(input), init)
    },
  })
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
}

function zipEntryRead(bytes: Uint8Array): { path: string; data: Uint8Array }[] {
  const endOffset = bytes.byteLength - 22
  expect(readUint32(bytes, endOffset)).toBe(0x06054b50)
  const entryCount = readUint16(bytes, endOffset + 10)
  const centralDirectorySize = readUint32(bytes, endOffset + 12)
  const centralDirectoryOffset = readUint32(bytes, endOffset + 16)
  expect(centralDirectoryOffset + centralDirectorySize).toBe(endOffset)

  const decoder = new TextDecoder("utf-8", { fatal: true })
  const entries: { path: string; data: Uint8Array }[] = []
  let offset = centralDirectoryOffset
  for (let index = 0; index < entryCount; index += 1) {
    expect(readUint32(bytes, offset)).toBe(0x02014b50)
    const compressedSize = readUint32(bytes, offset + 20)
    const nameLength = readUint16(bytes, offset + 28)
    const extraLength = readUint16(bytes, offset + 30)
    const commentLength = readUint16(bytes, offset + 32)
    const localOffset = readUint32(bytes, offset + 42)
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength)
    expect(readUint32(bytes, localOffset)).toBe(0x04034b50)
    expect(readUint16(bytes, localOffset + 8)).toBe(0)
    expect(readUint16(bytes, localOffset + 26)).toBe(nameLength)
    const dataOffset = localOffset + 30 + nameLength
    entries.push({ path: decoder.decode(nameBytes), data: bytes.slice(dataOffset, dataOffset + compressedSize) })
    offset += 46 + nameLength + extraLength + commentLength
  }
  expect(offset).toBe(centralDirectoryOffset + centralDirectorySize)
  return entries
}

async function attachmentCiphertextCreate(plaintext: Uint8Array, attachmentKey: Uint8Array): Promise<Uint8Array> {
  const iv = new Uint8Array(16).fill(7)
  const encryptionKey = attachmentKey.slice(0, 32)
  const encryptedResult = await aesCbcEncrypt(plaintext, encryptionKey, iv)
  encryptionKey.fill(0)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return new Uint8Array()

  const authenticationInput = new Uint8Array(iv.byteLength + encryptedResult.data.byteLength)
  authenticationInput.set(iv)
  authenticationInput.set(encryptedResult.data, iv.byteLength)
  const authenticationKey = attachmentKey.slice(32)
  const macResult = await hmacSha256Digest(authenticationKey, authenticationInput)
  authenticationKey.fill(0)
  authenticationInput.fill(0)
  expect(macResult.success).toBe(true)
  if (!macResult.success) return new Uint8Array()

  const encrypted = new Uint8Array(1 + iv.byteLength + macResult.data.byteLength + encryptedResult.data.byteLength)
  encrypted[0] = 2
  encrypted.set(iv, 1)
  encrypted.set(macResult.data, 1 + iv.byteLength)
  encrypted.set(encryptedResult.data, 1 + iv.byteLength + macResult.data.byteLength)
  encryptedResult.data.fill(0)
  macResult.data.fill(0)
  return encrypted
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("same-account encrypted JSON export/import succeeds and rejects a wrong account key", async () => {
  const context = await contextCreate()
  const requests: string[] = []
  const apiClient = apiClientCreate(context.app, requests)
  const exportResult = await vaultExportExecute({
    session: sessionCreate(context.token),
    format: "json-account-encrypted",
    apiClient,
  })

  expect(exportResult.success).toBe(true)
  if (!exportResult.success) return
  expect(JSON.parse(exportResult.data.content)).toMatchObject({ encrypted: true, passwordProtected: false })

  const importResult = await vaultImportExecute({
    session: sessionCreate(context.token),
    rawContent: exportResult.data.content,
    format: "json",
    apiClient,
  })
  expect(importResult).toMatchObject({ success: true, data: { cipherCount: 1, folderCount: 0, warnings: [] } })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 2 })

  const requestCount = requests.length
  const wrongAccountImport = await vaultImportExecute({
    session: sessionCreate(context.token, new Uint8Array(64).fill(9)),
    rawContent: exportResult.data.content,
    format: "json",
    apiClient,
  })
  expect(wrongAccountImport.success).toBe(false)
  if (!wrongAccountImport.success) expect(wrongAccountImport.errorMessage).toContain("Account-restricted")
  expect(requests.length).toBe(requestCount)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 2 })
})

test("same-account encrypted JSON imports through the additive personal server path", async () => {
  const context = await contextCreate()
  const result = await vaultImportExecute({
    session: sessionCreate(context.token),
    rawContent: JSON.stringify(accountFixture),
    format: "json",
    apiClient: apiClientCreate(context.app),
  })

  expect(result).toMatchObject({ success: true, data: { cipherCount: 1, folderCount: 1, warnings: [] } })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 2 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM folders").get()).toEqual({ count: 1 })
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
    filePassword: "fixture-password",
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

  const compatibleJsonExport = await vaultExportExecute({ session, format: "json-decrypted", apiClient })
  expect(compatibleJsonExport.success).toBe(true)
  if (!compatibleJsonExport.success) return

  const plaintextAttachment = new Uint8Array([0, 255, 1, 254])
  const attachmentFileName = await encrypted("exported.bin")
  const attachmentCiphertext = await attachmentCiphertextCreate(plaintextAttachment, userKey)
  expect(
    attachmentSave(context.database, {
      cipherUuid: "existing-cipher",
      fileName: attachmentFileName,
      fileSize: plaintextAttachment.byteLength,
      id: "existing-attachment",
      key: null,
    }).success,
  ).toBe(true)
  expect(await context.storage.write("existing-cipher", "existing-attachment", attachmentCiphertext)).toMatchObject({
    success: true,
  })

  const zipExport = await vaultExportExecute({ session, format: "zip", apiClient })
  expect(zipExport.success).toBe(true)
  if (!zipExport.success) return
  expect(zipExport.data.filename).toMatch(/\.zip$/)
  expect(zipExport.data.mimeType).toBe("application/zip")
  expect(zipExport.data.skippedAttachmentCount).toBe(0)
  expect(zipExport.data.warnings).toEqual([])
  const entries = zipEntryRead(zipExport.data.content)
  expect(entries.map((entry) => entry.path)).toEqual(["data.json", "attachments/Existing login/exported.bin"])
  expect(new TextDecoder().decode(entries[0]?.data)).toBe(compatibleJsonExport.data.content)
  expect(entries[1]?.data).toEqual(plaintextAttachment)
  const zipDataJson = new TextDecoder().decode(entries[0]?.data)
  expect(zipDataJson).not.toContain('"attachments"')
  expect(zipDataJson).not.toContain('"url"')
  expect(zipDataJson).not.toContain('"key"')
})
