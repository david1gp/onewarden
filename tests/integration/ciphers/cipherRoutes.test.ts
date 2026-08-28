import { afterEach, expect, test } from "bun:test"
import { cipherFindByUuid } from "../../../src/server/contexts/ciphers/cipherFindByUuid.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []
const date = "2026-08-28T00:00:00.000Z"

function userCreate(uuid: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: date,
    updatedAt: date,
    verifiedAt: date,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: `${uuid}@example.com`,
    emailNew: null,
    emailNewToken: null,
    name: uuid,
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 600_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(userUuid: string): IdentityDevice {
  return {
    uuid: "cipher-device",
    createdAt: date,
    updatedAt: date,
    userUuid,
    name: "Cipher Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
  notifications: unknown[]
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate("cipher-user")
  const device = deviceCreate(user.uuid)
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate(date), false).success).toBe(true)
  const clock = clockTestCreate(date)
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "cipher-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!bundleResult.success) throw new Error(bundleResult.errorMessage)
  const notifications: unknown[] = []
  const app = serverAppCreate({
    clock,
    database,
    ciphers: {
      notification: {
        sendCipherUpdate: (notification) => {
          notifications.push(notification)
        },
        sendUserUpdate: (notification) => {
          notifications.push(notification)
        },
      },
    },
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      identifier: identifierTestCreate(["cipher-one", "cipher-two", "folder-one"]),
    },
  })
  return { app, database, notifications, token: bundleResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

function loginData(name: string) {
  return {
    name,
    type: 1,
    key: "encrypted-key",
    login: { password: "encrypted-password", uris: [{ uri: "https://example.com" }] },
    notes: "encrypted-notes",
    fields: [{ name: "field", type: 0, value: "value" }],
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("cipher routes persist encrypted data, favorites, folders, archive, revisions, and notifications", async () => {
  const context = await contextCreate()
  const folderResponse = await context.app.request("https://vault.example/api/folders", {
    body: JSON.stringify({ name: "Work" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(folderResponse.status).toBe(200)
  const folder = await folderResponse.json()

  const createResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify({ ...loginData("Example"), folderId: folder.id, favorite: true }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  const created = await createResponse.json()
  expect(created).toMatchObject({
    favorite: true,
    folderId: folder.id,
    id: "cipher-two",
    login: { password: "encrypted-password", uris: [{ uri: "https://example.com" }] },
    name: "Example",
    object: "cipherDetails",
  })
  expect(created.fields).toEqual([{ name: "field", type: 0, value: "value" }])

  const userRow = context.database
    .query<{ updated_at: string }, [string]>("SELECT updated_at FROM users WHERE uuid = ?")
    .get("cipher-user")
  expect(userRow?.updated_at).toBe(date)

  const staleResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two", {
    body: JSON.stringify({ ...loginData("Stale"), lastKnownRevisionDate: "2026-08-27T23:59:58.000Z" }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(staleResponse.status).toBe(400)
  expect((await staleResponse.json()).message).toContain("out of date")

  const partialResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/partial", {
    body: JSON.stringify({ favorite: false, folderId: null }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(partialResponse.status).toBe(200)
  expect(await partialResponse.json()).toMatchObject({ favorite: false, folderId: null })

  const archiveResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/archive", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "PUT",
  })
  expect(archiveResponse.status).toBe(200)
  expect((await archiveResponse.json()).archivedDate).toBe(date)

  const softDeleteResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/delete", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "PUT",
  })
  expect(softDeleteResponse.status).toBe(200)
  const deleted = cipherFindByUuid(context.database, "cipher-two")
  expect(deleted.success && deleted.data?.deletedAt).toBe(date)

  const restoreResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/restore", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "PUT",
  })
  expect(restoreResponse.status).toBe(200)
  expect((await restoreResponse.json()).deletedDate).toBeNull()

  const hardDeleteResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "DELETE",
  })
  expect(hardDeleteResponse.status).toBe(200)
  const removed = cipherFindByUuid(context.database, "cipher-two")
  expect(removed.success && removed.data).toBeNull()
  expect(
    context.notifications.filter((item) => typeof item === "object" && item !== null && "type" in item),
  ).toHaveLength(5)
})

test("cipher route aliases implement bulk delete, restore, and move", async () => {
  const context = await contextCreate()
  const first = await context.app.request("https://vault.example/api/ciphers/create", {
    body: JSON.stringify({ cipher: loginData("First") }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const second = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Second")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(first.status).toBe(200)
  expect(second.status).toBe(200)
  const folder = await context.app.request("https://vault.example/api/folders", {
    body: JSON.stringify({ name: "Bulk" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const folderData = await folder.json()
  const move = await context.app.request("https://vault.example/api/ciphers/move", {
    body: JSON.stringify({ folderId: folderData.id, ids: ["cipher-one", "cipher-two"] }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(move.status).toBe(200)

  const remove = await context.app.request("https://vault.example/api/ciphers/delete", {
    body: JSON.stringify({ ids: ["cipher-one", "cipher-two"] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(remove.status).toBe(200)
  const restore = await context.app.request("https://vault.example/api/ciphers/restore", {
    body: JSON.stringify({ ids: ["cipher-one", "cipher-two"] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(restore.status).toBe(200)
  expect((await restore.json()).data).toHaveLength(2)
})
